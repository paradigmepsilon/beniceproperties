// server/lib/materialize.ts
// =============================================================================
// Short-stay booking materialization (payment-first model). Extracted from
// routes.ts so the decision tree is unit-testable: routes.ts is now a thin call
// from the `payment_intent.succeeded` webhook branch.
//
// The guest pays FIRST; no booking row exists until Stripe confirms the charge.
// This module rebuilds the booking from the PaymentIntent metadata.
//
// MONEY RULE — NO AUTOMATIC REFUND. This module cannot refund: it does not
// import the Stripe refund helper at all. If the dates were taken between the
// intent and the charge (a race, an OTA block landing, or the DB exclusion
// constraint firing), the booking is still written — as CONFLICT, a status that
// blocks no dates and never occupies a room — the payment is recorded PAID, a
// HIGH BOOKING_CONFLICT escalation is raised, and an admin is paged. A human
// then resolves it from the admin console: confirm, or cancel + refund. Money
// leaving the account is always a deliberate human action.
//
// Dependencies are injectable (defaulting to the real modules) purely so the
// tests can drive every branch without a DB, Stripe, or an email transport.
// =============================================================================

import { storage as realStorage } from "../storage";
import { resolveBooking as realResolveBooking, BookingError } from "./booking";
import { notifyAdmin as realNotifyAdmin } from "./notifications";
import {
  onBookingConfirmed as realOnBookingConfirmed,
  LIFECYCLE_TEMPLATES,
  roomDisplayName,
  fmtMoney,
} from "./lifecycle";
import { posthog } from "./posthog";
import { log } from "../server-log";
import type { Booking } from "@shared/schema";

/** Postgres `exclusion_violation` — the range-overlap constraint rejected the row. */
const PG_EXCLUSION_VIOLATION = "23P01";

export interface MaterializeDeps {
  storage: typeof realStorage;
  resolveBooking: typeof realResolveBooking;
  notifyAdmin: typeof realNotifyAdmin;
  onBookingConfirmed: typeof realOnBookingConfirmed;
}

const defaultDeps = (): MaterializeDeps => ({
  storage: realStorage,
  resolveBooking: realResolveBooking,
  notifyAdmin: realNotifyAdmin,
  onBookingConfirmed: realOnBookingConfirmed,
});

/**
 * A booking already exists for this reference — repair whatever the previous
 * attempt did not finish. Each step carries its own idempotency guard, so
 * running this on every Stripe retry is safe:
 *
 *  - payment row: created when absent, flipped to PAID when present-but-not-paid,
 *    left alone when already PAID (never duplicated).
 *  - CONFLICT booking: `raiseEscalationOnce` re-runs (deduped on
 *    (bookingId, kind, OPEN)); the admin is paged only when that returns a NEW
 *    row, so a webhook retry storm cannot re-page. Never a guest send, never a
 *    room grab.
 *  - live booking (CONFIRMED/ACTIVE): `onBookingConfirmed` re-runs, deduped via
 *    lifecycle_events, so a confirmation lost to a mid-flight crash still lands.
 *  - CANCELLED/other: left alone — a human already decided.
 */
async function repairExistingBooking(args: {
  existing: Booking;
  pi: import("stripe").Stripe.PaymentIntent;
  reference: string;
  deps: MaterializeDeps;
}): Promise<void> {
  const { existing, pi, reference, deps } = args;
  const { storage, notifyAdmin, onBookingConfirmed } = deps;
  const m = pi.metadata ?? {};

  const payment = await storage.getPaymentByStripeRef(pi.id);
  if (!payment) {
    // The booking landed but the payment row did not. The guest paid — record it.
    await storage.createPayment({
      bookingId: existing.id,
      type: "ONE_TIME",
      method: "STRIPE",
      amount: m.amount ?? "0",
      surcharge: m.surcharge ?? "0",
      status: "PAID",
      stripeRef: pi.id,
      confirmedBy: null,
      paidAt: new Date(),
    });
    log(`short-stay ${reference}: booking existed without a payment row — PAID row written`, "stripe");
  } else if (payment.status !== "PAID") {
    await storage.updatePayment(payment.id, { status: "PAID", paidAt: new Date() });
  }

  if (existing.status === "CONFLICT") {
    const raised = await storage.raiseEscalationOnce({
      bookingId: existing.id,
      leaseId: null,
      kind: "BOOKING_CONFLICT",
      severity: "HIGH",
      detail:
        `Paid booking ${reference} (PI ${pi.id}) is held in CONFLICT — resolve by confirming ` +
        `or cancelling + refunding.`,
    });
    // Only a NEW escalation pages a human: an OPEN one means the first pass
    // already alerted, and Stripe retries the same event many times.
    if (raised) {
      const [property, room, guest] = await Promise.all([
        storage.getProperty(existing.propertyId),
        existing.roomId ? storage.getRoom(existing.roomId) : Promise.resolve(undefined),
        storage.getGuest(existing.guestId),
      ]);
      const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
        property: property?.name ?? existing.propertyId,
        room: roomDisplayName(room),
        guest: guest?.name ?? "(unknown guest)",
        email: guest?.email ?? "",
        phone: guest?.phone ?? "",
        checkIn: existing.checkIn,
        checkOut: existing.checkOut ?? "",
        reference,
        total: fmtMoney(parseFloat(existing.quotedTotal)),
        status: "CONFLICT",
      });
      await notifyAdmin({
        subject: tpl.subject,
        body: tpl.body,
        telegramText: tpl.telegramText,
        context: { bookingId: existing.id, guestId: guest?.id ?? null, kind: "BOOKING_CONFLICT" },
      });
    }
    log(`short-stay ${reference} already exists as CONFLICT — escalation re-checked`, "stripe");
    return;
  }

  if (existing.status === "CONFIRMED" || existing.status === "ACTIVE") {
    const [property, room, guest] = await Promise.all([
      storage.getProperty(existing.propertyId),
      existing.roomId ? storage.getRoom(existing.roomId) : Promise.resolve(undefined),
      storage.getGuest(existing.guestId),
    ]);
    if (property && guest) {
      await onBookingConfirmed({ booking: existing, property, room: room ?? null, guest });
    }
    log(`short-stay booking ${reference} already exists — confirmation re-checked`, "stripe");
    return;
  }

  log(`short-stay booking ${reference} already exists (${existing.status}) — left as is`, "stripe");
}

/**
 * Materialize a short-stay booking from a succeeded PaymentIntent's metadata.
 * Idempotent across Stripe retries (keyed on `reference`).
 */
export async function materializeShortStayBooking(
  pi: import("stripe").Stripe.PaymentIntent,
  deps: MaterializeDeps = defaultDeps(),
): Promise<void> {
  const { storage, resolveBooking, notifyAdmin, onBookingConfirmed } = deps;
  const m = pi.metadata ?? {};
  const reference = m.reference;
  if (!reference) {
    log(`short-stay PI ${pi.id} has no reference — cannot materialize`, "stripe");
    return;
  }

  // Idempotency: a booking with this reference already exists (a Stripe retry, or
  // a manual booking that reused the reference space). This is NOT automatically
  // a no-op — the first attempt may have died partway through — so every step is
  // re-run under its own idempotency guard: the payment row is created if
  // missing, a CONFLICT is re-escalated (deduped), and a live booking re-fires
  // its confirmation (deduped via lifecycle_events).
  const existing = await storage.getBookingByReference(reference);
  if (existing) {
    await repairExistingBooking({ existing, pi, reference, deps });
    return;
  }

  // Guest completeness guard: contact is attached before confirmPayment, so this
  // should never be blank — but never write a booking we can't email.
  const guestName = m.guest_name;
  const guestEmail = m.guest_email;
  if (!guestName || guestName === "null" || !guestEmail || guestEmail === "null") {
    log(`short-stay PI ${pi.id} (${reference}) missing guest contact — NOT materializing`, "stripe");
    posthog.capture({ distinctId: pi.id, event: "booking_intent_missing_contact", properties: { reference } });
    return;
  }

  const propertyId = m.property_id && m.property_id !== "null" ? m.property_id : undefined;
  const roomId = m.room_id && m.room_id !== "null" ? m.room_id : undefined;
  const checkIn = m.check_in && m.check_in !== "null" ? m.check_in : undefined;
  const checkOut = m.check_out && m.check_out !== "null" ? m.check_out : undefined;
  const model = m.model === "COLIVING" ? ("COLIVING" as const) : ("STR" as const);

  // Structural guard: `property_id` and `check_in` are NOT NULL on the booking
  // row, so without them there is nothing writable. Page a human rather than
  // throwing a constraint error into the webhook (which Stripe would retry
  // forever) or writing a half-booking. The alert carries no guest contact
  // details — it is a broken-intent report, not a booking notice.
  if (!propertyId || !checkIn) {
    const missing = [!propertyId && "property_id", !checkIn && "check_in"].filter(Boolean).join(", ");
    log(
      `short-stay PI ${pi.id} (${reference}) missing ${missing} — NOT materializing, admin alerted`,
      "stripe",
    );
    await notifyAdmin({
      subject: `⚠️ Paid booking could not be created — ${reference}`,
      body:
        `PaymentIntent ${pi.id} for reference ${reference} ($${m.quoted_total ?? m.amount ?? "?"}) ` +
        `succeeded but its metadata is missing ${missing}, so no booking row could be written. ` +
        `The charge stands. Reconcile this manually in Stripe and the admin console.`,
      context: { kind: "BOOKING_MATERIALIZE_FAILED" },
    });
    posthog.capture({
      distinctId: pi.id,
      event: "booking_materialize_failed",
      properties: { reference, missing },
    });
    return;
  }

  // Availability race guard: re-check that the dates/room are still free. A
  // failure does NOT refund — it downgrades the booking to CONFLICT below.
  let conflictReason: string | null = null;
  try {
    await resolveBooking({ propertyId, roomId, checkIn, checkOut });
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    conflictReason = err.message;
    log(
      `short-stay ${reference} dates taken since intent — saving as CONFLICT (PI ${pi.id}): ${err.message}`,
      "stripe",
    );
  }

  const guestRow = await storage.upsertGuestByEmail({
    name: guestName,
    email: guestEmail,
    phone: m.guest_phone && m.guest_phone !== "null" ? m.guest_phone : undefined,
  });

  const baseBooking = {
    propertyId,
    roomId: roomId ?? null,
    guestId: guestRow.id,
    model,
    checkIn,
    checkOut: checkOut ?? null,
    paymentMethod: "STRIPE" as const,
    reference,
    quotedTotal: m.quoted_total ?? "0",
  };
  const okStatus = model === "COLIVING" ? ("ACTIVE" as const) : ("CONFIRMED" as const);

  let booking;
  if (conflictReason) {
    booking = await storage.createBooking({ ...baseBooking, status: "CONFLICT" });
  } else {
    try {
      booking = await storage.createBooking({ ...baseBooking, status: okStatus });
    } catch (err) {
      // The DB's own range-overlap guard won the race. CONFLICT rows are exempt
      // from the constraint, so the retry always lands.
      if ((err as { code?: string }).code !== PG_EXCLUSION_VIOLATION) throw err;
      conflictReason = `Database exclusion constraint rejected the booking (${PG_EXCLUSION_VIOLATION}) — the dates were taken concurrently.`;
      log(`short-stay ${reference} hit the exclusion constraint — saving as CONFLICT`, "stripe");
      booking = await storage.createBooking({ ...baseBooking, status: "CONFLICT" });
    }
  }

  // The guest paid either way — always record the money.
  await storage.createPayment({
    bookingId: booking.id,
    type: "ONE_TIME",
    method: "STRIPE",
    amount: m.amount ?? "0",
    surcharge: m.surcharge ?? "0",
    status: "PAID",
    stripeRef: pi.id,
    confirmedBy: null,
    paidAt: new Date(),
  });

  const [property, room] = await Promise.all([
    storage.getProperty(propertyId),
    roomId ? storage.getRoom(roomId) : Promise.resolve(undefined),
  ]);

  if (conflictReason) {
    // Do NOT occupy the room and do NOT confirm to the guest.
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "BOOKING_CONFLICT",
      severity: "HIGH",
      detail:
        `Paid booking ${reference} (PI ${pi.id}) landed on unavailable dates ` +
        `${checkIn}→${checkOut ?? "?"}: ${conflictReason} Saved as CONFLICT — resolve by confirming or cancelling + refunding.`,
    });
    const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
      property: property?.name ?? propertyId,
      room: roomDisplayName(room),
      guest: guestName,
      email: guestEmail,
      phone: m.guest_phone && m.guest_phone !== "null" ? m.guest_phone : "",
      checkIn,
      checkOut: checkOut ?? "",
      reference,
      total: fmtMoney(parseFloat(m.quoted_total ?? "0")),
      status: "CONFLICT",
    });
    await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
      telegramText: tpl.telegramText,
      context: { bookingId: booking.id, guestId: guestRow.id, kind: "BOOKING_CONFLICT" },
    });
    posthog.capture({
      distinctId: guestEmail,
      event: "booking_conflict_saved",
      properties: { reference, booking_id: booking.id, payment_intent_id: pi.id, reason: conflictReason },
    });
    log(`short-stay booking ${reference} saved as CONFLICT via ${pi.id} — admin alerted, NO refund`, "stripe");
    return;
  }

  if (roomId) await storage.updateRoom(roomId, { status: "OCCUPIED" });
  posthog.capture({
    distinctId: guestEmail,
    event: "booking_confirmed",
    properties: {
      reference,
      booking_id: booking.id,
      property_id: propertyId,
      property_type: model,
      room_id: roomId ?? null,
      check_in: checkIn,
      check_out: checkOut,
      payment_intent_id: pi.id,
    },
  });
  if (property) {
    await onBookingConfirmed({ booking, property, room: room ?? null, guest: guestRow });
  }
  log(`short-stay booking ${reference} materialized + confirmed via ${pi.id}`, "stripe");
}

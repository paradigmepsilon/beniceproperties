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
import { onBookingConfirmed as realOnBookingConfirmed, LIFECYCLE_TEMPLATES } from "./lifecycle";
import { posthog } from "./posthog";
import { log } from "../server-log";

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

  // Idempotency: if a booking with this reference already exists (Stripe retry, or
  // a manual booking that reused the reference space), just ensure its payment is
  // PAID and stop.
  const existing = await storage.getBookingByReference(reference);
  if (existing) {
    const payment = await storage.getPaymentByStripeRef(pi.id);
    if (payment && payment.status !== "PAID") {
      await storage.updatePayment(payment.id, { status: "PAID", paidAt: new Date() });
    }
    log(`short-stay booking ${reference} already exists — idempotent no-op`, "stripe");
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

  const propertyId = m.property_id;
  const roomId = m.room_id && m.room_id !== "null" ? m.room_id : undefined;
  const checkIn = m.check_in && m.check_in !== "null" ? m.check_in : undefined;
  const checkOut = m.check_out && m.check_out !== "null" ? m.check_out : undefined;
  const model = m.model === "COLIVING" ? ("COLIVING" as const) : ("STR" as const);

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
    checkIn: checkIn!,
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
      room: room ? (room.roomNumber ? `Room ${room.roomNumber} — ${room.name}` : room.name) : null,
      guest: guestName,
      email: guestEmail,
      phone: m.guest_phone && m.guest_phone !== "null" ? m.guest_phone : "",
      checkIn: checkIn ?? "",
      checkOut: checkOut ?? "",
      reference,
      total: `$${m.quoted_total ?? "0"}`,
      status: "CONFLICT",
    });
    await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
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

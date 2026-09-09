// server/lib/stayExtension.ts
// =============================================================================
// Extending a stay: the guest pays for more nights and their EXISTING booking's
// check_out moves later. One reference, one room, the SAME door code, and nothing
// to re-sign — the owner's decision, and the reason this is a mutation rather
// than a second adjacent booking.
//
// PRICING: RE-PRICE THE WHOLE STAY, then charge (new total - already paid).
//
// cascadeStayPrice bills whole periods with floor division at each tier, so with
// weekly $400 / monthly $1400 a 21-night stay is 3 weeks = $1200; extending to 28
// re-prices to one month = $1400, a delta of $200 for 7 nights. Pricing the added
// nights in isolation would charge $400 for the same room-nights — a SECOND,
// divergent money rule for one stay. Re-pricing is both cheaper for the guest and
// the single source of truth the repo already relies on everywhere else.
//
// A re-price that lands BELOW what was already paid is REFUSED (409), never
// refunded. An extension must never move money outward; that decision goes to a
// human.
//
// PAYMENT-FIRST, like every other charge here: the dates do NOT move until the
// webhook confirms. If they were taken in the meantime, the charge STANDS, no
// refund happens automatically, a HIGH escalation is raised, and a human decides
// — identical to the MONEY RULE in materialize.ts.
//
// OWNER OVERRIDE ON LENGTH: an extension MAY carry a stay past 28 nights, which
// requiresLease() would otherwise route to the lease flow. That was an explicit
// decision (one reference beats a mid-stay lease conversion that would move money
// twice), and it is flagged for counsel in the plan — a long occupancy can create
// tenancy rights regardless of what the agreement says.
// =============================================================================

import { storage } from "../storage";
import { LeaseError } from "./errorResponse";
import { cascadeStayPrice, RateError } from "@shared/rateSelection";
import { calculateBreakdown } from "@shared/pricing";
import { getCardSurchargeRate } from "./pricingSettings";
import { createOneTimePaymentIntent } from "./stripe";
import { buildRoomBookingChargeMetadata } from "./paymentMetadata";
import { onStayExtended } from "./stayLifecycle";
import { notifyAdmin } from "./notifications";
import { adminStayExtensionConflict } from "./stayTemplates";
import { roomDisplayName } from "./formatShared";
import { stayNights } from "@shared/bookingGate";
import { addDaysIso } from "@shared/dates";
import { log } from "../server-log";
import type { Booking, Room } from "@shared/schema";

/** Postgres exclusion_violation — the range-overlap constraint rejected the row. */
const PG_EXCLUSION_VIOLATION = "23P01";

/** How far ahead the picker offers nights. Bounded so the probe loop is cheap. */
export const MAX_EXTENSION_NIGHTS = 14;

export interface ExtensionOption {
  newCheckOut: string;
  addedNights: number;
  /** What the guest pays now, surcharge included. */
  dueNow: number;
}

export interface ExtensionQuote {
  reference: string;
  fromCheckOut: string;
  toCheckOut: string;
  currentNights: number;
  newNights: number;
  addedNights: number;
  alreadyPaid: number;
  newStayTotal: number;
  /** newStayTotal - alreadyPaid, before the card surcharge. */
  delta: number;
  surcharge: number;
  dueNow: number;
}

function roomRates(room: Room) {
  return {
    daily: room.dailyRate,
    weekly: room.weeklyRent,
    biweekly: room.biweeklyRate,
    monthly: room.monthlyRate,
  };
}

/** Everything already settled on this booking, surcharge included. */
async function alreadyPaidTotal(bookingId: string): Promise<number> {
  const payments = await storage.getPaymentsByBooking(bookingId);
  return payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge ?? "0"), 0);
}

async function loadExtendable(bookingId: string) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);
  if (!booking.checkOut) {
    throw new LeaseError("An open-ended stay cannot be extended.", 409);
  }
  if (!booking.roomId) {
    throw new LeaseError("Only a room booking can be extended here.", 409);
  }
  if (!["PENDING_APPROVAL", "ACTIVE", "CONFIRMED"].includes(booking.status)) {
    throw new LeaseError("This booking is not live, so it cannot be extended.", 409);
  }
  const [room, property, guest, gate] = await Promise.all([
    storage.getRoom(booking.roomId),
    storage.getProperty(booking.propertyId),
    storage.getGuest(booking.guestId),
    storage.getBookingGate(booking.id),
  ]);
  if (!room || !property || !guest) {
    throw new LeaseError("Booking is missing its room, property or guest", 409);
  }
  return { booking, room, property, guest, gate: gate ?? null };
}

/** Price an extension. Creates nothing and charges nothing. */
export async function quoteExtension(args: {
  bookingId: string;
  newCheckOut: string;
}): Promise<ExtensionQuote> {
  const { booking, room } = await loadExtendable(args.bookingId);
  const fromCheckOut = booking.checkOut!;

  if (args.newCheckOut <= fromCheckOut) {
    throw new LeaseError("Pick a date after your current checkout.", 400);
  }

  const currentNights = stayNights(booking.checkIn, fromCheckOut);
  const newNights = stayNights(booking.checkIn, args.newCheckOut);

  let priced;
  try {
    // The SAME call the original booking used — one money rule for one stay.
    priced = cascadeStayPrice({ days: newNights, rates: roomRates(room), topTier: "MONTHLY" });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    throw err;
  }

  const cleaningFee = room.cleaningFee ? parseFloat(room.cleaningFee) : 0;
  const newStayTotal = priced.total + cleaningFee;
  const alreadyPaid = await alreadyPaidTotal(booking.id);
  const delta = Math.round((newStayTotal - alreadyPaid) * 100) / 100;

  if (delta <= 0) {
    // Re-pricing crossed a tier boundary downward. Never refund automatically.
    throw new LeaseError(
      `Extending to ${newNights} nights re-prices this stay at or below what has already been ` +
        `paid. This needs a person — please get in touch and we will sort it out.`,
      409,
    );
  }

  const breakdown = calculateBreakdown({
    baseAmount: delta,
    cleaningFee: 0, // already inside newStayTotal
    paymentMethod: "STRIPE",
    surchargeRate: await getCardSurchargeRate(),
  });

  return {
    reference: booking.reference,
    fromCheckOut,
    toCheckOut: args.newCheckOut,
    currentNights,
    newNights,
    addedNights: newNights - currentNights,
    alreadyPaid,
    newStayTotal,
    delta,
    surcharge: breakdown.surcharge,
    dueNow: breakdown.total,
  };
}

/**
 * Which extensions are actually available, walked against the real calendar so a
 * reminder or a picker never offers a night we cannot honour.
 */
export async function extensionOptions(bookingId: string): Promise<{
  maxNewCheckOut: string | null;
  options: ExtensionOption[];
}> {
  const { booking } = await loadExtendable(bookingId);
  const from = booking.checkOut!;
  const options: ExtensionOption[] = [];
  let maxNewCheckOut: string | null = null;

  for (let n = 1; n <= MAX_EXTENSION_NIGHTS; n += 1) {
    const candidate = addDaysIso(from, n);
    const free = await storage.isRoomAvailableForRange({
      roomId: booking.roomId!,
      startDate: from,
      endDate: candidate,
      endExclusive: true,
      excludeBookingId: booking.id,
    });
    if (!free) break;
    maxNewCheckOut = candidate;
    // Offer a handful of useful jumps rather than every single night.
    if ([1, 2, 3, 7, 14].includes(n)) {
      try {
        const quote = await quoteExtension({ bookingId, newCheckOut: candidate });
        options.push({ newCheckOut: candidate, addedNights: n, dueNow: quote.dueNow });
      } catch {
        // A tier boundary can make one candidate unpriceable (delta <= 0) without
        // invalidating the others. Skip it rather than failing the whole picker.
      }
    }
  }
  return { maxNewCheckOut, options };
}

/**
 * Create the PaymentIntent. The dates are NOT moved here — the webhook does that
 * once Stripe confirms, exactly like a new booking.
 *
 * The idempotency key is stable PER TARGET DATE, so a double-tap reuses the same
 * intent while a genuinely different (longer) extension gets its own.
 */
export async function startExtension(args: {
  bookingId: string;
  newCheckOut: string;
}): Promise<{ clientSecret: string | null; paymentIntentId: string; quote: ExtensionQuote }> {
  const { booking, room, property, guest } = await loadExtendable(args.bookingId);
  const quote = await quoteExtension(args);

  const free = await storage.isRoomAvailableForRange({
    roomId: booking.roomId!,
    startDate: booking.checkOut!,
    endDate: args.newCheckOut,
    endExclusive: true,
    excludeBookingId: booking.id,
  });
  if (!free) {
    throw new LeaseError("Those extra nights have just been taken — pick a shorter extension.", 409);
  }

  const metadata = {
    ...buildRoomBookingChargeMetadata({
      entity: property.entity,
      property,
      room,
      paymentKind: "BOOKING_DEPOSIT",
    }),
    // Everything the webhook needs to apply the extension without re-quoting.
    extension_from: booking.checkOut!,
    extension_to: args.newCheckOut,
    extension_booking_id: booking.id,
    amount: quote.delta.toFixed(2),
    surcharge: quote.surcharge.toFixed(2),
  };

  const intent = await createOneTimePaymentIntent({
    amount: quote.dueNow,
    guestEmail: guest.email,
    reference: booking.reference,
    metadata,
    idempotencyKey: `extend:${booking.id}:${args.newCheckOut}`,
  });

  log(
    `stay ${booking.reference}: extension intent ${intent.id} for ${booking.checkOut} → ${args.newCheckOut}`,
    "stay",
  );
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id, quote };
}

/**
 * Apply a PAID extension. Called ONLY from the Stripe webhook.
 *
 * Idempotent three ways: an already-extended booking returns early, the payment
 * row is looked up by stripeRef before insert, and the guest message is deduped
 * on the extension ordinal.
 */
export async function applyExtension(
  pi: import("stripe").Stripe.PaymentIntent,
): Promise<{ applied: boolean; conflicted: boolean }> {
  const m = pi.metadata ?? {};
  const bookingId = m.extension_booking_id;
  const newCheckOut = m.extension_to;
  if (!bookingId || !newCheckOut) {
    log(`extension PI ${pi.id} has no booking/target metadata — cannot apply`, "stripe");
    return { applied: false, conflicted: false };
  }

  const booking = await storage.getBooking(bookingId);
  if (!booking) {
    log(`extension PI ${pi.id}: booking ${bookingId} not found`, "stripe");
    return { applied: false, conflicted: false };
  }

  // Already applied (a Stripe retry): nothing more to do.
  if (booking.checkOut && booking.checkOut >= newCheckOut) {
    log(`extension PI ${pi.id}: ${booking.reference} already extended to ${booking.checkOut}`, "stripe");
    return { applied: true, conflicted: false };
  }

  const previousCheckOut = booking.checkOut ?? booking.checkIn;
  const [room, property, guest, gate] = await Promise.all([
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
    storage.getProperty(booking.propertyId),
    storage.getGuest(booking.guestId),
    storage.getBookingGate(booking.id),
  ]);

  // Record the money FIRST — it moved regardless of whether the dates can.
  const existingPayment = await storage.getPaymentByStripeRef(pi.id);
  if (!existingPayment) {
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
  }

  // Widening check_out re-evaluates the exclusion constraint; the database is the
  // real arbiter of whether those nights are still free.
  try {
    await storage.updateBooking(booking.id, { checkOut: newCheckOut });
  } catch (err) {
    if ((err as { code?: string }).code !== PG_EXCLUSION_VIOLATION) throw err;
    // MONEY RULE: the charge stands and is NOT auto-refunded. A human decides.
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "EXTENSION_CONFLICT",
      severity: "HIGH",
      detail:
        `Extension for ${booking.reference} was PAID (PI ${pi.id}, ${m.amount ?? "?"}) but the ` +
        `nights ${previousCheckOut}→${newCheckOut} were taken in the meantime. check_out is ` +
        `UNCHANGED and the charge was NOT refunded. Resolve by hand: extend to a shorter date, ` +
        `move the guest, or refund.`,
    });
    if (property && guest) {
      const tpl = adminStayExtensionConflict({
        property: property.name,
        room: roomDisplayName(room),
        guest: guest.name,
        reference: booking.reference,
        requestedCheckOut: newCheckOut,
        amount: `$${m.amount ?? "?"}`,
        reason: "the exclusion constraint rejected the new range",
      });
      await notifyAdmin({
        subject: tpl.subject,
        body: tpl.body,
        telegramText: tpl.telegramText,
        context: { bookingId: booking.id, guestId: guest.id, kind: "EXTENSION_CONFLICT" },
      });
    }
    log(`extension PI ${pi.id}: ${booking.reference} CONFLICT — charge stands, no refund`, "stripe");
    return { applied: false, conflicted: true };
  }

  const extensionSeq = (gate?.extensionCount ?? 0) + 1;
  if (gate) {
    await storage.updateBookingGate(booking.id, {
      extensionCount: extensionSeq,
      // Preserve the term this stay was originally sold with, once.
      originalCheckOut: gate.originalCheckOut ?? previousCheckOut,
    });
  }

  if (property && guest) {
    const freshGate = await storage.getBookingGate(booking.id);
    await onStayExtended(
      {
        booking: { ...booking, checkOut: newCheckOut },
        gate: freshGate ?? gate ?? null,
        guest,
        property,
        room: room ?? null,
      },
      {
        previousCheckOut,
        newCheckOut,
        amount: parseFloat(m.amount ?? "0") + parseFloat(m.surcharge ?? "0"),
        extensionSeq,
      },
    );
  }

  log(
    `stay ${booking.reference}: extended ${previousCheckOut} → ${newCheckOut} via ${pi.id}`,
    "stripe",
  );
  return { applied: true, conflicted: false };
}

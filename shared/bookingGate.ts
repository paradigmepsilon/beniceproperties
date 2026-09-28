// shared/bookingGate.ts
// =============================================================================
// The short-stay APPROVAL GATE — one source of truth, imported by the client
// (to render "what's left to do") and the server (to decide the post-payment
// status). Mirrors the shape of the lease-vs-booking term gate in schema.ts.
//
// OWNER RULE (2026-09-08): a co-living stay of 7–28 nights is paid in full up
// front, but does NOT go live on payment. It lands PENDING_APPROVAL while the
// guest uploads a driver's license and signs a rental agreement, and a human
// checks both — and sets a door code — before the stay is confirmed.
//
// Whole-property STR is deliberately NOT gated: a themed date-night property
// cannot survive a 24-hour approval hold.
//
// WHY THIS FILE EXISTS AT ALL: five separate modules used to compute the
// post-payment status as `model === "COLIVING" ? "ACTIVE" : "CONFIRMED"` —
// materialize.ts, manualSettle.ts, bookingConflicts.ts, and two branches in
// routes.ts. Gating only the Stripe path would have left a CashApp settlement,
// an admin conflict resolution, and the legacy Checkout webhook each able to
// walk a paid guest to ACTIVE with no ID, no agreement, and no door code.
// All five now call postPaymentStatusFor(), and bookingGate.test.ts greps the
// sources to keep it that way.
//
// NOTHING HERE THROWS. postPaymentStatusFor runs inside the Stripe
// `payment_intent.succeeded` webhook; a throw there is retried by Stripe
// forever and the guest's booking never materializes.
// =============================================================================

import { differenceInCalendarDays, parseISO } from "date-fns";
import { isDirectCoLivingStay } from "./schema";
import { effectiveBookingStatus } from "./bookingStatus";
import { todayIso } from "./dates";

/** The facts needed to decide whether a paid stay is gated. */
export interface StayShape {
  /** BOOKING_MODELS: "STR" | "COLIVING". */
  model: string;
  checkIn: string;
  /** Null for open-ended co-living stays. */
  checkOut: string | null;
}

/** The status a booking takes the moment its payment is confirmed. */
export type PostPaymentStatus = "PENDING_APPROVAL" | "ACTIVE" | "CONFIRMED";

/**
 * Nights stayed, matching the STR booking path's convention (a checkout day is
 * not a night). Same math as the private helper in server/lib/booking.ts, which
 * this replaces as the exported one.
 *
 * Returns 0 rather than a negative for an inverted range, and 0 for an
 * unparseable date — callers on the money path must never see NaN.
 */
export function stayNights(checkIn: string, checkOut: string): number {
  const n = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

/**
 * True when a paid stay must be held for human approval — a co-living stay of
 * 7–28 nights with a known checkout.
 *
 * Deliberately false for: whole-property STR (any length), an open-ended stay
 * (nights are unknowable), a stay below the co-living minimum, and a stay above
 * the lease boundary (that one is a lease and never reaches this path). Each of
 * those keeps the behaviour it has today.
 */
export function isGatedStay(stay: StayShape): boolean {
  if (stay.model !== "COLIVING") return false;
  if (!stay.checkOut) return false;
  return isDirectCoLivingStay(stayNights(stay.checkIn, stay.checkOut));
}

/**
 * The ONE place the post-payment booking status is decided. Every path that
 * confirms money — Stripe webhook, CashApp/Zelle manual settlement, admin
 * conflict resolution, legacy Checkout session — must call this.
 *
 * A gated stay becomes PENDING_APPROVAL, which is NOT in
 * NON_BLOCKING_BOOKING_STATUSES: the guest paid, so the dates stay held while a
 * human reviews.
 *
 * Everything else is decided by the CALENDAR, not the product model. This used
 * to read `model === "COLIVING" ? "ACTIVE" : "CONFIRMED"`, which is why a
 * co-living stay booked for next March was written ACTIVE the moment the card
 * cleared and stayed that way forever. It now defers to
 * effectiveBookingStatus() — the same function the daily lifecycle job uses —
 * so a payment and a sweep can never reach different conclusions about the
 * same booking.
 *
 * `today` is injectable so this stays testable; production callers pass
 * nothing and get the real date.
 */
export function postPaymentStatusFor(
  stay: StayShape,
  today: string = todayIso(),
): PostPaymentStatus {
  if (isGatedStay(stay)) return "PENDING_APPROVAL";
  // Seed with CONFIRMED (paid, cleared) and let the dates place it in time.
  // Only ACTIVE or CONFIRMED can come back: a stay cannot be paid for after it
  // has already ended, and COMPLETED is not a post-payment state.
  const phase = effectiveBookingStatus(
    { status: "CONFIRMED", checkIn: stay.checkIn, checkOut: stay.checkOut },
    today,
  );
  return phase === "ACTIVE" ? "ACTIVE" : "CONFIRMED";
}

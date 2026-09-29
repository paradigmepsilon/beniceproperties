// shared/bookingStatus.ts
// The single definition of which status a booking SHOULD be in, given the
// stored status and today's date.
//
// Why this exists: booking status never described time. postPaymentStatusFor()
// returned ACTIVE for any ungated co-living booking and CONFIRMED for any paid
// STR — a *model* discriminator, written once at payment and never advanced.
// A stay booked for next March was ACTIVE the moment the card cleared. Nothing
// ever wrote COMPLETED. Meanwhile room occupancy was already fully date-driven
// (storage.getOccupiedRoomIdsOn), so the two halves disagreed by design.
//
// One pure function, used by BOTH the daily job that persists the status
// (server/lib/bookingLifecycle.ts) and anything that wants to display it. They
// call the same code, so the stored column and the screen cannot disagree.
//
// Dates are YYYY-MM-DD strings compared lexically — correct for ISO dates, and
// the same basis the availability queries use. `today` is injected so the
// function stays pure and testable (callers pass todayIso() from shared/dates).

/** Statuses this function will never rewrite. */
const TERMINAL: readonly string[] = ["CANCELLED", "CONFLICT", "EXPIRED", "COMPLETED"];

export interface BookingPhaseInput {
  status: string;
  /** YYYY-MM-DD. */
  checkIn: string;
  /** YYYY-MM-DD, or null for an open-ended co-living stay. */
  checkOut: string | null;
}

/**
 * The status this booking should currently hold. Returns the input status
 * unchanged when nothing should move — callers rely on that to stay idempotent.
 *
 * PENDING_APPROVAL is deliberately never touched. Those bookings are PAID, and
 * the gate's ghost sweep (server/lib/stayReminders.ts runStayGhostSweep) already
 * owns them: after 72h of document silence it auto-declines AND REFUNDS. If this
 * function expired one, it would strand the guest's money and race a refund
 * path. Admin action, not a date, resolves that status.
 *
 * COMPLETED is terminal here too: a stay that ended does not reopen because
 * someone edited a date.
 */
export function effectiveBookingStatus(booking: BookingPhaseInput, today: string): string {
  const { status, checkIn, checkOut } = booking;

  if (TERMINAL.includes(status)) return status;
  if (status === "PENDING_APPROVAL") return status;

  // Never paid, and the guest's arrival day has been and gone. Everything must
  // be paid before check-in, so this can only ever be an abandoned checkout.
  if (status === "PENDING_PAYMENT") {
    return checkIn < today ? "EXPIRED" : "PENDING_PAYMENT";
  }

  if (status === "CONFIRMED" || status === "ACTIVE") {
    // An open-ended co-living stay has no end to pass, so it runs until someone
    // ends it by hand. It becomes ACTIVE on arrival and stays there.
    if (!checkOut) return checkIn <= today ? "ACTIVE" : "CONFIRMED";
    // check-out is EXCLUSIVE — the guest is gone on the morning of checkOut,
    // the same half-open rule the availability and occupancy queries use.
    if (checkOut <= today) return "COMPLETED";
    return checkIn <= today ? "ACTIVE" : "CONFIRMED";
  }

  // Unknown status: leave it alone rather than guess.
  return status;
}

/** Convenience for the job and for tests: does this booking need a write? */
export function bookingStatusNeedsChange(booking: BookingPhaseInput, today: string): boolean {
  return effectiveBookingStatus(booking, today) !== booking.status;
}

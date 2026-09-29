// server/lib/bookingLifecycle.ts
// Booking-status sync. `bookings.status` describes the stay's phase in time —
// CONFIRMED before, ACTIVE during, COMPLETED after, EXPIRED if it was never
// paid for — and nothing moves it there except this job.
//
// Before it existed, status was written once at payment by postPaymentStatusFor
// and never advanced: ACTIVE meant "paid co-living, ungated", so a stay booked
// for next March went ACTIVE the moment the card cleared and stayed ACTIVE
// forever, and COMPLETED was never written by anything. Room occupancy was
// already date-driven (syncRoomOccupancyStatus), so the two disagreed by design.
//
// Deliberately the same shape as occupancy.ts: pure decision in shared code,
// idempotent, writes only when a status actually changes, safe to re-run.
// It must run BEFORE syncRoomOccupancyStatus in a sweep so occupancy recomputes
// against corrected statuses in the same pass.
//
// The first run against a real database IS the backfill — there is no separate
// migration for existing rows.

import { effectiveBookingStatus } from "@shared/bookingStatus";
import { todayIso } from "@shared/dates";
import { storage } from "../storage";

/**
 * The only four statuses this job will ever WRITE. A runtime-checked union
 * rather than a cast: if effectiveBookingStatus ever returns something this
 * job doesn't understand — a status added later, or a junk value already in
 * the column — the row is skipped instead of being written blind.
 */
type AdvanceTarget = "ACTIVE" | "COMPLETED" | "EXPIRED" | "CONFIRMED";

function isAdvanceTarget(value: string): value is AdvanceTarget {
  return value === "ACTIVE" || value === "COMPLETED" || value === "EXPIRED" || value === "CONFIRMED";
}

export interface BookingStatusSyncResult {
  /** CONFIRMED -> ACTIVE (a stay started), or ACTIVE -> CONFIRMED (a future one was wrong). */
  activated: number;
  /** -> COMPLETED (the guest checked out). */
  completed: number;
  /** PENDING_PAYMENT -> EXPIRED (never paid, check-in passed). */
  expired: number;
  /** CONFIRMED <- ACTIVE, i.e. a future stay demoted back out of ACTIVE. */
  deferred: number;
  /** Total rows written. */
  changed: number;
  /** Rows examined. */
  scanned: number;
  /** Rows whose computed status this job does not know how to write. */
  skipped: number;
}

/**
 * Bring every booking's status in line with the calendar.
 *
 * PENDING_APPROVAL is never touched — see shared/bookingStatus.ts. Those are
 * PAID, and the gate's ghost sweep already auto-declines and REFUNDS them
 * after 72h of document silence; expiring one here would strand money.
 */
export async function syncBookingStatuses(
  today: string = todayIso(),
): Promise<BookingStatusSyncResult> {
  const all = await storage.getBookings();

  const result: BookingStatusSyncResult = {
    activated: 0,
    completed: 0,
    expired: 0,
    deferred: 0,
    changed: 0,
    scanned: all.length,
    skipped: 0,
  };

  for (const booking of all) {
    const want = effectiveBookingStatus(
      { status: booking.status, checkIn: booking.checkIn, checkOut: booking.checkOut },
      today,
    );
    if (want === booking.status) continue;
    if (!isAdvanceTarget(want)) {
      result.skipped++;
      continue;
    }

    if (want === "ACTIVE") result.activated++;
    else if (want === "COMPLETED") result.completed++;
    else if (want === "EXPIRED") result.expired++;
    else result.deferred++;

    await storage.updateBooking(booking.id, { status: want });
    result.changed++;
  }

  return result;
}

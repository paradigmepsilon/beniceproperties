// server/lib/nextOpening.ts
// Pure "next opening" math for the public listings grid. Given the stays that
// block a property, compute the first date a guest could actually start a new
// stay — used to render "Next opening · <date>" on fully-booked cards.

import { addDays, parseISO } from "date-fns";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Day after an inclusive last-occupied date (lease endDate = last night). */
export function dayAfter(isoDate: string): string {
  return ymd(addDays(parseISO(isoDate), 1));
}

/**
 * STR next opening. `stays` are the property's non-cancelled STR bookings
 * (any with a checkOut on/after today — earlier ones can't block). A stay
 * blocks nights [checkIn, checkOut); the checkout day itself is bookable,
 * matching the overlap rule in server/lib/booking.ts (strHasConflict).
 *
 * Returns the end of the back-to-back chain covering `today`, or null when
 * the property is not occupied today (already bookable — no badge needed).
 */
export function strNextOpening(
  stays: Array<{ checkIn: string; checkOut: string | null }>,
  today: string,
): string | null {
  const spans = stays
    .filter((s): s is { checkIn: string; checkOut: string } => s.checkOut != null)
    .sort((a, b) => a.checkIn.localeCompare(b.checkIn));

  // ISO dates compare lexicographically, so plain string comparison is safe.
  let open: string | null = null;
  for (const s of spans) {
    if (open == null) {
      if (s.checkIn <= today && today < s.checkOut) open = s.checkOut;
    } else if (s.checkIn <= open && s.checkOut > open) {
      // Back-to-back (or overlapping) stay — the chain extends.
      open = s.checkOut;
    }
  }
  return open;
}

/**
 * Date-aware "from" price + availability for a co-living property's grid card.
 * Each entry is one AVAILABLE-status room paired with whether it is actually free
 * for the searched date range (from storage.isRoomAvailableForRange). The card
 * prices "from" the cheapest room a guest can actually book for those dates, so a
 * booked cheapest room yields the next cheapest FREE room's rate; when every room
 * is taken for the range, `fromWeeklyRent` is null and the card reads unavailable.
 *
 * Pure so it is unit-tested directly; the /api/properties handler pairs each room
 * with its availability and delegates the min/availability decision here. Rents
 * are decimal strings (schema `weekly_rent`); non-positive/unparseable are ignored.
 */
export function cheapestAvailableWeeklyRent(
  rooms: Array<{ weeklyRent: string; available: boolean }>,
): { fromWeeklyRent: string | null; available: boolean } {
  const rates = rooms
    .filter((r) => r.available)
    .map((r) => parseFloat(r.weeklyRent))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (rates.length === 0) return { fromWeeklyRent: null, available: false };
  return { fromWeeklyRent: String(Math.min(...rates)), available: true };
}

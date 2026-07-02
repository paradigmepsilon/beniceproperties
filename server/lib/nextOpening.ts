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

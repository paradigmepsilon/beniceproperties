// server/lib/nextOpening.ts
// Pure "next opening" math for the public listings grid. Given the stays that
// block a property, compute the first date a guest could actually start a new
// stay — used to render "Next opening · <date>" on fully-booked cards.

import { addDays, parseISO } from "date-fns";
import type { BusyRange } from "@shared/api-types";
import { daysUntil } from "@shared/dates";
import { MAX_LEASE_DAYS } from "@shared/schema";

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/**
 * How far ahead a co-living room must open for its property to read "Available"
 * on the date-blind grid card: two back-to-back maximum-term leases (2 × 90 =
 * 180 days). A room turning over from one full lease straight into another
 * always opens inside that window, so normal occupancy (Hutchens, OBC) keeps
 * its from-price; only a room held with no end in sight (an owner hold years
 * out) reads "Fully booked" instead of advertising a price nobody can book.
 */
export const COLIVING_OPENING_HORIZON_DAYS = 2 * MAX_LEASE_DAYS;

/**
 * First date on/after `from` not covered by any busy range. Ranges are half-open
 * (`end` = first free day, the AvailabilityResponse wire contract). Overlapping
 * and back-to-back ranges chain; a gap of even one night ends the chain.
 */
export function firstFreeDate(busy: Array<Pick<BusyRange, "start" | "end">>, from: string): string {
  const spans = [...busy].sort((a, b) => a.start.localeCompare(b.start));
  let free = from;
  for (const s of spans) {
    if (s.start <= free && s.end > free) free = s.end;
  }
  return free;
}

/**
 * Does this room have a bookable night within `horizonDays` of `today`?
 * Drives the date-blind "from $X / week" vs "Fully booked" decision on the grid.
 */
export function roomOpensWithin(
  busy: Array<Pick<BusyRange, "start" | "end">>,
  today: string,
  horizonDays: number = COLIVING_OPENING_HORIZON_DAYS,
): boolean {
  return daysUntil(firstFreeDate(busy, today), today) <= horizonDays;
}

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

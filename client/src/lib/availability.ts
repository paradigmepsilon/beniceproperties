// client/src/lib/availability.ts
// Pure helpers turning the server's busy ranges (AvailabilityResponse) into
// react-day-picker `disabled` matchers, plus a client-side range guard. The
// server sends every range half-open (`end` = first free day) — including
// co-living lease ranges, which the server normalizes from their INCLUSIVE
// stored endDate to exclusive before they ever reach the client (see
// server/lib/availability.ts). Every current caller (STR and co-living alike)
// passes `halfOpen: true`, so the checkout/end day of any busy range stays
// selectable as a new check-in. The `halfOpen` flag itself still supports the
// inclusive mode (`false`) for any range that genuinely is inclusive-end.

import { addDays, format, parseISO, subDays } from "date-fns";
import type { Matcher } from "react-day-picker";
import type { BusyRange } from "@shared/api-types";

/**
 * Build DayPicker `disabled` matchers: a floor before `minDate`, plus one
 * range matcher per busy span. When `halfOpen` (every current caller), the
 * last disabled day is `end - 1` (checkout day free); when `false`, `end`
 * itself is disabled (for a genuinely inclusive-end range).
 */
export function busyToDisabledMatchers(
  busy: BusyRange[],
  opts: { minDate: string; halfOpen: boolean },
): Matcher[] {
  const matchers: Matcher[] = [{ before: parseISO(opts.minDate) }];
  for (const r of busy) {
    const from = parseISO(r.start);
    const to = opts.halfOpen ? subDays(parseISO(r.end), 1) : parseISO(r.end);
    // A single-night half-open block ([d, d+1)) collapses to `from === to`.
    if (to >= from) matchers.push({ from, to });
  }
  return matchers;
}

/**
 * True if [checkIn, checkOut) overlaps any busy range — the belt-and-suspenders
 * guard on the Continue button (the calendar already prevents picking disabled
 * days, but react-day-picker can select a range spanning them). All comparisons
 * are on ISO `YYYY-MM-DD` strings (lexicographic = chronological).
 *
 * Busy ranges from the server are half-open [start, end); a stay
 * [checkIn, checkOut) hits one when checkIn < end && start < checkOut — every
 * current caller passes `halfOpen=true`. `halfOpen=false` treats `end` as
 * occupied instead (checkIn <= end && start < checkOut), for a genuinely
 * inclusive-end range.
 */
export function rangeHitsBusy(
  checkIn: string,
  checkOut: string,
  busy: BusyRange[],
  halfOpen: boolean,
): boolean {
  return busy.some((r) =>
    halfOpen ? checkIn < r.end && r.start < checkOut : checkIn <= r.end && r.start < checkOut,
  );
}

/**
 * Whether a selected [checkIn, checkOut) range is bookable — the single source of
 * truth for enabling a "Continue"/"Reserve" CTA. Returns false unless:
 *   - availability has actually loaded (`availReady`) — until then the busy set is
 *     unknown (defaults to []) and a booked range would falsely look free on first
 *     paint. This is the fix for the STR premature-enable bug.
 *   - both dates are set and form a real forward range (checkOut > checkIn), and
 *   - the range doesn't straddle any busy span (rangeHitsBusy).
 *
 * The server always re-validates on submit; this only governs the client CTA.
 */
export function datesBookable(
  availReady: boolean,
  checkIn: string,
  checkOut: string,
  busy: BusyRange[],
  halfOpen: boolean,
): boolean {
  if (!availReady) return false;
  if (!checkIn || !checkOut || checkOut <= checkIn) return false;
  return !rangeHitsBusy(checkIn, checkOut, busy, halfOpen);
}

/**
 * The earliest move-out a guest can actually pick for a given move-in, or null
 * when no valid stay starts there.
 *
 * Two things gate it: the product minimum (co-living is 7 nights; STR passes 0)
 * and the room's existing bookings. Because extending a checkout only ADDS
 * nights, if the shortest allowed stay already straddles a busy range then every
 * longer one does too — so there is no valid checkout from that check-in at all,
 * and we return null rather than a date the guest can't use.
 *
 * This exists because the minimum routinely pushes the first valid move-out into
 * the FOLLOWING month (pick Sep 29, the earliest is Oct 6). A single-month
 * calendar then renders every visible day disabled, which reads as a broken site.
 * Callers use this to scroll the calendar to the month that has real options and
 * to tell the guest the date they're looking for.
 */
export function earliestValidCheckout(
  checkIn: string,
  minNights: number,
  busy: BusyRange[],
  halfOpen: boolean,
): string | null {
  if (!checkIn) return null;
  // A range needs at least one night even when the product sets no minimum.
  const nights = Math.max(1, minNights);
  const candidate = format(addDays(parseISO(checkIn), nights), "yyyy-MM-dd");
  return rangeHitsBusy(checkIn, candidate, busy, halfOpen) ? null : candidate;
}

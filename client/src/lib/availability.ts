// client/src/lib/availability.ts
// Pure helpers turning the server's busy ranges (AvailabilityResponse) into
// react-day-picker `disabled` matchers, plus a client-side range guard. The
// server sends every range half-open (`end` = first free day). STR disables
// [start, end) (checkout day stays selectable as a new check-in); co-living
// rooms disable [start, end] inclusive (a lease occupies its end date) — the
// `halfOpen` flag switches between the two.

import { parseISO, subDays } from "date-fns";
import type { Matcher } from "react-day-picker";
import type { BusyRange } from "@shared/api-types";

/**
 * Build DayPicker `disabled` matchers: a floor before `minDate`, plus one
 * range matcher per busy span. When `halfOpen` (STR), the last disabled day is
 * `end - 1` (checkout day free); otherwise (co-living) `end` itself is disabled.
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
 * STR busy ranges are half-open [start, end); a stay [checkIn, checkOut) hits it
 * when checkIn < end && start < checkOut. For co-living (inclusive lease end),
 * the caller passes `halfOpen=false` and the range's inclusive end is treated as
 * occupied: checkIn <= end && start < checkOut.
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

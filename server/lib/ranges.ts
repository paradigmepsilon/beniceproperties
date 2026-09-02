// server/lib/ranges.ts
// =============================================================================
// One overlap check shared by every deconfliction path in this app. Bookings,
// external (Airbnb) blocks, and manual blocks all store a half-open range
// (endDate is the first FREE day, same as iCal DTEND). Leases store an
// INCLUSIVE endDate (a lease occupies its end date). Normalize every range to
// half-open [start, endExclusive) here, then compare — so a same-day turnover
// is free and an inclusive lease end correctly collides with a stay starting
// that day.
// =============================================================================
import { addDaysIso } from "@shared/dates";

export interface DateRange {
  start: string;
  end: string;
  endExclusive: boolean;
}

export function toHalfOpen(r: DateRange): { start: string; end: string } {
  return { start: r.start, end: r.endExclusive ? r.end : addDaysIso(r.end, 1) };
}

export function overlapsRange(a: DateRange, b: DateRange): boolean {
  const A = toHalfOpen(a),
    B = toHalfOpen(b);
  return A.start < B.end && B.start < A.end;
}

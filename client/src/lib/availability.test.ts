// client/src/lib/availability.test.ts
// Phase D — client matcher helpers: STR half-open vs co-living inclusive disabled
// days, and the range-overlap guard.

import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import { busyToDisabledMatchers, rangeHitsBusy, datesBookable } from "./availability";
import type { BusyRange } from "@shared/api-types";

const busy: BusyRange[] = [{ start: "2026-08-10", end: "2026-08-14", source: "external" }];

describe("busyToDisabledMatchers", () => {
  it("adds a floor before minDate", () => {
    const m = busyToDisabledMatchers([], { minDate: "2026-07-03", halfOpen: true });
    expect(m[0]).toEqual({ before: parseISO("2026-07-03") });
  });

  it("STR (half-open) disables [start, end-1] — checkout day stays free", () => {
    const m = busyToDisabledMatchers(busy, { minDate: "2026-07-03", halfOpen: true });
    // second matcher is the range; end normalized to end-1 (Aug 13)
    expect(m[1]).toEqual({ from: parseISO("2026-08-10"), to: parseISO("2026-08-13") });
  });

  it("co-living (inclusive) disables [start, end] — end day occupied", () => {
    const m = busyToDisabledMatchers(busy, { minDate: "2026-07-03", halfOpen: false });
    expect(m[1]).toEqual({ from: parseISO("2026-08-10"), to: parseISO("2026-08-14") });
  });
});

describe("rangeHitsBusy", () => {
  it("STR: a stay ending on the block start does NOT hit (half-open)", () => {
    // stay [2026-08-08, 2026-08-10) vs block [2026-08-10, 2026-08-14): checkIn < end && start < checkOut
    expect(rangeHitsBusy("2026-08-08", "2026-08-10", busy, true)).toBe(false);
  });
  it("STR: a stay checking in on the block's exclusive end does NOT hit", () => {
    expect(rangeHitsBusy("2026-08-14", "2026-08-16", busy, true)).toBe(false);
  });
  it("STR: a stay overlapping the block hits", () => {
    expect(rangeHitsBusy("2026-08-12", "2026-08-16", busy, true)).toBe(true);
  });
  it("co-living: checking in on the block's inclusive end DOES hit", () => {
    // inclusive end means Aug 14 is occupied → checkIn <= end
    expect(rangeHitsBusy("2026-08-14", "2026-08-16", busy, false)).toBe(true);
  });
});

describe("datesBookable — CTA gate", () => {
  // The STR premature-enable fix: until availability has loaded, the busy set is
  // unknown (defaults to []). A booked range must NOT read as bookable on first
  // paint just because the block hasn't arrived yet.
  it("is false while availability is still loading, even for an otherwise-open range", () => {
    expect(datesBookable(false, "2026-07-07", "2026-07-09", [], true)).toBe(false);
  });
  it("is false while loading even when a real block is already known", () => {
    expect(datesBookable(false, "2026-08-12", "2026-08-16", busy, true)).toBe(false);
  });
  it("is true once availability is ready and the range is clear", () => {
    expect(datesBookable(true, "2026-07-07", "2026-07-09", busy, true)).toBe(true);
  });
  it("is false once ready if the range straddles a booked block (STR half-open)", () => {
    expect(datesBookable(true, "2026-08-12", "2026-08-16", busy, true)).toBe(false);
  });
  it("is false once ready if the range straddles a booked block (co-living inclusive)", () => {
    // Aug 14 is occupied inclusively → a stay checking in Aug 14 is blocked.
    expect(datesBookable(true, "2026-08-14", "2026-08-16", busy, false)).toBe(false);
  });
  it("is false for a non-forward or incomplete range even when ready", () => {
    expect(datesBookable(true, "2026-07-09", "2026-07-07", [], true)).toBe(false); // backwards
    expect(datesBookable(true, "2026-07-07", "2026-07-07", [], true)).toBe(false); // same day
    expect(datesBookable(true, "2026-07-07", "", [], true)).toBe(false); // missing checkout
    expect(datesBookable(true, "", "", [], true)).toBe(false); // nothing picked
  });
});

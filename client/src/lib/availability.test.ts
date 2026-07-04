// client/src/lib/availability.test.ts
// Phase D — client matcher helpers: STR half-open vs co-living inclusive disabled
// days, and the range-overlap guard.

import { describe, it, expect } from "vitest";
import { parseISO } from "date-fns";
import { busyToDisabledMatchers, rangeHitsBusy } from "./availability";
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

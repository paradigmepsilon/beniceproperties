// scripts/recompute-kpi-snapshots.test.ts
// The recompute rewrites historical business figures, so the arithmetic that
// decides the new numbers is pinned here rather than trusted to a script that
// needs a database to exercise. The script itself never runs from a test — the
// isDirectRun guard keeps importing it side-effect free.
//
// The real production shapes are used as fixtures: 25/28 = 89.29% and
// 27/28 = 96.43% are literal rows from BNP's kpi_snapshots during the window
// the placeholder rooms were counted.

import { describe, it, expect } from "vitest";
import { correctSnapshot } from "./recompute-kpi-snapshots.mjs";

const PH = 22; // placeholder rooms live in production

describe("correctSnapshot — backing placeholder rooms out of a stored row", () => {
  it("recovers 3/6 = 50% from the real 25/28 = 89.29% row", () => {
    expect(correctSnapshot(25, 89.29, PH)).toMatchObject({
      total: 28,
      newOccupied: 3,
      newTotal: 6,
      newPct: 50,
    });
  });

  it("recovers 5/6 = 83.33% from the real 27/28 = 96.43% row", () => {
    expect(correctSnapshot(27, 96.43, PH)).toMatchObject({
      total: 28,
      newOccupied: 5,
      newTotal: 6,
      newPct: 83.33,
    });
  });

  it("agrees with the pre-placeholder rows, which is what validates the method", () => {
    // Snapshots taken before the market-test rooms existed stored a 6-room
    // denominator directly. Backing 22 out of a later row must land on that
    // same denominator, or the arithmetic is wrong.
    const corrected = correctSnapshot(27, 96.43, PH);
    expect(corrected.newTotal).toBe(6);
  });
});

describe("correctSnapshot — refuses rather than guesses", () => {
  it("skips a pre-placeholder row instead of corrupting it", () => {
    // 5/6 = 83.33% predates the placeholder rooms and is already correct.
    // Backing 22 out would give a negative total, so it must be left alone.
    const r = correctSnapshot(5, 83.33, PH);
    expect(r.skip).toMatch(/leaves a total of -16/);
    expect(r.newPct).toBeUndefined();
  });

  it("skips a zero-occupancy row, where the denominator is unrecoverable", () => {
    expect(correctSnapshot(0, 0, PH).skip).toMatch(/can't be recovered/);
  });

  it("skips when the implied total isn't a clean integer", () => {
    // 7 / 33% implies 21.21 rooms — the stored pair is inconsistent, so the
    // row can't be trusted enough to rewrite.
    expect(correctSnapshot(7, 33, PH).skip).toMatch(/isn't a clean integer/);
  });

  it("skips when more placeholder rooms are backed out than were occupied", () => {
    // 10/40 = 25%: the total survives (18) but the occupied count would go
    // negative, meaning the assumption 'all placeholders were occupied' fails.
    const r = correctSnapshot(10, 25, PH);
    expect(r.skip).toMatch(/leaves -12/);
  });

  it("skips non-numeric stored values", () => {
    expect(correctSnapshot(Number.NaN, 50, PH).skip).toMatch(/non-numeric/);
    expect(correctSnapshot(5, Number.NaN, PH).skip).toMatch(/non-numeric/);
  });

  it("never returns a corrected percentage above 100", () => {
    for (const [occ, pct] of [
      [25, 89.29],
      [27, 96.43],
      [28, 100],
    ] as const) {
      const r = correctSnapshot(occ, pct, PH);
      if (!r.skip) expect(r.newPct).toBeLessThanOrEqual(100);
    }
  });
});

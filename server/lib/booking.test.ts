// server/lib/booking.test.ts
// Phase 3 — STR quote uses the auto-selected rate tier. buildQuote is pure given
// a ResolvedBooking, so we test it directly (no storage needed). The tier math
// itself is covered in shared/rateSelection.test.ts.

import { describe, it, expect, vi } from "vitest";

// booking.ts imports ../storage, which throws at import time without DATABASE_URL.
// buildQuote is pure (no storage), but the import chain still needs storage stubbed.
vi.mock("../storage", () => ({ storage: {} }));

import { buildQuote, strBaseTotal, type ResolvedBooking } from "./booking";
import { calculateBreakdown } from "@shared/pricing";
import type { Property } from "@shared/schema";

// Minimal STR property fixture. Only the pricing fields strBaseTotal reads matter;
// the rest are cast away. Weekday fields default null (no per-weekday pricing).
function strProperty(over: Partial<Property>): Property {
  return {
    id: "p1",
    name: "Villa",
    type: "STR",
    basePrice: null,
    dailyRate: null,
    weeklyRate: null,
    monthlyRate: null,
    monPrice: null,
    tuePrice: null,
    wedPrice: null,
    thuPrice: null,
    friPrice: null,
    satPrice: null,
    sunPrice: null,
    ...over,
  } as Property;
}

function strResolved(over: Partial<ResolvedBooking>): ResolvedBooking {
  return {
    model: "STR",
    property: { id: "p1", name: "Villa", type: "STR" } as ResolvedBooking["property"],
    checkIn: "2026-07-01",
    checkOut: "2026-07-11",
    baseAmount: 800,
    cleaningFee: 0,
    nights: 10,
    rateTier: "WEEKLY",
    effectiveNightly: 80,
    ...over,
  };
}

describe("buildQuote — STR tier labelling + totals", () => {
  it("labels the stay line with the weekly tier and totals via calculateBreakdown", () => {
    const q = buildQuote(strResolved({}), "STRIPE");
    expect(q.dueNow.lines[0].label).toContain("weekly rate");
    expect(q.dueNow.lines[0].amount).toBe(800);
    const expected = calculateBreakdown({ baseAmount: 800, cleaningFee: 0, paymentMethod: "STRIPE" });
    expect(q.dueNow.total).toBe(expected.total); // surcharge still applies
  });

  it("monthly tier shows the monthly label", () => {
    const q = buildQuote(
      strResolved({ nights: 40, baseAmount: 3200, rateTier: "MONTHLY", effectiveNightly: 80 }),
      "ZELLE",
    );
    expect(q.dueNow.lines[0].label).toContain("monthly rate");
    expect(q.dueNow.total).toBe(3200); // no surcharge for ZELLE
  });

  it("daily tier shows no tier suffix", () => {
    const q = buildQuote(
      strResolved({ nights: 3, baseAmount: 300, rateTier: "DAILY", effectiveNightly: 100 }),
      "ZELLE",
    );
    expect(q.dueNow.lines[0].label).not.toContain("rate");
    expect(q.dueNow.lines[0].label).toContain("3 nights");
  });
});

describe("strBaseTotal — per-weekday pricing (DAILY tier only)", () => {
  // 2026-07-03 = Friday, +1 = Sat, +2 = Sun.
  const weekday = {
    monPrice: "120",
    tuePrice: "120",
    wedPrice: "120",
    thuPrice: "140",
    friPrice: "200",
    satPrice: "250",
    sunPrice: "140",
  };

  it("DAILY tier with weekday prices → sums each night's weekday price", () => {
    const r = strBaseTotal(
      strProperty({ basePrice: "100", ...weekday }),
      3, // Fri, Sat, Sun
      "2026-07-03",
    );
    expect(r.tier).toBe("DAILY");
    expect(r.baseAmount).toBe(590); // 200 + 250 + 140
    expect(r.effectiveNightly).toBeCloseTo(590 / 3, 2); // display average
  });

  it("DAILY tier with a null weekday falls back to dailyRate ?? basePrice for that night", () => {
    const r = strBaseTotal(
      strProperty({ dailyRate: "100", basePrice: "999", ...weekday, satPrice: null }),
      3,
      "2026-07-03",
    );
    // 200 (Fri) + 100 (Sat → dailyRate fallback) + 140 (Sun)
    expect(r.baseAmount).toBe(440);
  });

  it("DAILY tier with NO weekday prices → byte-identical to legacy nightly × n", () => {
    const r = strBaseTotal(strProperty({ dailyRate: "100" }), 3, "2026-07-03");
    expect(r.tier).toBe("DAILY");
    expect(r.baseAmount).toBe(300); // 100 × 3
    expect(r.effectiveNightly).toBe(100);
  });

  it("back-compat: only base_price set (no dailyRate, no weekday) → base_price × n", () => {
    const r = strBaseTotal(strProperty({ basePrice: "150" }), 3, "2026-07-03");
    expect(r.baseAmount).toBe(450); // 150 × 3
  });

  it("WEEKLY tier IGNORES weekday prices (scalar weekly rate)", () => {
    const r = strBaseTotal(
      strProperty({ weeklyRate: "560", ...weekday }), // weekday set but tier is WEEKLY
      10,
      "2026-07-03",
    );
    expect(r.tier).toBe("WEEKLY");
    expect(r.baseAmount).toBe(800); // (560 / 7) × 10, weekday prices not used
  });

  it("MONTHLY tier IGNORES weekday prices (scalar monthly rate)", () => {
    const r = strBaseTotal(
      strProperty({ monthlyRate: "2240", ...weekday }),
      40,
      "2026-07-03",
    );
    expect(r.tier).toBe("MONTHLY");
    expect(r.baseAmount).toBe(3200); // (2240 / 28) × 40
  });
});

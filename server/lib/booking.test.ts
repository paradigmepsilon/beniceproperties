// server/lib/booking.test.ts
// Phase 3 — STR quote uses the auto-selected rate tier. buildQuote is pure given
// a ResolvedBooking, so we test it directly (no storage needed). The tier math
// itself is covered in shared/rateSelection.test.ts.

import { describe, it, expect, vi } from "vitest";

// booking.ts imports ../storage, which throws at import time without DATABASE_URL.
// buildQuote is pure (no storage), but the import chain still needs storage stubbed.
vi.mock("../storage", () => ({ storage: {} }));

import { buildQuote, type ResolvedBooking } from "./booking";
import { calculateBreakdown } from "@shared/pricing";

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

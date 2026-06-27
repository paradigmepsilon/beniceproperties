// shared/pricing.test.ts
// Phase 1 — lock the canonical money contract: the number quoted = the number
// charged, surcharge is a visible line for STRIPE and dropped for CashApp/Zelle.

import { describe, it, expect } from "vitest";
import { calculateBreakdown, calculateWeeklyCharge, CREDIT_CARD_RATE } from "./pricing";

describe("calculateBreakdown", () => {
  it("adds a 3.5% surcharge for STRIPE", () => {
    const b = calculateBreakdown({ baseAmount: 100, paymentMethod: "STRIPE" });
    expect(b.subtotal).toBe(100);
    expect(b.surcharge).toBe(3.5);
    expect(b.total).toBe(103.5);
  });

  it("drops the surcharge for CASHAPP and ZELLE", () => {
    for (const m of ["CASHAPP", "ZELLE"] as const) {
      const b = calculateBreakdown({ baseAmount: 100, paymentMethod: m });
      expect(b.surcharge).toBe(0);
      expect(b.total).toBe(100);
    }
  });

  it("folds cleaning + extras − discount into the subtotal before surcharge", () => {
    const b = calculateBreakdown({
      baseAmount: 200,
      cleaningFee: 50,
      extrasTotal: 20,
      promoDiscount: 30,
      paymentMethod: "STRIPE",
    });
    expect(b.subtotal).toBe(240); // 200 + 50 + 20 − 30
    expect(b.surcharge).toBe(Math.round(240 * CREDIT_CARD_RATE * 100) / 100);
    expect(b.total).toBe(Math.round((240 + b.surcharge) * 100) / 100);
  });

  it("never lets the subtotal go below zero", () => {
    const b = calculateBreakdown({ baseAmount: 10, promoDiscount: 999, paymentMethod: "ZELLE" });
    expect(b.subtotal).toBe(0);
    expect(b.total).toBe(0);
  });
});

describe("calculateWeeklyCharge", () => {
  it("is rent-only and method-aware", () => {
    expect(calculateWeeklyCharge(250, "ZELLE").total).toBe(250);
    expect(calculateWeeklyCharge(250, "STRIPE").total).toBe(258.75); // 250 × 1.035
  });
});

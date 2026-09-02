import { describe, it, expect } from "vitest";
import { amountMatches, paidStripeTotal, refundEligibility } from "./adminRefund";

const stripePaid = (amount: string, surcharge = "0", stripeRef = "pi_test") => ({
  method: "STRIPE",
  status: "PAID",
  amount,
  surcharge,
  stripeRef,
});

describe("paidStripeTotal", () => {
  it("sums amount + surcharge across PAID Stripe rows", () => {
    expect(paidStripeTotal([stripePaid("100.00", "3.50"), stripePaid("50.00")])).toBeCloseTo(153.5);
  });

  // Coordinator-specified case: amount 350 + surcharge 12.25 -> 362.25.
  it("amount 350 + surcharge 12.25 refunds 362.25 (the full charged PaymentIntent, not bare amount)", () => {
    expect(paidStripeTotal([stripePaid("350", "12.25")])).toBeCloseTo(362.25);
  });

  it("ignores non-Stripe methods", () => {
    expect(
      paidStripeTotal([{ method: "CASHAPP", status: "PAID", amount: "100.00", surcharge: "0", stripeRef: null }]),
    ).toBe(0);
  });

  it("ignores non-PAID Stripe rows", () => {
    expect(
      paidStripeTotal([
        { method: "STRIPE", status: "PENDING", amount: "100.00", surcharge: "0", stripeRef: "pi_test" },
        { method: "STRIPE", status: "FAILED", amount: "50.00", surcharge: "0", stripeRef: "pi_test" },
      ]),
    ).toBe(0);
  });

  // Mirrors the server's own refund filter (cancelBooking skips a PAID
  // Stripe row with no stripeRef — there's nothing to actually refund).
  it("ignores a PAID Stripe row with no stripeRef", () => {
    expect(
      paidStripeTotal([{ method: "STRIPE", status: "PAID", amount: "100.00", surcharge: "0", stripeRef: null }]),
    ).toBe(0);
  });

  it("returns 0 for no payments", () => {
    expect(paidStripeTotal([])).toBe(0);
  });
});

describe("refundEligibility", () => {
  it("is eligible for a Stripe booking with a PAID Stripe payment", () => {
    const result = refundEligibility({ paymentMethod: "STRIPE" }, [stripePaid("275.00", "9.63")]);
    expect(result.eligible).toBe(true);
    expect(result.amount).toBeCloseTo(284.63);
  });

  it("is not eligible for a CashApp/Zelle booking even with a PAID row", () => {
    const result = refundEligibility({ paymentMethod: "ZELLE" }, [
      { method: "ZELLE", status: "PAID", amount: "275.00", surcharge: "0", stripeRef: null },
    ]);
    expect(result.eligible).toBe(false);
  });

  it("is not eligible for a Stripe booking with no PAID payment yet", () => {
    const result = refundEligibility({ paymentMethod: "STRIPE" }, [
      { method: "STRIPE", status: "PENDING", amount: "275.00", surcharge: "0", stripeRef: "pi_test" },
    ]);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  it("is not eligible for a PAID Stripe row missing a stripeRef", () => {
    const result = refundEligibility({ paymentMethod: "STRIPE" }, [
      { method: "STRIPE", status: "PAID", amount: "275.00", surcharge: "0", stripeRef: null },
    ]);
    expect(result.eligible).toBe(false);
    expect(result.amount).toBe(0);
  });

  it("is not eligible with no payments at all", () => {
    expect(refundEligibility({ paymentMethod: "STRIPE" }, []).eligible).toBe(false);
  });
});

describe("amountMatches", () => {
  it("matches the exact expected amount", () => {
    expect(amountMatches("284.63", 284.63)).toBe(true);
  });

  it("tolerates $, commas, and whitespace", () => {
    expect(amountMatches(" $1,284.63 ", 1284.63)).toBe(true);
  });

  it("rejects a mismatched amount", () => {
    expect(amountMatches("284.62", 284.63)).toBe(false);
  });

  it("rejects empty or non-numeric input", () => {
    expect(amountMatches("", 284.63)).toBe(false);
    expect(amountMatches("abc", 284.63)).toBe(false);
  });

  it("absorbs sub-half-cent floating point drift but not real fat-fingering", () => {
    expect(amountMatches("284.634999", 284.63)).toBe(true);
    expect(amountMatches("284.64", 284.63)).toBe(false);
  });
});

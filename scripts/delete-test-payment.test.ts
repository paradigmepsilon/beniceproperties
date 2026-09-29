// scripts/delete-test-payment.test.ts
// The one thing that must never happen in this script is deleting a live
// payment, so every refusal is pinned. The script itself never runs from a
// test — the isDirectRun guard keeps importing it side-effect free.

import { describe, it, expect } from "vitest";
import { canDeletePayment } from "./delete-test-payment.mjs";

// The real July test row, from docs/migration-backups/2026-09-09-payments.json.
const TEST_PAYMENT = {
  id: "3a799e57-0706-4115-a312-ed24a10f762e",
  method: "CASHAPP",
  status: "PENDING",
  amount: "435.00",
  paid_at: null,
  stripe_ref: null,
};
const CANCELLED = { status: "CANCELLED" };

const verdict = (over: Record<string, unknown> = {}, booking = CANCELLED, refundCount = 0) =>
  canDeletePayment({ payment: { ...TEST_PAYMENT, ...over }, booking, refundCount });

describe("canDeletePayment — the one row it should accept", () => {
  it("allows the July test row: pending, unpaid, CashApp, cancelled booking, no refunds", () => {
    expect(verdict()).toEqual({ ok: true });
  });
  it("allows ZELLE on the same terms", () => {
    expect(verdict({ method: "ZELLE" }).ok).toBe(true);
  });
});

describe("canDeletePayment — refuses anything that could be real money", () => {
  it("refuses a PAID payment", () => {
    const r = verdict({ status: "PAID" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/money may have moved/);
  });

  it("refuses a FAILED payment rather than assuming it is disposable", () => {
    expect(verdict({ status: "FAILED" }).ok).toBe(false);
  });

  it("refuses a Stripe payment — there is a real PaymentIntent behind it", () => {
    const r = verdict({ method: "STRIPE" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/PaymentIntent/);
  });

  it("refuses anything carrying a paid_at, even if still marked PENDING", () => {
    expect(verdict({ paid_at: "2026-07-05T17:12:00Z" }).ok).toBe(false);
  });

  it("refuses anything carrying a stripe_ref", () => {
    expect(verdict({ stripe_ref: "pi_123" }).ok).toBe(false);
  });

  it("refuses when the booking is still live", () => {
    for (const status of ["CONFIRMED", "ACTIVE", "PENDING_PAYMENT", "PENDING_APPROVAL", "COMPLETED"]) {
      const r = verdict({}, { status });
      expect(r.ok).toBe(false);
      expect(r.reason).toMatch(/live reservation/);
    }
  });

  it("refuses when a refund row references the payment (NOT NULL FK)", () => {
    const r = verdict({}, CANCELLED, 1);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/refund row/);
  });

  it("refuses a missing payment or a payment with no booking", () => {
    expect(canDeletePayment({ payment: null, booking: CANCELLED, refundCount: 0 }).ok).toBe(false);
    expect(canDeletePayment({ payment: TEST_PAYMENT, booking: null, refundCount: 0 }).ok).toBe(false);
  });
});

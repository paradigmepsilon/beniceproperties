// server/lib/bookingIntentGuard.test.ts
// POST /api/booking-intent/:id/contact rewrites metadata + receipt_email on a
// PaymentIntent by id. Only an OPEN short-stay intent this app created may be
// touched — never a lease deposit, a scheduled-rent charge, an already-paid
// intent, or some unrelated PI in the shared Stripe account.

import { describe, it, expect } from "vitest";
import { isOpenShortStayIntent } from "./bookingIntentGuard";

const base = {
  status: "requires_payment_method",
  metadata: { entity: "BNP", payment_kind: "BOOKING_DEPOSIT", lease_id: "null", reference: "BNP-AAAA-BBBB" },
};

describe("isOpenShortStayIntent", () => {
  it("accepts an unpaid short-stay intent tagged by this app", () => {
    expect(isOpenShortStayIntent(base)).toBe(true);
    expect(isOpenShortStayIntent({ ...base, status: "requires_confirmation" })).toBe(true);
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, entity: "TRAD" } })).toBe(true);
  });
  it("rejects an intent that has already succeeded, been canceled, or is processing", () => {
    for (const status of ["succeeded", "canceled", "processing", "requires_capture"]) {
      expect(isOpenShortStayIntent({ ...base, status })).toBe(false);
    }
  });
  it("rejects lease-scoped and non-booking intents", () => {
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, lease_id: "lease-1" } })).toBe(false);
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, payment_kind: "SCHEDULED_RENT" } })).toBe(false);
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, payment_kind: "FIRST_PAYMENT" } })).toBe(false);
  });
  it("rejects an intent with no metadata, an unknown entity, or no reference", () => {
    expect(isOpenShortStayIntent({ status: "requires_payment_method", metadata: {} })).toBe(false);
    expect(isOpenShortStayIntent({ status: "requires_payment_method", metadata: null })).toBe(false);
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, entity: "OTHER" } })).toBe(false);
    expect(isOpenShortStayIntent({ ...base, metadata: { ...base.metadata, reference: "" } })).toBe(false);
  });
});

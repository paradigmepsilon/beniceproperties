// server/lib/bookingIntents.test.ts
// Booking intents are the site's record of "a guest started checkout" — the
// one thing the payment-first model otherwise leaves no trace of. UO reads
// them to show what a guest did on the website and whether they booked.

import { describe, it, expect } from "vitest";
import { bookingIntentStatus, ABANDON_AFTER_MS } from "./bookingIntents";

const t0 = Date.parse("2026-09-04T12:00:00Z");
const intent = (over: Partial<{ guestEmail: string | null; createdAt: Date }> = {}) => ({
  guestEmail: null,
  createdAt: new Date(t0),
  ...over,
});

describe("bookingIntentStatus", () => {
  it("is PAID whenever a booking exists for the reference, regardless of age", () => {
    expect(bookingIntentStatus(intent(), { hasBooking: true, now: new Date(t0 + 10 * ABANDON_AFTER_MS) })).toBe("PAID");
  });
  it("is STARTED while fresh and no contact has been attached", () => {
    expect(bookingIntentStatus(intent(), { hasBooking: false, now: new Date(t0 + 1000) })).toBe("STARTED");
  });
  it("is CONTACT_ADDED once the guest entered their details but has not paid", () => {
    expect(bookingIntentStatus(intent({ guestEmail: "g@example.com" }), { hasBooking: false, now: new Date(t0 + 1000) })).toBe("CONTACT_ADDED");
  });
  it("is ABANDONED once the intent is older than the abandon window and unpaid", () => {
    expect(bookingIntentStatus(intent({ guestEmail: "g@example.com" }), { hasBooking: false, now: new Date(t0 + ABANDON_AFTER_MS + 1) })).toBe("ABANDONED");
    expect(bookingIntentStatus(intent(), { hasBooking: false, now: new Date(t0 + ABANDON_AFTER_MS + 1) })).toBe("ABANDONED");
  });
});

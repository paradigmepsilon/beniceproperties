// shared/leaseHold.test.ts
// Owner rule (2026-09-08): "A room should only be on hold if a deposit was made."
// Before this, a lease blocked its room from the instant the row was created —
// before signature, before any money — and nothing ever released it, so an
// abandoned checkout could kill a room for the full 90-day term.

import { describe, it, expect } from "vitest";
import { leaseHoldsRoom, CHECKOUT_HOLD_MINUTES } from "./schema";

const NOW = new Date("2026-07-01T12:00:00Z");
const minsAgo = (m: number) => new Date(NOW.getTime() - m * 60_000);

describe("leaseHoldsRoom — deposit paid", () => {
  it("holds through PENDING_VERIFICATION and ACTIVE", () => {
    for (const status of ["PENDING_VERIFICATION", "ACTIVE"]) {
      expect(
        leaseHoldsRoom({ status, depositStatus: "PAID", createdAt: minsAgo(100_000) }, NOW),
      ).toBe(true);
    }
  });

  it("does not hold once terminal, however the lease ended", () => {
    for (const status of ["COMPLETED", "TERMINATED", "DEFAULTED"]) {
      expect(leaseHoldsRoom({ status, depositStatus: "PAID", createdAt: NOW }, NOW)).toBe(false);
    }
  });
});

describe("leaseHoldsRoom — no deposit", () => {
  it("holds briefly so a guest cannot lose the room mid-checkout", () => {
    expect(
      leaseHoldsRoom(
        { status: "PENDING_FIRST_PAYMENT", depositStatus: "PENDING", createdAt: minsAgo(5) },
        NOW,
      ),
    ).toBe(true);
  });

  it("STOPS holding once the checkout window lapses — the 90-day leak", () => {
    for (const status of ["DRAFT", "PENDING_SIGNATURE", "PENDING_FIRST_PAYMENT"]) {
      expect(
        leaseHoldsRoom(
          { status, depositStatus: "PENDING", createdAt: minsAgo(CHECKOUT_HOLD_MINUTES + 1) },
          NOW,
        ),
        `${status} still holds the room after the checkout window`,
      ).toBe(false);
    }
  });

  it("a signed-but-unpaid lease does not hold the room indefinitely", () => {
    // The real leak: guest signs, never pays the deposit, room dead for 90 days.
    expect(
      leaseHoldsRoom(
        { status: "PENDING_FIRST_PAYMENT", depositStatus: "PENDING", createdAt: minsAgo(60 * 24) },
        NOW,
      ),
    ).toBe(false);
  });

  it("treats a missing createdAt as not holding rather than holding forever", () => {
    expect(
      leaseHoldsRoom({ status: "DRAFT", depositStatus: "PENDING", createdAt: null }, NOW),
    ).toBe(false);
  });

  it("accepts an ISO string createdAt (JSON round-trip)", () => {
    expect(
      leaseHoldsRoom(
        { status: "DRAFT", depositStatus: "PENDING", createdAt: minsAgo(5).toISOString() },
        NOW,
      ),
    ).toBe(true);
  });
});

// server/storage.gate.test.ts
// The gate storage methods need a live Postgres, so the properties that matter
// are pinned by reading the source — the same technique nextOpening.test.ts uses
// for its availability filters. Each assertion below corresponds to a way a
// paid guest could be silently mishandled.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const src = readFileSync(new URL("./storage.ts", import.meta.url), "utf8");

/** The body of a named async method, up to the next method at the same indent. */
function methodBody(name: string): string {
  const start = src.indexOf(`async ${name}(`);
  expect(start, `${name} not found`).toBeGreaterThan(-1);
  const rest = src.slice(start);
  const end = rest.indexOf("\n  async ", 1);
  return end === -1 ? rest : rest.slice(0, end);
}

describe("staff can see a paid-but-unapproved booking", () => {
  // A gated guest has PAID and is holding dates. If they are missing from the
  // default actionable list, staff cannot message them and the booking is
  // invisible everywhere except the approval queue.
  it("getBookingsWithGuest includes PENDING_APPROVAL by default", () => {
    const body = methodBody("getBookingsWithGuest");
    expect(body).toContain('opts?.statuses ?? ["PENDING_APPROVAL", "CONFIRMED", "ACTIVE", "CONFLICT"]');
  });
});

describe("the gate token stays stable across Stripe retries", () => {
  // The webhook that creates the gate runs on EVERY Stripe retry. A fresh token
  // on the second run would dead-link the email already sent to the guest.
  it("ensureBookingGate uses onConflictDoNothing, never an overwrite", () => {
    const body = methodBody("ensureBookingGate");
    expect(body).toContain("onConflictDoNothing");
    expect(body).not.toContain("onConflictDoUpdate");
    expect(body).not.toContain(".update(");
  });
});

describe("the ghost sweep can only ever see guests who owe us something", () => {
  // Structural suppression: a guest who submitted both documents at hour 2 and
  // is waiting on an admin at hour 73 must be excluded by the QUERY, so no
  // ordering mistake inside the sweep can auto-decline and refund them.
  it("getStaysAwaitingDocs excludes approved and both-documents-in stays in SQL", () => {
    const body = methodBody("getStaysAwaitingDocs");
    expect(body).toContain('eq(bookings.status, "PENDING_APPROVAL")');
    expect(body).toContain("isNull(bookingGate.approvedAt)");
    expect(body).toContain("isNull(bookingGate.agreementSignedAt)");
    expect(body).toContain('notInArray(bookingGate.verificationStatus, ["PENDING_REVIEW", "APPROVED"])');
    // `or` — outstanding means EITHER document missing, not both.
    expect(body).toContain("or(");
  });
});

describe("checkout reminders never fire on an open-ended stay", () => {
  // bookings.check_out is nullable for open-ended co-living. Filtering it in SQL
  // (not in the loop) keeps the window an index scan and makes the null case
  // impossible rather than merely handled.
  it("getStaysCheckingOutBetween requires a non-null check_out and bounds the window", () => {
    const body = methodBody("getStaysCheckingOutBetween");
    expect(body).toContain("IS NOT NULL");
    expect(body).toContain("gte(bookings.checkOut, from)");
    expect(body).toContain("lte(bookings.checkOut, to)");
  });

  it("both sweep windows only consider live stays", () => {
    for (const name of ["getStaysCheckingOutBetween", "getStaysCheckingInBetween"]) {
      expect(methodBody(name), name).toContain('inArray(bookings.status, ["ACTIVE", "CONFIRMED"])');
    }
  });
});

describe("one Stripe refund is recorded exactly once", () => {
  // The Stripe idempotency key expires after 24h and the sweep retries daily, so
  // the UNIQUE index is the real guarantee — this method must lean on it rather
  // than checking-then-inserting.
  it("recordPaymentRefund defers to the unique index and reports a duplicate as null", () => {
    const body = methodBody("recordPaymentRefund");
    expect(body).toContain("onConflictDoNothing");
    expect(body).toContain("paymentRefunds.stripeRefundId");
    expect(body).toContain("return row ?? null");
  });
});

describe("access info is never written blind", () => {
  it.each(["upsertPropertyAccessInfo", "upsertRoomAccessInfo"])(
    "%s records who changed it",
    (name) => {
      const body = methodBody(name);
      expect(body).toContain("updatedBy: actor");
      expect(body).toContain("onConflictDoUpdate");
    },
  );
});

// server/lib/escalationDedupe.test.ts
import { describe, it, expect } from "vitest";
import { escalationDedupeMatch } from "./escalationDedupe";

describe("escalationDedupeMatch", () => {
  it("lease-scoped: matches same lease + same installment only", () => {
    const incoming = { leaseId: "l1", bookingId: null, scheduleSeq: 2 };
    expect(
      escalationDedupeMatch({ leaseId: "l1", bookingId: null, scheduleSeq: 2 }, incoming),
    ).toBe(true);
    expect(
      escalationDedupeMatch({ leaseId: "l1", bookingId: null, scheduleSeq: 3 }, incoming),
    ).toBe(false);
    expect(
      escalationDedupeMatch({ leaseId: "l2", bookingId: null, scheduleSeq: 2 }, incoming),
    ).toBe(false);
  });

  it("booking-scoped: matches any OPEN row for the same booking regardless of scheduleSeq", () => {
    const incoming = { leaseId: null, bookingId: "b1", scheduleSeq: null };
    expect(
      escalationDedupeMatch({ leaseId: null, bookingId: "b1", scheduleSeq: 9 }, incoming),
    ).toBe(true);
    expect(
      escalationDedupeMatch({ leaseId: null, bookingId: "b2", scheduleSeq: null }, incoming),
    ).toBe(false);
  });

  it("unscoped: matches another unscoped row with the same scheduleSeq", () => {
    const incoming = { leaseId: null, bookingId: null, scheduleSeq: 20260902 };
    expect(
      escalationDedupeMatch({ leaseId: null, bookingId: null, scheduleSeq: 20260902 }, incoming),
    ).toBe(true);
  });

  it("unscoped: does NOT match a lease-scoped or booking-scoped row sharing the same scheduleSeq (the bug this fixes)", () => {
    const incoming = { leaseId: null, bookingId: null, scheduleSeq: 20260902 };
    expect(
      escalationDedupeMatch({ leaseId: "l1", bookingId: null, scheduleSeq: 20260902 }, incoming),
    ).toBe(false);
    expect(
      escalationDedupeMatch({ leaseId: null, bookingId: "b1", scheduleSeq: 20260902 }, incoming),
    ).toBe(false);
  });

  it("unscoped: does not match a different scheduleSeq", () => {
    const incoming = { leaseId: null, bookingId: null, scheduleSeq: 20260902 };
    expect(
      escalationDedupeMatch({ leaseId: null, bookingId: null, scheduleSeq: 20260901 }, incoming),
    ).toBe(false);
  });
});

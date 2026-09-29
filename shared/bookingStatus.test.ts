// shared/bookingStatus.test.ts
// The truth table for what a booking's status should be. This function decides
// what a daily job WRITES to production rows, so every branch is pinned —
// especially the ones that must NOT move.

import { describe, it, expect } from "vitest";
import { effectiveBookingStatus, bookingStatusNeedsChange } from "./bookingStatus";

const TODAY = "2026-09-28";
const at = (status: string, checkIn: string, checkOut: string | null = null) =>
  effectiveBookingStatus({ status, checkIn, checkOut }, TODAY);

describe("effectiveBookingStatus — ACTIVE means happening right now", () => {
  it("promotes a CONFIRMED stay to ACTIVE on its check-in day", () => {
    expect(at("CONFIRMED", "2026-09-28", "2026-10-05")).toBe("ACTIVE");
  });

  it("keeps a stay ACTIVE through its middle", () => {
    expect(at("ACTIVE", "2026-09-20", "2026-10-05")).toBe("ACTIVE");
    expect(at("CONFIRMED", "2026-09-20", "2026-10-05")).toBe("ACTIVE");
  });

  it("demotes a future stay wrongly marked ACTIVE back to CONFIRMED", () => {
    // This is the pre-existing bug: every paid co-living booking was written
    // ACTIVE at payment, months before arrival.
    expect(at("ACTIVE", "2027-03-01", "2027-03-08")).toBe("CONFIRMED");
  });

  it("leaves a genuinely future CONFIRMED stay alone", () => {
    expect(at("CONFIRMED", "2026-10-05", "2026-10-08")).toBe("CONFIRMED");
  });
});

describe("effectiveBookingStatus — COMPLETED on checkout", () => {
  it("completes a stay on its check-out day, which is exclusive", () => {
    // The guest leaves on the morning of checkOut — the same half-open rule
    // the availability and occupancy queries use.
    expect(at("ACTIVE", "2026-09-20", "2026-09-28")).toBe("COMPLETED");
  });

  it("completes a past stay from either live status", () => {
    expect(at("ACTIVE", "2026-08-01", "2026-08-10")).toBe("COMPLETED");
    expect(at("CONFIRMED", "2026-08-01", "2026-08-10")).toBe("COMPLETED");
  });

  it("stays ACTIVE on the last night", () => {
    expect(at("ACTIVE", "2026-09-20", "2026-09-29")).toBe("ACTIVE");
  });

  it("never reopens a COMPLETED stay, even if the dates say otherwise", () => {
    expect(at("COMPLETED", "2027-01-01", "2027-01-05")).toBe("COMPLETED");
  });
});

describe("effectiveBookingStatus — open-ended co-living", () => {
  it("goes ACTIVE once it has started and never completes", () => {
    expect(at("CONFIRMED", "2026-09-01", null)).toBe("ACTIVE");
    expect(at("ACTIVE", "2026-01-01", null)).toBe("ACTIVE");
  });

  it("is still CONFIRMED before it starts", () => {
    expect(at("CONFIRMED", "2026-12-01", null)).toBe("CONFIRMED");
  });
});

describe("effectiveBookingStatus — unpaid bookings expire", () => {
  it("expires a PENDING_PAYMENT whose check-in has passed", () => {
    // Everything must be paid before check-in, so this can only be abandoned.
    expect(at("PENDING_PAYMENT", "2026-09-01", "2026-09-04")).toBe("EXPIRED");
  });

  it("leaves a PENDING_PAYMENT whose check-in is still ahead", () => {
    expect(at("PENDING_PAYMENT", "2026-12-01", "2026-12-04")).toBe("PENDING_PAYMENT");
  });

  it("does not expire one on its check-in day — the guest could still pay and arrive", () => {
    expect(at("PENDING_PAYMENT", "2026-09-28", "2026-10-01")).toBe("PENDING_PAYMENT");
  });

  it("never un-expires", () => {
    expect(at("EXPIRED", "2027-01-01", "2027-01-05")).toBe("EXPIRED");
  });
});

describe("effectiveBookingStatus — statuses it must never touch", () => {
  it("leaves PENDING_APPROVAL alone no matter the dates", () => {
    // These are PAID. The gate's ghost sweep auto-declines AND REFUNDS them
    // after 72h of silence; expiring one here would strand the guest's money
    // and race that refund.
    expect(at("PENDING_APPROVAL", "2026-01-01", "2026-01-08")).toBe("PENDING_APPROVAL");
    expect(at("PENDING_APPROVAL", "2026-09-28", "2026-10-05")).toBe("PENDING_APPROVAL");
    expect(at("PENDING_APPROVAL", "2027-06-01", "2027-06-08")).toBe("PENDING_APPROVAL");
  });

  it("leaves CANCELLED and CONFLICT alone no matter the dates", () => {
    for (const s of ["CANCELLED", "CONFLICT"]) {
      expect(at(s, "2026-01-01", "2026-01-08")).toBe(s);
      expect(at(s, "2026-09-20", "2026-10-05")).toBe(s);
      expect(at(s, "2027-06-01", "2027-06-08")).toBe(s);
    }
  });

  it("leaves an unrecognised status alone rather than guessing", () => {
    expect(at("SOMETHING_NEW", "2026-01-01", "2026-01-08")).toBe("SOMETHING_NEW");
  });
});

describe("effectiveBookingStatus — idempotence", () => {
  it("is a fixed point: running it on its own output changes nothing", () => {
    // The job re-runs daily; a second pass must be a no-op or it churns rows.
    const cases: Array<[string, string, string | null]> = [
      ["CONFIRMED", "2026-09-20", "2026-10-05"],
      ["ACTIVE", "2027-03-01", "2027-03-08"],
      ["ACTIVE", "2026-08-01", "2026-08-10"],
      ["PENDING_PAYMENT", "2026-09-01", "2026-09-04"],
      ["CONFIRMED", "2026-09-01", null],
      ["PENDING_APPROVAL", "2026-01-01", "2026-01-08"],
    ];
    for (const [status, ci, co] of cases) {
      const once = effectiveBookingStatus({ status, checkIn: ci, checkOut: co }, TODAY);
      const twice = effectiveBookingStatus({ status: once, checkIn: ci, checkOut: co }, TODAY);
      expect(twice).toBe(once);
    }
  });
});

describe("bookingStatusNeedsChange", () => {
  it("is true only when the status would actually move", () => {
    expect(bookingStatusNeedsChange({ status: "ACTIVE", checkIn: "2027-03-01", checkOut: "2027-03-08" }, TODAY)).toBe(true);
    expect(bookingStatusNeedsChange({ status: "CONFIRMED", checkIn: "2027-03-01", checkOut: "2027-03-08" }, TODAY)).toBe(false);
    expect(bookingStatusNeedsChange({ status: "PENDING_APPROVAL", checkIn: "2026-01-01", checkOut: "2026-01-08" }, TODAY)).toBe(false);
  });
});

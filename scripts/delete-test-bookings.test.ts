// scripts/delete-test-bookings.test.ts
// The guard on an irreversible delete from money tables. The case that matters
// most is the third describe block: three real guests look exactly like test
// data, and a plausible predicate would have deleted them.

import { describe, it, expect } from "vitest";
import {
  canDeleteBooking,
  isoDate,
  TEST_REFERENCES,
  NEVER_DELETE,
  LAUNCH_WEEK_BEFORE,
} from "./delete-test-bookings.mjs";

const TODAY = "2026-09-28";

const testBooking = (over: Record<string, unknown> = {}) => ({
  id: "b1",
  reference: "BNP-FK9E-EHDV",
  status: "PENDING_PAYMENT",
  check_in: "2026-08-10",
  check_out: "2026-08-13",
  created_at: "2026-07-04 21:17:55",
  ...over,
});

const verdict = (over: Record<string, unknown> = {}) =>
  canDeleteBooking({ booking: testBooking(over), today: TODAY });

describe("the lists themselves", () => {
  it("covers the eleven launch-week bookings and nothing more", () => {
    expect(TEST_REFERENCES).toHaveLength(11);
    expect(new Set(TEST_REFERENCES).size).toBe(11);
  });

  it("never lets a protected reference appear on the delete list", () => {
    // If someone ever pastes one in, this fails before production does.
    for (const ref of NEVER_DELETE) expect(TEST_REFERENCES).not.toContain(ref);
  });
});

describe("canDeleteBooking — accepts the launch-week QA rows", () => {
  it("allows a listed booking created inside the window", () => {
    expect(verdict()).toEqual({ ok: true });
  });

  it("allows the one carrying a PAID Stripe charge, per the owner's decision", () => {
    expect(
      verdict({ reference: "BNP-9WTA-NNYK", status: "CONFIRMED", created_at: "2026-07-04 21:26:55" }).ok,
    ).toBe(true);
  });

  it("allows an already-CANCELLED test row", () => {
    expect(verdict({ reference: "BNP-2548-YP52", status: "CANCELLED" }).ok).toBe(true);
  });
});

describe("canDeleteBooking — the three real guests that look like test data", () => {
  // Created seconds apart with identical totals, because a BACKFILL SCRIPT
  // wrote them. The guests were physically in their rooms.
  it.each(NEVER_DELETE)("refuses %s even if it somehow reaches the predicate", (ref) => {
    const r = canDeleteBooking({
      booking: testBooking({ reference: ref, created_at: "2026-07-04 21:17:55" }),
      today: TODAY,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/REAL GUEST/);
  });

  it("refuses them before any other check, including the date window", () => {
    // The protected check must come first: these have a backfill timestamp,
    // so a window check alone could pass them.
    const r = canDeleteBooking({
      booking: testBooking({ reference: NEVER_DELETE[0], created_at: "2026-07-01 00:00:00" }),
      today: TODAY,
    });
    expect(r.reason).toMatch(/REAL GUEST/);
  });
});

describe("canDeleteBooking — refuses anything else", () => {
  it("refuses a reference that is not on the list", () => {
    const r = verdict({ reference: "BNP-REAL-0001" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/not on the test-booking list/);
  });

  it("refuses a listed reference created outside the launch week", () => {
    // Guards against the reference being reused, or the list going stale.
    const r = verdict({ created_at: "2026-09-20 10:00:00" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/outside the launch-week window/);
  });

  it("refuses an ACTIVE booking — someone could be in the room", () => {
    const r = verdict({ status: "ACTIVE" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/ACTIVE/);
  });

  it("refuses a stay that covers today, whatever its status", () => {
    const r = verdict({ status: "CONFIRMED", check_in: "2026-09-20", check_out: "2026-10-05" });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/covers today/);
  });

  it("refuses a missing booking", () => {
    expect(canDeleteBooking({ booking: null, today: TODAY }).ok).toBe(false);
  });

  it("handles a Date created_at, as the driver returns", () => {
    expect(verdict({ created_at: new Date("2026-07-04T21:17:55Z") }).ok).toBe(true);
    expect(verdict({ created_at: new Date("2026-09-20T10:00:00Z") }).ok).toBe(false);
  });

  it("uses the documented window boundary", () => {
    expect(LAUNCH_WEEK_BEFORE).toBe("2026-07-06");
    expect(verdict({ created_at: "2026-07-05 23:59:59" }).ok).toBe(true);
    expect(verdict({ created_at: "2026-07-06 00:00:01" }).ok).toBe(false);
  });
});

describe("isoDate", () => {
  it("normalises a Date and a string alike", () => {
    expect(isoDate(new Date("2026-08-10T04:00:00.000Z"))).toBe("2026-08-10");
    expect(isoDate("2026-08-10")).toBe("2026-08-10");
    expect(isoDate(null)).toBeNull();
  });
});

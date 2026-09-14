// server/lib/nextOpening.test.ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  dayAfter,
  strNextOpening,
  cheapestAvailableWeeklyRent,
  firstFreeDate,
  roomOpensWithin,
  COLIVING_OPENING_HORIZON_DAYS,
} from "./nextOpening";

describe("firstFreeDate", () => {
  const today = "2026-09-14";

  it("is today when nothing busy covers today", () => {
    expect(firstFreeDate([], today)).toBe(today);
    expect(firstFreeDate([{ start: "2026-10-01", end: "2026-10-08" }], today)).toBe(today);
    // A range that ended yesterday (exclusive end == today) does not cover today.
    expect(firstFreeDate([{ start: "2026-09-01", end: "2026-09-14" }], today)).toBe(today);
  });

  it("is the exclusive end of the range covering today", () => {
    expect(firstFreeDate([{ start: "2026-09-10", end: "2026-09-20" }], today)).toBe("2026-09-20");
  });

  it("chains back-to-back and overlapping ranges, regardless of input order", () => {
    const busy = [
      { start: "2026-09-25", end: "2026-10-05" }, // starts after the gap — not part of the chain
      { start: "2026-09-18", end: "2026-09-22" }, // overlaps the first
      { start: "2026-09-10", end: "2026-09-20" }, // covers today
      { start: "2026-09-22", end: "2026-09-24" }, // back-to-back with the second
    ];
    expect(firstFreeDate(busy, today)).toBe("2026-09-24");
  });
});

describe("roomOpensWithin", () => {
  const today = "2026-09-14";

  it("an unblocked room opens today", () => {
    expect(roomOpensWithin([], today)).toBe(true);
  });

  it("two back-to-back max-term leases starting today still count (the horizon = 2 x the max term)", () => {
    expect(COLIVING_OPENING_HORIZON_DAYS).toBe(180);
    // 90 inclusive days from 09-14 ends 12-12 (exclusive 12-13); a second 90-day
    // lease 12-13 → 03-12 (exclusive 03-13) = day 180.
    const chain = [
      { start: "2026-09-14", end: "2026-12-13" },
      { start: "2026-12-13", end: "2027-03-13" },
    ];
    expect(roomOpensWithin(chain, today)).toBe(true);
    // A single lease, or a hold of a few months, obviously counts too.
    expect(roomOpensWithin([{ start: "2026-09-14", end: "2026-12-31" }], today)).toBe(true);
  });

  it("a room held far into the future does not", () => {
    expect(roomOpensWithin([{ start: "2026-09-14", end: "2028-01-01" }], today)).toBe(false);
    // Just past the horizon (day 181).
    expect(roomOpensWithin([{ start: "2026-09-14", end: "2027-03-14" }], today)).toBe(false);
  });

  it("honors a custom horizon", () => {
    expect(roomOpensWithin([{ start: "2026-09-14", end: "2026-09-20" }], today, 3)).toBe(false);
    expect(roomOpensWithin([{ start: "2026-09-14", end: "2026-09-17" }], today, 3)).toBe(true);
  });
});

describe("dayAfter", () => {
  it("returns the day after an inclusive end date", () => {
    expect(dayAfter("2026-08-13")).toBe("2026-08-14");
  });

  it("rolls over month and year boundaries", () => {
    expect(dayAfter("2026-08-31")).toBe("2026-09-01");
    expect(dayAfter("2026-12-31")).toBe("2027-01-01");
  });
});

describe("strNextOpening", () => {
  const today = "2026-07-02";

  it("returns null when nothing blocks today", () => {
    expect(strNextOpening([], today)).toBeNull();
    // Future booking only — property is bookable now.
    expect(
      strNextOpening([{ checkIn: "2026-07-10", checkOut: "2026-07-14" }], today),
    ).toBeNull();
    // Past booking only.
    expect(
      strNextOpening([{ checkIn: "2026-06-20", checkOut: "2026-06-25" }], today),
    ).toBeNull();
  });

  it("returns the checkout of a single stay spanning today", () => {
    expect(
      strNextOpening([{ checkIn: "2026-06-30", checkOut: "2026-07-05" }], today),
    ).toBe("2026-07-05");
  });

  it("treats checkout day as bookable (stay ending today does not block)", () => {
    expect(
      strNextOpening([{ checkIn: "2026-06-28", checkOut: "2026-07-02" }], today),
    ).toBeNull();
  });

  it("treats check-in today as blocking", () => {
    expect(
      strNextOpening([{ checkIn: "2026-07-02", checkOut: "2026-07-06" }], today),
    ).toBe("2026-07-06");
  });

  it("walks a back-to-back chain to the first gap", () => {
    expect(
      strNextOpening(
        [
          { checkIn: "2026-07-06", checkOut: "2026-07-09" }, // back-to-back
          { checkIn: "2026-06-30", checkOut: "2026-07-06" }, // spans today (unsorted input)
          { checkIn: "2026-07-10", checkOut: "2026-07-15" }, // gap on the 9th — not part of the chain
        ],
        today,
      ),
    ).toBe("2026-07-09");
  });

  it("extends through overlapping stays", () => {
    expect(
      strNextOpening(
        [
          { checkIn: "2026-07-01", checkOut: "2026-07-04" },
          { checkIn: "2026-07-03", checkOut: "2026-07-08" },
        ],
        today,
      ),
    ).toBe("2026-07-08");
  });

  it("ignores open-ended stays (null checkOut)", () => {
    expect(
      strNextOpening(
        [
          { checkIn: "2026-06-30", checkOut: null },
          { checkIn: "2026-07-01", checkOut: "2026-07-05" },
        ],
        today,
      ),
    ).toBe("2026-07-05");
  });
});

describe("cheapestAvailableWeeklyRent — date-aware from-price", () => {
  it("prices from the cheapest room when all are free", () => {
    const r = cheapestAvailableWeeklyRent([
      { weeklyRent: "300.00", available: true },
      { weeklyRent: "325.00", available: true },
      { weeklyRent: "350.00", available: true },
    ]);
    expect(r).toEqual({ fromWeeklyRent: "300", available: true });
  });

  it("skips a booked cheapest room → next cheapest FREE room sets the price", () => {
    // The $300 room is taken for the range; the next open room is $325.
    const r = cheapestAvailableWeeklyRent([
      { weeklyRent: "300.00", available: false },
      { weeklyRent: "325.00", available: true },
      { weeklyRent: "350.00", available: true },
    ]);
    expect(r).toEqual({ fromWeeklyRent: "325", available: true });
  });

  it("reports unavailable (null price) when every room is booked for the range", () => {
    const r = cheapestAvailableWeeklyRent([
      { weeklyRent: "300.00", available: false },
      { weeklyRent: "350.00", available: false },
    ]);
    expect(r).toEqual({ fromWeeklyRent: null, available: false });
  });

  it("reports unavailable for a property with no rooms", () => {
    expect(cheapestAvailableWeeklyRent([])).toEqual({ fromWeeklyRent: null, available: false });
  });

  it("ignores non-positive or unparseable rents", () => {
    const r = cheapestAvailableWeeklyRent([
      { weeklyRent: "0.00", available: true },
      { weeklyRent: "not-a-number", available: true },
      { weeklyRent: "400.00", available: true },
    ]);
    expect(r).toEqual({ fromWeeklyRent: "400", available: true });
  });
});

// strNextOpening is pure and receives stays with no status field, so the
// CANCELLED/CONFLICT exemption has to hold one layer up, in the query that
// feeds it. A CONFLICT booking that reached this function would paint a
// "Next opening" badge over dates that are actually for sale.
describe("the stays feeding strNextOpening exclude non-blocking bookings", () => {
  it("getStrBookingsEndingOnOrAfter filters NON_BLOCKING_BOOKING_STATUSES", () => {
    const storageSrc = readFileSync(new URL("../storage.ts", import.meta.url), "utf8");
    const fn = storageSrc.slice(storageSrc.indexOf("async getStrBookingsEndingOnOrAfter"));
    expect(fn.slice(0, 900)).toContain("notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES])");
  });

  it("getStrBookingsForProperty filters NON_BLOCKING_BOOKING_STATUSES", () => {
    const storageSrc = readFileSync(new URL("../storage.ts", import.meta.url), "utf8");
    const fn = storageSrc.slice(storageSrc.indexOf("async getStrBookingsForProperty"));
    expect(fn.slice(0, 900)).toContain("notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES])");
  });
});

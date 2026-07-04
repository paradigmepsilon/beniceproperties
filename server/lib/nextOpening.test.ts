// server/lib/nextOpening.test.ts
import { describe, expect, it } from "vitest";
import { dayAfter, strNextOpening, cheapestAvailableWeeklyRent } from "./nextOpening";

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

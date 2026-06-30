// shared/rateSelection.test.ts
// Phase 3 — lock the day/week/month tier selection: stay length picks the tier,
// per-night proration within it, fallback to the next shorter tier, and a clear
// error when nothing is priced.

import { describe, it, expect } from "vitest";
import {
  chooseRate,
  tierForNights,
  baseAmountForStay,
  RateError,
  TIER_DAYS,
  hasAnyWeekdayRate,
  weekdayStayTotal,
  WEEKDAY_FIELDS,
} from "./rateSelection";

describe("tierForNights", () => {
  it("selects DAILY below 7 nights", () => {
    expect(tierForNights(1)).toBe("DAILY");
    expect(tierForNights(6)).toBe("DAILY");
  });
  it("selects WEEKLY at 7..27 nights", () => {
    expect(tierForNights(7)).toBe("WEEKLY");
    expect(tierForNights(27)).toBe("WEEKLY");
  });
  it("selects MONTHLY at 28+ nights", () => {
    expect(tierForNights(28)).toBe("MONTHLY");
    expect(tierForNights(90)).toBe("MONTHLY");
  });
});

describe("chooseRate — tier selection + proration", () => {
  const rates = { daily: "100", weekly: "560", monthly: "2240" }; // 80/night weekly, 80/night monthly

  it("3 nights → daily tier, effectiveNightly = daily", () => {
    const r = chooseRate({ nights: 3, ...rates });
    expect(r.tier).toBe("DAILY");
    expect(r.effectiveNightly).toBe(100);
    expect(r.fellBack).toBe(false);
  });

  it("10 nights → weekly tier, effectiveNightly = weekly/7", () => {
    const r = chooseRate({ nights: 10, ...rates });
    expect(r.tier).toBe("WEEKLY");
    expect(r.effectiveNightly).toBeCloseTo(560 / 7, 10); // 80
  });

  it("40 nights → monthly tier, effectiveNightly = monthly/28", () => {
    const r = chooseRate({ nights: 40, ...rates });
    expect(r.tier).toBe("MONTHLY");
    expect(r.effectiveNightly).toBeCloseTo(2240 / 28, 10); // 80
  });

  it("tierDays match the tier", () => {
    expect(chooseRate({ nights: 3, ...rates }).tierDays).toBe(TIER_DAYS.DAILY);
    expect(chooseRate({ nights: 10, ...rates }).tierDays).toBe(TIER_DAYS.WEEKLY);
    expect(chooseRate({ nights: 40, ...rates }).tierDays).toBe(TIER_DAYS.MONTHLY);
  });
});

describe("chooseRate — fallback chain", () => {
  it("monthly stay falls back to weekly when monthly is missing", () => {
    const r = chooseRate({ nights: 40, daily: "100", weekly: "560", monthly: null });
    expect(r.requestedTier).toBe("MONTHLY");
    expect(r.tier).toBe("WEEKLY");
    expect(r.fellBack).toBe(true);
    expect(r.effectiveNightly).toBeCloseTo(560 / 7, 10);
  });

  it("monthly stay falls back to daily when monthly + weekly missing", () => {
    const r = chooseRate({ nights: 40, daily: "100", weekly: null, monthly: null });
    expect(r.tier).toBe("DAILY");
    expect(r.fellBack).toBe(true);
    expect(r.effectiveNightly).toBe(100);
  });

  it("weekly stay falls back to daily when weekly is missing", () => {
    const r = chooseRate({ nights: 10, daily: "100", weekly: null, monthly: null });
    expect(r.tier).toBe("DAILY");
    expect(r.fellBack).toBe(true);
  });

  it("does NOT fall back upward (daily stay never uses weekly)", () => {
    const r = chooseRate({ nights: 3, daily: "100", weekly: "560", monthly: "2240" });
    expect(r.tier).toBe("DAILY");
  });

  it("throws when no rate is configured at all", () => {
    expect(() => chooseRate({ nights: 10, daily: null, weekly: null, monthly: null })).toThrow(
      RateError,
    );
  });

  it("throws on a zero/negative night count", () => {
    expect(() => chooseRate({ nights: 0, daily: "100" })).toThrow(RateError);
  });

  it("treats 0 / empty-string rates as unset (back-compat with default '0')", () => {
    const r = chooseRate({ nights: 10, daily: "100", weekly: "0", monthly: "" });
    expect(r.tier).toBe("DAILY"); // weekly '0' and monthly '' are ignored
  });
});

describe("baseAmountForStay", () => {
  it("daily: nights × daily", () => {
    expect(baseAmountForStay({ nights: 3, daily: "100" })).toBe(300);
  });
  it("weekly: nights × (weekly/7), rounded to cents", () => {
    // 10 nights @ 560/wk → 80/night → 800
    expect(baseAmountForStay({ nights: 10, weekly: "560" })).toBe(800);
  });
  it("monthly: nights × (monthly/28), rounded to cents", () => {
    // 40 nights @ 2240/mo → 80/night → 3200
    expect(baseAmountForStay({ nights: 40, monthly: "2240" })).toBe(3200);
  });
  it("rounds odd proration to cents", () => {
    // 10 nights @ 555/wk → 79.2857.../night → 792.857... → 792.86
    expect(baseAmountForStay({ nights: 10, weekly: "555" })).toBe(792.86);
  });
});

describe("WEEKDAY_FIELDS index map (getDay 0=Sun..6=Sat)", () => {
  it("maps each JS weekday index to its field", () => {
    expect(WEEKDAY_FIELDS[0]).toBe("sunPrice");
    expect(WEEKDAY_FIELDS[1]).toBe("monPrice");
    expect(WEEKDAY_FIELDS[5]).toBe("friPrice");
    expect(WEEKDAY_FIELDS[6]).toBe("satPrice");
  });
});

describe("hasAnyWeekdayRate", () => {
  it("false when empty", () => {
    expect(hasAnyWeekdayRate({})).toBe(false);
  });
  it("true when at least one price is set", () => {
    expect(hasAnyWeekdayRate({ friPrice: "200" })).toBe(true);
  });
  it("treats 0 / '' / null as unset", () => {
    expect(hasAnyWeekdayRate({ friPrice: "0", satPrice: "", sunPrice: null })).toBe(false);
  });
});

describe("weekdayStayTotal", () => {
  // 2026-07-03 is a Friday (getDay 5); +1 = Sat, +2 = Sun.
  const rates = { friPrice: "200", satPrice: "250", sunPrice: "150" };

  it("sums each night's weekday price (Fri+Sat+Sun)", () => {
    expect(
      weekdayStayTotal({
        checkIn: "2026-07-03",
        nights: 3,
        weekdayRates: rates,
        fallbackNightly: 100,
      }),
    ).toBe(600); // 200 + 250 + 150
  });

  it("falls back per-night when a weekday price is null", () => {
    expect(
      weekdayStayTotal({
        checkIn: "2026-07-03",
        nights: 3,
        weekdayRates: { ...rates, satPrice: null },
        fallbackNightly: 100,
      }),
    ).toBe(450); // 200 (Fri) + 100 (Sat fallback) + 150 (Sun)
  });

  it("maps all 7 weekdays exactly once over a full week from Monday", () => {
    // 2026-07-06 is a Monday. Distinct primes so the sum is unambiguous.
    const distinct = {
      monPrice: "101",
      tuePrice: "103",
      wedPrice: "107",
      thuPrice: "109",
      friPrice: "113",
      satPrice: "127",
      sunPrice: "131",
    };
    const sum = 101 + 103 + 107 + 109 + 113 + 127 + 131; // 791
    expect(
      weekdayStayTotal({
        checkIn: "2026-07-06",
        nights: 7,
        weekdayRates: distinct,
        fallbackNightly: null,
      }),
    ).toBe(sum);
  });

  it("throws RateError when a night has no weekday price and no fallback", () => {
    expect(() =>
      weekdayStayTotal({
        checkIn: "2026-07-03",
        nights: 3,
        weekdayRates: { friPrice: "200", satPrice: "250" }, // Sun unset
        fallbackNightly: null,
      }),
    ).toThrow(RateError);
  });

  it("rounds the summed total to cents", () => {
    expect(
      weekdayStayTotal({
        checkIn: "2026-07-03",
        nights: 2,
        weekdayRates: { friPrice: "100.005", satPrice: "100.005" },
        fallbackNightly: null,
      }),
    ).toBe(200.01); // 200.01 after rounding
  });
});

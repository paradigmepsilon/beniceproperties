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
  shortStayPrice,
  cascadeStayPrice,
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

describe("shortStayPrice — whole weeks + daily remainder (7–28 nights)", () => {
  it("exactly one week bills a single weekly rent, no remainder", () => {
    const p = shortStayPrice({ nights: 7, weeklyRent: "700" });
    expect(p).toMatchObject({ weeks: 1, remainderDays: 0, baseAmount: 700 });
  });

  it("10 nights = 1 week + 3 days at the explicit daily rate", () => {
    const p = shortStayPrice({ nights: 10, weeklyRent: "700", dailyRate: "120" });
    // 1 × 700 + 3 × 120 = 1060
    expect(p).toMatchObject({ weeks: 1, remainderDays: 3, dailyRate: 120, baseAmount: 1060 });
  });

  it("falls back to weeklyRent / 7 for remainder days when no dailyRate is set", () => {
    const p = shortStayPrice({ nights: 10, weeklyRent: "700" });
    // daily = 700/7 = 100 → 700 + 3 × 100 = 1000
    expect(p.dailyRate).toBe(100);
    expect(p.baseAmount).toBe(1000);
  });

  it("explicit dailyRate overrides the weekly-derived fallback", () => {
    const withRate = shortStayPrice({ nights: 9, weeklyRent: "700", dailyRate: "90" });
    const derived = shortStayPrice({ nights: 9, weeklyRent: "700" });
    expect(withRate.dailyRate).toBe(90); // explicit
    expect(derived.dailyRate).toBe(100); // 700/7
    expect(withRate.baseAmount).not.toBe(derived.baseAmount);
  });

  it("28 nights = 4 full weeks, no remainder", () => {
    const p = shortStayPrice({ nights: 28, weeklyRent: "700" });
    expect(p).toMatchObject({ weeks: 4, remainderDays: 0, baseAmount: 2800 });
  });

  it("rounds to cents", () => {
    const p = shortStayPrice({ nights: 8, weeklyRent: "100" });
    // 1 × 100 + 1 × (100/7 = 14.2857…) = 114.29
    expect(p.baseAmount).toBe(114.29);
  });

  it("throws RateError when the weekly rent is missing", () => {
    expect(() => shortStayPrice({ nights: 10, weeklyRent: "" })).toThrow(RateError);
  });
});

describe("cascadeStayPrice — whole months, then weeks, then days", () => {
  // Owner rule 2026-09-08: a stay bills as many whole periods of the chosen tier
  // as fit, then steps DOWN a tier for what is left, and finally bills leftover
  // whole days at the daily rate. There are no fractional days — check-in is 4pm
  // and checkout 11am, so every day in the range is one whole billable day.
  const RATES = { daily: "43", weekly: "300", biweekly: "580", monthly: "1200" };

  it("Alex's example: 52 days monthly = 1 month + 3 weeks + 3 days", () => {
    const p = cascadeStayPrice({ days: 52, rates: RATES, topTier: "MONTHLY" });
    expect(p.segments.map((s) => [s.tier, s.units, s.amount])).toEqual([
      ["MONTHLY", 1, 1200],
      ["WEEKLY", 3, 900],
      ["DAILY", 3, 129],
    ]);
    expect(p.total).toBe(2229);
    expect(p.days).toBe(52);
  });

  it("MONTHLY skips the biweekly tier — month, then WEEKS, then days", () => {
    // "after the month ... the remaining time should be charged at a weekly
    // rate, then at a daily rate for the remainder" — weekly, not biweekly.
    const p = cascadeStayPrice({ days: 48, rates: RATES, topTier: "MONTHLY" });
    expect(p.segments.map((s) => s.tier)).toEqual(["MONTHLY", "WEEKLY", "DAILY"]);
    expect(p.segments.find((s) => s.tier === "BIWEEKLY")).toBeUndefined();
  });

  it("BIWEEKLY cascades biweek -> week -> day", () => {
    // 52 days = 3 biweeks (42) + 1 week (7) + 3 days
    const p = cascadeStayPrice({ days: 52, rates: RATES, topTier: "BIWEEKLY" });
    expect(p.segments.map((s) => [s.tier, s.units, s.amount])).toEqual([
      ["BIWEEKLY", 3, 1740],
      ["WEEKLY", 1, 300],
      ["DAILY", 3, 129],
    ]);
    expect(p.total).toBe(2169);
  });

  it("WEEKLY cascades week -> day only", () => {
    const p = cascadeStayPrice({ days: 52, rates: RATES, topTier: "WEEKLY" });
    expect(p.segments.map((s) => [s.tier, s.units, s.amount])).toEqual([
      ["WEEKLY", 7, 2100],
      ["DAILY", 3, 129],
    ]);
    expect(p.total).toBe(2229);
  });

  it("omits a tier entirely when it does not divide into the remainder", () => {
    const p = cascadeStayPrice({ days: 28, rates: RATES, topTier: "MONTHLY" });
    expect(p.segments.map((s) => [s.tier, s.units])).toEqual([["MONTHLY", 1]]);
    expect(p.total).toBe(1200);
  });

  it("reports where each segment starts, so callers can price those exact days", () => {
    // STR weekday pricing needs to know WHICH nights the daily tail covers.
    const p = cascadeStayPrice({ days: 52, rates: RATES, topTier: "MONTHLY" });
    expect(p.segments.map((s) => [s.tier, s.startDay])).toEqual([
      ["MONTHLY", 0],
      ["WEEKLY", 28],
      ["DAILY", 49],
    ]);
  });

  it("falls past an unpriced tier rather than blocking the booking", () => {
    // No monthly rate set: those days fall to weeks + days at the tiers that
    // ARE priced. Mirrors chooseRate's fallback philosophy.
    const p = cascadeStayPrice({
      days: 52,
      rates: { daily: "43", weekly: "300" },
      topTier: "MONTHLY",
    });
    expect(p.segments.map((s) => [s.tier, s.units])).toEqual([["WEEKLY", 7], ["DAILY", 3]]);
    expect(p.total).toBe(2229);
  });

  it("derives a daily rate from the weekly one when none is set", () => {
    const p = cascadeStayPrice({ days: 10, rates: { weekly: "700" }, topTier: "WEEKLY" });
    // 1 week $700 + 3 days at 700/7 = 100 each
    expect(p.total).toBe(1000);
  });

  it("treats an unset biweekly rate as 2 x weekly", () => {
    const p = cascadeStayPrice({
      days: 28,
      rates: { daily: "43", weekly: "300" },
      topTier: "BIWEEKLY",
    });
    expect(p.segments.map((s) => [s.tier, s.units, s.amount])).toEqual([["BIWEEKLY", 2, 1200]]);
  });

  it("throws RateError when nothing is priced at all", () => {
    expect(() => cascadeStayPrice({ days: 30, rates: {}, topTier: "MONTHLY" })).toThrow(RateError);
  });

  it("rejects a non-positive stay", () => {
    expect(() => cascadeStayPrice({ days: 0, rates: RATES, topTier: "WEEKLY" })).toThrow(RateError);
  });

  it("every segment's days sum to the term, with no fractional days anywhere", () => {
    for (const days of [7, 13, 29, 41, 55, 83, 90]) {
      const p = cascadeStayPrice({ days, rates: RATES, topTier: "MONTHLY" });
      expect(p.segments.reduce((a, s) => a + s.days, 0)).toBe(days);
      for (const s of p.segments) expect(Number.isInteger(s.days)).toBe(true);
    }
  });
});

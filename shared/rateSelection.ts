// shared/rateSelection.ts
// =============================================================================
// BNP (Be Nice Properties) — the ONE canonical rate-tier selector. Imported by
// BOTH client and server, exactly like shared/pricing.ts and shared/leaseSchedule.ts.
//
// SUPERSEDED for pricing (2026-09-08): every stay — STR, short co-living, and
// leases — now bills through cascadeStayPrice() below, which charges whole
// months, then whole weeks, then leftover whole days. chooseRate() is retained
// for tier LOOKUP only; it is no longer the money path.
//
// MODEL (legacy): a stay is priced at a SINGLE tier chosen by its length:
//   nights >= 28 -> MONTHLY   (tierDays 28)
//   nights >= 7  -> WEEKLY    (tierDays 7)
//   else         -> DAILY     (tierDays 1)
// Within a tier the price is prorated PER NIGHT:
//   effectiveNightly = tierRate / tierDays
// so a 40-night monthly stay = (monthlyRate / 28) * 40 — smooth, no rounding to
// whole periods. Total / installment amounts derive from effectiveNightly.
//
// FALLBACK: if the chosen tier's rate is missing (null), fall to the next SHORTER
// tier that has a rate (monthly -> weekly -> daily). This keeps a partially-priced
// listing bookable instead of blocking. If NO rate is set at all, throw RateError.
//
// BACK-COMPAT: callers pass the legacy single rate (STR base_price as `daily`,
// co-living weekly_rent as `weekly`) so listings configured before the day/week/
// month columns existed bill EXACTLY as before.
//
// PER-WEEKDAY (added 2026-06-30): STR whole-property short stays (DAILY tier) can
// price each night by the weekday it falls on (weekends cost more). This is a
// SEPARATE axis from the day/week/month tiers — see weekdayStayTotal() at the
// bottom. chooseRate() stays a pure scalar selector; weekday summation is layered
// on top ONLY for the DAILY tier in server/lib/booking.ts. WEEKLY/MONTHLY tiers
// and all co-living lease/installment math are unaffected.
// =============================================================================

import { addDays, getDay, parseISO } from "date-fns";

import { CADENCE_DAYS, type PaymentCadence } from "./schema";

export type RateTier = "DAILY" | "WEEKLY" | "MONTHLY";

export const TIER_DAYS: Record<RateTier, number> = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 28,
};

/** Stay-length thresholds (inclusive lower bound) for tier selection. */
export const MONTHLY_MIN_NIGHTS = 28;
export const WEEKLY_MIN_NIGHTS = 7;

export class RateError extends Error {}

const roundCurrency = (v: number) => Math.round(v * 100) / 100;

/** Parse a decimal-string|number|null rate to a positive number, or null. */
function parseRate(v: string | number | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export interface RateInput {
  /** Total nights of the stay (>= 1). */
  nights: number;
  /** Per-tier rates (decimal strings from the DB, numbers, or null). */
  daily?: string | number | null;
  weekly?: string | number | null;
  monthly?: string | number | null;
}

export interface ChosenRate {
  /** The tier actually used after fallback. */
  tier: RateTier;
  /** The tier the stay length INITIALLY selected (before any fallback). */
  requestedTier: RateTier;
  /** The flat rate for `tier`. */
  tierRate: number;
  /** Days in one unit of `tier` (1 | 7 | 28). */
  tierDays: number;
  /** tierRate / tierDays — the per-night price the whole stay bills at. */
  effectiveNightly: number;
  /** True when the requested tier had no rate and we fell back to a shorter one. */
  fellBack: boolean;
}

/** The tier a stay length selects, before considering which rates are set. */
export function tierForNights(nights: number): RateTier {
  if (nights >= MONTHLY_MIN_NIGHTS) return "MONTHLY";
  if (nights >= WEEKLY_MIN_NIGHTS) return "WEEKLY";
  return "DAILY";
}

/**
 * Choose the rate tier + effective nightly for a stay. Tiers are tried from the
 * requested one DOWN to daily, using the first that has a rate set.
 *
 * Throws RateError if the stay has no nights or no rate is configured at all.
 */
export function chooseRate(input: RateInput): ChosenRate {
  const { nights } = input;
  if (!(nights >= 1)) throw new RateError("Stay must be at least 1 night");

  const rates: Record<RateTier, number | null> = {
    DAILY: parseRate(input.daily),
    WEEKLY: parseRate(input.weekly),
    MONTHLY: parseRate(input.monthly),
  };

  const requestedTier = tierForNights(nights);
  // Fallback order: requested tier, then each shorter tier.
  const order: RateTier[] =
    requestedTier === "MONTHLY"
      ? ["MONTHLY", "WEEKLY", "DAILY"]
      : requestedTier === "WEEKLY"
        ? ["WEEKLY", "DAILY"]
        : ["DAILY"];

  for (const tier of order) {
    const tierRate = rates[tier];
    if (tierRate !== null) {
      const tierDays = TIER_DAYS[tier];
      return {
        tier,
        requestedTier,
        tierRate,
        tierDays,
        effectiveNightly: tierRate / tierDays,
        fellBack: tier !== requestedTier,
      };
    }
  }

  throw new RateError(
    "No rate configured for this listing — set a daily, weekly, or monthly rate.",
  );
}

// =============================================================================
// CO-LIVING LEASE rates (owner rule, 2026-09-08).
//
// On the LEASE path the guest's chosen BILLING CADENCE picks the rate: pick
// weekly, pay the weekly rate; pick monthly, get the monthly rate. The cadence
// becomes the cascade's starting tier — see cascadeStayPrice() below, which is
// what actually prices every stay in this app.
//
// MULTI-ROOM: a room's missing tier is derived from ITS OWN weekly rent before
// summing, never dropped. Summing only the rooms that happen to carry a monthly
// rate would silently rent an unpriced room for free — a live money bug.
// =============================================================================

/** One room's four rate tiers, as stored on the rooms table. */
export interface LeaseRoomRate {
  /** Room weekly rent (decimal string from the DB, number, or null). */
  weeklyRent: string | number | null | undefined;
  /** Room daily rate; unset means weeklyRent / 7. */
  dailyRate?: string | number | null;
  /** Room biweekly rate; unset means 2 x weeklyRent. */
  biweeklyRate?: string | number | null;
  /** Room monthly rate; unset means 4 x weeklyRent. */
  monthlyRate?: string | number | null;
}

/**
 * Combine every room's tiers into ONE set of cascade rates for the lease.
 *
 * Each room's missing tier is derived from ITS OWN weekly rent before summing —
 * never dropped. Summing only the rooms that happen to carry a monthly rate
 * would silently rent an unpriced room for free, which was a live money bug.
 */
export function combineLeaseRates(rooms: LeaseRoomRate[]): CascadeRates {
  let daily = 0, weekly = 0, biweekly = 0, monthly = 0, any = false;
  for (const r of rooms) {
    const wk = parseRate(r.weeklyRent);
    if (wk === null) continue; // weekly_rent is NOT NULL; a 0 room adds nothing
    any = true;
    weekly += wk;
    daily += parseRate(r.dailyRate) ?? wk / 7;
    biweekly += parseRate(r.biweeklyRate) ?? wk * 2;
    monthly += parseRate(r.monthlyRate) ?? wk * 4;
  }
  if (!any) throw new RateError("No rate configured for this room — set a weekly rent.");
  return { daily, weekly, biweekly, monthly };
}

// =============================================================================
// TIER CASCADE (owner rule, 2026-09-08) — the one pricing rule for every stay.
//
// A stay bills as many WHOLE periods of the chosen tier as fit, then steps DOWN
// a tier for what is left, ending with leftover whole days at the daily rate:
//
//   MONTHLY  -> months, then weeks, then days
//   BIWEEKLY -> biweeks, then weeks, then days
//   WEEKLY   -> weeks, then days
//   DAILY    -> days
//
// MONTHLY deliberately skips the biweekly tier: the owner's rule is "after the
// month ... the remaining time should be charged at a weekly rate, then at a
// daily rate for the remainder."
//
// There are NO fractional days. Check-in is 4pm and checkout 11am, so every day
// in the range is one whole billable day and nothing is ever prorated by hours.
//
// An unpriced tier is skipped, not fatal — those days simply fall to the next
// tier down, the same fallback philosophy chooseRate() uses.
// =============================================================================

export type CascadeTier = "MONTHLY" | "BIWEEKLY" | "WEEKLY" | "DAILY";

/** Days in one unit of each tier. A "month" is 4 weeks, matching CADENCE_DAYS. */
export const CASCADE_TIER_DAYS: Record<CascadeTier, number> = {
  MONTHLY: 28,
  BIWEEKLY: 14,
  WEEKLY: 7,
  DAILY: 1,
};

/** Which tiers a cascade walks, given the tier it starts from. */
const CASCADE_ORDER: Record<CascadeTier, CascadeTier[]> = {
  // Monthly steps to WEEKLY, not biweekly — the owner's rule, verbatim.
  MONTHLY: ["MONTHLY", "WEEKLY", "DAILY"],
  BIWEEKLY: ["BIWEEKLY", "WEEKLY", "DAILY"],
  WEEKLY: ["WEEKLY", "DAILY"],
  DAILY: ["DAILY"],
};

export interface CascadeRates {
  daily?: string | number | null;
  weekly?: string | number | null;
  biweekly?: string | number | null;
  monthly?: string | number | null;
}

export interface CascadeInput {
  /** Whole billable days in the stay (>= 1). */
  days: number;
  rates: CascadeRates;
  /** Largest tier the cascade may start from — the guest's cadence, or stay length. */
  topTier: CascadeTier;
}

export interface CascadeSegment {
  tier: CascadeTier;
  /** How many whole periods of this tier. Always >= 1 (empty tiers are omitted). */
  units: number;
  /** Days in one unit: 28 | 14 | 7 | 1. */
  unitDays: number;
  /** Price of one unit. */
  unitRate: number;
  /** units * unitDays. */
  days: number;
  /** units * unitRate, rounded to cents. */
  amount: number;
  /** Day offset from check-in where this segment starts (0-based). */
  startDay: number;
}

export interface CascadePrice {
  segments: CascadeSegment[];
  /** Sum of every segment amount, rounded to cents. */
  total: number;
  /** Total whole days covered — always equals input.days. */
  days: number;
}

/**
 * The rate for one unit of a tier, or null when that tier has no usable price.
 * Two documented derivations keep a partly-priced listing bookable:
 *   BIWEEKLY unset -> 2 x weekly   (the pre-2026-09-08 behavior)
 *   DAILY    unset -> weekly / 7   (mirrors shortStayPrice)
 */
function tierUnitRate(tier: CascadeTier, rates: CascadeRates): number | null {
  const weekly = parseRate(rates.weekly);
  switch (tier) {
    case "MONTHLY":
      return parseRate(rates.monthly);
    case "BIWEEKLY": {
      const bi = parseRate(rates.biweekly);
      if (bi !== null) return bi;
      return weekly !== null ? weekly * 2 : null;
    }
    case "WEEKLY":
      return weekly;
    case "DAILY": {
      const daily = parseRate(rates.daily);
      if (daily !== null) return daily;
      return weekly !== null ? weekly / 7 : null;
    }
  }
}

/**
 * Price a stay by cascading whole periods down the tiers. Throws RateError when
 * the stay has no days, or when not one tier in the cascade carries a price.
 */
export function cascadeStayPrice(input: CascadeInput): CascadePrice {
  if (!(input.days >= 1)) throw new RateError("Stay must be at least 1 day");

  const segments: CascadeSegment[] = [];
  let remaining = input.days;
  let cursor = 0;

  for (const tier of CASCADE_ORDER[input.topTier]) {
    if (remaining <= 0) break;
    const unitRate = tierUnitRate(tier, input.rates);
    if (unitRate === null) continue; // unpriced tier: fall through to the next
    const unitDays = CASCADE_TIER_DAYS[tier];
    const units = Math.floor(remaining / unitDays);
    if (units < 1) continue;

    const days = units * unitDays;
    segments.push({
      tier,
      units,
      unitDays,
      unitRate,
      days,
      amount: roundCurrency(units * unitRate),
      startDay: cursor,
    });
    remaining -= days;
    cursor += days;
  }

  if (segments.length === 0) {
    throw new RateError(
      "No rate configured for this listing — set a daily, weekly, or monthly rate.",
    );
  }
  if (remaining > 0) {
    // Only reachable when the DAILY tier itself is unpriced, which tierUnitRate
    // prevents whenever a weekly rate exists. Surface it rather than undercharge.
    throw new RateError(
      `No daily rate configured to cover the final ${remaining} day(s) of this stay.`,
    );
  }

  return {
    segments,
    total: roundCurrency(segments.reduce((sum, seg) => sum + seg.amount, 0)),
    days: input.days,
  };
}

/** Convenience: the total base amount (pre-fees) for a stay, rounded to cents. */
export function baseAmountForStay(input: RateInput): number {
  const { effectiveNightly } = chooseRate(input);
  return roundCurrency(effectiveNightly * input.nights);
}

// =============================================================================
// Short co-living stay pricing (7–28 nights) — added 2026-07-04.
//
// A co-living stay UNDER the lease threshold is a lease-less direct booking. Its
// price is NOT chooseRate()'s per-night tier proration; it is the owner's rule:
//   full weeks  = floor(nights / 7) charged at the weekly rent
//   remainder   = nights % 7 charged at a DAILY rate
//   daily rate  = explicit room.dailyRate if set, else weeklyRent / 7
// e.g. 10 nights = 1 × weeklyRent + 3 × dailyRate. Kept here (pure, shared) so
// the client preview and the server charge compute the identical number.
// =============================================================================

export interface ShortStayInput {
  /** Total nights of the stay (>= 1). */
  nights: number;
  /** Room weekly rent (decimal string from the DB or number). Required. */
  weeklyRent: string | number;
  /** Optional explicit per-day rate for remainder days; falls back to weekly/7. */
  dailyRate?: string | number | null;
}

export interface ShortStayPrice {
  /** Total base amount (pre-fees), rounded to cents. */
  baseAmount: number;
  /** Whole weeks billed at the weekly rent. */
  weeks: number;
  /** Leftover days billed at the daily rate. */
  remainderDays: number;
  /** The weekly rent used. */
  weeklyRate: number;
  /** The per-day rate used for remainder days (explicit dailyRate ?? weekly/7). */
  dailyRate: number;
}

/**
 * Price a short co-living stay as whole weeks + a daily remainder. Throws
 * RateError if the weekly rent is missing/zero (a co-living room always has one).
 */
export function shortStayPrice(input: ShortStayInput): ShortStayPrice {
  if (!(input.nights >= 1)) throw new RateError("Stay must be at least 1 night");
  const weeklyRate = parseRate(input.weeklyRent);
  if (weeklyRate === null) {
    throw new RateError("Room has no weekly rent set — cannot price a short stay.");
  }
  // Explicit daily rate wins; otherwise derive from the weekly rent.
  const dailyRate = parseRate(input.dailyRate) ?? weeklyRate / 7;

  const weeks = Math.floor(input.nights / 7);
  const remainderDays = input.nights % 7;
  const baseAmount = roundCurrency(weeks * weeklyRate + remainderDays * dailyRate);

  return { baseAmount, weeks, remainderDays, weeklyRate, dailyRate };
}

// =============================================================================
// Per-weekday pricing (DAILY tier only) — added 2026-06-30.
// =============================================================================

/**
 * JS getDay() index (0=Sun..6=Sat) -> the weekday-price field on a property.
 * This index ordering is the CONTRACT: the DB/UI may present Mon-first for
 * humans, but the runtime lookup is always WEEKDAY_FIELDS[getDay(night)].
 */
export const WEEKDAY_FIELDS = [
  "sunPrice", // 0
  "monPrice", // 1
  "tuePrice", // 2
  "wedPrice", // 3
  "thuPrice", // 4
  "friPrice", // 5
  "satPrice", // 6
] as const;

export type WeekdayField = (typeof WEEKDAY_FIELDS)[number];

/** The 7 per-weekday prices (decimal strings | numbers | null), keyed by field. */
export type WeekdayRates = Partial<Record<WeekdayField, string | number | null>>;

/**
 * True iff at least one weekday price is set (0 / "" / null count as unset, per
 * parseRate). Lets callers skip weekday math entirely when no weekday data
 * exists, so a property without weekday prices bills EXACTLY as before.
 */
export function hasAnyWeekdayRate(rates: WeekdayRates): boolean {
  return WEEKDAY_FIELDS.some((f) => parseRate(rates[f]) !== null);
}

/**
 * Average of whatever per-weekday prices are set, or null when none are.
 *
 * Weekday prices ARE daily-tier prices, so a property that prices by weekday but
 * sets no scalar daily/base rate still has a priced DAILY tier. The cascade needs
 * a scalar to size and fall back on; this supplies it.
 */
export function averageWeekdayRate(rates: WeekdayRates): number | null {
  const set = WEEKDAY_FIELDS.map((f) => parseRate(rates[f])).filter(
    (v): v is number => v !== null,
  );
  if (set.length === 0) return null;
  return set.reduce((a, b) => a + b, 0) / set.length;
}

export interface WeekdayStayInput {
  /** YYYY-MM-DD check-in (the first night). */
  checkIn: string;
  /** Number of nights (>= 1). */
  nights: number;
  /** The 7 per-weekday prices, keyed by WeekdayField. */
  weekdayRates: WeekdayRates;
  /** Per-night fallback when a given weekday price is null (dailyRate ?? basePrice). */
  fallbackNightly: number | null;
}

/**
 * DAILY-tier stay total = SUM over each night of that night's weekday price,
 * falling back to fallbackNightly for any night whose weekday price is null.
 * Night k (0-based) falls on calendar day checkIn + k; its weekday is getDay of
 * that local calendar date.
 *
 * Deliberately mirrors nights()'s basis in server/lib/booking.ts: parseISO on a
 * YYYY-MM-DD string yields local-midnight (no time component), and addDays is
 * calendar-day arithmetic, so the weekday a guest sees == the weekday billed for
 * date-only inputs, TZ-independent. Do NOT introduce date-fns-tz here — it would
 * diverge from nights().
 *
 * Throws RateError if a night has neither a weekday price nor a fallback.
 */
export function weekdayStayTotal(input: WeekdayStayInput): number {
  const { checkIn, nights, weekdayRates, fallbackNightly } = input;
  if (!(nights >= 1)) throw new RateError("Stay must be at least 1 night");
  const start = parseISO(checkIn);
  let total = 0;
  for (let k = 0; k < nights; k++) {
    const day = getDay(addDays(start, k)); // 0=Sun..6=Sat
    const wkPrice = parseRate(weekdayRates[WEEKDAY_FIELDS[day]]);
    const nightly = wkPrice ?? fallbackNightly;
    if (nightly === null) {
      throw new RateError("No price for one or more nights of this stay.");
    }
    total += nightly;
  }
  return roundCurrency(total);
}

// shared/rateSelection.ts
// =============================================================================
// BNP (Be Nice Properties) — the ONE canonical rate-tier selector. Imported by
// BOTH client and server, exactly like shared/pricing.ts and shared/leaseSchedule.ts.
//
// MODEL (spec): a stay is priced at a SINGLE tier chosen by its length:
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

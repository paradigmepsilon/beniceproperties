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
// =============================================================================

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

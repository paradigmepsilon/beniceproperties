// shared/leaseSchedule.ts
// =============================================================================
// BNP (Be Nice Properties) — the ONE canonical payment-schedule generator for
// co-living leases. Imported by BOTH the client (booking-flow preview) and the
// server (the schedule it persists on the lease), exactly like shared/pricing.ts.
//
// CONTRACT: the schedule the guest previews is the schedule that is persisted
// and charged. There is one implementation. Never generate a schedule any other
// way.
//
// Cadence → schedule SHAPE (how due dates are spaced). The AMOUNT per period
// comes from chooseLeaseRate() in shared/rateSelection.ts, where the guest's
// cadence picks the rate (owner rule 2026-09-08) — a MONTHLY lease bills
// monthly_rate, not weeklyRate × 4, whenever a monthly rate is set:
//   WEEKLY:   a payment every 7 days from start_date
//   BIWEEKLY: every 14 days
//   MONTHLY:  every 28 days (4 weeks)
//   All cadences: schedule_seq 1 is due on the BOOKING DATE (first payment due
//   on booking). MONTHLY's first month is therefore due in full on booking.
//
// PRORATION RULE (documented + surfaced on the lease):
//   The term is divided into back-to-back cadence periods starting at start_date.
//   A trailing partial period (the lease ends mid-period) becomes a final
//   installment prorated by DAYS: amount = perDayRate × daysInFinalPeriod, where
//   perDayRate = effectiveNightly. The proration note records the count
//   of full installments + the prorated final amount and its day count.
// =============================================================================

import { CADENCE_DAYS, MAX_LEASE_DAYS } from "./schema";
import { cascadeStayPrice, type CascadeRates, type CascadeTier } from "./rateSelection";

export type { PaymentCadence } from "./schema";
import type { PaymentCadence } from "./schema";

export interface ScheduleInput {
  /** YYYY-MM-DD lease start (also the booking date / first due date). */
  startDate: string;
  /** YYYY-MM-DD lease end (exclusive of nothing — inclusive term boundary). */
  endDate: string;
  /** "WEEKLY" | "BIWEEKLY" | "MONTHLY". */
  cadence: PaymentCadence;
  /** Weekly rate for ONE room. */
  weeklyRate: number;
  /** Number of rooms on the lease (≥ 1). */
  roomCount: number;
}

/**
 * Phase-3 tier-driven schedule input. The amount math is "per-night × period":
 * each full installment = effectiveNightly × periodDays, the trailing partial =
 * effectiveNightly × remainingDays. This generalizes the weekly-only model
 * (where effectiveNightly was implicitly weeklyRate/7 and periodDays 7|14|28).
 */
export interface TierScheduleInput {
  startDate: string;
  endDate: string;
  /** Per-night price the whole stay bills at (tierRate / tierDays). */
  effectiveNightly: number;
  /** Days in one billing period (1 daily, 7 weekly, 28 monthly). */
  periodDays: number;
  /** Cadence label carried through for the proration note. */
  cadence: PaymentCadence;
}

export interface ScheduleInstallment {
  /** 1-based sequence; row 1 is always due on the booking/start date. */
  seq: number;
  /** YYYY-MM-DD due date. */
  dueDate: string;
  /** Dollar amount for this installment. */
  amount: number;
  /** True only for the final, day-prorated partial installment. */
  prorated: boolean;
  /** Days covered by this installment (a full period or the prorated tail). */
  daysCovered: number;
}

export interface GeneratedSchedule {
  installments: ScheduleInstallment[];
  /** Sum of all installment amounts (rent only; excludes late fees). */
  totalLeaseValue: number;
  /** Human-readable proration note, surfaced on the lease + booking preview. */
  prorationNote: string;
  /** Total inclusive days in the lease term. */
  totalDays: number;
}

export class ScheduleError extends Error {}

const roundCurrency = (v: number) => Math.round(v * 100) / 100;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse a YYYY-MM-DD as a UTC date so day math never drifts with timezones. */
function parseYmd(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function toYmd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(ymd: string, days: number): string {
  return toYmd(new Date(parseYmd(ymd).getTime() + days * MS_PER_DAY));
}

/** Inclusive day count between two YYYY-MM-DD dates (start and end both count). */
export function inclusiveDays(startDate: string, endDate: string): number {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
}

/**
 * Generate the canonical payment schedule for a co-living lease.
 *
 * Throws ScheduleError on invalid input (bad dates, end before start, term over
 * the 90-day ceiling, non-positive rate/rooms).
 */
export function generateSchedule(input: ScheduleInput): GeneratedSchedule {
  const { startDate, endDate, cadence, weeklyRate, roomCount } = input;

  if (!(roomCount >= 1)) throw new ScheduleError("roomCount must be at least 1");
  if (!(weeklyRate > 0)) throw new ScheduleError("weeklyRate must be positive");

  // The weekly model is the tier engine with effectiveNightly = weeklyRate/7 and
  // periodDays = the cadence's day count. This preserves all existing behavior
  // (full period = weeklyRate × CADENCE_WEEKS × rooms; proration = perDay × days).
  return buildSchedule({
    startDate,
    endDate,
    cadence,
    effectiveNightly: (weeklyRate * roomCount) / 7,
    periodDays: CADENCE_DAYS[cadence], // 7 | 14 | 28
  });
}

/**
 * Phase-3 tier-driven schedule: full installment = effectiveNightly × periodDays,
 * trailing partial = effectiveNightly × remainingDays. Used by the co-living lease
 * flow once chooseLeaseRate() has turned the guest's cadence into a rate.
 */
export function generateTierSchedule(input: TierScheduleInput): GeneratedSchedule {
  if (!(input.effectiveNightly > 0)) throw new ScheduleError("effectiveNightly must be positive");
  if (!(input.periodDays >= 1)) throw new ScheduleError("periodDays must be at least 1");
  return buildSchedule(input);
}

// =============================================================================
// CASCADE SCHEDULE (owner rule, 2026-09-08) — the schedule a lease actually gets.
//
// Full periods at the guest's chosen cadence each become their own installment.
// Everything the cascade steps DOWN to (weeks, then days) collapses into ONE
// combined final payment, so a guest who picked MONTHLY still makes monthly
// payments and never gets four charges in their last three weeks.
//
//   Sep 15 -> Nov 5, MONTHLY, wk 300 / mo 1200 / daily 43:
//     #1  Sep 15   $1,200.00   28d   monthly
//     #2  Oct 13   $1,029.00   24d   final (3 weeks + 3 days)
//
// The final payment's AMOUNT still cascades tier by tier — it is not a flat
// per-night proration. There are no fractional days anywhere.
// =============================================================================

/** The cadence a guest picked, as a cascade starting tier. */
const CADENCE_TOP_TIER: Record<PaymentCadence, CascadeTier> = {
  WEEKLY: "WEEKLY",
  BIWEEKLY: "BIWEEKLY",
  MONTHLY: "MONTHLY",
};

export interface CascadeScheduleInput {
  /** YYYY-MM-DD lease start (also the booking date / first due date). */
  startDate: string;
  /** YYYY-MM-DD lease end, INCLUSIVE. */
  endDate: string;
  /** The guest's billing cadence — sets both the rate and the payment rhythm. */
  cadence: PaymentCadence;
  /** Combined per-tier rates across every room on the lease. */
  rates: CascadeRates;
}

/**
 * Build the lease payment schedule by cascading whole periods down the tiers.
 * Throws ScheduleError on bad dates or a term over the 90-day ceiling, and
 * RateError (from cascadeStayPrice) when nothing is priced.
 */
export function generateCascadeSchedule(input: CascadeScheduleInput): GeneratedSchedule {
  const { startDate, endDate, cadence, rates } = input;

  if (parseYmd(endDate).getTime() < parseYmd(startDate).getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }
  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }

  const topTier = CADENCE_TOP_TIER[cadence];
  const priced = cascadeStayPrice({ days: totalDays, rates, topTier });

  const installments: ScheduleInstallment[] = [];
  let seq = 1;
  let cursor = startDate; // installment 1 is due on the start/booking date

  const head = priced.segments.find((seg) => seg.tier === topTier);
  const tail = priced.segments.filter((seg) => seg.tier !== topTier);

  // One installment per whole period of the chosen cadence.
  if (head) {
    for (let i = 0; i < head.units; i++) {
      installments.push({
        seq: seq++,
        dueDate: cursor,
        amount: roundCurrency(head.unitRate),
        prorated: false,
        daysCovered: head.unitDays,
      });
      cursor = addDays(cursor, head.unitDays);
    }
  }

  // Everything below the cadence tier becomes ONE combined final payment.
  if (tail.length > 0) {
    installments.push({
      seq: seq++,
      dueDate: cursor,
      amount: roundCurrency(tail.reduce((sum, seg) => sum + seg.amount, 0)),
      prorated: true,
      daysCovered: tail.reduce((sum, seg) => sum + seg.days, 0),
    });
  }

  const fullCount = head?.units ?? 0;
  const fullLabel = head ? `$${roundCurrency(head.unitRate).toFixed(2)}` : "";
  const cadenceWord = cadence.toLowerCase();
  const prorationNote = tail.length
    ? `${fullCount} full ${cadenceWord} installment(s)${fullCount ? ` of ${fullLabel}` : ""}, plus a ` +
      `final payment of $${installments[installments.length - 1].amount.toFixed(2)} covering ` +
      `${installments[installments.length - 1].daysCovered} day(s) — billed as ` +
      `${tail.map((seg) => `${seg.units} ${TIER_WORD[seg.tier]}${seg.units === 1 ? "" : "s"}`).join(" + ")}. ` +
      `First payment due on the move-in date.`
    : `${fullCount} ${cadenceWord} installment(s) of ${fullLabel}, no proration. ` +
      `First payment due on the move-in date.`;

  return {
    installments,
    totalLeaseValue: roundCurrency(installments.reduce((sum, i) => sum + i.amount, 0)),
    prorationNote,
    totalDays,
  };
}

/** Human words for the cascade tiers, used in the proration note. */
const TIER_WORD: Record<CascadeTier, string> = {
  MONTHLY: "month",
  BIWEEKLY: "two-week period",
  WEEKLY: "week",
  DAILY: "day",
};

/** Shared engine: lay out installments by period, prorate the trailing tail. */
function buildSchedule(input: TierScheduleInput): GeneratedSchedule {
  const { startDate, endDate, cadence, effectiveNightly, periodDays } = input;

  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end.getTime() < start.getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }

  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }

  const fullPeriodAmount = roundCurrency(effectiveNightly * periodDays);
  const perDayRate = effectiveNightly;

  const installments: ScheduleInstallment[] = [];
  let seq = 1;
  let cursor = startDate; // first installment is due on the start/booking date
  let remainingDays = totalDays;

  while (remainingDays > 0) {
    if (remainingDays >= periodDays) {
      // A full cadence period.
      installments.push({
        seq,
        dueDate: cursor,
        amount: fullPeriodAmount,
        prorated: false,
        daysCovered: periodDays,
      });
      remainingDays -= periodDays;
      cursor = addDays(cursor, periodDays);
    } else {
      // Trailing partial period → day-prorated final installment.
      installments.push({
        seq,
        dueDate: cursor,
        amount: roundCurrency(perDayRate * remainingDays),
        prorated: true,
        daysCovered: remainingDays,
      });
      remainingDays = 0;
    }
    seq += 1;
  }

  const totalLeaseValue = roundCurrency(
    installments.reduce((sum, i) => sum + i.amount, 0),
  );

  const fullCount = installments.filter((i) => !i.prorated).length;
  const finalProrated = installments.find((i) => i.prorated);
  const prorationNote = finalProrated
    ? `${fullCount} full ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, ` +
      `plus a final prorated installment of $${finalProrated.amount.toFixed(2)} covering ` +
      `${finalProrated.daysCovered} day(s). First payment due on the move-in date.`
    : `${fullCount} ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, no proration. ` +
      `First payment due on the move-in date.`;

  return { installments, totalLeaseValue, prorationNote, totalDays };
}

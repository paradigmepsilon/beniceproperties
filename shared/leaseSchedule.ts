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
// Cadence → schedule rules (spec PHASE 1):
//   WEEKLY:   a payment every 7 days from start_date,  each = weeklyRate × 1 × rooms
//   BIWEEKLY: every 14 days,                           each = weeklyRate × 2 × rooms
//   MONTHLY:  every 28 days (4 weeks),                 each = weeklyRate × 4 × rooms
//   All cadences: schedule_seq 1 is due on the BOOKING DATE (first payment due
//   on booking). MONTHLY's first month is therefore due in full on booking.
//
// PRORATION RULE (documented + surfaced on the lease):
//   The term is divided into back-to-back cadence periods starting at start_date.
//   A trailing partial period (the lease ends mid-period) becomes a final
//   installment prorated by DAYS: amount = perDayRate × daysInFinalPeriod, where
//   perDayRate = (weeklyRate × rooms) / 7. The proration note records the count
//   of full installments + the prorated final amount and its day count.
// =============================================================================

import {
  CADENCE_DAYS,
  CADENCE_WEEKS,
  MAX_LEASE_DAYS,
  type PAYMENT_CADENCES,
} from "./schema";

export type PaymentCadence = (typeof PAYMENT_CADENCES)[number];

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

  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end.getTime() < start.getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }

  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }

  const periodDays = CADENCE_DAYS[cadence]; // 7 | 14 | 28
  const fullPeriodAmount = roundCurrency(weeklyRate * CADENCE_WEEKS[cadence] * roomCount);
  const perDayRate = (weeklyRate * roomCount) / 7;

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
      `${finalProrated.daysCovered} day(s). First payment due on the booking date.`
    : `${fullCount} ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, no proration. ` +
      `First payment due on the booking date.`;

  return { installments, totalLeaseValue, prorationNote, totalDays };
}

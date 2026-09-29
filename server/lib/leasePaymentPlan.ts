// server/lib/leasePaymentPlan.ts
// =============================================================================
// Change a live lease's payment plan from Unified Ops: its cadence (weekly /
// bi-weekly / monthly) and, optionally, the rates it bills at.
//
// THIS OVERRIDES A SIGNED TERM. The schema calls payment_cadence "locked at
// booking, immutable for the term", and the cadence is written into the lease
// agreement the guest signed. An edit here is therefore a deliberate operator
// decision with a required reason, recorded in booking_modifications — and it
// should be backed by the guest's written agreement (owner decision 2026-09-28,
// flagged for counsel).
//
// ONLY THE NOT-YET-DUE TAIL MOVES. History is never rewritten:
//   - An installment that is PAID, DUE, LATE, FAILED or WAIVED stays exactly as
//     it is, with its seq, so late fees keyed on (lease, schedule_seq) still
//     attach to the right row.
//   - The tail is the run of SCHEDULED rows due strictly after today, at the end
//     of the schedule. It covers [first tail due date, lease end], and that
//     window is re-cut with generateCascadeSchedule — the same function that
//     built the original schedule — at the new cadence.
// No money moves here: paid rows are untouched and the new rows bill on their
// due dates through the normal scheduler.
// =============================================================================

import { z } from "zod";
import { storage } from "../storage";
import { LeaseError } from "./errorResponse";
import { fmtMoney } from "./formatShared";
import { log } from "../server-log";
import { generateCascadeSchedule, ScheduleError } from "@shared/leaseSchedule";
import { combineLeaseRates, RateError, type CascadeRates } from "@shared/rateSelection";
import { todayIso } from "@shared/dates";
import { PAYMENT_CADENCES, type InsertLease, type PaymentScheduleRow } from "@shared/schema";

const AMOUNT_TOLERANCE = 0.005;
const round2 = (v: number) => Math.round(v * 100) / 100;

export const PLAN_EDITABLE_LEASE_STATUSES = [
  "PENDING_FIRST_PAYMENT",
  "PENDING_VERIFICATION",
  "ACTIVE",
] as const;

const rate = z.number().positive().max(100_000);
export const paymentPlanInputSchema = z.object({
  cadence: z.enum(PAYMENT_CADENCES),
  /** Combined rates across the lease's rooms. Omit to use the rooms' current rates. */
  rates: z
    .object({
      daily: rate.optional(),
      weekly: rate,
      biweekly: rate.optional(),
      monthly: rate.optional(),
    })
    .optional(),
  reason: z.string().trim().min(5).max(400),
});
export type PaymentPlanInput = z.infer<typeof paymentPlanInputSchema>;
/** A preview needs no reason; applying does. */
export const paymentPlanQuoteSchema = paymentPlanInputSchema.omit({ reason: true });
export type PaymentPlanQuoteInput = z.infer<typeof paymentPlanQuoteSchema>;

export interface PlanInstallment {
  seq: number;
  dueDate: string;
  amount: number;
  status: string;
}

export interface PaymentPlanQuote {
  leaseId: string;
  status: string;
  current: { cadence: string; weeklyRate: number; totalLeaseValue: number };
  rates: CascadeRates;
  kept: PlanInstallment[];
  replaced: PlanInstallment[];
  proposed: PlanInstallment[];
  oldRemaining: number;
  newRemaining: number;
  /** newRemaining - oldRemaining. */
  delta: number;
  newTotalLeaseValue: number;
  prorationNote: string;
  tailStart: string;
}

const toInstallment = (r: PaymentScheduleRow): PlanInstallment => ({
  seq: r.scheduleSeq,
  dueDate: r.dueDate,
  amount: parseFloat(r.amount),
  status: r.status,
});

/**
 * Split a schedule into history and the replaceable tail. Exported for tests.
 * The tail must be contiguous at the END: a SCHEDULED row sitting before a DUE
 * or LATE one is not a clean window to re-cut, so it stays in history.
 */
export function splitSchedule(rows: PaymentScheduleRow[], today: string) {
  const sorted = [...rows].sort((a, b) => a.scheduleSeq - b.scheduleSeq);
  let i = sorted.length;
  while (i > 0 && sorted[i - 1].status === "SCHEDULED" && sorted[i - 1].dueDate > today) i -= 1;
  return { kept: sorted.slice(0, i), tail: sorted.slice(i) };
}

async function loadPlan(leaseId: string, input: PaymentPlanQuoteInput) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (!(PLAN_EDITABLE_LEASE_STATUSES as readonly string[]).includes(lease.status)) {
    throw new LeaseError(`A ${lease.status} lease's payment plan cannot be changed.`, 409);
  }

  const schedule = await storage.getScheduleByLease(lease.id);
  const { kept, tail } = splitSchedule(schedule, todayIso());
  if (tail.length === 0) {
    throw new LeaseError("Every remaining installment is already due or settled — nothing to re-plan.", 409);
  }

  let rates: CascadeRates;
  if (input.rates) {
    rates = input.rates;
  } else {
    const leaseRooms = await storage.getLeaseRooms(lease.id);
    const rooms = await Promise.all(leaseRooms.map((lr) => storage.getRoom(lr.roomId)));
    try {
      rates = combineLeaseRates(
        rooms
          .filter((r): r is NonNullable<typeof r> => !!r)
          .map((r) => ({
            weeklyRent: r.weeklyRent,
            dailyRate: r.dailyRate,
            biweeklyRate: r.biweeklyRate,
            monthlyRate: r.monthlyRate,
          })),
      );
    } catch (err) {
      if (err instanceof RateError) throw new LeaseError(err.message, 422);
      throw err;
    }
  }

  const tailStart = tail[0].dueDate;
  let generated;
  try {
    generated = generateCascadeSchedule({ startDate: tailStart, endDate: lease.endDate, cadence: input.cadence, rates });
  } catch (err) {
    if (err instanceof ScheduleError || err instanceof RateError) throw new LeaseError(err.message, 422);
    throw err;
  }

  const lastKeptSeq = kept.length ? Math.max(...kept.map((r) => r.scheduleSeq)) : 0;
  const proposed: PlanInstallment[] = generated.installments.map((inst, idx) => ({
    seq: lastKeptSeq + idx + 1,
    dueDate: inst.dueDate,
    amount: inst.amount,
    status: "SCHEDULED",
  }));

  const keptTotal = round2(kept.reduce((s, r) => s + parseFloat(r.amount), 0));
  const oldRemaining = round2(tail.reduce((s, r) => s + parseFloat(r.amount), 0));
  const newRemaining = round2(proposed.reduce((s, r) => s + r.amount, 0));

  const quote: PaymentPlanQuote = {
    leaseId: lease.id,
    status: lease.status,
    current: {
      cadence: lease.paymentCadence,
      weeklyRate: parseFloat(lease.weeklyRateSnapshot),
      totalLeaseValue: parseFloat(lease.totalLeaseValue),
    },
    rates,
    kept: kept.map(toInstallment),
    replaced: tail.map(toInstallment),
    proposed,
    oldRemaining,
    newRemaining,
    delta: round2(newRemaining - oldRemaining),
    newTotalLeaseValue: round2(keptTotal + newRemaining),
    prorationNote: generated.prorationNote,
    tailStart,
  };
  return { lease, tail, quote };
}

export async function quotePaymentPlan(leaseId: string, input: PaymentPlanQuoteInput): Promise<PaymentPlanQuote> {
  return (await loadPlan(leaseId, input)).quote;
}

export async function applyPaymentPlan(args: {
  leaseId: string;
  input: PaymentPlanInput;
  /** The new remaining total the operator confirmed. */
  expectedNewRemaining: number;
  actor: string;
}) {
  const { lease, tail, quote } = await loadPlan(args.leaseId, args.input);
  if (Math.abs(quote.newRemaining - args.expectedNewRemaining) > AMOUNT_TOLERANCE) {
    throw new LeaseError(
      `The new schedule changed (expected ${fmtMoney(args.expectedNewRemaining)}, now ` +
        `${fmtMoney(quote.newRemaining)}) — reload and try again.`,
      409,
    );
  }

  // Keep the settlement method the tail already had (card on file vs manual).
  const method = tail[0].paymentMethod === "MANUAL" ? "MANUAL" : "CARD_ON_FILE";
  const { removed } = await storage.replaceScheduledInstallments(
    lease.id,
    tail.map((r) => r.id),
    quote.proposed.map((p) => ({
      leaseId: lease.id,
      scheduleSeq: p.seq,
      dueDate: p.dueDate,
      amount: p.amount.toFixed(2),
      status: "SCHEDULED",
      paymentMethod: method,
    })),
  );
  if (removed !== tail.length) {
    // A tail row changed status between the read and the delete (the daily
    // scheduler flipped it DUE). The new rows are in and nothing was lost, but
    // one period may now bill twice — a person must look.
    const detail =
      `Lease ${lease.id} payment plan changed by ${args.actor}: expected to replace ${tail.length} ` +
      `scheduled installment(s) but only ${removed} were still SCHEDULED. Check the schedule for a ` +
      `period billed twice.`;
    await storage.raiseEscalationOnce({
      bookingId: null,
      leaseId: lease.id,
      kind: "PAYMENT_OVERDUE",
      severity: "HIGH",
      detail,
    });
    log(detail, "admin");
  }

  const updates: Partial<InsertLease> = {
    paymentCadence: args.input.cadence,
    totalLeaseValue: quote.newTotalLeaseValue.toFixed(2),
    prorationNote: quote.prorationNote,
  };
  if (args.input.rates) updates.weeklyRateSnapshot = args.input.rates.weekly.toFixed(2);
  await storage.updateLease(lease.id, updates);

  const mod = await storage.createBookingModification({
    bookingId: null,
    leaseId: lease.id,
    kind: "LEASE_PLAN",
    before: {
      cadence: lease.paymentCadence,
      weeklyRate: lease.weeklyRateSnapshot,
      installments: quote.replaced,
    },
    after: {
      cadence: args.input.cadence,
      rates: quote.rates,
      installments: quote.proposed,
    },
    oldTotal: lease.totalLeaseValue,
    newTotal: quote.newTotalLeaseValue.toFixed(2),
    paidNet: round2(quote.current.totalLeaseValue - quote.oldRemaining).toFixed(2),
    delta: quote.delta.toFixed(2),
    reason: args.input.reason,
    refundIds: [],
    actor: args.actor,
  });

  log(
    `lease ${lease.id}: payment plan ${lease.paymentCadence} → ${args.input.cadence} by ${args.actor} ` +
      `(${tail.length} → ${quote.proposed.length} installments, remaining ${fmtMoney(quote.oldRemaining)} → ` +
      `${fmtMoney(quote.newRemaining)}, mod ${mod.id})`,
    "admin",
  );
  return { modificationId: mod.id, quote, removed };
}

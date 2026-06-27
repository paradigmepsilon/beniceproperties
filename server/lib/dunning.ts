// server/lib/dunning.ts
// =============================================================================
// Phase 5 — payment reminders, failure handling, late fees, and defaults. This
// is the dunning state machine that makes co-living economics real.
//
// Daily sweep (runDunningSweep), per ACTIVE lease, per still-open installment:
//   REMINDERS (unless already PAID): 7 / 3 / 0 days before due → email + SMS,
//     each sent at most once (notification_log dedupe). Suppressed the moment the
//     row is PAID (we only consider non-PAID rows).
//   OVERDUE (from the day AFTER due, for 3 days): flag UO + message the guest
//     daily (email + SMS), and accrue a $25 late fee PER DAY (one row/day,
//     idempotent), continuing to accrue indefinitely (no cap) until paid.
//   DEFAULT: if an installment is unpaid for >= the admin-configured threshold
//     (default 7 days) past due, move the lease → DEFAULTED and raise a
//     HIGH-severity UO escalation (once).
//
// Event handlers (called from the payment paths, not the sweep):
//   handleChargeFailure()  — card-on-file decline: row FAILED, raise UO
//                            escalation immediately, send the fix-card link.
//   billAccruedLateFees()  — when an installment is finally PAID, bill all its
//                            ACCRUED late fees as a SINGLE separate LATE_FEE
//                            PaymentIntent (never folded into rent) and mark the
//                            fee rows BILLED.
//
// Notifications go out via the env-gated notifications layer (dry-run + log when
// creds are absent), so this whole machine is exercisable without live creds.
// =============================================================================

import { storage } from "../storage";
import { notifyGuest } from "./notifications";
import { chargeSavedCard } from "./stripe";
import { buildLeaseChargeMetadata } from "./paymentMetadata";
import {
  LATE_FEE_PER_DAY,
  OVERDUE_MESSAGE_DAYS,
  DEFAULT_DEFAULTED_THRESHOLD_DAYS,
} from "@shared/schema";
import { log } from "../server-log";
import type { Lease, Property, LeaseRoom, PaymentScheduleRow, Guest } from "@shared/schema";

const SETTING_DEFAULT_THRESHOLD = "defaulted_threshold_days";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Whole days `dueDate` is in the past relative to `today` (negative = future). */
export function daysPastDue(dueDate: string, today: string): number {
  const due = new Date(`${dueDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  return Math.round((now - due) / MS_PER_DAY);
}

const OPEN_INSTALLMENT_STATUSES = new Set(["SCHEDULED", "DUE", "FAILED", "LATE"]);

export interface DunningResult {
  remindersSent: number;
  overdueMessages: number;
  lateFeesAccrued: number;
  defaultsRaised: number;
}

// ---------------------------------------------------------------------------
// Daily sweep
// ---------------------------------------------------------------------------

export async function runDunningSweep(today: string = ymd(new Date())): Promise<DunningResult> {
  const result: DunningResult = {
    remindersSent: 0,
    overdueMessages: 0,
    lateFeesAccrued: 0,
    defaultsRaised: 0,
  };

  const thresholdDays = await storage.getSettingNumber(
    SETTING_DEFAULT_THRESHOLD,
    DEFAULT_DEFAULTED_THRESHOLD_DAYS,
  );

  const leases = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases) {
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (!property || !guest) continue;
    const rooms = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);

    for (const row of schedule) {
      if (row.status === "PAID" || row.status === "WAIVED") continue; // suppressed
      if (!OPEN_INSTALLMENT_STATUSES.has(row.status)) continue;

      const past = daysPastDue(row.dueDate, today);

      if (past <= 0) {
        // Before due (7d/3d) or on the due date (day-of reminder).
        await maybeSendReminder(lease, guest, row, past, today, result);
      } else {
        // Strictly past due → overdue path (messaging + late fees + default).
        await handleOverdue(lease, property, guest, rooms, row, past, today, thresholdDays, result);
      }
    }
  }

  if (result.remindersSent || result.overdueMessages || result.lateFeesAccrued || result.defaultsRaised) {
    log(
      `dunning: ${result.remindersSent} reminders, ${result.overdueMessages} overdue msgs, ` +
        `${result.lateFeesAccrued} late fees, ${result.defaultsRaised} defaults`,
      "scheduler",
    );
  }
  return result;
}

async function maybeSendReminder(
  lease: Lease,
  guest: Guest,
  row: PaymentScheduleRow,
  past: number,
  today: string,
  result: DunningResult,
): Promise<void> {
  const daysUntil = -past; // past is negative before due
  let kind: string | null = null;
  if (daysUntil === 7) kind = "REMINDER_7D";
  else if (daysUntil === 3) kind = "REMINDER_3D";
  else if (daysUntil === 0) kind = "REMINDER_DUE";
  if (!kind) return;

  const already = await storage.hasNotification({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    kind,
    sendDate: today,
  });
  if (already) return;

  const when = daysUntil === 0 ? "today" : `in ${daysUntil} day${daysUntil === 1 ? "" : "s"}`;
  const sent = await notifyGuest({
    email: guest.email,
    phone: guest.phone,
    subject: `Rent reminder — payment due ${when}`,
    body:
      `Hi ${guest.name}, your rent payment of $${row.amount} for installment #${row.scheduleSeq} ` +
      `is due ${when} (${row.dueDate}). ` +
      (row.paymentMethod === "CARD_ON_FILE"
        ? "It will be charged automatically to your card on file."
        : "Please send your payment by the due date."),
  });
  await storage.recordNotification({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    kind,
    sendDate: today,
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent,
  });
  result.remindersSent += 1;
}

async function handleOverdue(
  lease: Lease,
  property: Property,
  guest: Guest,
  rooms: LeaseRoom[],
  row: PaymentScheduleRow,
  past: number,
  today: string,
  thresholdDays: number,
  result: DunningResult,
): Promise<void> {
  if (past < 1) return; // due today is handled by REMINDER_DUE, not overdue

  // Mark the row LATE (visible state) if it isn't already PAID/WAIVED.
  if (row.status !== "LATE" && row.status !== "FAILED") {
    await storage.updateScheduleRow(row.id, { status: "LATE" });
  }

  // --- Late fee: $25/day from the day after due, accruing indefinitely. One row
  // per day (idempotent). past=1 → first late day. ---
  const fee = await storage.accrueLateFeeOnce({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    accrualDate: today,
    amount: LATE_FEE_PER_DAY,
  });
  if (fee) result.lateFeesAccrued += 1;

  // --- Daily overdue message + UO flag for the first 3 days past due. ---
  if (past <= OVERDUE_MESSAGE_DAYS) {
    const kind = `OVERDUE_${past}`; // OVERDUE_1 / _2 / _3
    const already = await storage.hasNotification({
      leaseId: lease.id,
      scheduleSeq: row.scheduleSeq,
      kind,
      sendDate: today,
    });
    if (!already) {
      const sent = await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: `Payment overdue — installment #${row.scheduleSeq}`,
        body:
          `Hi ${guest.name}, your rent payment of $${row.amount} (installment #${row.scheduleSeq}, ` +
          `due ${row.dueDate}) is ${past} day${past === 1 ? "" : "s"} overdue. A late fee of ` +
          `$${LATE_FEE_PER_DAY.toFixed(2)}/day is accruing. Please pay as soon as possible to stop ` +
          `further fees.`,
      });
      await storage.recordNotification({
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        kind,
        sendDate: today,
        emailSent: sent.email.sent,
        smsSent: sent.sms.sent,
      });
      // Flag UO (overdue). Deduped to one OPEN escalation per installment.
      await storage.raiseEscalationOnce({
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        kind: "PAYMENT_OVERDUE",
        severity: "MEDIUM",
        detail: `Installment #${row.scheduleSeq} ($${row.amount}) overdue since ${row.dueDate}.`,
      });
      result.overdueMessages += 1;
    }
  }

  // --- Default: unpaid >= threshold days past due → DEFAULTED + HIGH escalation. ---
  if (past >= thresholdDays && lease.status === "ACTIVE") {
    await storage.updateLease(lease.id, { status: "DEFAULTED" });
    const raised = await storage.raiseEscalationOnce({
      leaseId: lease.id,
      scheduleSeq: row.scheduleSeq,
      kind: "LEASE_DEFAULTED",
      severity: "HIGH",
      detail:
        `Lease defaulted: installment #${row.scheduleSeq} unpaid ${past} days ` +
        `(threshold ${thresholdDays}).`,
    });
    if (raised) {
      const already = await storage.hasNotification({
        leaseId: lease.id,
        scheduleSeq: null,
        kind: "DEFAULTED",
        sendDate: today,
      });
      if (!already) {
        const sent = await notifyGuest({
          email: guest.email,
          phone: guest.phone,
          subject: "Your lease is in default",
          body:
            `Hi ${guest.name}, your lease at ${property.name} is now in default due to an unpaid ` +
            `balance past ${thresholdDays} days. Please contact us immediately to resolve this.`,
        });
        await storage.recordNotification({
          leaseId: lease.id,
          scheduleSeq: null,
          kind: "DEFAULTED",
          sendDate: today,
          emailSent: sent.email.sent,
          smsSent: sent.sms.sent,
        });
      }
      result.defaultsRaised += 1;
    }
  }
}

// ---------------------------------------------------------------------------
// Event: card-on-file charge failure (called from the charge path)
// ---------------------------------------------------------------------------

export async function handleChargeFailure(args: {
  lease: Lease;
  guest: Guest;
  scheduleRow: PaymentScheduleRow;
  reason?: string;
  today?: string;
}): Promise<void> {
  const today = args.today ?? ymd(new Date());
  // Row is already marked FAILED by the charge path; ensure it here too.
  if (args.scheduleRow.status !== "FAILED") {
    await storage.updateScheduleRow(args.scheduleRow.id, { status: "FAILED" });
  }

  // Flag UO immediately.
  await storage.raiseEscalationOnce({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    severity: "HIGH",
    detail:
      `Card-on-file charge FAILED for installment #${args.scheduleRow.scheduleSeq} ` +
      `($${args.scheduleRow.amount})${args.reason ? `: ${args.reason}` : ""}.`,
  });

  // Email + SMS the guest a payment-fix link (once per day per installment).
  const already = await storage.hasNotification({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    sendDate: today,
  });
  if (!already) {
    const fixUrl = `${publicBaseUrl()}/lease/pay?leaseId=${args.lease.id}`;
    const sent = await notifyGuest({
      email: args.guest.email,
      phone: args.guest.phone,
      subject: "Action needed — your rent payment failed",
      body:
        `Hi ${args.guest.name}, we couldn't process your rent payment for installment ` +
        `#${args.scheduleRow.scheduleSeq}. Please update your card / retry here: ${fixUrl}`,
    });
    await storage.recordNotification({
      leaseId: args.lease.id,
      scheduleSeq: args.scheduleRow.scheduleSeq,
      kind: "PAYMENT_FAILED",
      sendDate: today,
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent,
    });
  }
}

// ---------------------------------------------------------------------------
// Event: bill accrued late fees as a SEPARATE charge when an installment is paid
// ---------------------------------------------------------------------------

export async function billAccruedLateFees(args: {
  lease: Lease;
  property: Property;
  rooms: LeaseRoom[];
  scheduleSeq: number;
}): Promise<{ billed: boolean; amount: number; paymentIntentId?: string }> {
  const fees = await storage.getAccruedLateFeesForSchedule(args.lease.id, args.scheduleSeq);
  if (fees.length === 0) return { billed: false, amount: 0 };

  const total = Math.round(fees.reduce((s, f) => s + parseFloat(f.amount), 0) * 100) / 100;
  if (total <= 0) return { billed: false, amount: 0 };
  if (!args.lease.stripeCustomerId || !args.lease.stripePaymentMethodId) {
    // No saved card (manual-pay lease): leave fees ACCRUED for manual settlement.
    return { billed: false, amount: total };
  }

  const metadata = buildLeaseChargeMetadata({
    entity: args.property.entity,
    property: args.property,
    lease: args.lease,
    rooms: args.rooms,
    paymentKind: "LATE_FEE",
    scheduleSeq: args.scheduleSeq,
  });

  // Separate line-item charge — NEVER folded into rent.
  const pi = await chargeSavedCard({
    amount: total,
    customerId: args.lease.stripeCustomerId,
    paymentMethodId: args.lease.stripePaymentMethodId,
    metadata,
    idempotencyKey: `lease-latefee-${args.lease.id}-seq-${args.scheduleSeq}`,
  });

  // Mark the fee rows BILLED with the PI id.
  for (const fee of fees) {
    await storage.updateLateFee(fee.id, { status: "BILLED", stripePaymentIntentId: pi.id });
  }
  log(`billed $${total} late fees for lease ${args.lease.id} seq ${args.scheduleSeq} (${pi.id})`, "scheduler");
  return { billed: true, amount: total, paymentIntentId: pi.id };
}

function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beniceproperties.vercel.app")
  );
}

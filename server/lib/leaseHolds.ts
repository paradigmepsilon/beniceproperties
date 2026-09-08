// server/lib/leaseHolds.ts
// =============================================================================
// Room-hold release (owner rule, 2026-09-08).
//
// "A room should only be on hold if a deposit was made, and then the first
//  payment must be completed by the first day of their reservation. If the bill
//  is not paid on the first day of the reservation, then the hold and the room
//  is released."
//
// The hold itself is enforced in the availability query (leaseHoldsRoom() in
// shared/schema.ts + roomHoldingLeaseCondition() in storage.ts). This module is
// the other half: releasing a lease that has run out of road.
//
// Two rules:
//   1. MOVE-IN RELEASE — deposit paid, but the first rent installment is still
//      unpaid AFTER the move-in date has passed. The guest gets the whole of
//      their first day; release fires on the next sweep once today > start_date.
//      (Releasing at 08:00 UTC ON the move-in date would be 4am ET — before the
//      guest has had the day to pay.)
//   2. ABANDONED-ROW HYGIENE — an unpaid lease left sitting for 24h+. It stops
//      holding the room after CHECKOUT_HOLD_MINUTES either way, so this is
//      bookkeeping, not inventory recovery.
//
// Nothing here moves money. A deposit on a released lease is NOT auto-refunded
// — that stays a human decision (see the escalation raised below).
// =============================================================================

import { todayIso } from "@shared/dates";
import { CHECKOUT_HOLD_LEASE_STATUSES, type Lease } from "@shared/schema";
import { storage } from "../storage";
import { log } from "../server-log";
import { notifyAdmin, notifyGuest } from "./notifications";
import { publicBaseUrl, portalUrl } from "./publicUrl";

/** Hours an unpaid, unsigned lease row lingers before it is tidied away. */
const ABANDONED_HOURS = 24;

export interface HoldExpiryResult {
  /** Released because the first payment missed the move-in date. */
  movedIn: number;
  /** Released as an abandoned, never-paid row. */
  abandoned: number;
  /** Nudges sent to guests whose move-in is today and whose seq 1 is unpaid. */
  nudged: number;
}

type LeaseWithRefs = Lease & {
  guest: { id: string; name: string; email: string; phone?: string | null };
  property: { name: string };
};

/** A schedule row counts as settled if it is PAID or an admin WAIVED it. */
const SETTLED = new Set(["PAID", "WAIVED"]);

export async function runLeaseHoldExpiry(
  opts: { now?: Date; today?: string } = {},
): Promise<HoldExpiryResult> {
  const now = opts.now ?? new Date();
  const today = opts.today ?? todayIso();
  const result: HoldExpiryResult = { movedIn: 0, abandoned: 0, nudged: 0 };

  const leases = await storage.getActiveLeasesWithGuest();

  for (const lease of leases) {
    const depositPaid = lease.depositStatus === "PAID";

    if (depositPaid) {
      await handleDepositedLease(lease, today, result);
      continue;
    }

    // --- Rule 2: abandoned, never-paid row. ---
    if (!(CHECKOUT_HOLD_LEASE_STATUSES as readonly string[]).includes(lease.status)) continue;
    const createdAt = lease.createdAt ? new Date(lease.createdAt) : null;
    if (!createdAt) continue;
    const ageHours = (now.getTime() - createdAt.getTime()) / 3_600_000;
    if (ageHours < ABANDONED_HOURS) continue;
    // Belt-and-braces: never tidy a lease that took any money.
    if (lease.cleaningFeeStatus === "PAID") continue;
    if (await anyInstallmentSettled(lease.id)) continue;

    await release(lease, "abandoned before any payment was made");
    result.abandoned += 1;
  }

  if (result.movedIn || result.abandoned || result.nudged) {
    log(
      `hold expiry: ${result.movedIn} released at move-in, ${result.abandoned} abandoned, ${result.nudged} nudged`,
      "scheduler",
    );
  }
  return result;
}

/**
 * A lease whose deposit is paid holds its room for the whole term — unless the
 * first rent installment never lands. Nudge on the move-in date, release after.
 */
async function handleDepositedLease(
  lease: LeaseWithRefs,
  today: string,
  result: HoldExpiryResult,
): Promise<void> {
  if (lease.status === "DEFAULTED" || lease.status === "TERMINATED") return;

  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first || SETTLED.has(first.status)) return; // paid, or nothing to collect

  // Move-in day: remind, don't release. They have through today.
  if (today === lease.startDate) {
    if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "FIRST_PAYMENT_REMINDER", null)) {
      return;
    }
    const sent = await notifyGuest({
      email: lease.guest.email,
      phone: lease.guest.phone,
      context: { leaseId: lease.id, guestId: lease.guest.id, kind: "FIRST_PAYMENT_REMINDER" },
      subject: "Today is move-in — your first rent payment is due",
      body:
        `Hi ${lease.guest.name}, welcome — today is your move-in date. Your first rent payment ` +
        `of $${first.amount} is due today to keep your room.\n\n` +
        `Pay by card, or by CashApp/Zelle: ${portalUrl(lease)}\n\n` +
        `If it isn't paid by the end of today the room goes back on the market. Your deposit is ` +
        `not forfeited automatically — reply to this email and we'll sort it out with you.`,
      smsBody:
        `BNP: move-in day. First rent $${first.amount} is due today to keep your room. ` +
        `Pay: ${portalUrl(lease)}`,
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "FIRST_PAYMENT_REMINDER",
      scheduleSeq: null,
      status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent,
    });
    result.nudged += 1;
    return;
  }

  if (today <= lease.startDate) return; // move-in still ahead

  // Past move-in with seq 1 unsettled. ONE exception, deliberately conservative:
  // a guest who elected CashApp/Zelle may well have sent the money already, with
  // only UO's "Mark Paid" outstanding. Auto-terminating them over an operator's
  // reconciliation lag would be wrong, so escalate to a human and hold the room.
  if (first.paymentMethod === "MANUAL") {
    await storage.raiseEscalationOnce({
      leaseId: lease.id,
      scheduleSeq: 1,
      kind: "PAYMENT_OVERDUE",
      severity: "HIGH",
      detail:
        `Move-in was ${lease.startDate} and installment #1 (manual CashApp/Zelle) is still ` +
        `unpaid. Hold NOT auto-released — confirm the payment with Mark Paid, or terminate ` +
        `the lease by hand to free the room.`,
    });
    return;
  }

  await release(lease, `first payment not received by the move-in date (${lease.startDate})`);
  result.movedIn += 1;
}

async function anyInstallmentSettled(leaseId: string): Promise<boolean> {
  const schedule = await storage.getScheduleByLease(leaseId);
  return schedule.some((s) => SETTLED.has(s.status));
}

/**
 * Terminate the lease and free the room. TERMINATED is not a room-holding
 * status, so the next availability read stops seeing it — nothing else to undo.
 */
async function release(lease: LeaseWithRefs, reason: string): Promise<void> {
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "LEASE_HOLD_RELEASED", null)) return;

  await storage.updateLease(lease.id, { status: "TERMINATED" });
  log(`lease ${lease.id} hold released — ${reason}`, "scheduler");

  const sent = await notifyGuest({
    email: lease.guest.email,
    phone: lease.guest.phone,
    context: { leaseId: lease.id, guestId: lease.guest.id, kind: "LEASE_HOLD_RELEASED" },
    subject: `Your reservation at ${lease.property.name} has been released`,
    body:
      `Hi ${lease.guest.name}, we've released the hold on your room at ${lease.property.name} ` +
      `because the ${reason}.\n\n` +
      `The room is back on the market. If you still want it, you can rebook here: ` +
      `${publicBaseUrl()}/property/${lease.propertyId}\n\n` +
      `If you believe this is a mistake — or you already paid — reply to this email right away ` +
      `and we'll get it sorted.`,
    smsBody:
      `BNP: the hold on your room at ${lease.property.name} was released. ` +
      `Rebook: ${publicBaseUrl()}/property/${lease.propertyId}`,
  });

  await notifyAdmin({
    subject: `Hold released — ${lease.property.name} (${lease.guest.name})`,
    body:
      `Lease ${lease.id} at ${lease.property.name} was TERMINATED and the room released: ` +
      `${reason}. Guest: ${lease.guest.name} <${lease.guest.email}>. Term was ${lease.startDate} ` +
      `to ${lease.endDate}. Deposit status: ${lease.depositStatus ?? "none"} — NOT auto-refunded.`,
    // Telegram is third-party: name only, never contact details.
    telegramText:
      `Hold released: ${lease.property.name}, ${lease.guest.name}. ${reason}. ` +
      `Deposit ${lease.depositStatus ?? "none"} — refund decision pending.`,
    context: { leaseId: lease.id, guestId: lease.guest.id, kind: "ESCALATION" },
  });

  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "LEASE_HOLD_RELEASED",
    scheduleSeq: null,
    status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent,
  });
}

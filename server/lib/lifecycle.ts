// server/lib/lifecycle.ts
// =============================================================================
// Guest lifecycle automation (Phase 7) — the co-living equivalent of TRAD's
// bookingEmailCoordinator spine. Templated, variable-substituted, admin-editable
// (LIFECYCLE_TEMPLATES is data), idempotent (every send is recorded in
// lifecycle_events and never repeats), and driven by the existing payment paths
// + the daily scheduler.
//
// Events:
//   onLeaseActivated()   — fired from finalizeFirstPayment: guest welcome +
//                          full schedule recap, and an admin new-lease notice.
//   onPaymentReceived()  — fired on each successful rent charge: a receipt
//                          (idempotent per installment).
//   runLeaseEndingNotices() — daily scheduler: ~14 days before end_date, a
//                          lease-ending notice with a renewal nudge (once).
//
// Sends go through the env-gated notifications layer (dry-run + log without
// creds), so the whole spine runs/tests without live email/SMS.
// =============================================================================

import { storage } from "../storage";
import { notifyGuest, sendEmail } from "./notifications";
import { LEASE_ENDING_NOTICE_DAYS } from "@shared/schema";
import { log } from "../server-log";
import type { Lease, Property, Guest, PaymentScheduleRow } from "@shared/schema";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

/** Days from `today` until `date` (positive = future). */
export function daysUntil(date: string, today: string): number {
  const t = new Date(`${today}T00:00:00Z`).getTime();
  const d = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((d - t) / MS_PER_DAY);
}

// ---------------------------------------------------------------------------
// Admin-editable templates (data — an admin surface can override these). Each is
// a function of substitution vars so callers never hand-format copy.
// ---------------------------------------------------------------------------

export const LIFECYCLE_TEMPLATES = {
  welcome: (v: { name: string; property: string; start: string }) => ({
    subject: `Welcome to ${v.property} 🎉`,
    body:
      `Hi ${v.name}, welcome! Your lease at ${v.property} is active and your move-in date is ` +
      `${v.start}. We're glad to have you. Your full payment schedule and signed lease are in your ` +
      `guest portal. Reach out anytime through the portal with questions or maintenance requests.`,
  }),
  scheduleRecap: (v: { name: string; total: string; rows: string; portalUrl: string }) => ({
    subject: "Your lease payment schedule",
    body:
      `Hi ${v.name}, here is your full payment schedule (total ${v.total}):\n\n${v.rows}\n\n` +
      `Payments on a saved card are charged automatically on each due date. Manage everything in ` +
      `your portal: ${v.portalUrl}`,
  }),
  adminNewLease: (v: { property: string; guest: string; start: string; end: string; total: string }) => ({
    subject: `New co-living lease — ${v.property}`,
    body:
      `New lease activated at ${v.property}. Guest: ${v.guest}. Term: ${v.start} → ${v.end}. ` +
      `Total lease value: ${v.total}.`,
  }),
  paymentReceipt: (v: { name: string; amount: string; seq: number; property: string }) => ({
    subject: `Payment received — ${v.property}`,
    body:
      `Hi ${v.name}, we received your rent payment of ${v.amount} (installment #${v.seq}) for ` +
      `${v.property}. Thank you! A record is available in your portal.`,
  }),
  depositReceipt: (v: { name: string; amount: string; property: string; room: string }) => ({
    subject: `Your room is secured — ${v.property} 🔒`,
    body:
      `Hi ${v.name}, we received your refundable security deposit of ${v.amount} — your room ` +
      `(${v.room}) at ${v.property} is now secured. The deposit is held and returned at the end ` +
      `of your lease per the agreement. Your first week's rent is charged next; the full schedule ` +
      `is in your portal.`,
  }),
  leaseEnding: (v: { name: string; property: string; end: string; days: number; portalUrl: string }) => ({
    subject: `Your lease ends in ${v.days} days`,
    body:
      `Hi ${v.name}, your lease at ${v.property} ends on ${v.end} (${v.days} days away). If you'd ` +
      `like to renew or extend, reply or reach out through your portal: ${v.portalUrl}. We'd love ` +
      `to have you stay.`,
  }),
};

function portalUrl(lease: Lease): string {
  return lease.portalToken ? `${publicBaseUrl()}/portal/${lease.portalToken}` : `${publicBaseUrl()}/lookup`;
}

// ---------------------------------------------------------------------------
// Event: lease activated (called from finalizeFirstPayment)
// ---------------------------------------------------------------------------

export async function onLeaseActivated(leaseId: string): Promise<void> {
  const lease = await storage.getLease(leaseId);
  if (!lease) return;
  const [property, guest, schedule] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getScheduleByLease(lease.id),
  ]);
  if (!property || !guest) return;

  // Welcome (once).
  if (!(await storage.hasLifecycleEvent(lease.id, "COLIVING_WELCOME", null))) {
    const tpl = LIFECYCLE_TEMPLATES.welcome({ name: guest.name, property: property.name, start: lease.startDate });
    const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_WELCOME",
      scheduleSeq: null,
      status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent,
    });
  }

  // Schedule recap (once).
  if (!(await storage.hasLifecycleEvent(lease.id, "COLIVING_SCHEDULE_RECAP", null))) {
    const rows = schedule
      .map((s) => `  #${s.scheduleSeq}  ${s.dueDate}  ${fmtMoney(parseFloat(s.amount))}`)
      .join("\n");
    const tpl = LIFECYCLE_TEMPLATES.scheduleRecap({
      name: guest.name,
      total: fmtMoney(parseFloat(lease.totalLeaseValue)),
      rows,
      portalUrl: portalUrl(lease),
    });
    const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_SCHEDULE_RECAP",
      scheduleSeq: null,
      status: sent.email.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent,
    });
  }

  // Admin notice (once) — to the configured admin email.
  if (!(await storage.hasLifecycleEvent(lease.id, "COLIVING_ADMIN_NEW_LEASE", null))) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewLease({
      property: property.name,
      guest: guest.name,
      start: lease.startDate,
      end: lease.endDate,
      total: fmtMoney(parseFloat(lease.totalLeaseValue)),
    });
    const adminEmail = process.env.ADMIN_EMAIL;
    const res = adminEmail
      ? await sendEmail({ to: adminEmail, subject: tpl.subject, text: tpl.body })
      : { sent: false };
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_ADMIN_NEW_LEASE",
      scheduleSeq: null,
      status: res.sent ? "SENT" : "SKIPPED",
      emailSent: res.sent,
      smsSent: false,
    });
  }

  log(`lifecycle: activation emails processed for lease ${lease.id}`, "lifecycle");
}

// ---------------------------------------------------------------------------
// Event: payment received (called on each successful rent charge)
// ---------------------------------------------------------------------------

export async function onPaymentReceived(args: {
  lease: Lease;
  property: Property;
  guest: Guest;
  scheduleRow: Pick<PaymentScheduleRow, "scheduleSeq" | "amount">;
}): Promise<void> {
  const { lease, property, guest, scheduleRow } = args;
  if (await storage.hasLifecycleEvent(lease.id, "PAYMENT_RECEIPT", scheduleRow.scheduleSeq)) return;

  const tpl = LIFECYCLE_TEMPLATES.paymentReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(scheduleRow.amount)),
    seq: scheduleRow.scheduleSeq,
    property: property.name,
  });
  const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "PAYMENT_RECEIPT",
    scheduleSeq: scheduleRow.scheduleSeq,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent,
  });
}

// ---------------------------------------------------------------------------
// Event: deposit received — the room is secured (called from finalizeDepositPayment)
// ---------------------------------------------------------------------------

export async function onDepositReceived(args: {
  lease: Lease;
  property: Property;
  guest: Guest;
}): Promise<void> {
  const { lease, property, guest } = args;
  if (await storage.hasLifecycleEvent(lease.id, "DEPOSIT_RECEIPT", null)) return;

  const rooms = await storage.getLeaseRooms(lease.id);
  const roomNames = rooms.map((r) => r.roomNameSnapshot).join(", ") || "your room";
  const tpl = LIFECYCLE_TEMPLATES.depositReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(lease.depositAmountSnapshot ?? "0")),
    property: property.name,
    room: roomNames,
  });
  const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "DEPOSIT_RECEIPT",
    scheduleSeq: null,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent,
  });
}

// ---------------------------------------------------------------------------
// Scheduler: lease-ending notices (~14 days before end_date)
// ---------------------------------------------------------------------------

export async function runLeaseEndingNotices(today: string = ymd(new Date())): Promise<number> {
  let sent = 0;
  const leases = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases) {
    const until = daysUntil(lease.endDate, today);
    // Fire when within the notice window (<= 14 days out, still in the future).
    if (until > LEASE_ENDING_NOTICE_DAYS || until < 0) continue;
    if (await storage.hasLifecycleEvent(lease.id, "LEASE_ENDING_SOON", null)) continue;

    const [property, guest] = await Promise.all([
      storage.getProperty(lease.propertyId),
      storage.getGuest(lease.guestId),
    ]);
    if (!property || !guest) continue;

    const tpl = LIFECYCLE_TEMPLATES.leaseEnding({
      name: guest.name,
      property: property.name,
      end: lease.endDate,
      days: until,
      portalUrl: portalUrl(lease),
    });
    const res = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "LEASE_ENDING_SOON",
      scheduleSeq: null,
      status: res.email.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
      smsSent: res.sms.sent,
    });
    sent += 1;
  }
  if (sent > 0) log(`lifecycle: ${sent} lease-ending notice(s) sent`, "scheduler");
  return sent;
}

function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beniceproperties.vercel.app")
  );
}

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
import { notifyGuest, notifyAdmin } from "./notifications";
import { LEASE_ENDING_NOTICE_DAYS } from "@shared/schema";
import { log } from "../server-log";
import type { Booking, Lease, Property, Room, Guest, PaymentScheduleRow } from "@shared/schema";

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
  depositReceipt: (v: { name: string; amount: string; property: string; room: string; portalUrl: string }) => ({
    subject: `Your room is secured — ${v.property} 🔒`,
    body:
      `Hi ${v.name}, we received your refundable security deposit of ${v.amount} — your room ` +
      `(${v.room}) at ${v.property} is now secured and held for you. The deposit is returned at the ` +
      `end of your lease per the agreement.\n\n` +
      `One last step to activate your lease: upload a photo of your driver's license from your portal ` +
      `so we can verify your identity. Once we approve it, your lease goes active and your first ` +
      `week's rent is charged. Upload here: ${v.portalUrl}`,
  }),
  // --- Short-stay bookings (no lease: STR nightly, or a 7–28-night co-living stay) ---
  bookingConfirmed: (v: {
    name: string;
    property: string;
    room: string | null;
    checkIn: string;
    checkOut: string;
    reference: string;
    total: string;
    lookupUrl: string;
  }) => ({
    subject: `You're booked — ${v.property}${v.room ? `, ${v.room}` : ""} (${v.reference})`,
    body:
      `Hi ${v.name}, your stay at ${v.property}${v.room ? ` (${v.room})` : ""} is confirmed for ${v.checkIn} to ${v.checkOut}. ` +
      `Reference ${v.reference}, paid ${v.total}. Check-in details arrive the day before arrival. ` +
      `View your booking anytime: ${v.lookupUrl}`,
  }),
  adminNewBooking: (v: {
    property: string;
    room: string | null;
    guest: string;
    email: string;
    phone: string;
    checkIn: string;
    checkOut: string;
    reference: string;
    total: string;
    status: string;
  }) => ({
    subject: `${v.status === "CONFLICT" ? "⚠️ CONFLICT — " : ""}New booking — ${v.property}${v.room ? ` ${v.room}` : ""} ${v.checkIn}→${v.checkOut}`,
    body: `${v.guest} (${v.email}${v.phone ? `, ${v.phone}` : ""}) · ${v.reference} · ${v.total}${v.status === "CONFLICT" ? "\n\nDATES WERE ALREADY TAKEN. Booking saved as CONFLICT (paid, not blocking). Resolve in the admin console: confirm, or cancel + refund." : ""}`,
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
  if (!(await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_WELCOME", null))) {
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
  if (!(await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_SCHEDULE_RECAP", null))) {
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
  if (!(await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_ADMIN_NEW_LEASE", null))) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewLease({
      property: property.name,
      guest: guest.name,
      start: lease.startDate,
      end: lease.endDate,
      total: fmtMoney(parseFloat(lease.totalLeaseValue)),
    });
    // Email + Telegram fan-out (one call, not a second raw sendEmail — the
    // lifecycle_events row below is still the single dedupe guard).
    const res = await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
      context: { leaseId: lease.id, guestId: guest.id, kind: "LEASE_ACTIVATED" },
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_ADMIN_NEW_LEASE",
      scheduleSeq: null,
      status: res.email.sent || res.telegram.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
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
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "PAYMENT_RECEIPT", scheduleRow.scheduleSeq)) return;

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
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "DEPOSIT_RECEIPT", null)) return;

  const rooms = await storage.getLeaseRooms(lease.id);
  const roomNames = rooms.map((r) => r.roomNameSnapshot).join(", ") || "your room";
  const tpl = LIFECYCLE_TEMPLATES.depositReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(lease.depositAmountSnapshot ?? "0")),
    property: property.name,
    room: roomNames,
    portalUrl: portalUrl(lease),
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
// Event: short-stay booking confirmed (called from the materialize path and the
// checkout.session.completed webhook branch)
// ---------------------------------------------------------------------------

/** "Room 2 — Garden" when a room number is set, else just the room name. */
function roomDisplayName(room?: Room | null): string | null {
  if (!room) return null;
  return room.roomNumber ? `Room ${room.roomNumber} — ${room.name}` : room.name;
}

/** Guest lookup page for a booking with no lease/portal token. */
function bookingLookupUrl(): string {
  return `${process.env.PUBLIC_BASE_URL ?? "https://beniceproperties.vercel.app"}/lookup`;
}

/**
 * Confirmation fan-out for a short-stay booking (STR nightly or a 7–28-night
 * co-living stay — neither has a lease, so idempotency keys on the BOOKING).
 *
 * - Guest confirmation: sent unless the `guest_auto_notifications` setting is
 *   explicitly "false" (unset = ON), and NEVER for a CONFLICT booking — a paid
 *   booking whose dates were taken is not a confirmation until an admin resolves
 *   it. A suppressed send still records a SKIPPED lifecycle_events row so it
 *   can't fire later behind the operator's back.
 * - Admin alert: ALWAYS, so nothing paid goes unseen.
 *
 * Both are idempotent via lifecycle_events (bookingId, eventType, null).
 */
export async function onBookingConfirmed(args: {
  booking: Booking;
  property: Property;
  room?: Room | null;
  guest: Guest;
}): Promise<void> {
  const { booking, property, room, guest } = args;
  const isConflict = booking.status === "CONFLICT";
  const roomLabel = roomDisplayName(room);
  const total = fmtMoney(parseFloat(booking.quotedTotal));

  // --- Guest confirmation (settings-gated, never on a conflict) ---
  // A CONFLICT booking records NOTHING here: the guest send has to stay possible
  // for when an admin later confirms it, and a SKIPPED row would permanently
  // suppress it.
  if (
    !isConflict &&
    !(await storage.hasLifecycleEvent({ bookingId: booking.id }, "BOOKING_CONFIRMED", null))
  ) {
    // Unset/any-other-value = ON. Only the literal "false" disables guest sends.
    const autoSetting = await storage.getSetting("guest_auto_notifications");
    const guestSendsOn = autoSetting?.value !== "false";

    if (guestSendsOn) {
      const tpl = LIFECYCLE_TEMPLATES.bookingConfirmed({
        name: guest.name,
        property: property.name,
        room: roomLabel,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut ?? "",
        reference: booking.reference,
        total,
        lookupUrl: bookingLookupUrl(),
      });
      const sent = await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: tpl.subject,
        body: tpl.body,
        context: { bookingId: booking.id, guestId: guest.id, kind: "BOOKING_CONFIRMED" },
      });
      await storage.recordLifecycleEvent({
        bookingId: booking.id,
        leaseId: null,
        eventType: "BOOKING_CONFIRMED",
        scheduleSeq: null,
        status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
        emailSent: sent.email.sent,
        smsSent: sent.sms.sent,
      });
    } else {
      await storage.recordLifecycleEvent({
        bookingId: booking.id,
        leaseId: null,
        eventType: "BOOKING_CONFIRMED",
        scheduleSeq: null,
        status: "SKIPPED",
        emailSent: false,
        smsSent: false,
      });
    }
  }

  // --- Admin alert (always) ---
  if (!(await storage.hasLifecycleEvent({ bookingId: booking.id }, "ADMIN_NEW_BOOKING", null))) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
      property: property.name,
      room: roomLabel,
      guest: guest.name,
      email: guest.email,
      phone: guest.phone ?? "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut ?? "",
      reference: booking.reference,
      total,
      status: booking.status,
    });
    const res = await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
      context: {
        bookingId: booking.id,
        guestId: guest.id,
        kind: isConflict ? "BOOKING_CONFLICT" : "ADMIN_NEW_BOOKING",
      },
    });
    await storage.recordLifecycleEvent({
      bookingId: booking.id,
      leaseId: null,
      eventType: "ADMIN_NEW_BOOKING",
      scheduleSeq: null,
      status: res.email.sent || res.telegram.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
      smsSent: false,
    });
  }

  log(`lifecycle: booking ${booking.reference} (${booking.status}) notifications processed`, "lifecycle");
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
    if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "LEASE_ENDING_SOON", null)) continue;

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
    "https://www.beniceproperties.com"
  );
}

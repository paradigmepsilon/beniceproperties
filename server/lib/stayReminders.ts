// server/lib/stayReminders.ts
// =============================================================================
// The three scheduled passes over short stays:
//
//   runStayGhostSweep       nudge, then auto-decline + refund after 72h SILENCE
//   runStayCheckoutReminders 2 days out (with the extension offer) and 1 day out
//   runStayPreArrival        day-before check-in details for an ungated stay
//
// TWO CLOCKS, DELIBERATELY DIFFERENT (this is the crux of the file):
//
//   Nudges use a DAY WINDOW. A skipped cron run must not lose a courtesy
//   message, so `>= 1 && < 3` plus the date-less lifecycle_events guard means
//   the first run inside the window sends and the rest are no-ops.
//
//   The auto-decline uses STRICT ELAPSED HOURS (>= 72). It refunds real money
//   against a promise made to the guest, so it must never fire EARLY. The cost
//   is that on a daily 08:00 UTC cron it can fire up to ~24h LATE — which is why
//   every message says "3 days" and names a date, never "72 hours".
//   Same shape as leaseHolds.ts's ABANDONED_HOURS.
//
// THREE GUARDS ON THE MONEY, any one of which stops a refund:
//
//   1. The QUERY only returns stays where the GUEST still owes us something.
//      A guest who submitted everything at hour 2 and is waiting on an admin at
//      hour 73 is excluded structurally, not by an ordering decision in a loop.
//   2. `checkIn > today`. Declining a FUTURE booking is always safe — nobody is
//      in the room and a full refund is complete and correct. Once check-in has
//      arrived, no money moves, ever: a HIGH escalation is raised instead.
//   3. `guest_auto_notifications === "false"` suppresses the decline as well as
//      the nudge. Otherwise an operator quietly turning guest messages off would
//      cause paying guests to be refunded and released having never been told
//      what was needed.
//
// Guard 2 has its OWN trigger, not an `else` on the deadline: a booking made
// today for tomorrow reaches check-in at hour ~24, long before hour 72, and must
// be escalated then rather than sailing through arrival unnoticed.
// =============================================================================

import { storage } from "../storage";
import { todayIso, addDaysIso, daysUntil } from "@shared/dates";
import { GUEST_AUTO_NOTIFICATIONS_SETTING } from "@shared/schema";
import { GATE_DOCS_DEADLINE_HOURS } from "./gateToken";
import { declineAndRefundBooking } from "./bookingGateDecline";
import {
  onStayCheckoutReminder,
  onStrPreArrival,
  outstandingItems,
  guestDocsSubmitted,
  type StayContext,
} from "./stayLifecycle";
import { notifyGuest, notifyAdmin } from "./notifications";
import { stayGhostNudge } from "./stayTemplates";
import { resolveStayAccessInfo, missingAccessFields } from "./accessInfo";
import { smsLink } from "./smsLinks";
import { stayUrl } from "./publicUrl";
import { roomDisplayName } from "./formatShared";
import { isGatedStay } from "@shared/bookingGate";
import { log } from "../server-log";
import type { GateStayRow } from "../storage";

const MS_PER_HOUR = 60 * 60 * 1000;

export interface GhostSweepResult {
  nudged: number;
  declined: number;
  refundFailed: number;
  escalatedAtCheckIn: number;
  suppressed: number;
}

export interface CheckoutReminderResult {
  sent48: number;
  sent24: number;
}

export interface PreArrivalResult {
  sent: number;
  blocked: number;
}

async function guestSendsEnabled(): Promise<boolean> {
  const setting = await storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING);
  return setting?.value !== "false";
}

const toContext = (stay: GateStayRow): StayContext => ({
  booking: stay,
  gate: stay.gate,
  guest: stay.guest,
  property: stay.property,
  room: stay.room,
});

/** A friendly date for guest copy: "Friday 2 October". Never an hour count. */
export function friendlyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

// ---------------------------------------------------------------------------
// 1. Ghost sweep — nudge, escalate, or decline
// ---------------------------------------------------------------------------

export async function runStayGhostSweep(opts?: {
  now?: Date;
  today?: string;
}): Promise<GhostSweepResult> {
  const now = opts?.now ?? new Date();
  const today = opts?.today ?? todayIso(now);
  const result: GhostSweepResult = {
    nudged: 0,
    declined: 0,
    refundFailed: 0,
    escalatedAtCheckIn: 0,
    suppressed: 0,
  };

  // Guard 1 lives in this query: it returns only stays where the GUEST still
  // owes something. See storage.getStaysAwaitingDocs.
  const stays = await storage.getStaysAwaitingDocs();
  if (stays.length === 0) return result;

  const sendsOn = await guestSendsEnabled();

  for (const stay of stays) {
    const outstanding = outstandingItems(stay.gate);

    // Defensive: the query should already exclude these, but this is the money
    // path, so the invariant is re-checked rather than assumed.
    if (guestDocsSubmitted(stay.gate)) continue;

    // --- Guard 2, on its OWN trigger. Check-in has arrived and we still do not
    // know who this is. NO MONEY MOVES. A human decides.
    if (daysUntil(stay.checkIn, today) <= 0) {
      const raised = await storage.raiseEscalationOnce({
        bookingId: stay.id,
        leaseId: null,
        kind: "GATE_INCOMPLETE_AT_CHECKIN",
        severity: "HIGH",
        detail:
          `Booking ${stay.reference} reaches check-in (${stay.checkIn}) with documents still ` +
          `outstanding: ${outstanding.join(", ")}. The guest has PAID and the room is held. ` +
          `Approve, request a fix, or decline by hand — the sweep will NOT refund a stay that ` +
          `has already started.`,
      });
      if (raised) {
        await notifyAdmin({
          subject: `Guest arriving with no ID on file - ${stay.reference}`,
          body:
            `${stay.guest.name} arrives ${stay.checkIn} at ${stay.property.name}` +
            `${stay.room ? ` (${roomDisplayName(stay.room)})` : ""} and has still not submitted: ` +
            `${outstanding.join(", ")}. They have paid and the room is held. This needs a person.`,
          telegramText:
            `${stay.guest.name} - ${stay.property.name} - arrives ${stay.checkIn} - ` +
            `${stay.reference} - documents still missing, needs a decision`,
          context: { bookingId: stay.id, guestId: stay.guest.id, kind: "ESCALATION" },
        });
        result.escalatedAtCheckIn += 1;
      }
      continue;
    }

    const deadline = stay.gate?.docsDeadlineAt;
    if (!deadline) continue; // no clock started; nothing to enforce

    const elapsedHours = (now.getTime() - clockStart(stay).getTime()) / MS_PER_HOUR;

    // --- Guard 3 covers BOTH the nudge and the decline.
    if (!sendsOn) {
      result.suppressed += 1;
      continue;
    }

    // --- Terminal: strict elapsed hours, never early.
    if (elapsedHours >= GATE_DOCS_DEADLINE_HOURS) {
      try {
        const declined = await declineAndRefundBooking({
          bookingId: stay.id,
          actor: "system:gate-sweep",
          reason:
            `No identification or signed agreement received within ${GATE_DOCS_DEADLINE_HOURS} ` +
            `hours of being asked. Cancelled and refunded automatically.`,
          confirm: stay.reference,
          kind: "GATE_AUTO_DECLINE",
        });
        result.declined += 1;
        if (declined.failed.length > 0) result.refundFailed += 1;
      } catch (err) {
        // declineAndRefundBooking already escalates a refund failure; anything
        // thrown here is a guard rejecting the call. Log and move to the next
        // stay rather than abandoning the sweep.
        log(
          `stay ${stay.reference}: auto-decline refused — ${(err as Error).message}`,
          "scheduler",
        );
        result.refundFailed += 1;
      }
      continue;
    }

    // --- Nudges: day-windowed, so a skipped run still catches them.
    const elapsedDays = Math.floor(elapsedHours / 24);
    const round = (stay.gate?.fixRequestCount ?? 0) + 1;
    const attempt: 1 | 2 | null = elapsedDays >= 2 ? 2 : elapsedDays >= 1 ? 1 : null;
    if (!attempt) continue;

    const kind = attempt === 1 ? "STAY_GHOST_NUDGE_1" : "STAY_GHOST_NUDGE_2";
    if (await storage.hasLifecycleEvent({ bookingId: stay.id }, kind, round)) continue;

    const url = stayUrl(stay.gate);
    const tpl = stayGhostNudge({
      name: stay.guest.name,
      property: stay.property.name,
      reference: stay.reference,
      outstanding,
      stayUrl: url,
      smsUrl: await smsLink(url),
      attempt,
      deadlineDate: friendlyDate(deadlineIso(stay)),
    });
    const sent = await notifyGuest({
      email: stay.guest.email,
      phone: stay.guest.phone,
      subject: tpl.subject,
      body: tpl.body,
      smsBody: tpl.smsBody,
      context: { bookingId: stay.id, guestId: stay.guest.id, kind },
    });
    await storage.recordLifecycleEvent({
      bookingId: stay.id,
      eventType: kind,
      scheduleSeq: round,
      status: sent.email.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent,
    });
    result.nudged += 1;
  }

  if (result.nudged || result.declined || result.escalatedAtCheckIn || result.refundFailed) {
    log(
      `stay gate sweep: ${result.nudged} nudged, ${result.declined} auto-declined, ` +
        `${result.escalatedAtCheckIn} escalated at check-in, ${result.refundFailed} refund issues`,
      "scheduler",
    );
  }
  return result;
}

/**
 * When the silence clock started: the last time WE asked, not when they booked.
 * A fix request restarts it, so a guest bounced at hour 60 gets a fresh 72 hours
 * rather than 12.
 */
function clockStart(stay: GateStayRow): Date {
  return stay.gate?.fixRequestedAt ?? stay.gate?.createdAt ?? stay.createdAt;
}

/** The deadline as a calendar date, for copy that must name a day. */
function deadlineIso(stay: GateStayRow): string {
  const deadline = stay.gate?.docsDeadlineAt;
  return deadline ? new Date(deadline).toISOString().slice(0, 10) : todayIso();
}

// ---------------------------------------------------------------------------
// 2. Checkout reminders — 2 days out, then 1 day out
// ---------------------------------------------------------------------------

export async function runStayCheckoutReminders(
  today: string = todayIso(),
): Promise<CheckoutReminderResult> {
  const result: CheckoutReminderResult = { sent48: 0, sent24: 0 };

  // Window the query, don't scan. Open-ended stays (null check_out) are excluded
  // in SQL — there is no checkout to remind about.
  const stays = await storage.getStaysCheckingOutBetween(today, addDaysIso(today, 2));

  for (const stay of stays) {
    if (!stay.checkOut) continue;
    // Owner decision: checkout reminders are co-living only. A whole-property STR
    // guest gets pre-arrival details and nothing else.
    if (!isGatedStay({ model: stay.model, checkIn: stay.checkIn, checkOut: stay.checkOut })) {
      continue;
    }

    const d = daysUntil(stay.checkOut, today);
    const ctx = toContext(stay);
    const cycle = stay.gate?.extensionCount ?? 0;
    const accessInfo = await resolveStayAccessInfo({
      gate: stay.gate,
      property: stay.property,
      room: stay.room,
    });
    const extension = await extensionAvailability(stay);

    // The two windows OVERLAP and the `continue` makes them exclusive per pass:
    //   normal run  — d=2 sends 48h, d=1 sends 24h
    //   one skipped — at d=1 the 48h fires (carrying the money-bearing offer),
    //                 and the 24h follows the next day. Nothing is lost.
    //   two skipped — at d=0 only the 24h fires, which is why BOTH templates
    //                 carry the extension link.
    if (d >= 1 && d <= 2) {
      if (!(await storage.hasLifecycleEvent({ bookingId: stay.id }, "STAY_CHECKOUT_48H", cycle))) {
        const sent = await onStayCheckoutReminder(ctx, {
          kind: "STAY_CHECKOUT_48H",
          checkOutBy: accessInfo.checkOutBy,
          extendAvailable: extension.available,
          maxExtraNights: extension.maxExtraNights,
        });
        if (sent) result.sent48 += 1;
        continue;
      }
    }
    if (d >= 0 && d <= 1) {
      if (!(await storage.hasLifecycleEvent({ bookingId: stay.id }, "STAY_CHECKOUT_24H", cycle))) {
        const sent = await onStayCheckoutReminder(ctx, {
          kind: "STAY_CHECKOUT_24H",
          checkOutBy: accessInfo.checkOutBy,
          extendAvailable: extension.available,
          maxExtraNights: extension.maxExtraNights,
        });
        if (sent) result.sent24 += 1;
      }
    }
  }

  if (result.sent48 || result.sent24) {
    log(`stay checkout reminders: ${result.sent48} at 2d, ${result.sent24} at 1d`, "scheduler");
  }
  return result;
}

/**
 * How many more nights this room is actually free for, capped at a week.
 * Never offer an extension we cannot honour — a dead offer in a reminder is
 * worse than no offer.
 */
async function extensionAvailability(
  stay: GateStayRow,
): Promise<{ available: boolean; maxExtraNights: number }> {
  if (!stay.roomId || !stay.checkOut) return { available: false, maxExtraNights: 0 };
  let nights = 0;
  for (let n = 1; n <= 7; n += 1) {
    const candidate = addDaysIso(stay.checkOut, n);
    const free = await storage.isRoomAvailableForRange({
      roomId: stay.roomId,
      startDate: stay.checkOut,
      endDate: candidate,
      endExclusive: true,
      excludeBookingId: stay.id,
    });
    if (!free) break;
    nights = n;
  }
  return { available: nights > 0, maxExtraNights: nights };
}

// ---------------------------------------------------------------------------
// 3. Pre-arrival — the promise the confirmation email has always made
// ---------------------------------------------------------------------------

export async function runStayPreArrival(today: string = todayIso()): Promise<PreArrivalResult> {
  const result: PreArrivalResult = { sent: 0, blocked: 0 };
  // Day-before, with a same-day catch-up so a skipped run is not a silent miss.
  const stays = await storage.getStaysCheckingInBetween(today, addDaysIso(today, 1));

  for (const stay of stays) {
    const d = daysUntil(stay.checkIn, today);
    if (d !== 1 && d !== 0) continue;
    // Gated stays get their arrival details in the WELCOME letter at approval.
    // Sending both would be duplicate — and confusing if the codes differed.
    if (stay.gate?.approvedAt) continue;
    if (isGatedStay({ model: stay.model, checkIn: stay.checkIn, checkOut: stay.checkOut })) continue;

    const info = await resolveStayAccessInfo({
      gate: stay.gate,
      property: stay.property,
      room: stay.room,
    });
    const missing = missingAccessFields(info, { requireDoorCode: false });
    if (missing.length > 0) {
      // CRITICAL: do NOT record a lifecycle event here. lifecycle_events has no
      // date in its key, so a SKIPPED row would permanently consume the slot and
      // the guest would never receive check-in details even after an operator
      // fills the property in. Escalate instead — raiseEscalationOnce dedupes the
      // nag without touching the guest's slot.
      const raised = await storage.raiseEscalationOnce({
        bookingId: stay.id,
        leaseId: null,
        kind: "ACCESS_INFO_MISSING",
        severity: "HIGH",
        // FIELD NAMES ONLY — never the values of the fields that ARE set.
        detail:
          `Guest arrives ${stay.checkIn} at ${stay.property.name} but the check-in details ` +
          `cannot be sent: missing ${missing.join(", ")}. Fill these in and the next sweep ` +
          `will send them.`,
      });
      if (raised) {
        await notifyAdmin({
          subject: `Cannot send check-in details - ${stay.property.name} ${stay.checkIn}`,
          body:
            `${stay.guest.name} arrives ${stay.checkIn} at ${stay.property.name}, but the ` +
            `property is missing: ${missing.join(", ")}. Nothing has been sent to the guest.`,
          telegramText:
            `${stay.guest.name} - ${stay.property.name} - arrives ${stay.checkIn} - ` +
            `access info missing (${missing.join(", ")})`,
          context: { bookingId: stay.id, guestId: stay.guest.id, kind: "ESCALATION" },
        });
      }
      result.blocked += 1;
      continue;
    }

    if (await onStrPreArrival(toContext(stay))) result.sent += 1;
  }

  if (result.sent || result.blocked) {
    log(`stay pre-arrival: ${result.sent} sent, ${result.blocked} blocked on missing info`, "scheduler");
  }
  return result;
}

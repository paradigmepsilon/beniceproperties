// server/lib/stayLifecycle.ts
// =============================================================================
// The short-stay equivalent of lifecycle.ts: every event-driven message the
// approval gate sends. Same four-step dispatch shape as its lease sibling, so
// the two read alike:
//
//   1. guard   — hasLifecycleEvent(...) ? return
//   2. compose — a pure template function
//   3. send    — notifyGuest / notifyAdmin (these never throw)
//   4. record  — recordLifecycleEvent, ALWAYS, even on a failed or dry-run send
//
// Step 4 running unconditionally is deliberate and inherited: a dry-run consumes
// the slot, so an unconfigured environment cannot queue up a burst of real
// messages the first time credentials appear.
//
// DIRECTION OF DEPENDENCY. lifecycle.ts must never import this file. The branch
// between the two lives in materialize.ts, which already has an injectable deps
// interface built for exactly that. Both files depend only on shared primitives
// (formatShared, @shared/dates), which is why those were extracted first.
//
// scheduleSeq IS A ROUND COUNTER HERE, not an installment. lifecycle_events has
// no date in its dedupe key, so a message that must be sendable more than once
// per booking keys on a monotonic ordinal instead:
//   - fix-request loop  → booking_gate.fix_request_count
//   - checkout reminders → booking_gate.extension_count
// Without that, a guest bounced twice would get no second nudge before being
// auto-declined, and an extended stay would never be reminded about checkout.
// =============================================================================

import { storage } from "../storage";
import { notifyGuest, notifyAdmin } from "./notifications";
import { fmtMoney, roomDisplayName } from "./formatShared";
import { GUEST_AUTO_NOTIFICATIONS_SETTING } from "@shared/schema";
import { stayNights } from "@shared/bookingGate";
import { log } from "../server-log";
import * as T from "./stayTemplates";
import { resolveStayAccessInfo, renderAccessInfoText, renderAccessInfoRedacted } from "./accessInfo";
import { smsLink } from "./smsLinks";
import { houseRulesUrl, publicBaseUrl, stayUrl, stayExtendUrl } from "./publicUrl";
import type { Booking, BookingGate, Guest, Property, Room } from "@shared/schema";

/** The shape every handler here works from. */
export interface StayContext {
  booking: Booking;
  gate: BookingGate | null;
  guest: Guest;
  property: Property;
  room: Room | null;
}

/**
 * Guest sends are suppressible by an operator (`guest_auto_notifications`).
 * Unset means ON; only the literal "false" disables — matching lifecycle.ts, and
 * failing OPEN so a missing row never silences the app.
 */
async function guestSendsEnabled(): Promise<boolean> {
  const setting = await storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING);
  return setting?.value !== "false";
}

/** Human labels for what the guest still owes us, in the order we ask for them. */
export function outstandingItems(gate: BookingGate | null): string[] {
  const items: string[] = [];
  if (!gate?.agreementSignedAt) items.push("your signed rental agreement");
  if (!gate || !["PENDING_REVIEW", "APPROVED"].includes(gate.verificationStatus)) {
    items.push("a photo of your driver's licence");
  }
  return items;
}

/** True when the GUEST has done their part — the admin may still be reviewing. */
export function guestDocsSubmitted(gate: BookingGate | null): boolean {
  return outstandingItems(gate).length === 0;
}

/**
 * Send + record in one place so no handler can do one without the other.
 * `logBody` is threaded through for the two credential-bearing messages.
 */
async function sendGuest(
  ctx: StayContext,
  kind: string,
  tpl: T.StayTemplate,
  scheduleSeq: number | null = null,
): Promise<boolean> {
  if (await storage.hasLifecycleEvent({ bookingId: ctx.booking.id }, kind, scheduleSeq)) {
    return false;
  }
  const enabled = await guestSendsEnabled();
  if (!enabled) {
    // Record a SKIPPED row so a suppressed message cannot fire later, behind the
    // operator's back, the moment the setting is flipped again.
    await storage.recordLifecycleEvent({
      bookingId: ctx.booking.id,
      eventType: kind,
      scheduleSeq,
      status: "SKIPPED",
      emailSent: false,
      smsSent: false,
    });
    return false;
  }
  const sent = await notifyGuest({
    email: ctx.guest.email,
    phone: ctx.guest.phone,
    subject: tpl.subject,
    body: tpl.body,
    smsBody: tpl.smsBody,
    logBody: tpl.logBody,
    context: { bookingId: ctx.booking.id, guestId: ctx.guest.id, kind },
  });
  await storage.recordLifecycleEvent({
    bookingId: ctx.booking.id,
    eventType: kind,
    scheduleSeq,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent,
  });
  return sent.email.sent;
}

async function sendAdmin(
  ctx: StayContext,
  kind: string,
  tpl: T.StayTemplate,
  scheduleSeq: number | null = null,
): Promise<void> {
  if (await storage.hasLifecycleEvent({ bookingId: ctx.booking.id }, kind, scheduleSeq)) return;
  await notifyAdmin({
    subject: tpl.subject,
    body: tpl.body,
    telegramText: tpl.telegramText,
    context: { bookingId: ctx.booking.id, guestId: ctx.guest.id, kind },
  });
  await storage.recordLifecycleEvent({
    bookingId: ctx.booking.id,
    eventType: kind,
    scheduleSeq,
    status: "SENT",
    emailSent: true,
    smsSent: false,
  });
}

/** Common template vars, so no handler assembles a URL or a room label by hand. */
async function vars(ctx: StayContext) {
  const url = stayUrl(ctx.gate);
  return {
    name: ctx.guest.name,
    property: ctx.property.name,
    room: roomDisplayName(ctx.room),
    reference: ctx.booking.reference,
    stayUrl: url,
    // Routed through the A2P 10DLC switch: when SMS links are off this is "" and
    // the template renders without one.
    smsUrl: await smsLink(url),
  };
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

/**
 * A gated booking has just materialized. Tells the guest their money landed,
 * their dates are held, and exactly what is still outstanding.
 */
export async function onStayBookingConfirmed(ctx: StayContext): Promise<void> {
  const v = await vars(ctx);
  const tpl = T.stayDocsRequired({
    ...v,
    checkIn: ctx.booking.checkIn,
    checkOut: ctx.booking.checkOut ?? "",
    total: fmtMoney(parseFloat(ctx.booking.quotedTotal)),
    outstanding: outstandingItems(ctx.gate),
  });
  await sendGuest(ctx, "STAY_DOCS_REQUIRED", tpl);
  log(`stay ${ctx.booking.reference}: gated — documents requested`, "lifecycle");
}

/**
 * Both documents are in. Reassures the guest and puts the reservation in front
 * of a human, over email AND Telegram.
 *
 * Keyed on the fix-request round, so a guest who is bounced and resubmits
 * re-alerts the admin instead of being silently deduped against the first pass.
 */
export async function onStayDocsComplete(ctx: StayContext): Promise<void> {
  const round = (ctx.gate?.fixRequestCount ?? 0) + 1;
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_DOCS_COMPLETE",
    T.stayDocsComplete({ ...v, checkIn: ctx.booking.checkIn }),
    round,
  );

  const signedName = ctx.gate?.agreementSignedName ?? "";
  await sendAdmin(
    ctx,
    "STAY_ADMIN_AWAITING_APPROVAL",
    T.adminStayAwaitingApproval({
      property: ctx.property.name,
      room: roomDisplayName(ctx.room),
      guest: ctx.guest.name,
      email: ctx.guest.email,
      phone: ctx.guest.phone ?? "",
      checkIn: ctx.booking.checkIn,
      checkOut: ctx.booking.checkOut ?? "",
      nights: stayNights(ctx.booking.checkIn, ctx.booking.checkOut ?? ctx.booking.checkIn),
      reference: ctx.booking.reference,
      total: fmtMoney(parseFloat(ctx.booking.quotedTotal)),
      signedName,
      // The substance of the review, surfaced rather than left for the admin to
      // spot. Same comparison the lease verification queue already makes.
      nameMismatch:
        signedName.trim().toLowerCase() !== ctx.guest.name.trim().toLowerCase(),
      adminUrl: `${publicBaseUrl()}/admin`,
    }),
    round,
  );
  log(`stay ${ctx.booking.reference}: documents complete — awaiting approval`, "lifecycle");
}

/** An admin bounced a document. Non-terminal: the dates stay held, no money moves. */
export async function onStayFixRequested(ctx: StayContext, reason: string): Promise<void> {
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_FIX_REQUESTED",
    T.stayFixRequested({ ...v, reason }),
    ctx.gate?.fixRequestCount ?? 1,
  );
  log(`stay ${ctx.booking.reference}: fix requested`, "lifecycle");
}

/**
 * Approved — the welcome letter. THE ONLY guest message carrying live access
 * credentials, so it is the only one that supplies a `logBody`.
 */
export async function onStayApproved(ctx: StayContext): Promise<void> {
  const info = await resolveStayAccessInfo({
    gate: ctx.gate,
    property: ctx.property,
    room: ctx.room,
  });
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_APPROVED_WELCOME",
    T.stayApprovedWelcome({
      ...v,
      propertyAddress: ctx.property.address,
      checkIn: ctx.booking.checkIn,
      checkOut: ctx.booking.checkOut ?? "",
      accessText: renderAccessInfoText(info),
      accessTextRedacted: renderAccessInfoRedacted(info),
      houseRulesUrl: houseRulesUrl(),
    }),
  );
  // Deliberately never logs the code itself — see shared/doorCode.ts.
  log(`stay ${ctx.booking.reference}: approved — welcome letter sent`, "lifecycle");
}

/** Terminal: cancelled and refunded. `auto` distinguishes the sweep from a human. */
export async function onStayDeclined(
  ctx: StayContext,
  args: { reason: string | null; refundAmount: number; auto: boolean },
): Promise<void> {
  await sendGuest(
    ctx,
    "STAY_DECLINED_REFUNDED",
    T.stayDeclinedRefunded({
      name: ctx.guest.name,
      property: ctx.property.name,
      reference: ctx.booking.reference,
      reason: args.reason,
      refundAmount: fmtMoney(args.refundAmount),
      auto: args.auto,
      rebookUrl: `${publicBaseUrl()}/property/${ctx.booking.propertyId}`,
    }),
  );

  // Only the AUTOMATIC path alerts an admin. A human who just clicked decline
  // does not need to be told they clicked decline.
  if (args.auto) {
    await sendAdmin(
      ctx,
      "STAY_ADMIN_AUTO_DECLINED",
      T.adminStayAutoDeclined({
        property: ctx.property.name,
        room: roomDisplayName(ctx.room),
        guest: ctx.guest.name,
        checkIn: ctx.booking.checkIn,
        checkOut: ctx.booking.checkOut ?? "",
        reference: ctx.booking.reference,
        refundAmount: fmtMoney(args.refundAmount),
      }),
    );
  }
  log(
    `stay ${ctx.booking.reference}: declined + refunded (${args.auto ? "auto" : "admin"})`,
    "lifecycle",
  );
}

/**
 * An extension was paid and applied. Keyed on the new extension ordinal so a
 * SECOND extension sends its own confirmation.
 */
export async function onStayExtended(
  ctx: StayContext,
  args: { previousCheckOut: string; newCheckOut: string; amount: number; extensionSeq: number },
): Promise<void> {
  const addedNights = stayNights(args.previousCheckOut, args.newCheckOut);
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_EXTENDED",
    T.stayExtended({
      ...v,
      previousCheckOut: args.previousCheckOut,
      newCheckOut: args.newCheckOut,
      addedNights,
      amount: fmtMoney(args.amount),
    }),
    args.extensionSeq,
  );
  await sendAdmin(
    ctx,
    "STAY_ADMIN_EXTENDED",
    T.adminStayExtended({
      property: ctx.property.name,
      room: roomDisplayName(ctx.room),
      guest: ctx.guest.name,
      previousCheckOut: args.previousCheckOut,
      newCheckOut: args.newCheckOut,
      reference: ctx.booking.reference,
      amount: fmtMoney(args.amount),
    }),
    args.extensionSeq,
  );
  log(
    `stay ${ctx.booking.reference}: extended ${args.previousCheckOut} → ${args.newCheckOut}`,
    "lifecycle",
  );
}

/** Day-before arrival details for an ungated (STR) stay. Carries credentials. */
export async function onStrPreArrival(ctx: StayContext): Promise<boolean> {
  const info = await resolveStayAccessInfo({
    gate: ctx.gate,
    property: ctx.property,
    room: ctx.room,
  });
  return sendGuest(
    ctx,
    "STR_PRE_ARRIVAL",
    T.strPreArrival({
      name: ctx.guest.name,
      property: ctx.property.name,
      checkIn: ctx.booking.checkIn,
      reference: ctx.booking.reference,
      accessText: renderAccessInfoText(info),
      accessTextRedacted: renderAccessInfoRedacted(info),
      houseRulesUrl: houseRulesUrl(),
      stayUrl: stayUrl(ctx.gate),
    }),
  );
}

/** Checkout reminder, shared by the 48h and 24h passes. */
export async function onStayCheckoutReminder(
  ctx: StayContext,
  args: {
    kind: "STAY_CHECKOUT_48H" | "STAY_CHECKOUT_24H";
    checkOutBy: string | null;
    extendAvailable: boolean;
    maxExtraNights: number;
  },
): Promise<boolean> {
  const extendUrl = stayExtendUrl(ctx.gate);
  const smsExtendUrl = await smsLink(extendUrl);
  const common = {
    name: ctx.guest.name,
    property: ctx.property.name,
    room: roomDisplayName(ctx.room),
    checkOut: ctx.booking.checkOut ?? "",
    checkOutBy: args.checkOutBy,
    reference: ctx.booking.reference,
    extendAvailable: args.extendAvailable,
    extendUrl,
    smsExtendUrl,
  };
  const tpl =
    args.kind === "STAY_CHECKOUT_48H"
      ? T.stayCheckout48h({ ...common, maxExtraNights: args.maxExtraNights, stayUrl: stayUrl(ctx.gate) })
      : T.stayCheckout24h({ ...common, houseRulesUrl: houseRulesUrl() });
  // Keyed on the extension ordinal, so extending RE-ARMS both reminders.
  return sendGuest(ctx, args.kind, tpl, ctx.gate?.extensionCount ?? 0);
}

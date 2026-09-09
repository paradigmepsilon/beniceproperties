// server/lib/stayTemplates.ts
// =============================================================================
// Every message the short-stay approval gate sends. Pure functions of their
// substitution vars — no storage, no Stripe, no I/O — so the ratchet test can
// drive all of them with zero mocks.
//
// Kept OUT of lifecycle.ts on purpose. That file is 488 lines of lease-shaped
// lifecycle (cadence, installments, deposits); growing it with a second product
// would make both harder to read, and it would create the import cycle that
// appears the moment lifecycle needs to branch to stay handling.
//
// FOUR RULES, all enforced by bookingMessageLinks.test.ts rather than by memory:
//
//   1. smsBody is ASCII-only and <= 160 characters. A curly quote or an em dash
//      forces UCS-2 encoding, which cuts the segment to 70 and silently splits
//      or truncates the message. So: plain hyphens, plain apostrophes.
//   2. NO CREDENTIAL EVER LEAVES BY SMS, TELEGRAM, OR IN A SUBJECT. A door code,
//      wifi password, or building entry code appears only in an email body. SMS
//      says "it is in your email".
//   3. Anything asking a guest for money or action carries a LINK, and every SMS
//      link routes through smsLinks.ts (the A2P 10DLC kill switch) at the call
//      site — never a raw URL concatenated here.
//   4. An admin template that names guest contact details MUST supply
//      `telegramText` reduced to name / listing / dates / reference / amount.
//      Telegram is a third party. See notifications.ts.
//
// TIMING NOTE for anything that states a deadline: production crons run ONCE a
// day at 08:00 UTC, so the 72-hour silence deadline actually fires between 72
// and 96 hours. Guest-facing copy therefore says "3 days", never "72 hours",
// and a final warning names a DATE rather than an hour.
// =============================================================================

// Pure constants only — no server-module import, so no cycle (see header).
import { BNP_CONTACT } from "@shared/contact";

export interface StayTemplate {
  subject: string;
  body: string;
  /** ASCII, <= 160 chars. Omitted only where SMS makes no sense. */
  smsBody?: string;
  /** Redacted admin variant for Telegram. Required when body carries contact details. */
  telegramText?: string;
  /** Audit-trail copy of `body` when the real body carries credentials. */
  logBody?: string;
}

/** Human list: ["a","b"] -> "a and b"; ["a","b","c"] -> "a, b and c". */
function listOf(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const roomClause = (room: string | null) => (room ? ` (${room})` : "");

// ---------------------------------------------------------------------------
// 1. Paid, gated — here is what is still outstanding
// ---------------------------------------------------------------------------

export function stayDocsRequired(v: {
  name: string;
  property: string;
  room: string | null;
  checkIn: string;
  checkOut: string;
  reference: string;
  total: string;
  /** Human labels of what remains, e.g. ["a photo of your driver's licence"]. */
  outstanding: string[];
  stayUrl: string;
  smsUrl: string;
}): StayTemplate {
  const what = listOf(v.outstanding);
  return {
    subject: `Thanks for booking — ${v.outstanding.length} thing${
      v.outstanding.length === 1 ? "" : "s"
    } left to finish (${v.reference})`,
    body:
      `Hi ${v.name}, thank you for booking${roomClause(v.room)} at ${v.property} from ` +
      `${v.checkIn} to ${v.checkOut}. Your payment of ${v.total} has gone through and your ` +
      `dates are held.\n\n` +
      `TO COMPLETE YOUR BOOKING we still need ${what}. It takes about two minutes:\n` +
      `${v.stayUrl}\n\n` +
      `Once we have everything, we review it and confirm — that can take up to 24 hours. ` +
      `We will email you your door code and arrival details as soon as it is approved.\n\n` +
      `Reference ${v.reference}.`,
    smsBody:
      `BNP: payment received for ${v.reference}. Finish your booking (ID + agreement): ${v.smsUrl}`,
  };
}

// ---------------------------------------------------------------------------
// 2. Both documents in — under review
// ---------------------------------------------------------------------------

export function stayDocsComplete(v: {
  name: string;
  property: string;
  room: string | null;
  checkIn: string;
  reference: string;
  stayUrl: string;
  smsUrl: string;
}): StayTemplate {
  return {
    subject: `We have everything — reviewing your stay (${v.reference})`,
    body:
      `Hi ${v.name}, thanks — we have your ID and your signed agreement for ${v.property}` +
      `${roomClause(v.room)}, arriving ${v.checkIn}.\n\n` +
      `We review these by hand, which can take up to 24 hours. As soon as it is approved we ` +
      `will email your door code, wifi and directions.\n\n` +
      `Check your status anytime: ${v.stayUrl}\n\nReference ${v.reference}.`,
    smsBody: `BNP: got your ID and agreement for ${v.reference}. We confirm within 24 hours.`,
  };
}

/** Admin: a reservation is waiting on a human. Carries contact details -> redacted Telegram. */
export function adminStayAwaitingApproval(v: {
  property: string;
  room: string | null;
  guest: string;
  email: string;
  phone: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  reference: string;
  total: string;
  signedName: string;
  nameMismatch: boolean;
  adminUrl: string;
}): StayTemplate {
  const flag = v.nameMismatch ? "NAME MISMATCH - " : "";
  return {
    subject: `${flag}Stay awaiting approval - ${v.property}${roomClause(v.room)} ${v.checkIn}`,
    body:
      `${v.guest} has completed their documents and is awaiting approval.\n\n` +
      `Listing: ${v.property}${roomClause(v.room)}\n` +
      `Dates: ${v.checkIn} to ${v.checkOut} (${v.nights} nights)\n` +
      `Reference: ${v.reference}\nPaid: ${v.total}\n` +
      `Signed as: ${v.signedName}\nGuest record: ${v.guest}\n` +
      (v.nameMismatch
        ? `\n** The signed name does not match the guest record. Check the licence carefully. **\n`
        : "") +
      `\nContact: ${v.email}${v.phone ? ` / ${v.phone}` : ""}\n\n` +
      `Review the licence, confirm the name matches, and set the door code: ${v.adminUrl}`,
    // Name / listing / dates / reference / amount only — no email, no phone.
    telegramText:
      `${v.guest} - ${v.property}${roomClause(v.room)} - ${v.checkIn} to ${v.checkOut} - ` +
      `${v.reference} - ${v.total}${v.nameMismatch ? " - NAME MISMATCH" : ""} - awaiting approval`,
  };
}

// ---------------------------------------------------------------------------
// 3. Admin bounced a document (non-terminal — the dates stay held)
// ---------------------------------------------------------------------------

export function stayFixRequested(v: {
  name: string;
  property: string;
  reference: string;
  reason: string;
  stayUrl: string;
  smsUrl: string;
}): StayTemplate {
  return {
    subject: `Action needed to confirm your stay (${v.reference})`,
    body:
      `Hi ${v.name}, we need one more thing before we can confirm your stay at ${v.property}.\n\n` +
      `${v.reason}\n\n` +
      `Your dates are still held and no further payment is needed — just resubmit here:\n` +
      `${v.stayUrl}\n\n` +
      `If this is not sorted within 3 days we will cancel the booking and refund you in full.\n\n` +
      `Reference ${v.reference}.`,
    smsBody: `BNP: we need one more thing to confirm ${v.reference}. Details in your email: ${v.smsUrl}`,
  };
}

// ---------------------------------------------------------------------------
// 4. Approved — the welcome letter. THE ONLY GUEST MESSAGE CARRYING CREDENTIALS.
// ---------------------------------------------------------------------------

export function stayApprovedWelcome(v: {
  name: string;
  property: string;
  room: string | null;
  /** Street address, when the property has one on file. */
  propertyAddress?: string | null;
  checkIn: string;
  checkOut: string;
  reference: string;
  /** Rendered arrival block WITH real credentials — email body only. */
  accessText: string;
  /** The same block with credentials replaced — for the audit trail. */
  accessTextRedacted: string;
  houseRulesUrl: string;
  stayUrl: string;
  smsUrl: string;
}): StayTemplate {
  // Body follows the owner's "Welcome Email Template v3" (2026-09-09). Two
  // deliberate deviations, both to match what the app actually does: extensions
  // are made from the stay page (not "a new booking through our website"), and an
  // extension is confirmed on payment (the app applies it without a separate
  // approval step), so the template's "until approved by BNP" is not repeated.
  const shell = (access: string) =>
    `Greetings ${v.name},\n\n` +
    `We are excited to welcome you to Be Nice Properties and are looking forward to your ` +
    `arrival on ${v.checkIn}. Your reservation has been approved and your payment has been ` +
    `received. Below is your welcome information so you can get settled in comfortably when ` +
    `you arrive.\n\n` +
    `YOUR STAY\n${v.property}${roomClause(v.room)}\n` +
    (v.propertyAddress ? `${v.propertyAddress}\n` : "") +
    `Check-in: ${v.checkIn}\nCheck-out: ${v.checkOut}\nReference: ${v.reference}\n\n` +
    `GETTING IN\n${access}\n\n` +
    `HOUSE RULES\n${v.houseRulesUrl}\n\n` +
    `DURING YOUR STAY\n` +
    `If you need anything during your stay, please reach out to us at ${BNP_CONTACT.phone} or ` +
    `${BNP_CONTACT.email}, or use your stay page: ${v.stayUrl}. We want your stay to feel ` +
    `easy, comfortable, and welcoming.\n\n` +
    `EXTENSIONS & ADDITIONAL PAYMENTS\n` +
    `If you would like to extend your stay, you can do so from your stay page. We will also ` +
    `send you an extension link two days before your reservation ends, which you may use to ` +
    `request and pay for additional time.\n\n` +
    `We recommend securing your extension as soon as possible. Rooms remain available for new ` +
    `reservations until an extension is completed, so booking early helps avoid an ` +
    `interruption in your stay due to a new incoming guest.\n\n` +
    `Extensions are subject to room availability and are not confirmed until payment is ` +
    `completed. If you need to pay using an option that is not available through the stay ` +
    `page or extension link, please contact us directly for assistance.\n\n` +
    `If you have any questions before arrival, feel free to reach out. We are happy to help ` +
    `and look forward to having you with us.\n\n` +
    `Happy Moving!\n\nBest,\nBe Nice Properties Team`;
  return {
    subject: `Your Be Nice Properties Stay Details - Arrival on ${v.checkIn}`,
    body: shell(v.accessText),
    // Rule 2: the code never leaves by SMS. It points at the email instead.
    smsBody: `BNP: you are confirmed for ${v.checkIn}. Door code, wifi and directions are in your email.`,
    logBody: shell(v.accessTextRedacted),
  };
}

/** Day-before arrival details for a whole-property STR stay (no approval gate). */
export function strPreArrival(v: {
  name: string;
  property: string;
  checkIn: string;
  reference: string;
  accessText: string;
  accessTextRedacted: string;
  houseRulesUrl: string;
  stayUrl: string;
}): StayTemplate {
  const shell = (access: string) =>
    `Hi ${v.name}, you arrive tomorrow at ${v.property}. Here is everything you need.\n\n` +
    `GETTING IN\n${access}\n\n` +
    `HOUSE RULES\n${v.houseRulesUrl}\n\n` +
    `Your booking: ${v.stayUrl}\nReference ${v.reference}.\n\nSee you tomorrow.`;
  return {
    subject: `Tomorrow: everything you need to check in at ${v.property}`,
    body: shell(v.accessText),
    smsBody: `BNP: check-in is tomorrow. Your code, wifi and directions are in your email.`,
    logBody: shell(v.accessTextRedacted),
  };
}

// ---------------------------------------------------------------------------
// 5. Silence — nudges, then the terminal decline
// ---------------------------------------------------------------------------

export function stayGhostNudge(v: {
  name: string;
  property: string;
  reference: string;
  outstanding: string[];
  stayUrl: string;
  smsUrl: string;
  attempt: 1 | 2;
  /** The date the booking is cancelled if nothing arrives. Named, not "72 hours". */
  deadlineDate: string;
}): StayTemplate {
  const what = listOf(v.outstanding);
  if (v.attempt === 1) {
    return {
      subject: `Don't lose your dates — ${v.outstanding.length} thing${
        v.outstanding.length === 1 ? "" : "s"
      } left (${v.reference})`,
      body:
        `Hi ${v.name}, your booking at ${v.property} is paid and your dates are held, but we ` +
        `still need ${what} before we can confirm it.\n\n${v.stayUrl}\n\n` +
        `If we do not hear from you by ${v.deadlineDate} we will cancel the booking and refund ` +
        `you in full.\n\nReference ${v.reference}.`,
      smsBody: `BNP: ${v.reference} still needs your ID and agreement. Finish it: ${v.smsUrl}`,
    };
  }
  return {
    subject: `Last reminder — your booking is cancelled ${v.deadlineDate} (${v.reference})`,
    body:
      `Hi ${v.name}, this is the last reminder about your booking at ${v.property}.\n\n` +
      `We still need ${what}. If it is not submitted by ${v.deadlineDate} the booking will be ` +
      `cancelled and your payment refunded in full, and the dates will go back on sale.\n\n` +
      `${v.stayUrl}\n\nReference ${v.reference}.`,
    smsBody: `BNP: last call on ${v.reference}. Send your ID and agreement or we cancel: ${v.smsUrl}`,
  };
}

export function stayDeclinedRefunded(v: {
  name: string;
  property: string;
  reference: string;
  reason: string | null;
  refundAmount: string;
  auto: boolean;
  rebookUrl: string;
}): StayTemplate {
  return {
    subject: `Your booking ${v.reference} has been cancelled and refunded`,
    body:
      `Hi ${v.name}, your booking at ${v.property} (${v.reference}) has been cancelled and ` +
      `${v.refundAmount} has been refunded in full to the card you paid with. Refunds usually ` +
      `land within 5 to 10 business days.\n\n` +
      (v.auto
        ? `We did not receive the ID and signed agreement we needed to confirm the stay.\n\n`
        : v.reason
          ? `Reason: ${v.reason}\n\n`
          : "") +
      `If you would still like to stay with us, you are welcome to book again: ${v.rebookUrl}`,
    smsBody:
      `BNP: booking ${v.reference} is cancelled and ${v.refundAmount} refunded in full. ` +
      `Details in your email.`,
  };
}

/** Admin: the sweep moved money with no human in the loop. No contact details. */
export function adminStayAutoDeclined(v: {
  property: string;
  room: string | null;
  guest: string;
  checkIn: string;
  checkOut: string;
  reference: string;
  refundAmount: string;
}): StayTemplate {
  const text =
    `Auto-declined and refunded: ${v.guest} - ${v.property}${roomClause(v.room)} - ` +
    `${v.checkIn} to ${v.checkOut} - ${v.reference} - ${v.refundAmount} refunded. ` +
    `The guest never completed their ID and agreement. The dates are back on sale.`;
  return {
    subject: `Auto-declined + refunded - ${v.property}${roomClause(v.room)} ${v.checkIn}`,
    body: text,
    // Carries no contact details, but passed explicitly so a later edit that adds
    // an email cannot silently start leaking it to a third party.
    telegramText: text,
  };
}

// ---------------------------------------------------------------------------
// 6. Checkout reminders. BOTH carry the extension link — see stayReminders.ts:
// on a daily cron a skipped run can mean only the 24h message lands, so the
// money-bearing offer cannot live only in the 48h one.
// ---------------------------------------------------------------------------

export function stayCheckout48h(v: {
  name: string;
  property: string;
  room: string | null;
  checkOut: string;
  checkOutBy: string | null;
  reference: string;
  extendAvailable: boolean;
  maxExtraNights: number;
  extendUrl: string;
  smsExtendUrl: string;
  stayUrl: string;
}): StayTemplate {
  const by = v.checkOutBy ? ` by ${v.checkOutBy}` : "";
  return {
    subject: v.extendAvailable
      ? `Checkout is in 2 days — want to stay longer?`
      : `Checkout is in 2 days (${v.checkOut})`,
    body:
      `Hi ${v.name}, a heads-up that your stay at ${v.property}${roomClause(v.room)} ends on ` +
      `${v.checkOut}${by}.\n\n` +
      (v.extendAvailable
        ? `WANT MORE TIME? Your room is free for up to ${v.maxExtraNights} more night` +
          `${v.maxExtraNights === 1 ? "" : "s"}. You can extend and pay in a couple of taps — ` +
          `same room, same door code, nothing to re-sign:\n${v.extendUrl}\n\n`
        : `Your room is booked straight after you, so we cannot extend this stay — but reply ` +
          `and we will happily look for another room.\n\n`) +
      `Your booking: ${v.stayUrl}\nReference ${v.reference}.`,
    smsBody: v.extendAvailable
      ? `BNP: checkout is in 2 days (${v.checkOut}). Need more time? Extend: ${v.smsExtendUrl}`
      : `BNP: checkout is in 2 days (${v.checkOut}). Reply if you need more time.`,
  };
}

export function stayCheckout24h(v: {
  name: string;
  property: string;
  room: string | null;
  checkOut: string;
  checkOutBy: string | null;
  reference: string;
  extendAvailable: boolean;
  extendUrl: string;
  smsExtendUrl: string;
  houseRulesUrl: string;
}): StayTemplate {
  const by = v.checkOutBy ?? "the stated checkout time";
  return {
    subject: `Checkout is tomorrow — ${v.checkOut}`,
    body:
      `Hi ${v.name}, your stay at ${v.property}${roomClause(v.room)} ends tomorrow, ` +
      `${v.checkOut}. Checkout is ${by}.\n\n` +
      `Before you go: take everything with you, leave the room as you found it, and close the ` +
      `door behind you. The checkout notes are in the house rules: ${v.houseRulesUrl}\n\n` +
      (v.extendAvailable
        ? `Still need more time? You can extend right up to checkout: ${v.extendUrl}\n\n`
        : "") +
      `Thanks for staying with us. Reference ${v.reference}.`,
    smsBody: v.extendAvailable
      ? `BNP: checkout is tomorrow (${v.checkOut}). Need more time? Extend: ${v.smsExtendUrl}`
      : `BNP: checkout is tomorrow (${v.checkOut}), ${by}. Thanks for staying with us.`,
  };
}

// ---------------------------------------------------------------------------
// 7. Extension — mirrors the first confirmation, per the owner's spec
// ---------------------------------------------------------------------------

export function stayExtended(v: {
  name: string;
  property: string;
  room: string | null;
  previousCheckOut: string;
  newCheckOut: string;
  addedNights: number;
  reference: string;
  amount: string;
  stayUrl: string;
}): StayTemplate {
  return {
    subject: `Your stay is extended — now through ${v.newCheckOut} (${v.reference})`,
    body:
      `Hi ${v.name}, done — your stay at ${v.property}${roomClause(v.room)} is extended.\n\n` +
      `YOUR UPDATED STAY\nWas ending: ${v.previousCheckOut}\nNow ending: ${v.newCheckOut}\n` +
      `Added: ${v.addedNights} night${v.addedNights === 1 ? "" : "s"}\n` +
      `Paid today: ${v.amount}\nReference ${v.reference}\n\n` +
      `Nothing else changes — same room, same door code, and there is nothing new to sign.\n\n` +
      `Your booking: ${v.stayUrl}`,
    smsBody:
      `BNP: your stay is extended to ${v.newCheckOut}. ${v.amount} paid. Same room, same code.`,
  };
}

export function adminStayExtended(v: {
  property: string;
  room: string | null;
  guest: string;
  previousCheckOut: string;
  newCheckOut: string;
  reference: string;
  amount: string;
}): StayTemplate {
  const text =
    `Stay extended: ${v.guest} - ${v.property}${roomClause(v.room)} - ${v.previousCheckOut} ` +
    `to ${v.newCheckOut} - ${v.reference} - ${v.amount} paid.`;
  return { subject: `Stay extended - ${v.property}${roomClause(v.room)}`, body: text, telegramText: text };
}

/** Admin: an extension was PAID but the dates could not be applied. Money is held. */
export function adminStayExtensionConflict(v: {
  property: string;
  room: string | null;
  guest: string;
  reference: string;
  requestedCheckOut: string;
  amount: string;
  reason: string;
}): StayTemplate {
  const text =
    `EXTENSION PAID BUT NOT APPLIED: ${v.guest} - ${v.property}${roomClause(v.room)} - ` +
    `${v.reference} - ${v.amount} charged for an extension to ${v.requestedCheckOut}, but the ` +
    `dates were taken in the meantime (${v.reason}). The charge STANDS and was NOT refunded. ` +
    `Resolve by hand: extend to a shorter date, move the guest, or refund.`;
  return {
    subject: `EXTENSION PAID BUT DATES TAKEN - ${v.reference}`,
    body: text,
    telegramText: text,
  };
}

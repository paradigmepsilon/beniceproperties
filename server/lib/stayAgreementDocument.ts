// server/lib/stayAgreementDocument.ts
// =============================================================================
// The acknowledgment a SHORT-STAY guest signs (co-living, 7–28 nights, paid in
// full up front): the owner's "Room Booking & Resident Acknowledgment".
//
// WHY NOT REUSE THE LEASE TEMPLATE. DEFAULT_LEASE_TEMPLATE is built around a
// payment cadence, an installment schedule, a security deposit, late fees, and a
// card-on-file authorization. A short stay has NONE of those — it is paid once,
// in full, before arrival. Rendering a guest an agreement that promises a
// payment schedule they do not have would be worse than no agreement.
//
// PROVENANCE OF THE BODY TEXT. Every section is the owner's document
// "BE NICE PROPERTIES — ROOM BOOKING & RESIDENT ACKNOWLEDGMENT | Version
// BNP-RBA-2026.3" (supplied by Alex Henry, 2026-09-09), reproduced verbatim,
// with exactly two additions that are NOT in that document and are marked
// inline: (1) the sentence linking the published house-rules page, which the
// app incorporates by reference, and (2) the "Confirmation & Access" section,
// which describes the app's own approval flow (signed acknowledgment + photo ID
// + admin approval) rather than any policy. The E-SIGN/UETA attestation is the
// same reviewed text the lease uses.
//
// Counsel review of BNP-RBA-2026.3: confirmed by the owner 2026-09-09. Owner-directed
// edit after that review: late fee $50 → $25 (matches `late_fee_per_day`). Bump `version` only when the owner issues a new document version — the
// version string is printed on, and frozen into, every executed copy.
// =============================================================================

import {
  esc,
  documentPage,
  awaitingSignatureHtml,
  signatureBlockHtml,
  fillTokens,
  ESIGN_ATTESTATION,
  type SignatureCapture,
} from "./documentHtml";
import { fmtMoney } from "./formatShared";
import { stayNights } from "@shared/bookingGate";

export interface StayAgreementData {
  guestName: string;
  propertyName: string;
  /** Street address (the property's `address`); printed as "Property address". */
  propertyLocation: string;
  /** Display name of the room, e.g. "Room 2 — Garden". */
  roomLabel: string;
  checkIn: string;
  checkOut: string;
  /** Total already charged, including any card surcharge. */
  totalPaid: number;
  /** Absolute URL of the public house-rules page. */
  houseRulesUrl: string;
  /** Free-text arrival/departure times from the property's access info. */
  checkInFrom: string;
  checkOutBy: string;
  /** Booking reference, printed in the booking-record line. */
  reference: string;
}

export interface StayAgreementSection {
  heading: string;
  /** Prose paragraph (tokens allowed). */
  body?: string;
  /** Bullet list, rendered after `body` when both are present (tokens allowed). */
  bullets?: string[];
}

/**
 * Admin-editable-as-data template. Every string may use {{tokens}} substituted
 * at render time; the signature block is structural and rendered separately.
 */
export const DEFAULT_STAY_AGREEMENT_TEMPLATE = {
  title: "Room Booking & Resident Acknowledgment",
  version: "BNP-RBA-2026.3",
  /** The reservation-details table at the top: [label, text]. */
  details: [
    ["Resident legal name", "{{guestName}}"],
    ["Property address", "{{propertyLocation}}"],
    ["Assigned room", "{{roomLabel}}"],
    ["Check-in date", "{{checkIn}} ({{checkInFrom}})"],
    ["Check-out date", "{{checkOut}} ({{checkOutBy}})"],
    ["Length of stay", "{{nights}} night(s)"],
    ["Booking total", "{{totalPaid}}"],
    ["Amount due", "{{totalPaid}} — paid in full at booking"],
  ] as [string, string][],
  intro:
    "This acknowledgment applies to your furnished private-room reservation with Be Nice " +
    "Properties (BNP). Your booking details above control your specific room, dates, rate, " +
    "fees, and amount due. Your reservation is for the assigned bedroom only, with " +
    "non-exclusive use of approved shared/common areas.",
  sections: [
    {
      heading: "Payment & Reservation",
      bullets: [
        "Pay all amounts according to the schedule shown in your booking.",
        "A payment received after the agreed due date is late. BNP's current late fee is $25, " +
          "unless Management authorizes otherwise.",
        "No security deposit or reservation hold is required for weekly stays.",
        "Any cancellation/refund follows the terms shown at booking.",
        "Staying beyond the confirmed check-out date requires BNP approval and a new or " +
          "extended reservation. Unless BNP requires a newer agreement version, an approved " +
          "extension remains subject to this acknowledgment.",
      ],
    },
    {
      // NOT in BNP-RBA-2026.3 — describes the app's own approval flow.
      heading: "Confirmation & Access",
      body:
        "This booking is confirmed only after BNP has (a) received this signed acknowledgment, " +
        "(b) received a government-issued photo identification matching the name signed below, " +
        "and (c) approved both. Access details, including the door code, are issued on approval " +
        "and are personal to the Resident. The Resident may not share, copy, or transfer any " +
        "access code or key.",
    },
    {
      heading: "Room & Common Areas",
      bullets: [
        "Only approved residents may occupy the room. Unauthorized occupants are prohibited.",
        "Residents may use designated shared kitchen, bathroom, laundry, living, parking, and " +
          "outdoor areas.",
        "Keep your bedroom reasonably clean. Wash dishes, remove trash, clean spills, and keep " +
          "shared areas sanitary.",
        "Weekly common-area housekeeping does not replace your responsibility to clean up " +
          "after yourself.",
      ],
    },
    {
      heading: "House & Community Rules",
      // The link sentence is NOT in BNP-RBA-2026.3; the app incorporates the
      // published page by reference so the two can never silently diverge.
      body:
        "The full house rules are published at {{houseRulesUrl}} and form part of this " +
        "acknowledgment.",
      bullets: [
        "No pets, except approved or legally required accommodations.",
        "No smoking or vaping inside. Smoking is only permitted in approved outdoor areas.",
        "Quiet hours: 10:00 p.m.-7:00 a.m.",
        "Illegal drug activity, criminal conduct, threats, harassment, violence, and unlawful " +
          "weapons-related conduct are prohibited.",
        "You are responsible for your guests and for damage caused by you or your guests, to " +
          "the extent permitted by law.",
        "Report maintenance, leaks, damage, safety concerns, and access problems promptly.",
        "Be respectful of residents, neighbors, BNP staff, vendors, and guests.",
      ],
    },
    {
      heading: "Move-Out",
      bullets: [
        "Remove all belongings, food, and trash by check-out. Your property access code will " +
          "automatically become inactive after your reservation ends.",
        "Items left behind will be handled under BNP policy and applicable Georgia law.",
      ],
    },
    {
      heading: "Violations, Nonpayment & Communications",
      body:
        "Failure to pay amounts due or serious/repeated violations may result in warnings, " +
        "charges permitted by the reservation, refusal of an extension, termination procedures, " +
        "or other action permitted by law. Nothing in this acknowledgment permits BNP to bypass " +
        "any notice, possession, dispossessory, or other process required by Georgia law. You " +
        "agree that BNP may communicate with you by text, email, booking/property-management " +
        "software, and other electronic methods regarding your stay.",
    },
  ] as StayAgreementSection[],
  /** The owner's checkbox statement, rendered immediately above the signature block. */
  acknowledgment:
    "I have read and agree to the Be Nice Properties Room Booking & Resident Acknowledgment " +
    "(Version {{version}}) and the reservation details above. I understand my room, dates, " +
    "payment terms, house/community rules, and that staying beyond my confirmed check-out date " +
    "requires BNP approval and an extension or new reservation. By signing below and completing " +
    "my booking, I electronically acknowledge and agree to these terms to the extent permitted " +
    "by law.",
  bookingRecord: "Booking Record: Reservation # {{reference}} | Agreement Version {{version}}",
  signatureStatement: ESIGN_ATTESTATION,
};

export type StayAgreementTemplate = typeof DEFAULT_STAY_AGREEMENT_TEMPLATE;

/** {{token}} → value. Every value is escaped at render time, not here. */
export function stayAgreementTokens(
  data: StayAgreementData,
  template: StayAgreementTemplate = DEFAULT_STAY_AGREEMENT_TEMPLATE,
): Record<string, string> {
  return {
    guestName: data.guestName,
    propertyName: data.propertyName,
    propertyLocation: data.propertyLocation,
    roomLabel: data.roomLabel,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    nights: String(stayNights(data.checkIn, data.checkOut)),
    totalPaid: fmtMoney(data.totalPaid),
    houseRulesUrl: data.houseRulesUrl,
    reference: data.reference,
    version: template.version,
    // Fall back to plain language rather than rendering an empty parenthesis when
    // a property has not had its arrival times filled in yet.
    checkInFrom: data.checkInFrom || "check-in time as advised",
    checkOutBy: data.checkOutBy || "the stated checkout time",
  };
}

/** Every template string that may carry a token — for the coverage test and the renderer. */
export function stayAgreementTemplateStrings(template: StayAgreementTemplate): string[] {
  return [
    template.intro,
    template.acknowledgment,
    template.bookingRecord,
    ...template.details.map(([, text]) => text),
    ...template.sections.flatMap((s) => [s.body ?? "", ...(s.bullets ?? [])]),
  ];
}

function bodyHtml(data: StayAgreementData, template: StayAgreementTemplate): string {
  const tokens = stayAgreementTokens(data, template);
  const fill = (s: string) => esc(fillTokens(s, tokens));

  const details =
    `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px">` +
    template.details
      .map(
        ([label, text]) =>
          `<tr><th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;width:38%">${esc(
            label,
          )}</th><td style="padding:6px 8px;border:1px solid #ddd">${fill(text)}</td></tr>`,
      )
      .join("") +
    `</table>`;

  const sections = template.sections
    .map((s) => {
      const body = s.body ? `<p style="margin:0 0 6px;line-height:1.5">${fill(s.body)}</p>` : "";
      const bullets = s.bullets?.length
        ? `<ul style="margin:0;padding-left:20px;line-height:1.5">${s.bullets
            .map((b) => `<li>${fill(b)}</li>`)
            .join("")}</ul>`
        : "";
      return (
        `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc(s.heading)}</h2>` +
        body +
        bullets +
        `</section>`
      );
    })
    .join("");

  return (
    `<h1 style="font-size:20px;margin:0 0 2px">${esc(template.title)}</h1>` +
    `<p style="color:#555;margin:0 0 14px;font-size:13px">Version ${esc(template.version)}</p>` +
    details +
    `<p style="margin:0 0 4px;line-height:1.5">${fill(template.intro)}</p>` +
    sections +
    `<p style="margin:18px 0 0;padding:10px 12px;border:2px solid #7a9a2e;line-height:1.5;font-weight:bold">${fill(
      template.acknowledgment,
    )}</p>` +
    `<p style="color:#555;margin:10px 0 0;font-size:12px">${fill(template.bookingRecord)}</p>`
  );
}

/** Render for review — no signature captured yet, and no DB write anywhere. */
export function renderStayAgreementHtml(
  data: StayAgreementData,
  template: StayAgreementTemplate = DEFAULT_STAY_AGREEMENT_TEMPLATE,
): string {
  return documentPage(
    template.title,
    bodyHtml(data, template) + awaitingSignatureHtml(template.signatureStatement),
  );
}

/**
 * Render the EXECUTED acknowledgment. This output is frozen into
 * booking_gate.agreement_document_html and is the record of what the guest
 * actually agreed to — it is never re-rendered from live data afterwards, so a
 * later rate or template change cannot rewrite history.
 */
export function renderSignedStayAgreementHtml(
  data: StayAgreementData,
  signature: SignatureCapture,
  template: StayAgreementTemplate = DEFAULT_STAY_AGREEMENT_TEMPLATE,
): string {
  return documentPage(
    template.title,
    bodyHtml(data, template) + signatureBlockHtml(signature, template.signatureStatement),
  );
}

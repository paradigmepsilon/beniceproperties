// server/lib/stayAgreementDocument.ts
// =============================================================================
// The rental agreement a SHORT-STAY guest signs (co-living, 7–28 nights, paid in
// full up front).
//
// WHY NOT REUSE THE LEASE TEMPLATE. DEFAULT_LEASE_TEMPLATE is built around a
// payment cadence, an installment schedule, a security deposit, late fees, and a
// card-on-file authorization. A short stay has NONE of those — it is paid once,
// in full, before arrival. Rendering a guest an agreement that promises a
// payment schedule they do not have would be worse than no agreement.
//
// ⚠️ THE SUBSTANTIVE TERMS BELOW ARE PENDING OWNER / COUNSEL REVIEW.
// The structure, token substitution, and E-SIGN attestation are production-ready
// and reuse the same reviewed attestation as the lease. The BODY TEXT is a
// faithful adaptation of the existing lease sections to a paid-in-full short
// stay — it invents no new policy — but it has not been reviewed by counsel, and
// it must be before this is shown to a real guest. Anything an operator has to
// decide (house rules, cancellation) is a token, not invented prose.
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
}

/**
 * Admin-editable-as-data template. Sections use {{tokens}} substituted at render
 * time; the signature block is structural and rendered separately.
 */
export const DEFAULT_STAY_AGREEMENT_TEMPLATE = {
  title: "Short-Stay Rental Agreement",
  intro:
    "This Short-Stay Rental Agreement (the “Agreement”) is entered into between " +
    "Be Nice Properties (“Operator”) and {{guestName}} (“Guest”) for the room and dates " +
    "described below at {{propertyName}}, {{propertyLocation}}. This is a short-term " +
    "occupancy agreement for a stay of {{nights}} night(s) paid in full in advance. " +
    "It does not create a tenancy or a lease.",
  sections: [
    {
      heading: "1. Room and Dates",
      body:
        "The Operator makes available to the Guest the following room at {{propertyName}}: " +
        "{{roomLabel}}. The stay begins on {{checkIn}} ({{checkInFrom}}) and ends on " +
        "{{checkOut}} ({{checkOutBy}}), a total of {{nights}} night(s). The Guest occupies " +
        "the named room and shares the common areas of the property with other residents.",
    },
    {
      heading: "2. Payment",
      body:
        "The total amount for this stay is {{totalPaid}}, charged in full at the time of " +
        "booking. There is no recurring payment, no installment schedule, and no security " +
        "deposit for this stay. No further amount is due unless the Guest extends the stay.",
    },
    {
      heading: "3. Confirmation and Access",
      body:
        "This booking is confirmed only after the Operator has (a) received this signed " +
        "Agreement, (b) received a government-issued photo identification matching the name " +
        "signed below, and (c) approved both. Access details, including the door code, are " +
        "issued on approval and are personal to the Guest. The Guest may not share, copy, or " +
        "transfer any access code or key.",
    },
    {
      heading: "4. Occupancy",
      body:
        "Only the Guest named in this Agreement may occupy the room. The room is not to be " +
        "sublet, listed, assigned, or shared, and no additional overnight occupant may stay " +
        "without the Operator's prior written approval.",
    },
    {
      heading: "5. Extensions",
      body:
        "The Guest may request additional nights before the end of the stay, subject to " +
        "availability. An extension takes effect only once the additional amount has been " +
        "paid, and is priced at the rates then in effect for the full length of the stay.",
    },
    {
      heading: "6. House Rules",
      body:
        "The Guest agrees to the house rules published at {{houseRulesUrl}}, which form part " +
        "of this Agreement, and to treat the property, its shared spaces, and other residents " +
        "with care and respect. Repeated or serious breaches may end the stay.",
    },
    {
      heading: "7. Condition and Damage",
      body:
        "The Guest agrees to leave the room and shared areas in the condition in which they " +
        "were received, allowing for ordinary use, and to report any damage or maintenance " +
        "issue promptly. The Guest is responsible for damage beyond ordinary wear caused by " +
        "the Guest or the Guest's visitors.",
    },
    {
      heading: "8. Departure",
      body:
        "The Guest agrees to vacate the room and return or cease using all access codes by " +
        "{{checkOutBy}} on {{checkOut}}, unless the stay has been extended and paid for.",
    },
  ],
  signatureStatement: ESIGN_ATTESTATION,
};

export type StayAgreementTemplate = typeof DEFAULT_STAY_AGREEMENT_TEMPLATE;

/** {{token}} → value. Every value is escaped at render time, not here. */
export function stayAgreementTokens(data: StayAgreementData): Record<string, string> {
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
    // Fall back to plain language rather than rendering an empty parenthesis when
    // a property has not had its arrival times filled in yet.
    checkInFrom: data.checkInFrom || "check-in time as advised",
    checkOutBy: data.checkOutBy || "the stated checkout time",
  };
}

function bodyHtml(data: StayAgreementData, template: StayAgreementTemplate): string {
  const tokens = stayAgreementTokens(data);
  const sections = template.sections
    .map(
      (s) =>
        `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc(s.heading)}</h2>` +
        `<p style="margin:0;line-height:1.5">${esc(fillTokens(s.body, tokens))}</p></section>`,
    )
    .join("");
  return (
    `<h1 style="font-size:20px;margin:0 0 4px">${esc(template.title)}</h1>` +
    `<p style="color:#555;margin:0 0 16px;line-height:1.5">${esc(
      fillTokens(template.intro, tokens),
    )}</p>` +
    sections
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
 * Render the EXECUTED agreement. This output is frozen into
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

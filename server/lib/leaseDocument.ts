// server/lib/leaseDocument.ts
// =============================================================================
// Co-living lease document generator. Renders a residential room-rental
// agreement from an ADMIN-EDITABLE template (sections + house rules) populated
// with the guest, property, room(s), term, cadence, full payment schedule, and
// the late-fee policy. The template is data (DEFAULT_LEASE_TEMPLATE) so an admin
// surface can later override it without code changes — the same spirit as the
// TRAD email templates.
//
// Two render passes:
//   renderLeaseHtml()       → the agreement BEFORE signing (for review).
//   renderSignedLeaseHtml() → the same agreement WITH a signature block
//                             (typed legal name, timestamp, IP) appended. This is
//                             the artifact stored on the lease (print-to-PDF).
//
// In-app typed e-signature is valid under E-SIGN / UETA: the binding capture is
// the typed legal name + affirmation + timestamp + IP, recorded on the lease row.
// The file format of the stored artifact (HTML vs PDF) is not what makes it valid.
// No third-party signature provider is used (per the locked decision).
//
// GENERIC: nothing here hard-codes a property or room identity — every name comes
// from the lease data passed in.
// =============================================================================

import { LATE_FEE_PER_DAY } from "@shared/schema";

export interface LeaseDocRoom {
  name: string;
  roomNumber: string | null;
  weeklyRent: number;
}

export interface LeaseDocScheduleLine {
  seq: number;
  dueDate: string;
  amount: number;
  prorated: boolean;
}

export interface LeaseDocData {
  leaseId: string;
  guestName: string;
  guestEmail: string;
  propertyName: string;
  propertyLocation: string;
  rooms: LeaseDocRoom[];
  startDate: string;
  endDate: string;
  cadence: "WEEKLY" | "BIWEEKLY" | "MONTHLY";
  weeklyRateTotal: number;
  totalLeaseValue: number;
  /** Refundable security deposit due at move-in (sum across rooms). */
  depositTotal: number;
  /** One-time non-refundable cleaning fee due at move-in (sum across rooms). */
  cleaningFeeTotal: number;
  prorationNote: string;
  schedule: LeaseDocScheduleLine[];
}

export interface SignatureCapture {
  signedName: string;
  signedAt: Date;
  signedIp: string;
}

const CADENCE_LABEL: Record<LeaseDocData["cadence"], string> = {
  WEEKLY: "weekly",
  BIWEEKLY: "bi-weekly",
  MONTHLY: "monthly (every 4 weeks)",
};

/**
 * The admin-editable agreement template. Sections use {{tokens}} substituted at
 * render time. Keep tokens documented; an admin editor maps to these. The
 * payment schedule + signature block are structural and rendered separately.
 */
export const DEFAULT_LEASE_TEMPLATE = {
  title: "Room Rental Agreement",
  intro:
    "This Room Rental Agreement (the “Agreement”) is entered into between " +
    "Be Nice Properties (“Landlord”) and {{guestName}} (“Resident”) for the " +
    "room(s) and term described below at {{propertyName}}, {{propertyLocation}}.",
  sections: [
    {
      heading: "1. Premises",
      body:
        "The Landlord rents to the Resident the following room(s) at {{propertyName}}: " +
        "{{roomList}}. The Resident has the non-exclusive right to use shared common areas " +
        "of the property in common with other residents.",
    },
    {
      heading: "2. Term",
      body:
        "The lease term runs from {{startDate}} through {{endDate}} ({{termDays}} days). " +
        "This is a fixed-term arrangement and does not exceed 90 days.",
    },
    {
      heading: "3. Rent & Payment Schedule",
      body:
        "Rent is billed on a {{cadenceLabel}} basis at a combined rate of " +
        "{{weeklyRateLabel}} per week across all rented room(s). The first payment is due on " +
        "the start date (move-in) and includes the one-time cleaning fee described below. The " +
        "complete schedule of payments and amounts appears below; the total value of this lease " +
        "is {{totalLeaseValue}}. {{prorationNote}}",
    },
    {
      heading: "4. Move-in Charges (Deposit & Cleaning Fee)",
      body:
        "At move-in the Resident pays a refundable security deposit of {{depositTotal}}, which " +
        "secures the room(s) and is returned at the end of the term less any deductions permitted " +
        "by law.{{cleaningFeeClause}} These move-in charges are separate from rent and from the " +
        "payment schedule below.",
    },
    {
      heading: "5. Late Fees",
      body:
        "If a scheduled payment is not received by its due date, a late fee of " +
        "{{lateFeePerDay}} per day accrues beginning the day after the due date and continues " +
        "to accrue daily until the balance is paid. Accrued late fees are billed as a separate " +
        "charge from rent.",
    },
    {
      heading: "6. House Rules",
      body:
        "The Resident agrees to: keep shared spaces clean; respect quiet hours and other " +
        "residents; not sublet or assign the room; not engage in illegal activity on the " +
        "premises; and follow any posted property-specific house rules. Repeated or serious " +
        "violations may result in termination of this Agreement.",
    },
    {
      heading: "7. Payment Authorization",
      body:
        "A payment method is kept on file for the term of this lease. The Resident may pay each " +
        "scheduled payment either by that card (subject to a 3.5% processing fee) or manually by " +
        "CashApp/Zelle (no processing fee); a manual payment is held pending until confirmed. The " +
        "Resident authorizes Be Nice Properties to charge the saved payment method on file for any " +
        "scheduled payment not elected as manual, and for any accrued late fees, on or after each " +
        "due date.",
    },
  ],
  signatureStatement:
    "By typing my full legal name below and submitting this Agreement, I acknowledge that I " +
    "have read and agree to its terms, and I intend my typed name to be my legally binding " +
    "electronic signature under the U.S. E-SIGN Act and UETA.",
};

type Template = typeof DEFAULT_LEASE_TEMPLATE;

const fmtMoney = (v: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inclusiveDays(startDate: string, endDate: string): number {
  const ms = 24 * 60 * 60 * 1000;
  const s = new Date(`${startDate}T00:00:00Z`).getTime();
  const e = new Date(`${endDate}T00:00:00Z`).getTime();
  return Math.round((e - s) / ms) + 1;
}

/** Build the {{token}} → value map from lease data. */
function tokenMap(data: LeaseDocData): Record<string, string> {
  const roomList = data.rooms
    .map((r) => (r.roomNumber ? `${r.name} (#${r.roomNumber})` : r.name))
    .join(", ");
  return {
    guestName: data.guestName,
    propertyName: data.propertyName,
    propertyLocation: data.propertyLocation,
    roomList,
    startDate: data.startDate,
    endDate: data.endDate,
    termDays: String(inclusiveDays(data.startDate, data.endDate)),
    cadenceLabel: CADENCE_LABEL[data.cadence],
    weeklyRateLabel: fmtMoney(data.weeklyRateTotal),
    totalLeaseValue: fmtMoney(data.totalLeaseValue),
    depositTotal: fmtMoney(data.depositTotal),
    // Only state a cleaning fee when one applies; it is non-refundable.
    cleaningFeeClause:
      data.cleaningFeeTotal > 0
        ? ` A one-time, non-refundable cleaning fee of ${fmtMoney(data.cleaningFeeTotal)} is also due at move-in.`
        : "",
    prorationNote: data.prorationNote,
    lateFeePerDay: fmtMoney(LATE_FEE_PER_DAY),
  };
}

function fill(text: string, tokens: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) =>
    key in tokens ? tokens[key] : `{{${key}}}`,
  );
}

function scheduleTableHtml(schedule: LeaseDocScheduleLine[]): string {
  const rows = schedule
    .map(
      (r) =>
        `<tr><td>${r.seq}</td><td>${esc(r.dueDate)}${
          r.seq === 1 ? " <strong>(due on start)</strong>" : ""
        }${r.prorated ? " <em>(prorated)</em>" : ""}</td><td style="text-align:right">${fmtMoney(
          r.amount,
        )}</td></tr>`,
    )
    .join("");
  return (
    `<table style="width:100%;border-collapse:collapse" cellpadding="6">` +
    `<thead><tr style="border-bottom:1px solid #ccc;text-align:left">` +
    `<th>#</th><th>Due date</th><th style="text-align:right">Amount</th></tr></thead>` +
    `<tbody>${rows}</tbody></table>`
  );
}

function bodyHtml(data: LeaseDocData, template: Template): string {
  const tokens = tokenMap(data);
  const sections = template.sections
    .map(
      (s) =>
        `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc(s.heading)}</h2>` +
        `<p style="margin:0;line-height:1.5">${esc(fill(s.body, tokens))}</p></section>`,
    )
    .join("");
  return (
    `<h1 style="font-size:20px;margin:0 0 4px">${esc(template.title)}</h1>` +
    `<p style="color:#555;margin:0 0 16px;line-height:1.5">${esc(fill(template.intro, tokens))}</p>` +
    sections +
    `<section><h2 style="font-size:15px;margin:18px 0 6px">Payment Schedule</h2>` +
    scheduleTableHtml(data.schedule) +
    `</section>`
  );
}

const PAGE = (inner: string) =>
  `<!doctype html><html><head><meta charset="utf-8">` +
  `<meta name="viewport" content="width=device-width,initial-scale=1">` +
  `<title>Room Rental Agreement</title>` +
  `<style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:32px auto;` +
  `padding:0 20px;color:#1a1a1a}@media print{body{margin:0}}</style></head>` +
  `<body>${inner}</body></html>`;

/** Render the agreement for review (no signature yet). */
export function renderLeaseHtml(data: LeaseDocData, template: Template = DEFAULT_LEASE_TEMPLATE): string {
  const unsigned =
    bodyHtml(data, template) +
    `<section style="margin-top:24px"><p style="line-height:1.5">${esc(
      template.signatureStatement,
    )}</p><p style="color:#777">— Awaiting signature —</p></section>`;
  return PAGE(unsigned);
}

/** Render the SIGNED agreement: appends the signature block (name, ts, IP). */
export function renderSignedLeaseHtml(
  data: LeaseDocData,
  signature: SignatureCapture,
  template: Template = DEFAULT_LEASE_TEMPLATE,
): string {
  const signed =
    bodyHtml(data, template) +
    `<section style="margin-top:24px;border-top:2px solid #1a1a1a;padding-top:16px">` +
    `<p style="line-height:1.5">${esc(template.signatureStatement)}</p>` +
    `<div style="margin-top:12px;font-size:14px">` +
    `<div><strong>Signed by:</strong> ${esc(signature.signedName)}</div>` +
    `<div><strong>Date &amp; time:</strong> ${esc(signature.signedAt.toISOString())}</div>` +
    `<div><strong>IP address:</strong> ${esc(signature.signedIp)}</div>` +
    `<div style="margin-top:8px;color:#555">Electronically signed under the E-SIGN Act / UETA.</div>` +
    `</div></section>`;
  return PAGE(signed);
}

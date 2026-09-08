// server/lib/leaseDocument.test.ts
// Phase 3 — lease document generator. Verifies token substitution, the schedule
// table, the late-fee policy text, and that the signed render carries the
// signature block (name, timestamp, IP) while the review render does not.

import { describe, it, expect } from "vitest";
import {
  renderLeaseHtml,
  renderSignedLeaseHtml,
  DEFAULT_LEASE_TEMPLATE,
  type LeaseDocData,
} from "./leaseDocument";

const DATA: LeaseDocData = {
  leaseId: "lease-1",
  guestName: "Jane Q. Resident",
  guestEmail: "jane@example.com",
  propertyName: "Old Bill Cook",
  propertyLocation: "Atlanta",
  rooms: [{ name: "Room 2 - Garden", roomNumber: "2", weeklyRent: 260 }],
  startDate: "2026-07-01",
  endDate: "2026-07-28",
  cadence: "WEEKLY",
  installmentAmount: 260,
  totalLeaseValue: 1040,
  depositTotal: 260,
  cleaningFeeTotal: 75,
  lateFeePerDay: 25,
  cardSurchargeRate: 0.035,
  prorationNote: "4 weekly installment(s) of $260.00, no proration. First payment due on the move-in date.",
  schedule: [
    { seq: 1, dueDate: "2026-07-01", amount: 260, prorated: false },
    { seq: 2, dueDate: "2026-07-08", amount: 260, prorated: false },
    { seq: 3, dueDate: "2026-07-15", amount: 260, prorated: false },
    { seq: 4, dueDate: "2026-07-22", amount: 260, prorated: false },
  ],
};

describe("renderLeaseHtml (review)", () => {
  it("substitutes guest, property, room, and term tokens", () => {
    const html = renderLeaseHtml(DATA);
    expect(html).toContain("Jane Q. Resident");
    expect(html).toContain("Old Bill Cook");
    expect(html).toContain("Atlanta");
    expect(html).toContain("Room 2 - Garden (#2)");
    expect(html).toContain("2026-07-01");
    expect(html).toContain("2026-07-28");
    expect(html).not.toContain("{{"); // no unreplaced tokens
  });

  it("states the move-in deposit and non-refundable cleaning fee", () => {
    const html = renderLeaseHtml(DATA);
    expect(html).toMatch(/security deposit of \$260\.00/);
    expect(html).toMatch(/non-refundable cleaning fee of \$75\.00/i);
  });

  it("omits the cleaning-fee clause when the fee is zero", () => {
    const html = renderLeaseHtml({ ...DATA, cleaningFeeTotal: 0 });
    // The section heading is structural (always present); only the fee sentence
    // is conditional. A $0 fee must not state a cleaning-fee amount.
    expect(html).not.toMatch(/non-refundable cleaning fee of \$/i);
    expect(html).toMatch(/security deposit of \$260\.00/); // deposit still shown
  });

  it("states the $25/day late-fee policy", () => {
    const html = renderLeaseHtml(DATA);
    expect(html).toMatch(/\$25\.00 per day/);
    expect(html).toMatch(/day after the due date/i);
  });

  it("states the late fee and surcharge the lease was created under", () => {
    const html = renderLeaseHtml({ ...DATA, lateFeePerDay: 40, cardSurchargeRate: 0.03 });
    expect(html).toMatch(/\$40\.00 per day/);
    expect(html).toMatch(/subject to a 3% processing fee/);
    expect(html).not.toMatch(/3\.5%/);
  });

  it("renders every schedule installment", () => {
    const html = renderLeaseHtml(DATA);
    for (const row of DATA.schedule) expect(html).toContain(row.dueDate);
    expect(html).toMatch(/due on start/i); // seq 1 marker
  });

  it("shows it is awaiting signature (no signature block yet)", () => {
    const html = renderLeaseHtml(DATA);
    expect(html).toMatch(/awaiting signature/i);
    expect(html).not.toContain("IP address:");
  });

  it("includes the E-SIGN/UETA affirmation statement", () => {
    expect(renderLeaseHtml(DATA)).toContain(DEFAULT_LEASE_TEMPLATE.signatureStatement);
  });
});

describe("renderSignedLeaseHtml", () => {
  it("appends the signature block with name, timestamp, and IP", () => {
    const signedAt = new Date("2026-07-01T15:04:05.000Z");
    const html = renderSignedLeaseHtml(DATA, {
      signedName: "Jane Q. Resident",
      signedAt,
      signedIp: "203.0.113.7",
    });
    expect(html).toContain("Signed by:");
    expect(html).toContain("Jane Q. Resident");
    expect(html).toContain("2026-07-01T15:04:05.000Z");
    expect(html).toContain("203.0.113.7");
    expect(html).toMatch(/E-SIGN Act \/ UETA/);
  });

  it("escapes HTML in user-supplied fields", () => {
    const html = renderSignedLeaseHtml(
      { ...DATA, guestName: "<script>x</script>" },
      { signedName: "A & B <b>", signedAt: new Date("2026-07-01T00:00:00Z"), signedIp: "1.1.1.1" },
    );
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt;b&gt;");
  });
});

describe("the rent clause states what the Resident is actually charged", () => {
  it("WEEKLY: the installment and its 7-day period", () => {
    const html = renderLeaseHtml(DATA);
    expect(html).toContain("$260.00 per payment");
    expect(html).toContain("covering 7 days");
    expect(html).toContain("weekly basis");
  });

  it("MONTHLY: bills the monthly amount over 28 days and never says 'per week'", () => {
    // The regression guard for the legal-text bug: before 2026-09-08 this clause
    // printed the weekly list rate "per week" regardless of cadence.
    const html = renderLeaseHtml({
      ...DATA,
      cadence: "MONTHLY",
      installmentAmount: 2100,
      totalLeaseValue: 2100,
      schedule: [{ seq: 1, dueDate: "2026-07-01", amount: 2100, prorated: false }],
    });
    expect(html).toContain("$2,100.00 per payment");
    expect(html).toContain("covering 28 days");
    expect(html).not.toContain("per week");
    expect(html).not.toContain("{{");
  });

  it("no longer claims the first payment includes the cleaning fee", () => {
    // Clause 4 (and the code — the fee is its own CLEANING_FEE PaymentIntent)
    // says move-in charges are separate. Clause 3 used to contradict it.
    const html = renderLeaseHtml(DATA);
    expect(html).not.toMatch(/first payment[^.]*includes the one-time cleaning fee/i);
    expect(html).toContain("separate from rent");
  });
});

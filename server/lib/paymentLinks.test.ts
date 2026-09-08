// server/lib/paymentLinks.test.ts
// =============================================================================
// RATCHET. Every guest-facing message about money must carry a working payment
// link, and its SMS variant must fit one GSM-7 segment.
//
// Before 2026-09-08 not one reminder, overdue notice or default notice
// contained a URL of any kind — the overdue message literally said "please pay
// as soon as possible" with no mechanism — and the single link that did exist
// (PAYMENT_FAILED) pointed at a page that 409s for the only lease status the
// message can fire on.
//
// The `kind` set is asserted exhaustively on purpose: a NEW money message added
// later fails this test until it is given a link.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getGuest: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getSettingNumber: vi.fn(),
  getSetting: vi.fn(),
  updateScheduleRow: vi.fn(),
  updateLease: vi.fn(),
  hasNotification: vi.fn(),
  recordNotification: vi.fn(),
  accrueLateFeeOnce: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  getAccruedLateFeesForSchedule: vi.fn(),
  updateLateFee: vi.fn(),
}));
const mockNotify = vi.hoisted(() => ({
  notifyGuest: vi.fn(),
  sendEmail: vi.fn(),
  sendSms: vi.fn(),
  notifyAdmin: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);
vi.mock("./stripe", () => ({ chargeSavedCard: vi.fn() }));

import { runDunningSweep, handleChargeFailure } from "./dunning";

const TOKEN = "t".repeat(32);
const PORTAL = new RegExp(`https://[^\\s]+/portal/${TOKEN}`);
const PROP = { id: "prop-1", name: "Old Bill Cook", entity: "BNP", type: "COLIVING" };
const GUEST = { id: "g1", name: "Jane", email: "jane@example.com", phone: "+15551234567" };

const lease = (o = {}) => ({
  id: "lease-1",
  propertyId: "prop-1",
  guestId: "g1",
  status: "ACTIVE",
  stripeCustomerId: "cus_1",
  stripePaymentMethodId: "pm_1",
  portalToken: TOKEN,
  ...o,
});
// Worst-case lengths: a 4-figure amount and a 2-digit installment number.
const row = (seq: number, dueDate: string, o = {}) => ({
  id: `row-${seq}`,
  scheduleSeq: seq,
  dueDate,
  amount: "1000.00",
  status: "SCHEDULED",
  paymentMethod: "CARD_ON_FILE",
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getLeaseRooms.mockResolvedValue([]);
  mockStorage.getSettingNumber.mockResolvedValue(7);
  mockStorage.getSetting.mockResolvedValue(undefined); // SMS links on
  mockStorage.hasNotification.mockResolvedValue(false);
  mockStorage.recordNotification.mockResolvedValue({});
  mockStorage.accrueLateFeeOnce.mockResolvedValue({ id: "fee-1" });
  // Truthy: the DEFAULTED guest notice is nested under a NEW escalation.
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.updateScheduleRow.mockResolvedValue({});
  mockStorage.updateLease.mockResolvedValue({});
  mockNotify.notifyGuest.mockResolvedValue({
    email: { sent: true, channel: "email" },
    sms: { sent: true, channel: "sms" },
  });
});

/** Drive every guest money message once; return the notifyGuest payloads. */
async function collectMessages() {
  mockStorage.getLeases.mockResolvedValue([lease()]);

  // Reminders: 7 days out, 3 days out, day of.
  for (const [due, today] of [
    ["2026-07-10", "2026-07-03"],
    ["2026-07-10", "2026-07-07"],
    ["2026-07-10", "2026-07-10"],
  ]) {
    mockStorage.getScheduleByLease.mockResolvedValue([row(12, due)]);
    await runDunningSweep(today);
  }

  // Overdue days 1-3, then the default notice.
  for (const [today, seq] of [
    ["2026-07-11", 12],
    ["2026-07-12", 12],
    ["2026-07-13", 12],
  ] as [string, number][]) {
    mockStorage.getScheduleByLease.mockResolvedValue([row(seq, "2026-07-10", { status: "DUE" })]);
    await runDunningSweep(today);
  }
  mockStorage.getScheduleByLease.mockResolvedValue([row(12, "2026-07-10", { status: "LATE" })]);
  await runDunningSweep("2026-07-18"); // past the 7-day default threshold

  await handleChargeFailure({
    lease: lease(),
    guest: GUEST,
    scheduleRow: row(12, "2026-07-10", { status: "DUE" }),
    reason: "card_declined",
    today: "2026-07-10",
  });

  return mockNotify.notifyGuest.mock.calls.map((c) => c[0]);
}

describe("every guest money message carries a working payment link", () => {
  it("covers exactly the expected set of message kinds", async () => {
    const msgs = await collectMessages();
    const kinds = [...new Set(msgs.map((m) => m.context?.kind))].sort();
    expect(kinds).toEqual([
      "DEFAULTED",
      "OVERDUE_1",
      "OVERDUE_2",
      "OVERDUE_3",
      "PAYMENT_FAILED",
      "REMINDER_3D",
      "REMINDER_7D",
      "REMINDER_DUE",
    ]);
  });

  it("puts a resolvable portal link in every email body", async () => {
    const msgs = await collectMessages();
    expect(msgs.length).toBeGreaterThan(0);
    for (const m of msgs) {
      expect(m.body, `${m.context?.kind} has no portal link`).toMatch(PORTAL);
      // The dead deposit link must never come back.
      expect(m.body, `${m.context?.kind} uses the broken /lease/pay link`).not.toContain(
        "/lease/pay",
      );
    }
  });

  it("keeps every SMS to one ASCII GSM-7 segment", async () => {
    const msgs = await collectMessages();
    for (const m of msgs) {
      expect(m.smsBody, `${m.context?.kind} has no smsBody`).toBeTruthy();
      // A curly quote, em dash or emoji forces UCS-2 and halves the segment to 70.
      expect(m.smsBody, `${m.context?.kind} SMS is not plain ASCII`).toMatch(/^[\x20-\x7E]*$/);
      expect(
        m.smsBody.length,
        `${m.context?.kind} SMS is ${m.smsBody.length} chars (2 segments)`,
      ).toBeLessThanOrEqual(160);
      expect(m.smsBody).toMatch(PORTAL);
    }
  });

  it("the SMS kill switch strips links from SMS but never from email", async () => {
    // US carriers filter link-bearing SMS from unregistered A2P 10DLC brands.
    mockStorage.getSetting.mockResolvedValue({ key: "sms_include_links", value: "false" });
    const msgs = await collectMessages();
    for (const m of msgs) {
      expect(m.smsBody, `${m.context?.kind} SMS still has a link`).not.toMatch(PORTAL);
      expect(m.body, `${m.context?.kind} email lost its link`).toMatch(PORTAL);
    }
  });
});

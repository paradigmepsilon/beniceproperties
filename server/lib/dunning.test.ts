// server/lib/dunning.test.ts
// Phase 5 — dunning state machine. Mocks storage + notifications + stripe so no
// network/DB. Locks: reminder windows + dedupe + PAID suppression, overdue daily
// messaging (days 1–3) with $25/day idempotent accrual, default at threshold
// (DEFAULTED + HIGH escalation, once), failure path, and separate late-fee billing.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getGuest: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getSettingNumber: vi.fn(),
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
}));
const mockStripe = vi.hoisted(() => ({ chargeSavedCard: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);
vi.mock("./stripe", () => mockStripe);

import {
  runDunningSweep,
  handleChargeFailure,
  billAccruedLateFees,
  daysPastDue,
} from "./dunning";

const PROP = { id: "prop-1", name: "Old Bill Cook", entity: "BNP", type: "COLIVING" };
const GUEST = { id: "g1", name: "Jane", email: "jane@example.com", phone: "+15551234567" };
const ROOMS = [{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" }];

function activeLease(overrides = {}) {
  return {
    id: "lease-1",
    propertyId: "prop-1",
    guestId: "g1",
    status: "ACTIVE",
    stripeCustomerId: "cus_1",
    stripePaymentMethodId: "pm_1",
    ...overrides,
  };
}
function row(seq: number, dueDate: string, overrides = {}) {
  return {
    id: `row-${seq}`,
    scheduleSeq: seq,
    dueDate,
    amount: "250",
    status: "SCHEDULED",
    paymentMethod: "CARD_ON_FILE",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getSettingNumber.mockResolvedValue(7);
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
  mockStorage.hasNotification.mockResolvedValue(false);
  mockStorage.recordNotification.mockResolvedValue({});
  mockStorage.accrueLateFeeOnce.mockResolvedValue({ id: "fee-1" });
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.updateScheduleRow.mockResolvedValue(undefined);
  mockStorage.updateLease.mockResolvedValue(undefined);
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
});

describe("daysPastDue", () => {
  it("computes signed day offset", () => {
    expect(daysPastDue("2026-07-10", "2026-07-10")).toBe(0);
    expect(daysPastDue("2026-07-10", "2026-07-13")).toBe(3);
    expect(daysPastDue("2026-07-10", "2026-07-03")).toBe(-7);
  });
});

describe("reminders", () => {
  it("sends a 7-day reminder exactly 7 days before due", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-17")]);
    const res = await runDunningSweep("2026-07-10"); // 7 days before
    expect(res.remindersSent).toBe(1);
    const rec = mockStorage.recordNotification.mock.calls[0][0];
    expect(rec.kind).toBe("REMINDER_7D");
  });

  it("sends a day-of reminder on the due date", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-10")]);
    const res = await runDunningSweep("2026-07-10");
    expect(res.remindersSent).toBe(1);
    expect(mockStorage.recordNotification.mock.calls[0][0].kind).toBe("REMINDER_DUE");
  });

  it("does not resend if already logged that day (dedupe)", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-13")]);
    mockStorage.hasNotification.mockResolvedValue(true);
    const res = await runDunningSweep("2026-07-10"); // 3 days before
    expect(res.remindersSent).toBe(0);
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
  });

  it("suppresses reminders once the installment is PAID", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-17", { status: "PAID" })]);
    const res = await runDunningSweep("2026-07-10");
    expect(res.remindersSent).toBe(0);
  });

  it("does not send on a non-window day (e.g. 5 days before)", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-15")]);
    const res = await runDunningSweep("2026-07-10");
    expect(res.remindersSent).toBe(0);
  });
});

describe("overdue + late fees", () => {
  it("on day 1 past due: marks LATE, accrues a $25 fee, messages the guest, flags UO", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-09")]);
    const res = await runDunningSweep("2026-07-10"); // 1 day past

    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith("row-2", { status: "LATE" });
    const fee = mockStorage.accrueLateFeeOnce.mock.calls[0][0];
    expect(fee).toMatchObject({ leaseId: "lease-1", scheduleSeq: 2, accrualDate: "2026-07-10", amount: 25 });
    expect(res.lateFeesAccrued).toBe(1);
    expect(res.overdueMessages).toBe(1);
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "PAYMENT_OVERDUE" }),
    );
  });

  it("accrues a fee every day but messages only days 1–3", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-04")]);
    // 5 days past due (within the 7-day default threshold, so no default yet).
    mockStorage.getSettingNumber.mockResolvedValue(7);
    const res = await runDunningSweep("2026-07-09"); // 5 days past
    expect(res.lateFeesAccrued).toBe(1); // fee accrues
    expect(res.overdueMessages).toBe(0); // but no message past day 3
  });

  it("is idempotent on accrual: a duplicate day returns null and is not counted", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-09", { status: "LATE" })]);
    mockStorage.accrueLateFeeOnce.mockResolvedValue(null); // already accrued today
    const res = await runDunningSweep("2026-07-10");
    expect(res.lateFeesAccrued).toBe(0);
  });
});

describe("default", () => {
  it("flips the lease to DEFAULTED and raises a HIGH escalation at the threshold", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-03", { status: "LATE" })]);
    mockStorage.getSettingNumber.mockResolvedValue(7);
    const res = await runDunningSweep("2026-07-10"); // exactly 7 days past

    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", { status: "DEFAULTED" });
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "LEASE_DEFAULTED", severity: "HIGH" }),
    );
    expect(res.defaultsRaised).toBe(1);
  });

  it("respects a custom (configured) threshold", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([row(2, "2026-07-08", { status: "LATE" })]);
    mockStorage.getSettingNumber.mockResolvedValue(3); // 3-day threshold
    const res = await runDunningSweep("2026-07-10"); // 2 days past → no default yet
    expect(res.defaultsRaised).toBe(0);
    expect(mockStorage.updateLease).not.toHaveBeenCalledWith("lease-1", { status: "DEFAULTED" });
  });
});

describe("handleChargeFailure", () => {
  it("marks FAILED, raises a UO escalation, and sends a fix-card message", async () => {
    await handleChargeFailure({
      lease: activeLease(),
      guest: GUEST,
      scheduleRow: row(2, "2026-07-10", { status: "DUE" }),
      reason: "card_declined",
      today: "2026-07-10",
    });
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith("row-2", { status: "FAILED" });
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "PAYMENT_FAILED", severity: "HIGH" }),
    );
    const msg = mockNotify.notifyGuest.mock.calls[0][0];
    expect(msg.subject).toMatch(/failed/i);
    expect(msg.body).toMatch(/lease\/pay\?leaseId=lease-1/);
  });
});

describe("billAccruedLateFees", () => {
  it("charges accrued fees as a SEPARATE LATE_FEE PaymentIntent and marks them BILLED", async () => {
    mockStorage.getAccruedLateFeesForSchedule.mockResolvedValue([
      { id: "fee-1", amount: "25" },
      { id: "fee-2", amount: "25" },
    ]);
    mockStorage.updateLateFee.mockResolvedValue(undefined);
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_latefee_1", status: "succeeded" });

    const res = await billAccruedLateFees({
      lease: activeLease(),
      property: PROP,
      rooms: ROOMS,
      scheduleSeq: 2,
    });

    expect(res.billed).toBe(true);
    expect(res.amount).toBe(50);
    const args = mockStripe.chargeSavedCard.mock.calls[0][0];
    expect(args.amount).toBe(50);
    expect(args.metadata.payment_kind).toBe("LATE_FEE");
    expect(args.idempotencyKey).toBe("lease-latefee-lease-1-seq-2");
    expect(mockStorage.updateLateFee).toHaveBeenCalledWith("fee-1", { status: "BILLED", stripePaymentIntentId: "pi_latefee_1" });
    expect(mockStorage.updateLateFee).toHaveBeenCalledWith("fee-2", { status: "BILLED", stripePaymentIntentId: "pi_latefee_1" });
  });

  it("does not charge when there are no accrued fees", async () => {
    mockStorage.getAccruedLateFeesForSchedule.mockResolvedValue([]);
    const res = await billAccruedLateFees({ lease: activeLease(), property: PROP, rooms: ROOMS, scheduleSeq: 2 });
    expect(res.billed).toBe(false);
    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
  });

  it("leaves fees ACCRUED for a manual-pay lease (no saved card)", async () => {
    mockStorage.getAccruedLateFeesForSchedule.mockResolvedValue([{ id: "fee-1", amount: "25" }]);
    const res = await billAccruedLateFees({
      lease: activeLease({ stripePaymentMethodId: null }),
      property: PROP,
      rooms: ROOMS,
      scheduleSeq: 2,
    });
    expect(res.billed).toBe(false);
    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
  });
});

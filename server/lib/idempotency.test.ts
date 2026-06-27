// server/lib/idempotency.test.ts
// Phase 9 — idempotency audit for the money-moving sweeps. Asserts the invariants
// the spec calls out: no double charge and no duplicate late fee on scheduler
// re-runs. These complement the per-module tests with explicit double-run checks.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getGuest: vi.fn(),
  updateScheduleRow: vi.fn(),
  getSettingNumber: vi.fn(),
  hasNotification: vi.fn(),
  recordNotification: vi.fn(),
  accrueLateFeeOnce: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  updateLease: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ chargeSavedCard: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyGuest: vi.fn(), sendEmail: vi.fn(), sendSms: vi.fn() }));
const mockLifecycle = vi.hoisted(() => ({ onPaymentReceived: vi.fn(), onLeaseActivated: vi.fn() }));
const mockDunning = vi.hoisted(() => ({ handleChargeFailure: vi.fn(), billAccruedLateFees: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./notifications", () => mockNotify);
vi.mock("./lifecycle", () => mockLifecycle);

// dunning is imported by leasePayments; mock its outward effects but keep the
// real accrual idempotency at the storage layer (accrueLateFeeOnce).
vi.mock("./dunning", async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return { ...actual, billAccruedLateFees: mockDunning.billAccruedLateFees };
});

import { runScheduledRentSweep } from "./leasePayments";
import { runDunningSweep } from "./dunning";

const PROP = { id: "p1", name: "OBC", entity: "BNP", type: "COLIVING" };
const ROOMS = [{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" }];
const activeLease = {
  id: "lease-1", propertyId: "p1", guestId: "g1", status: "ACTIVE",
  stripeCustomerId: "cus_1", stripePaymentMethodId: "pm_1",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
  mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "j@x.com", phone: "+15550000000" });
  mockStorage.getSettingNumber.mockResolvedValue(7);
  mockStorage.hasNotification.mockResolvedValue(false);
  mockStorage.recordNotification.mockResolvedValue({});
  mockStorage.raiseEscalationOnce.mockResolvedValue(null);
  mockDunning.billAccruedLateFees.mockResolvedValue({ billed: false, amount: 0 });
  mockLifecycle.onPaymentReceived.mockResolvedValue(undefined);
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.sendEmail.mockResolvedValue({ sent: true });
  mockNotify.sendSms.mockResolvedValue({ sent: true });
});

describe("rent sweep — no double charge on re-run", () => {
  it("charges once; a second sweep sees the PI-stamped row and skips", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease]);
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_1", status: "succeeded" });

    // First run: row is chargeable.
    mockStorage.getScheduleByLease.mockResolvedValueOnce([
      { id: "row-2", scheduleSeq: 2, dueDate: "2026-07-01", amount: "250", status: "SCHEDULED", paymentMethod: "CARD_ON_FILE", stripePaymentIntentId: null },
    ]);
    const first = await runScheduledRentSweep("2026-07-10");
    expect(first.charged).toBe(1);
    expect(mockStripe.chargeSavedCard).toHaveBeenCalledTimes(1);

    // Second run: the row now carries a PI id (and is PAID) → skipped, no charge.
    mockStorage.getScheduleByLease.mockResolvedValueOnce([
      { id: "row-2", scheduleSeq: 2, dueDate: "2026-07-01", amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", stripePaymentIntentId: "pi_1" },
    ]);
    const second = await runScheduledRentSweep("2026-07-10");
    expect(second.charged).toBe(0);
    expect(mockStripe.chargeSavedCard).toHaveBeenCalledTimes(1); // still once
  });
});

describe("dunning — no duplicate late fee on re-run (same day)", () => {
  it("accrues once; the storage guard returns null on the second run", async () => {
    mockStorage.getLeases.mockResolvedValue([activeLease]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, dueDate: "2026-07-09", amount: "250", status: "LATE", paymentMethod: "CARD_ON_FILE" },
    ]);

    // First run: accrual succeeds.
    mockStorage.accrueLateFeeOnce.mockResolvedValueOnce({ id: "fee-1" });
    const first = await runDunningSweep("2026-07-10");
    expect(first.lateFeesAccrued).toBe(1);

    // Second run same day: the unique-accrual guard returns null → no new fee.
    mockStorage.accrueLateFeeOnce.mockResolvedValueOnce(null);
    const second = await runDunningSweep("2026-07-10");
    expect(second.lateFeesAccrued).toBe(0);
  });
});

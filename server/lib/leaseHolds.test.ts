// server/lib/leaseHolds.test.ts
// Owner rule (2026-09-08): a room is held only once a deposit is paid, and that
// hold lapses if the first rent payment misses the move-in date.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getActiveLeasesWithGuest: vi.fn(),
  getScheduleByLease: vi.fn(),
  getPendingManualPayments: vi.fn(),
  hasLifecycleEvent: vi.fn(),
  recordLifecycleEvent: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  updateLease: vi.fn(),
}));
const mockNotify = vi.hoisted(() => ({ notifyGuest: vi.fn(), notifyAdmin: vi.fn() }));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);

import { runLeaseHoldExpiry } from "./leaseHolds";

const GUEST = { id: "g1", name: "Jane", email: "jane@example.com", phone: "+15551234567" };
const PROPERTY = { name: "Old Bill Cook" };

const lease = (o: Record<string, unknown> = {}) => ({
  id: "lease-1",
  propertyId: "prop-1",
  guestId: "g1",
  status: "PENDING_VERIFICATION",
  depositStatus: "PAID",
  cleaningFeeStatus: "PENDING",
  startDate: "2026-07-10",
  endDate: "2026-09-01",
  createdAt: new Date("2026-07-01T00:00:00Z"),
  guest: GUEST,
  property: PROPERTY,
  ...o,
});
const seq1 = (o: Record<string, unknown> = {}) => ({
  id: "row-1",
  scheduleSeq: 1,
  dueDate: "2026-07-10",
  amount: "250",
  status: "SCHEDULED",
  paymentMethod: "CARD_ON_FILE",
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getScheduleByLease.mockResolvedValue([seq1()]);
  mockStorage.getPendingManualPayments.mockResolvedValue([]);
  mockStorage.hasLifecycleEvent.mockResolvedValue(false);
  mockStorage.recordLifecycleEvent.mockResolvedValue({});
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.updateLease.mockResolvedValue({});
  mockNotify.notifyGuest.mockResolvedValue({
    email: { sent: true, channel: "email" },
    sms: { sent: true, channel: "sms" },
  });
});

describe("move-in release", () => {
  it("releases the room when the first payment misses the move-in date", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease()]);
    const res = await runLeaseHoldExpiry({ today: "2026-07-11" }); // day AFTER move-in
    expect(res.movedIn).toBe(1);
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", { status: "TERMINATED" });
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "LEASE_HOLD_RELEASED" }),
    );
    // The guest is told, and told their deposit is not gone automatically.
    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("gives the guest the WHOLE move-in day: nudges, does not release", async () => {
    // The daily cron fires at 08:00 UTC = 4am ET. Releasing on the move-in date
    // itself would kill the lease before the guest has had the day to pay.
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease()]);
    const res = await runLeaseHoldExpiry({ today: "2026-07-10" }); // move-in day
    expect(res.movedIn).toBe(0);
    expect(res.nudged).toBe(1);
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
    expect(mockNotify.notifyGuest.mock.calls[0][0].subject).toMatch(/move-in/i);
  });

  it("does nothing while move-in is still ahead", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease()]);
    const res = await runLeaseHoldExpiry({ today: "2026-07-01" });
    expect(res).toEqual({ movedIn: 0, abandoned: 0, nudged: 0 });
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });

  it("leaves a paid lease alone", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease({ status: "ACTIVE" })]);
    mockStorage.getScheduleByLease.mockResolvedValue([seq1({ status: "PAID" })]);
    const res = await runLeaseHoldExpiry({ today: "2026-08-01" });
    expect(res.movedIn).toBe(0);
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });

  it("treats an admin WAIVED first installment as settled", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease({ status: "ACTIVE" })]);
    mockStorage.getScheduleByLease.mockResolvedValue([seq1({ status: "WAIVED" })]);
    expect((await runLeaseHoldExpiry({ today: "2026-08-01" })).movedIn).toBe(0);
  });

  it("NEVER auto-terminates a CashApp/Zelle guest — escalates to a human instead", async () => {
    // Their money may already be sent, with only UO's Mark Paid outstanding.
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease({ status: "ACTIVE" })]);
    mockStorage.getScheduleByLease.mockResolvedValue([seq1({ paymentMethod: "MANUAL" })]);
    const res = await runLeaseHoldExpiry({ today: "2026-07-20" });
    expect(res.movedIn).toBe(0);
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "PAYMENT_OVERDUE", severity: "HIGH" }),
    );
  });

  it("is idempotent: an already-released lease is skipped", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([lease()]);
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    await runLeaseHoldExpiry({ today: "2026-07-11" });
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
  });
});

describe("abandoned-row hygiene", () => {
  const NOW = new Date("2026-07-03T00:00:00Z");

  it("terminates an unpaid lease left sitting for 24h+", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([
      lease({
        status: "PENDING_FIRST_PAYMENT",
        depositStatus: "PENDING",
        createdAt: new Date("2026-07-01T00:00:00Z"), // 48h old
      }),
    ]);
    const res = await runLeaseHoldExpiry({ now: NOW, today: "2026-07-03" });
    expect(res.abandoned).toBe(1);
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", { status: "TERMINATED" });
  });

  it("leaves a fresh unpaid lease alone", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([
      lease({
        status: "PENDING_SIGNATURE",
        depositStatus: "PENDING",
        createdAt: new Date("2026-07-02T23:00:00Z"), // 1h old
      }),
    ]);
    expect((await runLeaseHoldExpiry({ now: NOW, today: "2026-07-03" })).abandoned).toBe(0);
  });

  it("never tidies away a lease that took any money", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([
      lease({
        status: "PENDING_FIRST_PAYMENT",
        depositStatus: "PENDING",
        cleaningFeeStatus: "PAID",
        createdAt: new Date("2026-07-01T00:00:00Z"),
      }),
    ]);
    expect((await runLeaseHoldExpiry({ now: NOW, today: "2026-07-03" })).abandoned).toBe(0);
  });

  it("never tidies away a lease with a settled installment", async () => {
    mockStorage.getActiveLeasesWithGuest.mockResolvedValue([
      lease({
        status: "PENDING_FIRST_PAYMENT",
        depositStatus: "PENDING",
        createdAt: new Date("2026-07-01T00:00:00Z"),
      }),
    ]);
    mockStorage.getScheduleByLease.mockResolvedValue([seq1({ status: "PAID" })]);
    expect((await runLeaseHoldExpiry({ now: NOW, today: "2026-07-03" })).abandoned).toBe(0);
  });
});

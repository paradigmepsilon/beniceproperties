// server/lib/leasePaymentPlan.test.ts
// A payment-plan change must never rewrite history: only the not-yet-due tail of
// SCHEDULED installments is re-cut, and a stale confirmation changes nothing.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLease: vi.fn(),
  getScheduleByLease: vi.fn(),
  getLeaseRooms: vi.fn(),
  getRoom: vi.fn(),
  replaceScheduledInstallments: vi.fn(),
  updateLease: vi.fn(),
  createBookingModification: vi.fn(),
  raiseEscalationOnce: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("@shared/dates", async (orig) => ({
  ...(await orig<typeof import("@shared/dates")>()),
  todayIso: () => "2026-10-10",
}));

import { applyPaymentPlan, quotePaymentPlan, splitSchedule } from "./leasePaymentPlan";

// Monthly lease Oct 1 – Dec 23 (84 days) at $1200/mo: three $1200 installments.
const LEASE = {
  id: "l1", status: "ACTIVE", startDate: "2026-10-01", endDate: "2026-12-23",
  paymentCadence: "MONTHLY", weeklyRateSnapshot: "350.00", totalLeaseValue: "3600.00",
};
const row = (seq: number, dueDate: string, status: string, over: Record<string, unknown> = {}) => ({
  id: `s${seq}`, leaseId: "l1", scheduleSeq: seq, dueDate, amount: "1200.00", status,
  paymentMethod: "CARD_ON_FILE", ...over,
});
const SCHEDULE = [row(1, "2026-10-01", "PAID"), row(2, "2026-10-29", "SCHEDULED"), row(3, "2026-11-26", "SCHEDULED")];
const INPUT = { cadence: "WEEKLY" as const, reason: "Guest asked for weekly billing, agreed in writing" };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getLease.mockResolvedValue(LEASE);
  mockStorage.getScheduleByLease.mockResolvedValue(SCHEDULE);
  mockStorage.getLeaseRooms.mockResolvedValue([{ roomId: "r1" }]);
  mockStorage.getRoom.mockResolvedValue({ id: "r1", weeklyRent: "350", dailyRate: null, biweeklyRate: null, monthlyRate: "1200" });
  mockStorage.replaceScheduledInstallments.mockResolvedValue({ removed: 2, inserted: 8 });
  mockStorage.createBookingModification.mockResolvedValue({ id: "mod-9" });
});

describe("splitSchedule", () => {
  it("keeps everything up to the last non-SCHEDULED or already-due row", () => {
    const rows = [row(1, "2026-10-01", "PAID"), row(2, "2026-10-08", "SCHEDULED"), row(3, "2026-10-15", "LATE"), row(4, "2026-10-22", "SCHEDULED")];
    const { kept, tail } = splitSchedule(rows as never, "2026-10-10");
    expect(kept.map((r) => r.scheduleSeq)).toEqual([1, 2, 3]);
    expect(tail.map((r) => r.scheduleSeq)).toEqual([4]);
  });
});

describe("quotePaymentPlan", () => {
  it("re-cuts only the unpaid tail at the new cadence and numbers after history", async () => {
    const q = await quotePaymentPlan("l1", INPUT);
    expect(q.kept.map((k) => k.seq)).toEqual([1]);
    expect(q.replaced.map((r) => r.seq)).toEqual([2, 3]);
    // Oct 29 – Dec 23 = 56 days = 8 weeks at $350.
    expect(q.proposed).toHaveLength(8);
    expect(q.proposed[0]).toMatchObject({ seq: 2, dueDate: "2026-10-29", amount: 350 });
    expect(q.oldRemaining).toBe(2400);
    expect(q.newRemaining).toBe(2800);
    expect(q.newTotalLeaseValue).toBe(4000);
  });

  it("refuses a lease with nothing left to re-plan, or one that is not live", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([row(1, "2026-10-01", "PAID")]);
    await expect(quotePaymentPlan("l1", INPUT)).rejects.toMatchObject({ status: 409 });
    mockStorage.getLease.mockResolvedValue({ ...LEASE, status: "COMPLETED" });
    await expect(quotePaymentPlan("l1", INPUT)).rejects.toMatchObject({ status: 409 });
  });
});

describe("applyPaymentPlan", () => {
  it("a stale confirmation writes nothing", async () => {
    await expect(
      applyPaymentPlan({ leaseId: "l1", input: INPUT, expectedNewRemaining: 2400, actor: "uo:x" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockStorage.replaceScheduledInstallments).not.toHaveBeenCalled();
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });

  it("swaps the tail, updates the lease, and records the change", async () => {
    const r = await applyPaymentPlan({ leaseId: "l1", input: INPUT, expectedNewRemaining: 2800, actor: "uo:x" });
    const [leaseId, removeIds, rows] = mockStorage.replaceScheduledInstallments.mock.calls[0];
    expect(leaseId).toBe("l1");
    expect(removeIds).toEqual(["s2", "s3"]);
    expect(rows).toHaveLength(8);
    expect(rows[0]).toMatchObject({ scheduleSeq: 2, dueDate: "2026-10-29", amount: "350.00", status: "SCHEDULED", paymentMethod: "CARD_ON_FILE" });
    expect(mockStorage.updateLease).toHaveBeenCalledWith("l1", expect.objectContaining({ paymentCadence: "WEEKLY", totalLeaseValue: "4000.00" }));
    expect(mockStorage.createBookingModification).toHaveBeenCalledWith(
      expect.objectContaining({ leaseId: "l1", kind: "LEASE_PLAN", reason: INPUT.reason }),
    );
    expect(r.modificationId).toBe("mod-9");
    expect(mockStorage.raiseEscalationOnce).not.toHaveBeenCalled();
  });

  it("escalates when a tail row changed status underneath the swap", async () => {
    mockStorage.replaceScheduledInstallments.mockResolvedValue({ removed: 1, inserted: 8 });
    await applyPaymentPlan({ leaseId: "l1", input: INPUT, expectedNewRemaining: 2800, actor: "uo:x" });
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(expect.objectContaining({ leaseId: "l1", severity: "HIGH" }));
  });

  it("a rate override also moves the weekly snapshot", async () => {
    const input = { ...INPUT, rates: { weekly: 300 } };
    const q = await quotePaymentPlan("l1", input);
    await applyPaymentPlan({ leaseId: "l1", input, expectedNewRemaining: q.newRemaining, actor: "uo:x" });
    expect(q.newRemaining).toBe(2400);
    expect(mockStorage.updateLease).toHaveBeenCalledWith("l1", expect.objectContaining({ weeklyRateSnapshot: "300.00" }));
  });
});

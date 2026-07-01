// server/lib/portal.test.ts
// Phase 6 — guest portal service over mocked storage/stripe/dunning. Covers token
// resolution, the read view, pay-installment guards + success, and messaging.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLeaseByPortalToken: vi.fn(),
  getProperty: vi.fn(),
  getGuest: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getLateFeesByLease: vi.fn(),
  getMessageThreadsByLease: vi.fn(),
  getMessagesByThread: vi.fn(),
  getVehicleByLease: vi.fn(),
  updateScheduleRow: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ chargeSavedCard: vi.fn() }));
const mockDunning = vi.hoisted(() => ({ billAccruedLateFees: vi.fn() }));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./dunning", () => mockDunning);

import {
  getPortalView,
  payInstallmentNow,
  submitMessage,
  replyToThread,
} from "./portal";
import { LeaseError } from "./lease";

const TOKEN = "a".repeat(32);
const PROP = { id: "prop-1", name: "Old Bill Cook", location: "Atlanta", entity: "BNP", type: "COLIVING" };

function lease(overrides = {}) {
  return {
    id: "lease-1",
    propertyId: "prop-1",
    guestId: "g1",
    status: "ACTIVE",
    startDate: "2026-07-01",
    endDate: "2026-07-28",
    paymentCadence: "WEEKLY",
    weeklyRateSnapshot: "250",
    totalLeaseValue: "1000",
    prorationNote: "note",
    signedAt: new Date(),
    signedPdfUrl: "/api/leases/lease-1/document",
    portalToken: TOKEN,
    stripeCustomerId: "cus_1",
    stripePaymentMethodId: "pm_1",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
  mockStorage.getLeaseRooms.mockResolvedValue([{ roomNameSnapshot: "Room 1", roomNumberSnapshot: "1", roomId: "r1" }]);
  mockStorage.getLateFeesByLease.mockResolvedValue([]);
  mockStorage.getMessageThreadsByLease.mockResolvedValue([]);
  mockStorage.getVehicleByLease.mockResolvedValue(undefined);
});

describe("token resolution", () => {
  it("rejects a too-short token", async () => {
    await expect(getPortalView("short")).rejects.toBeInstanceOf(LeaseError);
  });
  it("404s an unknown token", async () => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(undefined);
    await expect(getPortalView(TOKEN)).rejects.toThrow(/not found/i);
  });
});

describe("getPortalView", () => {
  it("returns lease, schedule, accrued late-fee total, and hasSavedCard", async () => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(lease());
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, dueDate: "2026-07-01", amount: "250", status: "PAID", paidAt: new Date(), paymentMethod: "CARD_ON_FILE" },
      { scheduleSeq: 2, dueDate: "2026-07-08", amount: "250", status: "DUE", paidAt: null, paymentMethod: "CARD_ON_FILE" },
    ]);
    mockStorage.getLateFeesByLease.mockResolvedValue([
      { scheduleSeq: 2, accrualDate: "2026-07-09", amount: "25", status: "ACCRUED" },
      { scheduleSeq: 2, accrualDate: "2026-07-10", amount: "25", status: "ACCRUED" },
    ]);

    const view = await getPortalView(TOKEN);
    expect(view.lease.hasSavedCard).toBe(true);
    expect(view.schedule).toHaveLength(2);
    expect(view.lateFees.accruedTotal).toBe(50);
  });
});

describe("payInstallmentNow", () => {
  beforeEach(() => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(lease());
    mockStorage.updateScheduleRow.mockResolvedValue(undefined);
    mockDunning.billAccruedLateFees.mockResolvedValue({ billed: false, amount: 0 });
  });

  it("charges an open installment with surcharge and marks it PAID", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, dueDate: "2026-07-08", amount: "250", status: "DUE", paymentMethod: "CARD_ON_FILE" },
    ]);
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_pay_2", status: "succeeded" });

    const res = await payInstallmentNow(TOKEN, 2);
    expect(res.paid).toBe(true);
    expect(res.amount).toBe(258.75);
    expect(mockStripe.chargeSavedCard.mock.calls[0][0].idempotencyKey).toBe("lease-rent-lease-1-seq-2");
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith("row-2", expect.objectContaining({ status: "PAID" }));
    expect(mockDunning.billAccruedLateFees).toHaveBeenCalled();
  });

  it("refuses when there is no saved card", async () => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(lease({ stripePaymentMethodId: null }));
    await expect(payInstallmentNow(TOKEN, 2)).rejects.toThrow(/no saved card/i);
  });

  it("refuses an already-paid installment", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, dueDate: "2026-07-08", amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE" },
    ]);
    await expect(payInstallmentNow(TOKEN, 2)).rejects.toThrow(/already paid/i);
  });
});

describe("messaging", () => {
  it("submits a new thread root", async () => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(lease());
    mockStorage.createMessage.mockResolvedValue({ id: "msg-1", status: "OPEN" });
    const root = await submitMessage(TOKEN, { body: "Sink is leaking", category: "MAINTENANCE" });
    expect(root.id).toBe("msg-1");
    const arg = mockStorage.createMessage.mock.calls[0][0];
    expect(arg.authorRole).toBe("GUEST");
    expect(arg.category).toBe("MAINTENANCE");
  });

  it("reply reopens an ANSWERED thread and rejects a foreign thread", async () => {
    mockStorage.getLeaseByPortalToken.mockResolvedValue(lease());
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "thread-1", threadId: "thread-1", leaseId: "lease-1", status: "ANSWERED", category: "QUESTION" },
    ]);
    mockStorage.createMessage.mockResolvedValue({ id: "reply-1" });
    await replyToThread(TOKEN, "thread-1", "any update?");
    expect(mockStorage.updateMessage).toHaveBeenCalledWith("thread-1", { status: "OPEN" });

    // Foreign thread (belongs to another lease).
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "thread-x", threadId: "thread-x", leaseId: "OTHER", status: "OPEN", category: "QUESTION" },
    ]);
    await expect(replyToThread(TOKEN, "thread-x", "hi")).rejects.toThrow(/not found/i);
  });
});

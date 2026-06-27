// server/lib/uoApi.test.ts
// Phase 8 — UO write-backs + payments-with-metadata, over mocked storage.
// Locks: mark-paid is MANUAL-only + idempotent + resolves escalations, approve is
// idempotent, respond posts a STAFF reply + ANSWERED, waive marks WAIVED, and the
// payments view carries the full metadata contract.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLease: vi.fn(),
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getLateFeesByLease: vi.fn(),
  getEscalations: vi.fn(),
  updateScheduleRow: vi.fn(),
  updateEscalation: vi.fn(),
  updateLease: vi.fn(),
  getMessagesByThread: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
  updateLateFee: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import {
  markPaid,
  approveLease,
  respondToMessage,
  waiveLateFees,
  listPaymentsWithMetadata,
} from "./uoApi";
import { LeaseError } from "./lease";

const PROP = { id: "prop-1", name: "Old Bill Cook", entity: "BNP", type: "COLIVING" };
const ROOMS = [{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" }];
const lease = { id: "lease-1", propertyId: "prop-1", guestId: "g1", status: "ACTIVE" };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getLease.mockResolvedValue(lease);
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
  mockStorage.getEscalations.mockResolvedValue([]);
  mockStorage.updateScheduleRow.mockResolvedValue(undefined);
});

describe("markPaid", () => {
  it("settles a MANUAL installment, writing MANUAL_RECONCILE note + metadata", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, status: "LATE", paymentMethod: "MANUAL", amount: "250" },
    ]);
    const res = await markPaid({ leaseId: "lease-1", scheduleSeq: 2, note: "Zelle conf #abc", actor: "alex" });
    expect(res.alreadyPaid).toBe(false);
    const upd = mockStorage.updateScheduleRow.mock.calls[0][1];
    expect(upd.status).toBe("PAID");
    expect(upd.manualNote).toMatch(/MANUAL_RECONCILE by alex/);
    expect(upd.manualNote).toMatch(/"payment_kind":"MANUAL_RECONCILE"/);
  });

  it("is idempotent for an already-paid row", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, status: "PAID", paymentMethod: "MANUAL", amount: "250" },
    ]);
    const res = await markPaid({ leaseId: "lease-1", scheduleSeq: 2, note: "x", actor: "alex" });
    expect(res.alreadyPaid).toBe(true);
    expect(mockStorage.updateScheduleRow).not.toHaveBeenCalled();
  });

  it("refuses a CARD_ON_FILE row (those settle via Stripe)", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, status: "DUE", paymentMethod: "CARD_ON_FILE", amount: "250" },
    ]);
    await expect(markPaid({ leaseId: "lease-1", scheduleSeq: 2, note: "x", actor: "alex" })).rejects.toThrow(/MANUAL/);
  });

  it("resolves an OPEN escalation for that installment", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, status: "LATE", paymentMethod: "MANUAL", amount: "250" },
    ]);
    mockStorage.getEscalations.mockResolvedValue([{ id: "esc-1", scheduleSeq: 2, status: "OPEN" }]);
    await markPaid({ leaseId: "lease-1", scheduleSeq: 2, note: "x", actor: "alex" });
    expect(mockStorage.updateEscalation).toHaveBeenCalledWith("esc-1", expect.objectContaining({ status: "RESOLVED" }));
  });
});

describe("approveLease", () => {
  it("moves DRAFT → PENDING_SIGNATURE", async () => {
    mockStorage.getLease.mockResolvedValue({ ...lease, status: "DRAFT" });
    const res = await approveLease("lease-1", "alex");
    expect(res.status).toBe("PENDING_SIGNATURE");
    expect(mockStorage.updateLease).toHaveBeenCalled();
  });
  it("no-ops when already past draft (idempotent)", async () => {
    mockStorage.getLease.mockResolvedValue({ ...lease, status: "ACTIVE" });
    const res = await approveLease("lease-1", "alex");
    expect(res.noop).toBe(true);
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });
});

describe("respondToMessage", () => {
  it("posts a STAFF reply and marks the thread ANSWERED", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "t1", threadId: "t1", leaseId: "lease-1", guestId: "g1", category: "QUESTION", status: "OPEN" },
    ]);
    mockStorage.createMessage.mockResolvedValue({ id: "reply-1" });
    const res = await respondToMessage({ threadId: "t1", body: "We're on it.", actor: "alex" });
    expect(res.threadStatus).toBe("ANSWERED");
    expect(mockStorage.createMessage.mock.calls[0][0].authorRole).toBe("STAFF");
    expect(mockStorage.updateMessage).toHaveBeenCalledWith("t1", { status: "ANSWERED" });
  });
  it("404s an unknown thread", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([]);
    await expect(respondToMessage({ threadId: "nope", body: "x", actor: "a" })).rejects.toBeInstanceOf(LeaseError);
  });
});

describe("waiveLateFees", () => {
  it("marks ACCRUED fees WAIVED and notes the reason", async () => {
    mockStorage.getLateFeesByLease.mockResolvedValue([
      { id: "f1", scheduleSeq: 2, status: "ACCRUED" },
      { id: "f2", scheduleSeq: 2, status: "ACCRUED" },
      { id: "f3", scheduleSeq: 2, status: "BILLED" }, // not waived
    ]);
    mockStorage.getScheduleByLease.mockResolvedValue([{ id: "row-2", scheduleSeq: 2, manualNote: null }]);
    mockStorage.updateLateFee.mockResolvedValue(undefined);
    const res = await waiveLateFees({ leaseId: "lease-1", scheduleSeq: 2, reason: "goodwill", actor: "alex" });
    expect(res.waivedCount).toBe(2);
    expect(mockStorage.updateLateFee).toHaveBeenCalledWith("f1", { status: "WAIVED" });
    expect(mockStorage.updateLateFee).toHaveBeenCalledWith("f2", { status: "WAIVED" });
    const note = mockStorage.updateScheduleRow.mock.calls[0][1].manualNote;
    expect(note).toMatch(/LATE_FEE_WAIVED by alex.*goodwill/);
  });
});

describe("listPaymentsWithMetadata", () => {
  it("emits rent + late-fee rows each carrying the full metadata contract", async () => {
    mockStorage.getLeases.mockResolvedValue([lease]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, amount: "250", status: "PAID", paymentMethod: "CARD_ON_FILE", paidAt: new Date(), stripePaymentIntentId: "pi_1" },
    ]);
    mockStorage.getLateFeesByLease.mockResolvedValue([
      { scheduleSeq: 1, amount: "25", status: "BILLED", stripePaymentIntentId: "pi_lf" },
    ]);
    const rows = await listPaymentsWithMetadata();
    expect(rows).toHaveLength(2);
    const rent = rows.find((r) => r.kind === "RENT")!;
    const fee = rows.find((r) => r.kind === "LATE_FEE")!;
    expect((rent.metadata as any).payment_kind).toBe("FIRST_PAYMENT");
    expect((rent.metadata as any).entity).toBe("BNP");
    expect((rent.metadata as any).property_name).toBe("Old Bill Cook");
    expect((fee.metadata as any).payment_kind).toBe("LATE_FEE");
  });
});

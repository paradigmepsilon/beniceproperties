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
  getProperties: vi.fn(),
  getRoomsByProperty: vi.fn(),
  getRoom: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getLateFeesByLease: vi.fn(),
  getEscalations: vi.fn(),
  updateScheduleRow: vi.fn(),
  updateEscalation: vi.fn(),
  updateLease: vi.fn(),
  updateLateFee: vi.fn(),
  updateProperty: vi.fn(),
  updateRoom: vi.fn(),
  createProperty: vi.fn(),
  createRoom: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

const mockLeasePayments = vi.hoisted(() => ({ activateVerifiedLease: vi.fn() }));
vi.mock("./leasePayments", () => mockLeasePayments);

const mockAdminMessages = vi.hoisted(() => ({ sendStaffMessage: vi.fn() }));
vi.mock("./adminMessages", () => mockAdminMessages);

import {
  markPaid,
  approveLease,
  respondToMessage,
  waiveLateFees,
  listPaymentsWithMetadata,
  listPropertiesWithRooms,
  updateProperty,
  updateRoom,
  createProperty,
  createRoom,
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

  it("settling MANUAL seq 1 on an approved lease releases check-in (activates)", async () => {
    mockStorage.getLease.mockResolvedValue({
      ...lease,
      status: "PENDING_VERIFICATION",
      verificationStatus: "APPROVED",
    });
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-1", scheduleSeq: 1, status: "DUE", paymentMethod: "MANUAL", amount: "250" },
    ]);
    await markPaid({ leaseId: "lease-1", scheduleSeq: 1, note: "Zelle move-in", actor: "alex" });
    expect(mockLeasePayments.activateVerifiedLease).toHaveBeenCalledWith("lease-1");
  });

  it("settling a non-seq-1 MANUAL row does NOT trigger activation", async () => {
    mockStorage.getLease.mockResolvedValue({
      ...lease,
      status: "PENDING_VERIFICATION",
      verificationStatus: "APPROVED",
    });
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-2", scheduleSeq: 2, status: "LATE", paymentMethod: "MANUAL", amount: "250" },
    ]);
    await markPaid({ leaseId: "lease-1", scheduleSeq: 2, note: "x", actor: "alex" });
    expect(mockLeasePayments.activateVerifiedLease).not.toHaveBeenCalled();
  });

  it("settling MANUAL seq 1 before ID approval does NOT activate (waits for approval)", async () => {
    mockStorage.getLease.mockResolvedValue({
      ...lease,
      status: "PENDING_VERIFICATION",
      verificationStatus: "PENDING_REVIEW",
    });
    mockStorage.getScheduleByLease.mockResolvedValue([
      { id: "row-1", scheduleSeq: 1, status: "DUE", paymentMethod: "MANUAL", amount: "250" },
    ]);
    await markPaid({ leaseId: "lease-1", scheduleSeq: 1, note: "x", actor: "alex" });
    expect(mockLeasePayments.activateVerifiedLease).not.toHaveBeenCalled();
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
  it("delegates to sendStaffMessage as a uo:-prefixed actor over EMAIL+SMS", async () => {
    mockAdminMessages.sendStaffMessage.mockResolvedValue({
      messageId: "reply-1",
      threadId: "t1",
      delivery: { email: { sent: true, channel: "email" }, sms: { sent: true, channel: "sms" } },
    });
    const res = await respondToMessage({ threadId: "t1", body: "We're on it.", actor: "alex" });
    expect(mockAdminMessages.sendStaffMessage).toHaveBeenCalledWith({
      threadId: "t1",
      body: "We're on it.",
      channels: ["EMAIL", "SMS"],
      actor: "uo:alex",
    });
    expect(res.messageId).toBe("reply-1");
  });
  it("propagates a 404 from sendStaffMessage for an unknown thread", async () => {
    mockAdminMessages.sendStaffMessage.mockRejectedValue(new LeaseError("Thread not found", 404));
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

describe("listPropertiesWithRooms", () => {
  it("returns full property rows with full room rows nested", async () => {
    const prop = { ...PROP, biweeklyRate: "700.00", airbnbIcalUrl: "https://x/ical" };
    const room = { id: "r1", propertyId: "prop-1", name: "Room 1", weeklyRent: "350.00", biweeklyRate: "650.00", cleaningFee: "0", status: "AVAILABLE" };
    mockStorage.getProperties.mockResolvedValue([prop]);
    mockStorage.getRoomsByProperty.mockResolvedValue([room]);
    const out = await listPropertiesWithRooms();
    expect(out[0]).toMatchObject({ ...prop, rooms: [room] });
  });
  it("gives non-COLIVING properties an empty rooms array without querying", async () => {
    mockStorage.getProperties.mockResolvedValue([{ ...PROP, type: "STR" }]);
    const out = await listPropertiesWithRooms();
    expect(out[0].rooms).toEqual([]);
    expect(mockStorage.getRoomsByProperty).not.toHaveBeenCalled();
  });
});

describe("updateProperty / updateRoom write-backs", () => {
  beforeEach(() => {
    mockStorage.updateProperty.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
    mockStorage.updateRoom.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
  });
  it("validates through insertPropertySchema.partial() and returns the updated row", async () => {
    const out = await updateProperty({ propertyId: "prop-1", patch: { biweeklyRate: "700.00", monPrice: "120.00" }, actor: "alex@x.com" });
    expect(mockStorage.updateProperty).toHaveBeenCalledWith("prop-1", { biweeklyRate: "700.00", monPrice: "120.00" });
    expect(out).toMatchObject({ id: "prop-1", biweeklyRate: "700.00" });
  });
  it("rejects an invalid field value with 400", async () => {
    await expect(updateProperty({ propertyId: "prop-1", patch: { type: "CASTLE" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
    expect(mockStorage.updateProperty).not.toHaveBeenCalled();
  });
  it("rejects an empty patch and a missing actor", async () => {
    await expect(updateProperty({ propertyId: "prop-1", patch: {}, actor: "a" })).rejects.toMatchObject({ status: 400 });
    await expect(updateProperty({ propertyId: "prop-1", patch: { name: "X" }, actor: "" })).rejects.toMatchObject({ status: 400 });
  });
  it("404s when the row does not exist", async () => {
    mockStorage.updateProperty.mockResolvedValue(undefined);
    await expect(updateProperty({ propertyId: "nope", patch: { name: "X" }, actor: "a" })).rejects.toMatchObject({ status: 404 });
  });
  it("updates a room's cleaning fee and biweekly rate", async () => {
    const out = await updateRoom({ roomId: "r1", patch: { cleaningFee: "50.00", biweeklyRate: "650.00" }, actor: "a" });
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { cleaningFee: "50.00", biweeklyRate: "650.00" });
    expect(out).toMatchObject({ id: "r1", cleaningFee: "50.00" });
  });
  it("rejects a bad room status", async () => {
    await expect(updateRoom({ roomId: "r1", patch: { status: "ON_FIRE" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
  });
  it("404s when the room does not exist", async () => {
    mockStorage.updateRoom.mockResolvedValue(undefined);
    await expect(updateRoom({ roomId: "nope", patch: { name: "X" }, actor: "a" })).rejects.toMatchObject({ status: 404 });
  });
});

describe("createProperty / createRoom write-backs", () => {
  it("creates a property through insertPropertySchema", async () => {
    mockStorage.createProperty.mockImplementation(async (p: Record<string, unknown>) => ({ id: "new", ...p }));
    const out = await createProperty({ property: { name: "Third House", location: "Atlanta", type: "COLIVING" }, actor: "a" });
    expect(out).toMatchObject({ id: "new", name: "Third House" });
  });
  // Parity: insertRoomSchema requires status (drizzle-zod drops the DB-default optionality); UO must send it exactly as POST /api/admin/rooms does.
  it("creates a room only under a COLIVING parent", async () => {
    mockStorage.getProperty.mockResolvedValue({ ...PROP, type: "STR" });
    await expect(createRoom({ propertyId: "prop-1", room: { name: "R", weeklyRent: "300", depositAmount: "300", status: "AVAILABLE" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
    mockStorage.getProperty.mockResolvedValue({ ...PROP, type: "COLIVING" });
    mockStorage.createRoom.mockImplementation(async (r: Record<string, unknown>) => ({ id: "r9", ...r }));
    const out = await createRoom({ propertyId: "prop-1", room: { name: "R", weeklyRent: "300", depositAmount: "300", status: "AVAILABLE" }, actor: "a" });
    expect(mockStorage.createRoom).toHaveBeenCalledWith(expect.objectContaining({ propertyId: "prop-1", name: "R", status: "AVAILABLE" }));
    expect(out.id).toBe("r9");
  });
});

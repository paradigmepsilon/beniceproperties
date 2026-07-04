// server/lib/leaseFlow.test.ts
// Phase 3 — lease creation + e-signature flow over a mocked storage layer.
// Critical invariants:
//   - createDraftLease persists with status PENDING_SIGNATURE,
//   - signLease moves PENDING_SIGNATURE → PENDING_FIRST_PAYMENT (never ACTIVE),
//   - signing requires a real name + the affirmation,
//   - signing captures the IP and timestamp,
//   - re-signing an already-signed lease is a no-op.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
  getExternalBlocksForRoom: vi.fn(),
  upsertGuestByEmail: vi.fn(),
  createLeaseWithSchedule: vi.fn(),
  getLease: vi.fn(),
  getGuest: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  updateLease: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { createDraftLease, signLease } from "./leaseFlow";
import { LeaseError } from "./lease";

const PROP = { id: "prop-1", name: "Old Bill Cook", location: "Atlanta", type: "COLIVING", active: true };
const ROOM = { id: "r1", name: "Room 1", roomNumber: "1", weeklyRent: "250.00", status: "AVAILABLE", propertyId: "prop-1" };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  // buildLeaseQuote (called by createDraftLease) now checks external blocks;
  // default to none so the flow tests exercise the happy path.
  mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
});

describe("createDraftLease", () => {
  it("persists the lease as PENDING_SIGNATURE with its schedule and returns the review doc", async () => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getRoom.mockResolvedValue(ROOM);
    mockStorage.upsertGuestByEmail.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
    mockStorage.createLeaseWithSchedule.mockImplementation(async (args) => ({
      id: "lease-1",
      status: args.lease.status,
      ...args.lease,
    }));

    const { lease, documentHtml } = await createDraftLease({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-28",
      cadence: "WEEKLY",
      guest: { name: "Jane", email: "jane@example.com" },
    });

    expect(lease.status).toBe("PENDING_SIGNATURE");
    // The schedule passed to storage has seq 1 due on the start date.
    const passed = mockStorage.createLeaseWithSchedule.mock.calls[0][0];
    expect(passed.schedule[0].scheduleSeq).toBe(1);
    expect(passed.schedule[0].dueDate).toBe("2026-07-01");
    expect(passed.schedule.every((s: { paymentMethod: string }) => s.paymentMethod === "CARD_ON_FILE")).toBe(true);
    expect(passed.lease.weeklyRateSnapshot).toBe("250");
    expect(documentHtml).toContain("Room Rental Agreement");
  });
});

function signedLeaseFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: "lease-1",
    propertyId: "prop-1",
    guestId: "g1",
    status: "PENDING_SIGNATURE",
    startDate: "2026-07-01",
    endDate: "2026-07-28",
    paymentCadence: "WEEKLY",
    weeklyRateSnapshot: "250",
    totalLeaseValue: "1000",
    prorationNote: "note",
    signedAt: null,
    signedPdfUrl: null,
    signedDocumentHtml: null,
    ...overrides,
  };
}

describe("signLease", () => {
  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
    mockStorage.getLeaseRooms.mockResolvedValue([
      { roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" },
    ]);
    mockStorage.getScheduleByLease.mockResolvedValue([
      { scheduleSeq: 1, dueDate: "2026-07-01", amount: "250" },
    ]);
    mockStorage.updateLease.mockImplementation(async (_id, updates) =>
      signedLeaseFixture(updates),
    );
  });

  it("moves PENDING_SIGNATURE → PENDING_FIRST_PAYMENT (never ACTIVE)", async () => {
    mockStorage.getLease.mockResolvedValue(signedLeaseFixture());
    const { lease } = await signLease({
      leaseId: "lease-1",
      signedName: "Jane Q. Resident",
      affirmed: true,
      ip: "203.0.113.9",
      signedAt: new Date("2026-07-01T12:00:00Z"),
    });
    expect(lease.status).toBe("PENDING_FIRST_PAYMENT");
    expect(lease.status).not.toBe("ACTIVE");
  });

  it("captures the signed name, timestamp, and IP", async () => {
    mockStorage.getLease.mockResolvedValue(signedLeaseFixture());
    await signLease({
      leaseId: "lease-1",
      signedName: "  Jane Q. Resident  ",
      affirmed: true,
      ip: "203.0.113.9",
      signedAt: new Date("2026-07-01T12:00:00Z"),
    });
    const updates = mockStorage.updateLease.mock.calls[0][1];
    expect(updates.signedName).toBe("Jane Q. Resident"); // trimmed
    expect(updates.signedIp).toBe("203.0.113.9");
    expect(updates.signedAt).toEqual(new Date("2026-07-01T12:00:00Z"));
    expect(updates.signedDocumentHtml).toContain("203.0.113.9");
    expect(updates.signedPdfUrl).toBe("/api/leases/lease-1/document");
  });

  it("rejects a missing/short name", async () => {
    mockStorage.getLease.mockResolvedValue(signedLeaseFixture());
    await expect(
      signLease({ leaseId: "lease-1", signedName: "J", affirmed: true, ip: "1.1.1.1" }),
    ).rejects.toThrow(/legal name/i);
  });

  it("rejects when not affirmed", async () => {
    mockStorage.getLease.mockResolvedValue(signedLeaseFixture());
    await expect(
      signLease({ leaseId: "lease-1", signedName: "Jane Resident", affirmed: false, ip: "1.1.1.1" }),
    ).rejects.toThrow(/affirm/i);
  });

  it("rejects signing from a non-signable status", async () => {
    mockStorage.getLease.mockResolvedValue(signedLeaseFixture({ status: "ACTIVE" }));
    await expect(
      signLease({ leaseId: "lease-1", signedName: "Jane Resident", affirmed: true, ip: "1.1.1.1" }),
    ).rejects.toThrow(/cannot be signed/i);
  });

  it("is idempotent: re-signing an already-signed lease returns the existing artifact", async () => {
    mockStorage.getLease.mockResolvedValue(
      signedLeaseFixture({
        status: "PENDING_FIRST_PAYMENT",
        signedAt: new Date("2026-07-01T12:00:00Z"),
        signedPdfUrl: "/api/leases/lease-1/document",
      }),
    );
    const { documentUrl } = await signLease({
      leaseId: "lease-1",
      signedName: "Someone Else",
      affirmed: true,
      ip: "9.9.9.9",
    });
    expect(documentUrl).toBe("/api/leases/lease-1/document");
    expect(mockStorage.updateLease).not.toHaveBeenCalled(); // no re-sign
  });

  it("404s when the lease does not exist", async () => {
    mockStorage.getLease.mockResolvedValue(undefined);
    await expect(
      signLease({ leaseId: "nope", signedName: "Jane Resident", affirmed: true, ip: "1.1.1.1" }),
    ).rejects.toBeInstanceOf(LeaseError);
  });
});

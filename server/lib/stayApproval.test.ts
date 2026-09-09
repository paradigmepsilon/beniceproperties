// server/lib/stayApproval.test.ts
// The admin decisions. Door codes here are SYNTHETIC, and one test asserts the
// code never reaches a log line — that is the sensitive-data fence, not a nicety.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(), getBookingGate: vi.fn(), updateBookingGate: vi.fn(),
  updateBooking: vi.fn(), updateRoom: vi.fn(), getGuest: vi.fn(), getProperty: vi.fn(),
  getRoom: vi.fn(), getBookingsWithGuest: vi.fn(), getEscalations: vi.fn(),
  updateEscalation: vi.fn(), getPropertyAccessInfo: vi.fn(), getRoomAccessInfo: vi.fn(),
}));
const mockLifecycle = vi.hoisted(() => ({
  onStayApproved: vi.fn(), onStayFixRequested: vi.fn(),
}));
const mockLog = vi.hoisted(() => ({ log: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stayLifecycle", async (orig) => ({
  ...(await orig<typeof import("./stayLifecycle")>()),
  ...mockLifecycle,
}));
vi.mock("../server-log", () => mockLog);

import { approveStay, requestStayFix, listPendingApprovals, isNameMismatch } from "./stayApproval";

const DOOR = "1357";
const BOOKING = {
  id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1", roomId: "r1", guestId: "g1",
  model: "COLIVING", checkIn: "2026-10-20", checkOut: "2026-10-31",
  status: "PENDING_APPROVAL", quotedTotal: "980.00",
};
const GATE = {
  bookingId: "bk-1", gateToken: "a1B2c3D4e5F6g7H8i9J0kLmN",
  agreementSignedAt: new Date("2026-10-01T10:00:00Z"), agreementSignedName: "Jane Doe",
  verificationStatus: "PENDING_REVIEW", fixRequestCount: 0, extensionCount: 0,
  approvedAt: null, fixRequestedAt: null, originalCheckOut: null,
};
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };
const PROPERTY = { id: "prop-1", name: "Old Bill Cook", entity: "BNP" };
const ROOM = { id: "r1", name: "Garden", roomNumber: "2" };

const OK_ACCESS = { wifiSsid: "BNP-Guest", directions: "Off Highway 5.", checkOutBy: "11:00 AM" };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getBookingGate.mockResolvedValue(GATE);
  mockStorage.updateBookingGate.mockResolvedValue(GATE);
  mockStorage.updateBooking.mockResolvedValue(BOOKING);
  mockStorage.updateRoom.mockResolvedValue({});
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getProperty.mockResolvedValue(PROPERTY);
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.getEscalations.mockResolvedValue([]);
  mockStorage.updateEscalation.mockResolvedValue({});
  mockStorage.getPropertyAccessInfo.mockResolvedValue(OK_ACCESS);
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs." });
  mockLifecycle.onStayApproved.mockResolvedValue(undefined);
  mockLifecycle.onStayFixRequested.mockResolvedValue(undefined);
});

const APPROVE = { bookingId: "bk-1", actor: "admin@bnp.com", doorCode: DOOR, nameMatches: true as const };

describe("isNameMismatch", () => {
  it("ignores casing and surrounding whitespace", () => {
    expect(isNameMismatch("Jane Doe", "  jane doe ")).toBe(false);
  });

  it("flags a genuinely different name", () => {
    expect(isNameMismatch("Someone Else", "Jane Doe")).toBe(true);
  });

  // Do not cry mismatch over what we do not know.
  it("is not a mismatch when either side is blank", () => {
    expect(isNameMismatch(null, "Jane Doe")).toBe(false);
    expect(isNameMismatch("Jane Doe", "")).toBe(false);
  });
});

describe("approveStay — the door code is required and validated server-side", () => {
  it("400s a missing, blank, or malformed code and changes NOTHING", async () => {
    for (const doorCode of ["", "   ", "12", "a".repeat(20), "12 34", "../etc"]) {
      vi.clearAllMocks();
      mockStorage.getBooking.mockResolvedValue(BOOKING);
      mockStorage.getBookingGate.mockResolvedValue(GATE);
      mockStorage.getGuest.mockResolvedValue(GUEST);
      mockStorage.getProperty.mockResolvedValue(PROPERTY);
      mockStorage.getRoom.mockResolvedValue(ROOM);
      await expect(approveStay({ ...APPROVE, doorCode })).rejects.toMatchObject({ status: 400 });
      expect(mockStorage.updateBookingGate, doorCode).not.toHaveBeenCalled();
      expect(mockStorage.updateBooking, doorCode).not.toHaveBeenCalled();
    }
  });

  it("requires the name-match affirmation — it is the substance of the review", async () => {
    await expect(
      approveStay({ ...APPROVE, nameMatches: false as unknown as true }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
  });

  it("stores the code trimmed", async () => {
    await approveStay({ ...APPROVE, doorCode: `  ${DOOR}  ` });
    expect(mockStorage.updateBookingGate.mock.calls[0][1].doorCode).toBe(DOOR);
  });

  // THE sensitive-data fence.
  it("never writes the door code to a log line", async () => {
    await approveStay(APPROVE);
    const logged = mockLog.log.mock.calls.map((c) => String(c[0])).join(" | ");
    expect(logged).toContain("BNP-7QK4-2F9X");
    expect(logged).toContain("admin@bnp.com");
    expect(logged).not.toContain(DOOR);
  });
});

describe("approveStay — the data gate", () => {
  it("409s when the property has no arrival details, naming what is missing", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({ wifiSsid: "BNP-Guest" }); // no directions
    await expect(approveStay(APPROVE)).rejects.toMatchObject({
      status: 409,
      message: expect.stringContaining("directions"),
    });
    // Crucially: it did not go live with a blank welcome letter.
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockLifecycle.onStayApproved).not.toHaveBeenCalled();
  });

  it("names the property, so the operator knows where to go", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({});
    await expect(approveStay(APPROVE)).rejects.toMatchObject({
      message: expect.stringContaining("Old Bill Cook"),
    });
  });
});

describe("approveStay — the happy path", () => {
  it("goes live, occupies the room, and sends the welcome letter once", async () => {
    const res = await approveStay(APPROVE);
    expect(res.status).toBe("ACTIVE");
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", { status: "ACTIVE" });
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(mockLifecycle.onStayApproved).toHaveBeenCalledTimes(1);
  });

  it("records who approved it and when, and clears any prior rejection", async () => {
    await approveStay(APPROVE);
    expect(mockStorage.updateBookingGate.mock.calls[0][1]).toMatchObject({
      approvedBy: "admin@bnp.com",
      nameMatchesAck: true,
      verificationStatus: "APPROVED",
      verificationRejectionReason: null,
    });
  });

  // The gate row is written BEFORE the status, so a crash between them leaves a
  // recoverable state that a second click finishes.
  it("writes the gate row before the booking status", async () => {
    const order: string[] = [];
    mockStorage.updateBookingGate.mockImplementation(async () => { order.push("gate"); return GATE; });
    mockStorage.updateBooking.mockImplementation(async () => { order.push("status"); return BOOKING; });
    await approveStay(APPROVE);
    expect(order).toEqual(["gate", "status"]);
  });

  it("is re-entrant from the crashed-between state", async () => {
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, approvedAt: new Date(), doorCode: DOOR });
    const res = await approveStay(APPROVE);
    expect(res.status).toBe("ACTIVE");
    expect(mockStorage.updateBooking).toHaveBeenCalled();
  });

  it("on an already-live stay it only re-asserts the welcome, never re-writes", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, status: "ACTIVE" });
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, approvedAt: new Date(), doorCode: DOOR });
    await approveStay(APPROVE);
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockLifecycle.onStayApproved).toHaveBeenCalledTimes(1);
  });

  it("resolves the awaiting-approval escalation — the human just looked", async () => {
    mockStorage.getEscalations.mockResolvedValue([
      { id: "esc-1", kind: "GATE_AWAITING_APPROVAL", status: "OPEN" },
      { id: "esc-2", kind: "BOOKING_CONFLICT", status: "OPEN" },
    ]);
    await approveStay(APPROVE);
    expect(mockStorage.updateEscalation).toHaveBeenCalledTimes(1);
    expect(mockStorage.updateEscalation).toHaveBeenCalledWith("esc-1", {
      status: "RESOLVED", resolvedBy: "admin@bnp.com",
    });
  });
});

describe("approveStay — refusals", () => {
  it("409s when the guest has not finished", async () => {
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, agreementSignedAt: null });
    await expect(approveStay(APPROVE)).rejects.toMatchObject({ status: 409 });
  });

  it("409s a cancelled booking", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, status: "CANCELLED" });
    await expect(approveStay(APPROVE)).rejects.toMatchObject({ status: 409 });
  });

  it("404s an unknown booking and 409s one with no gate", async () => {
    mockStorage.getBooking.mockResolvedValue(undefined);
    await expect(approveStay(APPROVE)).rejects.toMatchObject({ status: 404 });
    mockStorage.getBooking.mockResolvedValue(BOOKING);
    mockStorage.getBookingGate.mockResolvedValue(undefined);
    await expect(approveStay(APPROVE)).rejects.toMatchObject({ status: 409 });
  });
});

describe("requestStayFix — non-terminal, and it restarts the clock", () => {
  const FIX = { bookingId: "bk-1", actor: "admin@bnp.com", reason: "The licence photo is too blurry.", what: "LICENSE" as const };

  it("moves NO money and leaves the booking status alone", async () => {
    await requestStayFix(FIX);
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
  });

  it("restarts the silence deadline from now, not from booking", async () => {
    const now = new Date("2026-10-05T12:00:00Z");
    await requestStayFix({ ...FIX, now });
    const { docsDeadlineAt } = mockStorage.updateBookingGate.mock.calls[0][1];
    // 72 hours later, to the millisecond.
    expect(docsDeadlineAt.getTime() - now.getTime()).toBe(72 * 60 * 60 * 1000);
  });

  it("increments the round so the nudges re-arm", async () => {
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, fixRequestCount: 2 });
    const res = await requestStayFix(FIX);
    expect(res.fixRequestCount).toBe(3);
    expect(mockStorage.updateBookingGate.mock.calls[0][1].fixRequestCount).toBe(3);
  });

  it("bouncing the LICENCE resets its status and leaves the signature intact", async () => {
    await requestStayFix({ ...FIX, what: "LICENSE" });
    const patch = mockStorage.updateBookingGate.mock.calls[0][1];
    expect(patch.verificationStatus).toBe("REJECTED");
    expect(patch).not.toHaveProperty("agreementSignedAt");
  });

  it("bouncing the AGREEMENT clears the signature so it can be re-signed", async () => {
    await requestStayFix({ ...FIX, what: "AGREEMENT" });
    const patch = mockStorage.updateBookingGate.mock.calls[0][1];
    expect(patch.agreementSignedAt).toBeNull();
    expect(patch.agreementDocumentHtml).toBeNull();
    expect(patch).not.toHaveProperty("verificationStatus");
  });

  it("BOTH clears each of them", async () => {
    await requestStayFix({ ...FIX, what: "BOTH" });
    const patch = mockStorage.updateBookingGate.mock.calls[0][1];
    expect(patch.verificationStatus).toBe("REJECTED");
    expect(patch.agreementSignedAt).toBeNull();
  });

  it("requires a usable reason — the guest has to know what to do", async () => {
    for (const reason of ["", "  ", "no"]) {
      await expect(requestStayFix({ ...FIX, reason })).rejects.toMatchObject({ status: 400 });
    }
  });

  it("409s an already-approved stay", async () => {
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, approvedAt: new Date() });
    await expect(requestStayFix(FIX)).rejects.toMatchObject({ status: 409 });
  });
});

describe("listPendingApprovals", () => {
  const row = (over: Record<string, unknown> = {}) => ({
    ...BOOKING, guest: GUEST, property: PROPERTY, room: ROOM, ...over,
  });

  it("shows only stays where the human is the blocker", async () => {
    mockStorage.getBookingsWithGuest.mockResolvedValue([row({ id: "bk-1" }), row({ id: "bk-2" })]);
    mockStorage.getBookingGate.mockImplementation(async (id: string) =>
      id === "bk-1" ? GATE : { ...GATE, agreementSignedAt: null }, // bk-2 still owes us
    );
    const rows = await listPendingApprovals();
    expect(rows).toHaveLength(1);
    expect(rows[0].bookingId).toBe("bk-1");
  });

  it("pre-computes the name mismatch so the operator does not have to", async () => {
    mockStorage.getBookingsWithGuest.mockResolvedValue([row()]);
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, agreementSignedName: "Someone Else" });
    const rows = await listPendingApprovals();
    expect(rows[0].nameMismatch).toBe(true);
    expect(rows[0].signedName).toBe("Someone Else");
  });

  it("flags a property that cannot be approved yet", async () => {
    mockStorage.getBookingsWithGuest.mockResolvedValue([row()]);
    mockStorage.getBookingGate.mockResolvedValue(GATE);
    mockStorage.getPropertyAccessInfo.mockResolvedValue({});
    const rows = await listPendingApprovals();
    expect(rows[0].accessInfoMissing).toContain("directions");
    // The per-booking door code is set AT approval, so it is not "missing" here.
    expect(rows[0].accessInfoMissing).not.toContain("doorCode");
  });

  it("puts the soonest arrival first", async () => {
    mockStorage.getBookingsWithGuest.mockResolvedValue([
      row({ id: "bk-1", checkIn: "2026-11-01" }),
      row({ id: "bk-2", checkIn: "2026-10-05" }),
    ]);
    mockStorage.getBookingGate.mockResolvedValue(GATE);
    const rows = await listPendingApprovals();
    expect(rows.map((r) => r.checkIn)).toEqual(["2026-10-05", "2026-11-01"]);
  });
});

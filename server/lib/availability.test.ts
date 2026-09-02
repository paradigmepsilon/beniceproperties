// server/lib/availability.test.ts
// Phase C — availability merge: STR (direct bookings ∪ external, half-open) and
// co-living (leases inclusive→exclusive ∪ external), sorted by start, future-only.

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = {
  strBookings: [] as any[],
  propertyBlocks: [] as any[],
  leases: [] as any[],
  roomBookings: [] as any[],
  roomBlocks: [] as any[],
};

const mockStorage = vi.hoisted(() => ({
  getStrBookingsForProperty: vi.fn(),
  getExternalBlocksForProperty: vi.fn(),
  getRoomBlockingLeasesForRoom: vi.fn(),
  getColivingBookingsForRoom: vi.fn(),
  getExternalBlocksForRoom: vi.fn(),
  getManualBlocksForRoom: vi.fn(),
  getManualBlocksForProperty: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { buildStrAvailability, buildRoomAvailability, isRoomBookableStatus, roomAvailableForDates } from "./availability";

beforeEach(() => {
  store.strBookings = [];
  store.propertyBlocks = [];
  store.leases = [];
  store.roomBookings = [];
  store.roomBlocks = [];
  mockStorage.getStrBookingsForProperty.mockImplementation(async () => store.strBookings);
  mockStorage.getExternalBlocksForProperty.mockImplementation(async () => store.propertyBlocks);
  mockStorage.getRoomBlockingLeasesForRoom.mockImplementation(async () => store.leases);
  mockStorage.getColivingBookingsForRoom.mockImplementation(async () => store.roomBookings);
  mockStorage.getExternalBlocksForRoom.mockImplementation(async () => store.roomBlocks);
  mockStorage.getManualBlocksForRoom.mockResolvedValue([]);
  mockStorage.getManualBlocksForProperty.mockResolvedValue([]);
});

const FUTURE_A = "2999-08-10";
const FUTURE_B = "2999-08-14";
const FUTURE_C = "2999-09-01";
const FUTURE_D = "2999-09-05";

describe("buildStrAvailability", () => {
  it("merges direct bookings + external blocks, sorted by start, tagged by source", async () => {
    store.strBookings = [{ checkIn: FUTURE_C, checkOut: FUTURE_D, status: "CONFIRMED" }];
    store.propertyBlocks = [
      { startDate: FUTURE_A, endDate: FUTURE_B }, // earlier — should sort first
    ];
    const r = await buildStrAvailability("p1");
    expect(r.busy).toHaveLength(2);
    expect(r.busy[0]).toEqual({ start: FUTURE_A, end: FUTURE_B, source: "external" });
    expect(r.busy[1]).toEqual({ start: FUTURE_C, end: FUTURE_D, source: "direct" });
    expect(r.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("drops open-ended (null checkOut) and past bookings", async () => {
    store.strBookings = [
      { checkIn: FUTURE_A, checkOut: null, status: "CONFIRMED" }, // open-ended → drop
      { checkIn: "2000-01-01", checkOut: "2000-01-03", status: "CONFIRMED" }, // past → drop
    ];
    const r = await buildStrAvailability("p1");
    expect(r.busy).toHaveLength(0);
  });

  it("includes manual blocks as busy ranges (source manual), dropping past ones", async () => {
    mockStorage.getManualBlocksForProperty.mockResolvedValue([
      { startDate: FUTURE_A, endDate: FUTURE_B },
      { startDate: "2000-01-01", endDate: "2000-01-03" }, // past → drop
    ]);
    const r = await buildStrAvailability("p1");
    expect(r.busy).toEqual([{ start: FUTURE_A, end: FUTURE_B, source: "manual" }]);
  });
});

describe("buildRoomAvailability", () => {
  it("normalizes inclusive lease end to exclusive (+1) and merges external blocks", async () => {
    store.leases = [{ startDate: FUTURE_A, endDate: FUTURE_B }]; // inclusive end
    store.roomBlocks = [{ startDate: FUTURE_C, endDate: FUTURE_D }];
    const r = await buildRoomAvailability("room1");
    expect(r.busy[0]).toEqual({ start: FUTURE_A, end: "2999-08-15", source: "direct" }); // +1 day
    expect(r.busy[1]).toEqual({ start: FUTURE_C, end: FUTURE_D, source: "external" });
  });

  it("includes non-cancelled direct co-living bookings (half-open) so the calendar matches the quote path", async () => {
    // A short co-living booking must show as busy — otherwise the calendar shows
    // the dates free while /api/quote 409s (the exact bug this closes).
    store.roomBookings = [{ checkIn: FUTURE_A, checkOut: FUTURE_B, status: "CONFIRMED" }];
    const r = await buildRoomAvailability("room1");
    expect(r.busy).toContainEqual({ start: FUTURE_A, end: FUTURE_B, source: "direct" });
  });

  it("drops open-ended (null checkOut) and past direct co-living bookings", async () => {
    store.roomBookings = [
      { checkIn: FUTURE_A, checkOut: null, status: "CONFIRMED" }, // open-ended → drop
      { checkIn: "2000-01-01", checkOut: "2000-01-03", status: "PENDING_PAYMENT" }, // past → drop
    ];
    const r = await buildRoomAvailability("room1");
    expect(r.busy).toHaveLength(0);
  });

  it("includes manual blocks as busy ranges (source manual)", async () => {
    mockStorage.getRoomBlockingLeasesForRoom.mockResolvedValue([]);
    mockStorage.getColivingBookingsForRoom.mockResolvedValue([]);
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
    mockStorage.getManualBlocksForRoom.mockResolvedValue([{ startDate: "2026-12-01", endDate: "2026-12-05" }]);
    const res = await buildRoomAvailability("room-1");
    expect(res.busy).toEqual([{ start: "2026-12-01", end: "2026-12-05", source: "manual" }]);
  });

  it("drops a past manual block", async () => {
    mockStorage.getManualBlocksForRoom.mockResolvedValue([{ startDate: "2000-01-01", endDate: "2000-01-03" }]);
    const res = await buildRoomAvailability("room-1");
    expect(res.busy).toHaveLength(0);
  });
});

describe("isRoomBookableStatus — pure status gate (ROOM_UNBOOKABLE_STATUSES)", () => {
  it("AVAILABLE and OCCUPIED are bookable-by-status", () => {
    expect(isRoomBookableStatus("AVAILABLE")).toBe(true);
    expect(isRoomBookableStatus("OCCUPIED")).toBe(true);
  });

  it("HOLD, MAINTENANCE, INACTIVE are not bookable-by-status", () => {
    expect(isRoomBookableStatus("HOLD")).toBe(false);
    expect(isRoomBookableStatus("MAINTENANCE")).toBe(false);
    expect(isRoomBookableStatus("INACTIVE")).toBe(false);
  });
});

describe("roomAvailableForDates — the /api/properties* availableForDates field", () => {
  beforeEach(() => {
    mockStorage.isRoomAvailableForRange.mockReset();
  });

  it("no range → true regardless of status (back-compat: card falls back to room.status)", async () => {
    await expect(roomAvailableForDates({ id: "r1", status: "HOLD" }, null)).resolves.toBe(true);
    await expect(roomAvailableForDates({ id: "r1", status: "MAINTENANCE" }, null)).resolves.toBe(true);
  });

  it("an OCCUPIED room with a free range is availableForDates: true (the exact regression this closes)", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
    const range = { checkIn: "2026-07-01", checkOut: "2026-07-08" };
    await expect(roomAvailableForDates({ id: "r1", status: "OCCUPIED" }, range)).resolves.toBe(true);
    expect(mockStorage.isRoomAvailableForRange).toHaveBeenCalledWith({
      roomId: "r1",
      startDate: "2026-07-01",
      endDate: "2026-07-08",
      endExclusive: true,
    });
  });

  it("a HOLD room is availableForDates: false even for a range that would otherwise be free", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(true); // range itself is free
    const range = { checkIn: "2026-07-01", checkOut: "2026-07-08" };
    await expect(roomAvailableForDates({ id: "r1", status: "HOLD" }, range)).resolves.toBe(false);
    // Status gate short-circuits — never even asks storage about the range.
    expect(mockStorage.isRoomAvailableForRange).not.toHaveBeenCalled();
  });

  it("an AVAILABLE room with a conflicting range is availableForDates: false", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    const range = { checkIn: "2026-07-01", checkOut: "2026-07-08" };
    await expect(roomAvailableForDates({ id: "r1", status: "AVAILABLE" }, range)).resolves.toBe(false);
  });
});

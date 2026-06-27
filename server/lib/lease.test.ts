// server/lib/lease.test.ts
// Phase 2 — co-living lease-quote builder. Uses a mocked storage layer so no
// database is required. Verifies the preview is shaped from the shared canonical
// generator, multi-room weekly rates are summed, dueToday = schedule_seq 1, and
// the validation guards (property type, room availability, term ceiling) fire.

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the storage module the builder imports. vi.mock is hoisted above
// imports, so the mock object must be created with vi.hoisted to be available. ---
const mockStorage = vi.hoisted(() => ({
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { buildLeaseQuote, LeaseError } from "./lease";

const COLIVING_PROP = {
  id: "prop-1",
  name: "Old Bill Cook",
  type: "COLIVING",
  active: true,
};

function room(id: string, name: string, weeklyRent: string, status = "AVAILABLE") {
  return { id, name, roomNumber: name.slice(-1), weeklyRent, status, propertyId: "prop-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
});

describe("buildLeaseQuote — happy path", () => {
  it("builds a weekly schedule, summing multi-room weekly rent", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce(room("r1", "Room 1", "250.00"))
      .mockResolvedValueOnce(room("r2", "Room 2", "200.00"));

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1", "r2"],
      startDate: "2026-07-01",
      endDate: "2026-07-28", // 28 days, 4 weekly periods
      cadence: "WEEKLY",
    });

    expect(q.weeklyRateTotal).toBe(450); // 250 + 200
    expect(q.schedule).toHaveLength(4);
    expect(q.schedule.every((r) => r.amount === 450)).toBe(true);
    expect(q.schedule[0].dueOnBooking).toBe(true);
    expect(q.schedule[0].dueDate).toBe("2026-07-01");
    expect(q.dueToday).toBe(450);
    expect(q.totalLeaseValue).toBe(1800);
    expect(q.rooms.map((r) => r.name)).toEqual(["Room 1", "Room 2"]);
  });

  it("marks only the first installment as dueOnBooking", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-21",
      cadence: "WEEKLY",
    });
    expect(q.schedule.filter((r) => r.dueOnBooking)).toHaveLength(1);
    expect(q.schedule[0].dueOnBooking).toBe(true);
  });
});

describe("buildLeaseQuote — guards", () => {
  it("rejects a non-co-living property", async () => {
    mockStorage.getProperty.mockResolvedValue({ ...COLIVING_PROP, type: "STR" });
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toBeInstanceOf(LeaseError);
  });

  it("rejects an unavailable room", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00", "OCCUPIED"));
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toThrow(/no longer available/i);
  });

  it("rejects a room that overlaps an existing lease", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toThrow(/overlapping/i);
  });

  it("rejects a term over 90 days", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-10-15", cadence: "WEEKLY" }),
    ).rejects.toThrow(/90 days/i);
  });

  it("rejects a room from a different property", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue({ ...room("r1", "Room 1", "250.00"), propertyId: "other" });
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toThrow(/not found in this property/i);
  });
});

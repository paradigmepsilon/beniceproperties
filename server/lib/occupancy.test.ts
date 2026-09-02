// server/lib/occupancy.test.ts
// Room-occupancy sync (every sweep, idempotent): sets each bookable room's
// status from the
// deconfliction source of truth (storage.getOccupiedRoomIdsOn), leaving
// HOLD/MAINTENANCE/INACTIVE rooms untouched, and only calls updateRoom when
// the status actually changes.

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = {
  properties: [{ id: "p1" }] as any[],
  roomsByProperty: {} as Record<string, any[]>,
  occupiedIds: new Set<string>(),
  updates: [] as { id: string; updates: any }[],
};

vi.mock("../storage", () => ({
  storage: {
    getProperties: vi.fn(async () => store.properties),
    getRoomsByProperty: vi.fn(async (propertyId: string) => store.roomsByProperty[propertyId] ?? []),
    getOccupiedRoomIdsOn: vi.fn(async () => store.occupiedIds),
    updateRoom: vi.fn(async (id: string, updates: any) => {
      store.updates.push({ id, updates });
      return { id, ...updates };
    }),
  },
}));

import { storage } from "../storage";
import { syncRoomOccupancyStatus } from "./occupancy";

beforeEach(() => {
  store.properties = [{ id: "p1" }];
  store.roomsByProperty = {};
  store.occupiedIds = new Set();
  store.updates = [];
  vi.clearAllMocks();
});

describe("syncRoomOccupancyStatus", () => {
  it("marks the occupied room OCCUPIED and the other AVAILABLE", async () => {
    store.roomsByProperty.p1 = [
      { id: "r1", propertyId: "p1", status: "AVAILABLE" },
      { id: "r2", propertyId: "p1", status: "OCCUPIED" },
    ];
    store.occupiedIds = new Set(["r1"]);

    const result = await syncRoomOccupancyStatus("2026-09-02");

    expect(storage.getOccupiedRoomIdsOn).toHaveBeenCalledWith("2026-09-02");
    expect(store.updates).toContainEqual({ id: "r1", updates: { status: "OCCUPIED" } });
    expect(store.updates).toContainEqual({ id: "r2", updates: { status: "AVAILABLE" } });
    expect(result).toEqual({ occupied: 1, available: 1, changed: 2 });
  });

  it("leaves HOLD, MAINTENANCE, and INACTIVE rooms untouched even if occupied", async () => {
    store.roomsByProperty.p1 = [
      { id: "r_hold", propertyId: "p1", status: "HOLD" },
      { id: "r_maint", propertyId: "p1", status: "MAINTENANCE" },
      { id: "r_inactive", propertyId: "p1", status: "INACTIVE" },
    ];
    // Even though these rooms show up as "occupied" by the raw query, their
    // unbookable status must not be clobbered.
    store.occupiedIds = new Set(["r_hold", "r_maint", "r_inactive"]);

    const result = await syncRoomOccupancyStatus("2026-09-02");

    expect(store.updates).toHaveLength(0);
    expect(result).toEqual({ occupied: 0, available: 0, changed: 0 });
  });

  it("does not call updateRoom when the status is already correct (no-op sync)", async () => {
    store.roomsByProperty.p1 = [
      { id: "r1", propertyId: "p1", status: "OCCUPIED" },
      { id: "r2", propertyId: "p1", status: "AVAILABLE" },
    ];
    store.occupiedIds = new Set(["r1"]);

    const result = await syncRoomOccupancyStatus("2026-09-02");

    expect(store.updates).toHaveLength(0);
    expect(storage.updateRoom).not.toHaveBeenCalled();
    expect(result).toEqual({ occupied: 1, available: 1, changed: 0 });
  });

  it("defaults `today` to todayIso() when not passed", async () => {
    store.roomsByProperty.p1 = [{ id: "r1", propertyId: "p1", status: "AVAILABLE" }];
    store.occupiedIds = new Set();

    await syncRoomOccupancyStatus();

    expect(storage.getOccupiedRoomIdsOn).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });
});

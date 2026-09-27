// server/lib/occupancy.ts
// Room-occupancy sync. Room `status` (AVAILABLE/OCCUPIED) is a display
// convenience derived from the same deconfliction source of truth used to
// guard new bookings/leases (storage.getOccupiedRoomIdsOn — bookings, room-
// blocking leases, external Airbnb blocks, and manual blocks). It runs on every
// scheduler sweep and is idempotent (it writes only when a status actually
// changes), so the room grid/inventory views don't drift from reality between
// guard checks. HOLD/MAINTENANCE/INACTIVE rooms are never
// touched — those are host-set unbookable states, not a computed occupancy
// state, and must survive independent of whether the room happens to overlap
// a block on `today`.
import { ROOM_UNBOOKABLE_STATUSES } from "@shared/schema";
import { excludePlaceholders } from "@shared/placeholder";
import { todayIso } from "@shared/dates";
import { storage } from "../storage";

export interface OccupancySyncResult {
  occupied: number;
  available: number;
  changed: number;
}

/**
 * For every room whose status is not HOLD/MAINTENANCE/INACTIVE, set it to
 * OCCUPIED if the room is occupied on `today` (per getOccupiedRoomIdsOn),
 * else AVAILABLE — only calling storage.updateRoom when the status actually
 * changes. Rooms are enumerated the same way the inventory routes do:
 * getProperties() + getRoomsByProperty(p.id) per property (STR properties
 * have zero rooms, so they contribute nothing here) — minus placeholder
 * properties, whose rooms are not real inventory.
 */
export async function syncRoomOccupancyStatus(today: string = todayIso()): Promise<OccupancySyncResult> {
  const [allProperties, occupiedRoomIds] = await Promise.all([
    storage.getProperties(),
    storage.getOccupiedRoomIdsOn(today),
  ]);
  // Placeholder listings are front-end only (shared/placeholder.ts). Their
  // rooms are not real inventory, so this job must neither count them nor
  // write a computed status onto them — otherwise the nightly sweep keeps
  // stamping AVAILABLE on rooms nobody can book and feeding them into the
  // occupancy denominator in storage.getKpiAggregates().
  const properties = excludePlaceholders(allProperties);

  const roomLists = await Promise.all(properties.map((p) => storage.getRoomsByProperty(p.id)));
  const rooms = roomLists.flat();

  let occupied = 0;
  let available = 0;
  let changed = 0;

  for (const room of rooms) {
    if ((ROOM_UNBOOKABLE_STATUSES as readonly string[]).includes(room.status)) continue;

    const wantStatus = occupiedRoomIds.has(room.id) ? "OCCUPIED" : "AVAILABLE";
    if (wantStatus === "OCCUPIED") occupied++;
    else available++;

    if (room.status !== wantStatus) {
      await storage.updateRoom(room.id, { status: wantStatus });
      changed++;
    }
  }

  return { occupied, available, changed };
}

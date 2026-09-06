// server/lib/publicInventory.ts
// What the PUBLIC site is allowed to show. A room is visible only when its
// property exists and is active AND the room is not pulled off the market
// (ROOM_UNBOOKABLE_STATUSES: HOLD/MAINTENANCE/INACTIVE). OCCUPIED stays visible:
// a room with a guest today is still bookable for a future free range (the date
// gate, not the status flag, decides that).

import { ROOM_UNBOOKABLE_STATUSES } from "@shared/schema";

export function roomPubliclyVisible(
  room: { status: string },
  property: { active: boolean } | undefined | null,
): boolean {
  if (!property || !property.active) return false;
  return !(ROOM_UNBOOKABLE_STATUSES as readonly string[]).includes(room.status);
}

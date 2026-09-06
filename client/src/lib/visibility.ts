// client/src/lib/visibility.ts
// Guest-facing inventory visibility rules (pure, shared by the property page's
// room list and the listings grid):
//   • A room pulled off the market (HOLD/MAINTENANCE/INACTIVE) is never listed.
//   • During a dated search, rooms and listings not free for the searched range
//     are dropped rather than greyed — a guest only sees what they can book.
//   • With no dates, every listing stays (a full house still shows "Next
//     opening"), and OCCUPIED rooms stay (bookable for a future free range).
//   • LTR listings are inquiry-only and have no availability, so they always show.

import { ROOM_UNBOOKABLE_STATUSES } from "@shared/schema";

export function visibleRooms<T extends { status: string; availableForDates?: boolean }>(
  rooms: T[],
  datedSearch: boolean,
): T[] {
  return rooms.filter((r) => {
    if ((ROOM_UNBOOKABLE_STATUSES as readonly string[]).includes(r.status)) return false;
    if (datedSearch && r.availableForDates === false) return false;
    return true;
  });
}

export function visibleProperties<T extends { type: string; availableForDates?: boolean }>(
  properties: T[],
  datedSearch: boolean,
): T[] {
  if (!datedSearch) return properties;
  return properties.filter((p) => p.type === "LTR" || p.availableForDates !== false);
}

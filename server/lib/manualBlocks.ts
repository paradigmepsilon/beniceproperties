// server/lib/manualBlocks.ts
// Validation for admin/UO manual calendar blocks (off-platform bookings,
// maintenance holds, owner use). Pure so it is unit-testable without Express or
// a database; the shared createBlock route handler in server/routes.ts loads the
// property/room and delegates the decision here.
//
// Why this exists: a manual block with `room_id IS NULL` blocks the WHOLE
// property, which is only meaningful for an STR listing. On a co-living
// property, availability is decided per room (buildRoomAvailability /
// isRoomAvailableForRange only ever look at room-scoped blocks), so a
// property-level block there is silently inert — the operator thinks a room is
// held and it is still bookable. Reject it at the door instead.

import type { Property, Room } from "@shared/schema";

export interface ManualBlockValidationResult {
  ok: boolean;
  /** Guest-safe 400 message; null when `ok`. */
  message: string | null;
}

const OK: ManualBlockValidationResult = { ok: true, message: null };
const fail = (message: string): ManualBlockValidationResult => ({ ok: false, message });

/**
 * Validate the property/room pairing of a manual block.
 *   - unknown property        → 404-ish "Property not found" (the route maps it)
 *   - COLIVING + no room      → rejected: the block would block nothing
 *   - room from another property → rejected: it would block the wrong listing
 *   - STR + a room            → allowed (STR listings normally have no rooms,
 *                               but a room that genuinely belongs to the
 *                               property is not a data error)
 */
export function validateManualBlockInput(args: {
  property: Pick<Property, "id" | "type"> | undefined | null;
  room: Pick<Room, "id" | "propertyId"> | undefined | null;
  roomId: string | null | undefined;
}): ManualBlockValidationResult {
  const { property, room, roomId } = args;
  if (!property) return fail("Property not found");

  if (!roomId) {
    return property.type === "COLIVING"
      ? fail("Co-living blocks must name a room")
      : OK;
  }

  if (!room) return fail("Room not found");
  if (room.propertyId !== property.id) return fail("Room does not belong to that property");
  return OK;
}

// shared/publicProjection.ts
// =============================================================================
// What a PROPERTY or ROOM row looks like once it leaves the building.
//
// The public endpoints used to return the raw DB row (`res.json({ ...p })`),
// which shipped three things the browser has no business seeing:
//   - airbnbIcalUrl        tokenized calendar feed; schema.ts calls it secret
//   - airbnbListingRoomId  internal OTA mapping
//   - priorNames           internal tag list (campaign tags live here)
// and, as of the placeholder work, would have shipped a fourth:
//   - isPlaceholder        tells a visitor the listing is not real inventory
//
// So the public shape is a WHITELIST, not a blocklist: a column added to
// `properties` or `rooms` is withheld until someone deliberately publishes it.
// The ledger checks below make that a compile error rather than a judgement
// call — add a new column to the public list or the withheld list, or the
// build fails.
//
// The one field added on the way out is `inquiryOnly`: the neutral public form
// of "you can look, but you can't book online". It is true for LTR listings
// and for placeholders, and the browser is never told which. See
// shared/placeholder.ts.
//
// Lives in shared/ rather than server/lib/ because the client needs the
// PublicProperty / PublicRoom types to know what it is allowed to read. The
// module is pure: type-only imports plus one predicate.
//
// Sibling module: server/lib/publicInventory.ts answers WHETHER a room may be
// shown at all. This one answers WHAT of it may be shown.
// =============================================================================

import { listingIsInquiryOnly } from "./placeholder";
import type { Property, Room } from "./schema";

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

const PUBLIC_PROPERTY_KEYS = [
  "id",
  "name",
  "location",
  "type",
  "entity",
  "description",
  "listingContent",
  "photos",
  "amenities",
  "basePrice",
  "cleaningFee",
  "dailyRate",
  "weeklyRate",
  "biweeklyRate",
  "monthlyRate",
  "downPayment",
  "monPrice",
  "tuePrice",
  "wedPrice",
  "thuPrice",
  "friPrice",
  "satPrice",
  "sunPrice",
  "address",
  "active",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof Property)[];

const WITHHELD_PROPERTY_KEYS = [
  "priorNames",
  "airbnbListingRoomId",
  "airbnbIcalUrl",
  "isPlaceholder",
] as const satisfies readonly (keyof Property)[];

type PublicPropertyKey = (typeof PUBLIC_PROPERTY_KEYS)[number];
type WithheldPropertyKey = (typeof WITHHELD_PROPERTY_KEYS)[number];

export type PublicProperty = Pick<Property, PublicPropertyKey> & {
  /** True when the listing is visible but not bookable online (LTR or placeholder). */
  inquiryOnly: boolean;
};

// Compile-time ledger: every column on `properties` must be classified as
// either public or withheld. Add a column and forget, and this line fails to
// build with "Type 'true' is not assignable to type 'never'" — which is the
// point. Resolve it by adding the new key to one of the two lists above.
type UnclassifiedPropertyKeys = Exclude<keyof Property, PublicPropertyKey | WithheldPropertyKey>;
const _propertyKeyLedger: [UnclassifiedPropertyKeys] extends [never] ? true : never = true;
void _propertyKeyLedger;

export function toPublicProperty(property: Property): PublicProperty {
  const out = {} as Record<string, unknown>;
  for (const key of PUBLIC_PROPERTY_KEYS) out[key] = property[key];
  return {
    ...(out as Pick<Property, PublicPropertyKey>),
    inquiryOnly: listingIsInquiryOnly(property),
  };
}

// ---------------------------------------------------------------------------
// Rooms
// ---------------------------------------------------------------------------

const PUBLIC_ROOM_KEYS = [
  "id",
  "propertyId",
  "name",
  "roomNumber",
  "description",
  "listingContent",
  "photos",
  "weeklyRent",
  "depositAmount",
  "cleaningFee",
  "dailyRate",
  "biweeklyRate",
  "monthlyRate",
  "status",
  "address",
  "createdAt",
  "updatedAt",
] as const satisfies readonly (keyof Room)[];

const WITHHELD_ROOM_KEYS = [
  "priorNames",
  "airbnbListingRoomId",
  "airbnbIcalUrl",
] as const satisfies readonly (keyof Room)[];

type PublicRoomKey = (typeof PUBLIC_ROOM_KEYS)[number];
type WithheldRoomKey = (typeof WITHHELD_ROOM_KEYS)[number];

export type PublicRoom = Pick<Room, PublicRoomKey>;

// Same ledger, for `rooms`.
type UnclassifiedRoomKeys = Exclude<keyof Room, PublicRoomKey | WithheldRoomKey>;
const _roomKeyLedger: [UnclassifiedRoomKeys] extends [never] ? true : never = true;
void _roomKeyLedger;

export function toPublicRoom(room: Room): PublicRoom {
  const out = {} as Record<string, unknown>;
  for (const key of PUBLIC_ROOM_KEYS) out[key] = room[key];
  return out as PublicRoom;
}

// server/lib/accessInfo.ts
// =============================================================================
// Resolves everything a guest needs to physically get in: door code, wifi,
// directions, parking, and how to find their actual room.
//
// GENERIC BY CONSTRUCTION. Nothing here knows a property by name. A door code is
// per-booking (an admin types it at approval); wifi/directions/parking/entry are
// per-property; room-finding notes are per-room. Adding a property or a room
// requires zero code change — the EXPANSION RULE.
//
// SENSITIVE VALUES. The door code, the wifi password and the building entry code
// are access credentials. They may appear in exactly two places: the body of an
// email to the guest who booked, and the token-gated stay page. They must never
// reach Telegram, an SMS, a log line, a PostHog property, an escalation detail,
// or a test fixture. `missingAccessFields` therefore returns FIELD NAMES, never
// values, precisely so an admin alert can say what is missing without leaking
// what is set.
// =============================================================================

import { storage } from "../storage";
import type { Booking, BookingGate, Property, Room } from "@shared/schema";

/** Everything the welcome letter and the stay page's arrival card need. */
export interface StayAccessInfo {
  /** SENSITIVE — per-booking, set by an admin at approval. */
  doorCode: string | null;
  wifiSsid: string | null;
  /** SENSITIVE. */
  wifiPassword: string | null;
  /** SENSITIVE — shared gate/lobby code, if the property has one. */
  buildingEntry: string | null;
  directions: string | null;
  parking: string | null;
  /** How to find the specific room once inside. Null for a whole-property stay. */
  roomFinding: string | null;
  checkInFrom: string | null;
  checkOutBy: string | null;
  notes: string | null;
}

/**
 * The fields a welcome letter cannot usefully go out without. Wifi password is
 * deliberately NOT required — plenty of properties have an open or guest network
 * — but an SSID with no password and no note is a support call, so the SSID is.
 */
export const REQUIRED_WELCOME_FIELDS = ["doorCode", "wifiSsid", "directions"] as const;

const nonEmpty = (v: string | undefined | null): string | null => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length > 0 ? t : null;
};

/**
 * Compose the access info for one stay from the booking's gate row, its
 * property, and its room. Reads the two access-info tables; those live apart
 * from `properties`/`rooms` so a public endpoint selecting whole property rows
 * can never publish a wifi password.
 */
export async function resolveStayAccessInfo(args: {
  gate: BookingGate | null;
  property: Property;
  room: Room | null;
}): Promise<StayAccessInfo> {
  const [propertyInfo, roomInfo] = await Promise.all([
    storage.getPropertyAccessInfo(args.property.id),
    args.room ? storage.getRoomAccessInfo(args.room.id) : Promise.resolve(undefined),
  ]);

  return {
    doorCode: nonEmpty(args.gate?.doorCode),
    wifiSsid: nonEmpty(propertyInfo?.wifiSsid),
    wifiPassword: nonEmpty(propertyInfo?.wifiPassword),
    buildingEntry: nonEmpty(propertyInfo?.buildingEntry),
    directions: nonEmpty(propertyInfo?.directions),
    parking: nonEmpty(propertyInfo?.parking),
    roomFinding: nonEmpty(roomInfo?.findingNotes),
    checkInFrom: nonEmpty(propertyInfo?.checkInFrom),
    checkOutBy: nonEmpty(propertyInfo?.checkOutBy),
    notes: nonEmpty(propertyInfo?.notes),
  };
}

/**
 * Which required fields are blank. Returns FIELD NAMES ONLY — an admin alert
 * built from this can say "wifiSsid, directions are missing" without ever
 * printing a code that IS set.
 *
 * `requireDoorCode` is false for a whole-property STR pre-arrival where the
 * property's standing entry code is the access method and no per-booking code
 * was ever set.
 */
export function missingAccessFields(
  info: StayAccessInfo,
  opts: { requireDoorCode?: boolean } = {},
): string[] {
  const requireDoorCode = opts.requireDoorCode !== false;
  return REQUIRED_WELCOME_FIELDS.filter((field) => {
    if (field === "doorCode" && !requireDoorCode) {
      // Without a per-booking code, SOME way in still has to exist.
      return !info.doorCode && !info.buildingEntry;
    }
    return !info[field];
  });
}

/** True when a welcome letter can be composed with real arrival information. */
export function hasWelcomeInfo(
  info: StayAccessInfo,
  opts: { requireDoorCode?: boolean } = {},
): boolean {
  return missingAccessFields(info, opts).length === 0;
}

/**
 * The arrival section of a guest email. EMAIL ONLY — this renders live access
 * credentials, so it must never be passed as an `smsBody` or a `telegramText`.
 */
export function renderAccessInfoText(info: StayAccessInfo): string {
  const lines: string[] = [];
  if (info.doorCode) lines.push(`Door code: ${info.doorCode}`);
  if (info.buildingEntry) lines.push(`Building/gate entry: ${info.buildingEntry}`);
  if (info.wifiSsid) {
    lines.push(
      info.wifiPassword
        ? `Wi-Fi: ${info.wifiSsid} — password ${info.wifiPassword}`
        : `Wi-Fi: ${info.wifiSsid}`,
    );
  }
  if (info.roomFinding) lines.push(`Finding your room: ${info.roomFinding}`);
  if (info.directions) lines.push(`Getting here: ${info.directions}`);
  if (info.parking) lines.push(`Parking: ${info.parking}`);
  if (info.checkInFrom) lines.push(`Check-in from: ${info.checkInFrom}`);
  if (info.checkOutBy) lines.push(`Checkout by: ${info.checkOutBy}`);
  if (info.notes) lines.push(info.notes);
  return lines.join("\n");
}

/**
 * The same arrival section with every credential replaced. This is what gets
 * persisted to `message_log`, handed to an admin surface, or written to a log —
 * anywhere the record of "we sent the welcome letter" is wanted without a
 * durable copy of the codes themselves.
 */
export function renderAccessInfoRedacted(info: StayAccessInfo): string {
  return renderAccessInfoText({
    ...info,
    doorCode: info.doorCode ? "[redacted]" : null,
    buildingEntry: info.buildingEntry ? "[redacted]" : null,
    wifiPassword: info.wifiPassword ? "[redacted]" : null,
  });
}

/**
 * Booking-shaped convenience wrapper: resolve access info straight from a row
 * that already carries its gate, property and room (the sweep query shape).
 */
export async function getWelcomeInfo(
  stay: Booking & { gate: BookingGate | null; property: Property; room: Room | null },
): Promise<StayAccessInfo> {
  return resolveStayAccessInfo({ gate: stay.gate, property: stay.property, room: stay.room });
}

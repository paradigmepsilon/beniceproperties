// server/lib/icalExport.ts
// =============================================================================
// Outbound calendar feed (BNP -> Airbnb). The mirror image of icalSync.ts: that
// module IMPORTS Airbnb's occupancy into BNP; this one PUBLISHES BNP's own
// occupancy as a subscribable .ics so a direct booking blocks the same dates on
// Airbnb (paste the feed URL into the listing's "Import calendar").
//
// SOURCES (BNP-owned only): direct bookings, room-blocking leases, manual blocks
// — the same rows buildStrAvailability / buildRoomAvailability read. It
// deliberately NEVER reads external_bookings: those blocks came FROM Airbnb, and
// handing them back would be a pointless echo (icalSync's dedup already exists
// for the reverse round-trip; don't rely on it here).
//
// PRIVACY: this URL is fetched by a third party with no credentials, so the
// token in the path is the only gate and the body carries NO guest data — every
// event is the literal "Reserved" with a synthetic UID, nothing else.
//
// DATES: every event is an all-day range with an EXCLUSIVE end (iCal DTEND).
// Bookings and manual blocks are already half-open; a lease's endDate is
// INCLUSIVE (the lease occupies it) so it is bumped one day, exactly as
// availability.ts does.
//
// Hand-rolled instead of a generator dependency: the feed is fixed-shape
// all-day VEVENTs with no user text, so escaping is a non-issue and the only
// spec detail that matters (75-octet line folding) is a few lines.
// =============================================================================

import { storage } from "../storage";
import { addDaysIso, todayIso } from "@shared/dates";
import { NON_BLOCKING_BOOKING_STATUSES } from "@shared/schema";
import { countsTowardBusiness } from "@shared/placeholder";

const UID_DOMAIN = "beniceproperties.com";
const EVENT_SUMMARY = "Reserved";

export interface ExportEvent {
  /** Stable per source row, so Airbnb's re-polls update rather than duplicate. */
  uid: string;
  /** YYYY-MM-DD, first occupied night. */
  start: string;
  /** YYYY-MM-DD, EXCLUSIVE (first free day). */
  end: string;
}

function isBlocking(status: string): boolean {
  return !(NON_BLOCKING_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** Drop past, zero-length, and inverted ranges; sort by start then uid. */
function clean(events: ExportEvent[], today: string): ExportEvent[] {
  return events
    .filter((e) => e.end > e.start && e.end >= today)
    .sort((a, b) => (a.start === b.start ? (a.uid < b.uid ? -1 : 1) : a.start < b.start ? -1 : 1));
}

/** Whole-property STR feed: direct bookings + property-level manual blocks. */
export async function buildPropertyExportEvents(propertyId: string, today = todayIso()): Promise<ExportEvent[]> {
  const [bookings, blocks] = await Promise.all([
    storage.getStrBookingsForProperty(propertyId),
    storage.getManualBlocksForProperty(propertyId),
  ]);
  const events: ExportEvent[] = [];
  for (const b of bookings) {
    if (!isBlocking(b.status) || !b.checkOut) continue; // open-ended rows are dropped, as in availability.ts
    events.push({ uid: `booking-${b.id}@${UID_DOMAIN}`, start: b.checkIn, end: b.checkOut });
  }
  for (const m of blocks) {
    events.push({ uid: `block-${m.id}@${UID_DOMAIN}`, start: m.startDate, end: m.endDate });
  }
  return clean(events, today);
}

/** Co-living room feed: room-blocking leases + short-stay bookings + room-level manual blocks. */
export async function buildRoomExportEvents(roomId: string, today = todayIso()): Promise<ExportEvent[]> {
  const [leases, bookings, blocks] = await Promise.all([
    storage.getRoomBlockingLeasesForRoom(roomId),
    storage.getColivingBookingsForRoom(roomId),
    storage.getManualBlocksForRoom(roomId),
  ]);
  const events: ExportEvent[] = [];
  for (const l of leases) {
    events.push({ uid: `lease-${l.id}-${roomId}@${UID_DOMAIN}`, start: l.startDate, end: addDaysIso(l.endDate, 1) });
  }
  for (const b of bookings) {
    if (!isBlocking(b.status) || !b.checkOut) continue;
    events.push({ uid: `booking-${b.id}@${UID_DOMAIN}`, start: b.checkIn, end: b.checkOut });
  }
  for (const m of blocks) {
    events.push({ uid: `block-${m.id}@${UID_DOMAIN}`, start: m.startDate, end: m.endDate });
  }
  return clean(events, today);
}

// ─── ICS rendering ──────────────────────────────────────────────────────────

/** RFC 5545 §3.1: content lines are folded at 75 octets; continuation starts with one space. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let i = 0;
  let limit = 75;
  while (i < bytes.length) {
    let end = Math.min(i + limit, bytes.length);
    // Never split inside a multi-byte UTF-8 sequence.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    parts.push(bytes.subarray(i, end).toString("utf8"));
    i = end;
    limit = 74; // the leading space counts toward the 75
  }
  return parts.join("\r\n ");
}

const compact = (iso: string) => iso.replace(/-/g, "");

function stamp(now: Date): string {
  return now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape a TEXT value (RFC 5545 §3.3.11). Only the calendar name is user-influenced. */
function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

export function renderIcs(calendarName: string, events: ExportEvent[], now: Date = new Date()): string {
  const dtstamp = stamp(now);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Be Nice Properties//Calendar Export//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const e of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${compact(e.start)}`,
      `DTEND;VALUE=DATE:${compact(e.end)}`,
      `SUMMARY:${EVENT_SUMMARY}`,
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

// ─── Token -> feed ──────────────────────────────────────────────────────────

/**
 * Resolve a secret export token to its rendered feed. Returns null for an
 * unknown token or a listing that must not publish (inactive, placeholder, or
 * the wrong product type) — the route turns null into one generic 404 so a
 * caller can't tell "no such token" from "not publishable".
 */
export async function getExportFeed(token: string, now: Date = new Date()): Promise<string | null> {
  if (!token) return null;
  const today = todayIso(now);

  const property = await storage.getPropertyByExportToken(token);
  if (property) {
    if (!property.active || !countsTowardBusiness(property) || property.type !== "STR") return null;
    return renderIcs(property.name, await buildPropertyExportEvents(property.id, today), now);
  }

  const room = await storage.getRoomByExportToken(token);
  if (room) {
    const parent = await storage.getProperty(room.propertyId);
    if (!parent || !parent.active || !countsTowardBusiness(parent) || parent.type !== "COLIVING") return null;
    return renderIcs(`${parent.name} — ${room.name}`, await buildRoomExportEvents(room.id, today), now);
  }

  return null;
}

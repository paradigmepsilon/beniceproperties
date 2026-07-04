// server/lib/icalSync.ts
// =============================================================================
// External (Airbnb/iCal) calendar ingest for BNP. Each BNP listing carries its
// OWN Airbnb-exported .ics URL in the `airbnb_ical_url` column on properties
// (whole-property STR listing) / rooms (private-room listing) — the single
// source of truth, also managed from Unified-Ops. This module fetches each
// listing's feed and writes DATE BLOCKS into BNP's own `external_bookings`
// table. BNP owns its data — this reads/writes only the BNP database; it never
// touches the TRAD DB or Unified Ops. It mirrors the pattern in
// Unified-Ops/src/lib/trad/ical-sync.ts, adapted to BNP's storage layer.
//
// TWO-RECORD-TYPE DISCIPLINE: this writes ONLY blocks to external_bookings. It
// NEVER creates a `bookings`/`leases` row and NEVER attributes revenue or guest
// PII to an Airbnb block. It skips events overlapping a confirmed DIRECT booking
// / room-blocking lease (prevents the circular sync where a direct booking
// exported to Airbnb round-trips back as a "Reserved" block).
//
// SECURITY: faithful port of the reference's SSRF protections — HTTPS-only,
// blocked-IP ranges (RFC1918/localhost/link-local/CGNAT/ULA/etc.), DNS
// resolution check, manual redirect re-validation, size/timeout/content-type
// limits. `url` is admin-supplied, so these guards are mandatory. Do NOT relax.
// =============================================================================

import { promises as dns } from "node:dns";
import net from "node:net";
import type { VEvent } from "node-ical";
import { storage } from "../storage";

/** A bookable listing with an Airbnb iCal feed URL to sync. */
export interface IcalListing {
  kind: "property" | "room";
  propertyId: string;
  roomId: string | null;
  url: string;
  label: string;
}

// ─── SSRF guard config (ported verbatim) ────────────────────────────────────

const ALLOWED_PROTOCOLS = ["https:"];
const ALLOWED_CONTENT_TYPES = ["text/calendar", "application/calendar", "text/plain"];
const MAX_RESPONSE_SIZE = 10 * 1024 * 1024; // 10MB
const FETCH_TIMEOUT_MS = 30_000;
const MAX_REDIRECTS = 3;
const SAFE_DELETE_DAYS = 0; // remove vanished events immediately (matches reference)

const BLOCKED_IPS: RegExp[] = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^localhost$/i,
  /^169\.254\./,
  /^fe80:/i,
  /^224\./,
  /^ff00:/i,
  /^0\./, // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./, // CGNAT 100.64/10
  /^198\.1[8-9]\./, // benchmarking 198.18/15
  /^fc00:/i, // IPv6 ULA fc00::/7
];

export function isBlockedIP(ip: string): boolean {
  return BLOCKED_IPS.some((p) => p.test(ip));
}

export function validateUrl(urlString: string): URL {
  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL format: ${urlString}`);
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Protocol not allowed: ${url.protocol}. Only HTTPS is permitted.`);
  }
  const port = url.port ? parseInt(url.port, 10) : 443;
  if (port < 80 || port > 65535 || (port >= 1 && port <= 1023 && ![80, 443].includes(port))) {
    throw new Error(`Port not allowed: ${port}`);
  }
  return url;
}

export async function validateIP(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isBlockedIP(hostname)) throw new Error(`IP address not allowed: ${hostname}`);
    return;
  }
  let addresses: string[] = [];
  try {
    addresses = await dns.resolve4(hostname);
  } catch {
    try {
      addresses = await dns.resolve6(hostname);
    } catch {
      throw new Error(`Failed to resolve hostname: ${hostname}`);
    }
  }
  for (const addr of addresses) {
    if (isBlockedIP(addr)) {
      throw new Error(`IP address not allowed: ${addr} (resolved from ${hostname})`);
    }
  }
}

/** Secure fetch with manual redirect re-validation at each hop. */
export async function secureFetch(urlString: string, redirectCount = 0): Promise<string> {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
  }
  const url = validateUrl(urlString);
  await validateIP(url.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(urlString, {
      headers: {
        "User-Agent": "BeNiceProperties Calendar Sync/1.0",
        Accept: ALLOWED_CONTENT_TYPES.join(", "),
      },
      signal: controller.signal,
      redirect: "manual",
    });

    // Manual redirect: re-validate the next hop.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect with no Location header");
      const nextUrl = new URL(loc, urlString).toString();
      return secureFetch(nextUrl, redirectCount + 1);
    }
    if (!res.ok) {
      throw new Error(`Feed fetch failed: HTTP ${res.status}`);
    }

    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType && !ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      throw new Error(`Disallowed content-type: ${contentType}`);
    }

    const text = await res.text();
    if (text.length > MAX_RESPONSE_SIZE) {
      throw new Error(`Feed too large (> ${MAX_RESPONSE_SIZE} bytes)`);
    }
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new Error("Response is not a valid iCalendar document");
    }
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Parsing (ported) ───────────────────────────────────────────────────────

export interface ParsedEvent {
  externalId: string;
  summary: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD (iCal DTEND is exclusive — checkout morning)
}

function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Today's date (YYYY-MM-DD) in local time. Extracted for test injection. */
function todayIso(): string {
  return fmtDate(new Date());
}

export async function parseICalData(icalData: string, today: string = todayIso()): Promise<ParsedEvent[]> {
  const events: ParsedEvent[] = [];
  // Dynamic import: node-ical (and its transitive deps) must NOT be evaluated at
  // module load. Loading it lazily keeps it out of the client/build graph and
  // avoids the ESM/BigInt-at-load hazard the reference documented.
  const ical = (await import("node-ical")).default;
  const parsed = ical.parseICS(icalData);

  for (const [key, component] of Object.entries(parsed)) {
    if (!component || (component as { type?: string }).type !== "VEVENT") continue;
    const event = component as VEvent;
    if (!(event.start instanceof Date) || !(event.end instanceof Date)) continue;

    const startDate = fmtDate(event.start);
    const endDate = fmtDate(event.end);

    // Skip past events.
    if (endDate < today) continue;

    // Skip Airbnb "Not available" host-blocks (host-blocked / outside bookable
    // window). "Reserved" = a real Airbnb guest booking; keep it.
    const rawSummary = (event.summary || "").toString();
    if (/not available/i.test(rawSummary)) continue;

    events.push({
      externalId: (event.uid || key) as string,
      summary: event.summary ? String(event.summary) : "External Event",
      startDate,
      endDate,
    });
  }
  return events;
}

// ─── Direct-booking / lease overlap dedup (ported + BNP-adapted) ─────────────

const GENERIC_TERMS = [
  "not available",
  "blocked",
  "unavailable",
  "reserved",
  "booked",
  "occupied",
  "closed period",
  "maintenance",
  "block",
];

export function isGenericPlaceholder(summary: string): boolean {
  const s = summary.toLowerCase().trim();
  return GENERIC_TERMS.some((t) => s.includes(t));
}

export function extractGuestName(summary: string): string {
  let name = summary
    .replace(/^🏡\s*/, "")
    .replace(/^\w+:\s*/, "")
    .replace(/\s*\(.*\)$/g, "")
    .trim();
  if (name.includes(" & ")) name = name.split(" & ")[0].trim();
  return name;
}

export function fuzzyNameMatch(a: string, b: string): boolean {
  if (!a || !b) return false;
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
  const n1 = norm(a);
  const n2 = norm(b);
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;
  const p1 = n1.split(" ");
  const p2 = n2.split(" ");
  if (p1.length >= 2 && p2.length >= 2) {
    return p1[0] === p2[0] && p1[p1.length - 1] === p2[p2.length - 1];
  }
  return false;
}

/**
 * True if an STR feed event duplicates a confirmed BNP DIRECT booking for the
 * property (date overlap + generic placeholder OR fuzzy name). Airbnb host
 * exports usually give no guest name, so date-overlap + generic placeholder is
 * the primary signal; fuzzy-name kept for parity. Half-open overlap to match
 * strHasConflict.
 */
async function isStrDirectDuplicate(event: ParsedEvent, propertyId: string): Promise<boolean> {
  const bookings = await storage.getStrBookingsForProperty(propertyId);
  for (const b of bookings) {
    if (!b.checkOut) continue;
    // Half-open: event.start < booking.end && booking.start < event.end.
    if (event.startDate < b.checkOut && b.checkIn < event.endDate) {
      if (isGenericPlaceholder(event.summary)) return true;
      // Bookings store the guest via guestId, not a name; rely on placeholder.
    }
  }
  return false;
}

/**
 * True if a room feed event duplicates a room-blocking BNP lease for the room
 * (inclusive overlap, matching isRoomAvailableForRange). Leases have no guest
 * name on the row either, so a generic-placeholder overlap is the signal.
 */
async function isColivingDirectDuplicate(event: ParsedEvent, roomId: string): Promise<boolean> {
  const leases = await storage.getRoomBlockingLeasesForRoom(roomId);
  for (const l of leases) {
    // Inclusive overlap against a lease that occupies its end date.
    if (event.startDate <= l.endDate && l.startDate < event.endDate) {
      if (isGenericPlaceholder(event.summary)) return true;
    }
  }
  return false;
}

/** Route dedup by listing kind (co-living room vs whole-property STR). */
async function isDirectDuplicate(event: ParsedEvent, listing: IcalListing): Promise<boolean> {
  if (listing.roomId) return isColivingDirectDuplicate(event, listing.roomId);
  return isStrDirectDuplicate(event, listing.propertyId);
}

// ─── Sync ────────────────────────────────────────────────────────────────────

export interface ListingSyncResult {
  /** "property:<id>" | "room:<id>" — the listing this result is for. */
  key: string;
  label: string;
  kind: "property" | "room";
  ok: boolean;
  parsed: number;
  created: number;
  updated: number;
  skippedDuplicates: number;
  removed: number;
  error?: string;
}

export interface SyncResult {
  totalListings: number;
  listings: ListingSyncResult[];
}

/**
 * Sync one listing's Airbnb calendar: fetch its `airbnb_ical_url`, parse, dedup
 * vs BNP direct bookings/leases, upsert external_bookings for that listing, and
 * remove vanished events. Idempotent — a re-run with no calendar change yields
 * 0 created / 0 removed. When `dryRun` is true, performs the fetch + parse +
 * dedup but writes nothing. Never throws out of the sweep: a fetch/parse failure
 * is captured on the result (there is no feed row to stamp — sync status is
 * derived from external_bookings, and errors surface live in UO's calendar view).
 */
export async function syncListing(listing: IcalListing, dryRun = false): Promise<ListingSyncResult> {
  const base: ListingSyncResult = {
    key: listing.roomId ? `room:${listing.roomId}` : `property:${listing.propertyId}`,
    label: listing.label,
    kind: listing.kind,
    ok: false,
    parsed: 0,
    created: 0,
    updated: 0,
    skippedDuplicates: 0,
    removed: 0,
  };

  let parsedEvents: ParsedEvent[];
  try {
    const icalData = await secureFetch(listing.url);
    parsedEvents = await parseICalData(icalData);
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
  base.parsed = parsedEvents.length;

  const existing = listing.roomId
    ? await storage.getExternalBlocksForRoom(listing.roomId)
    : await storage.getExternalBlocksForProperty(listing.propertyId);
  const existingByExternalId = new Map(existing.map((b) => [b.externalId, b]));
  const currentIds = new Set(parsedEvents.map((e) => e.externalId));
  const now = new Date();

  for (const event of parsedEvents) {
    try {
      const dup = await isDirectDuplicate(event, listing);
      const prior = existingByExternalId.get(event.externalId);
      if (dup) {
        // A direct booking round-tripped from Airbnb — don't double-block.
        if (prior && !dryRun) await storage.deleteExternalBooking(prior.id);
        base.skippedDuplicates++;
        continue;
      }
      if (!dryRun) {
        await storage.upsertExternalBooking({
          propertyId: listing.propertyId,
          roomId: listing.roomId,
          externalId: event.externalId,
          startDate: event.startDate,
          endDate: event.endDate,
          summary: event.summary,
          lastSynced: now,
        });
      }
      if (prior) base.updated++;
      else base.created++;
    } catch {
      // Continue processing other events even if one fails.
    }
  }

  // Safe deletion: remove events no longer in the feed if unseen for
  // SAFE_DELETE_DAYS (=0 → immediate, matches reference).
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - SAFE_DELETE_DAYS);
  for (const prior of existing) {
    if (currentIds.has(prior.externalId)) continue;
    const lastSeen = prior.lastSynced ?? prior.updatedAt ?? prior.createdAt;
    if (!lastSeen) continue; // safety: no timestamp → keep
    if (lastSeen < threshold) {
      if (!dryRun) await storage.deleteExternalBooking(prior.id);
      base.removed++;
    }
  }

  base.ok = true;
  return base;
}

/**
 * Sync every listing that has an Airbnb iCal URL, sequentially (low volume;
 * avoids hammering Airbnb). The URL lives on properties/rooms.airbnb_ical_url.
 */
export async function syncAllListings(dryRun = false): Promise<SyncResult> {
  const listings = await storage.getListingsWithIcalUrl();
  const results: ListingSyncResult[] = [];
  for (const l of listings) {
    results.push(await syncListing(l, dryRun));
  }
  return { totalListings: listings.length, listings: results };
}

/** Scheduler entry point — refresh every listing's Airbnb calendar. */
export async function refreshExternalCalendars(): Promise<SyncResult> {
  return syncAllListings(false);
}

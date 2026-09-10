// server/lib/icalSync.test.ts
// iCal sync: SSRF guards, parse (skip "Not available" + past, honor host
// blocks), the idempotent create/update/remove/dedup diff logic in
// syncListing against a mocked storage, syncAllListings' settings bookkeeping,
// and checkCalendarSyncHealth's stale/failed escalation. The feed URL is
// per-listing (properties/rooms.airbnb_ical_url); node-ical is real (pure
// parse); the network is stubbed via global.fetch.

import { describe, it, expect, vi, beforeEach } from "vitest";

// syncListing reaches storage for blocks + dedup reads. Reset each test.
const store = {
  blocks: [] as any[],
  strBookings: [] as any[],
  leases: [] as any[],
  upserts: [] as any[],
  deletes: [] as string[],
  listings: [] as any[],
  settings: {} as Record<string, string | undefined>,
  escalationResult: { id: "esc1", kind: "CALENDAR_SYNC_FAILED", status: "OPEN" } as any,
};

vi.mock("../storage", () => ({
  storage: {
    getExternalBlocksForProperty: vi.fn(async () => store.blocks),
    getExternalBlocksForRoom: vi.fn(async () => store.blocks),
    getStrBookingsForProperty: vi.fn(async () => store.strBookings),
    getRoomBlockingLeasesForRoom: vi.fn(async () => store.leases),
    upsertExternalBooking: vi.fn(async (d: any) => {
      store.upserts.push(d);
      return { id: `blk_${store.upserts.length}`, ...d };
    }),
    deleteExternalBooking: vi.fn(async (id: string) => {
      store.deletes.push(id);
    }),
    getListingsWithIcalUrl: vi.fn(async () => store.listings),
    getSetting: vi.fn(async (key: string) => {
      const value = store.settings[key];
      return value === undefined ? undefined : { key, value };
    }),
    setSetting: vi.fn(async (key: string, value: string) => {
      store.settings[key] = value;
      return { key, value };
    }),
    raiseEscalationOnce: vi.fn(async () => store.escalationResult),
  },
}));

vi.mock("./notifications", () => ({
  notifyAdmin: vi.fn(async () => ({
    email: { sent: false, channel: "email" },
    telegram: { sent: false, channel: "telegram" },
  })),
}));

import { storage } from "../storage";
import { notifyAdmin } from "./notifications";
import {
  parseICalData,
  validateUrl,
  validateIP,
  isBlockedIP,
  isGenericPlaceholder,
  fuzzyNameMatch,
  syncListing,
  syncAllListings,
  checkCalendarSyncHealth,
  type IcalListing,
} from "./icalSync";

// ─── Fixture helpers ─────────────────────────────────────────────────────────

function vevent(uid: string, start: string, end: string, summary: string): string {
  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `SUMMARY:${summary}`,
    "END:VEVENT",
  ].join("\r\n");
}

function ics(...events: string[]): string {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Airbnb//EN", ...events, "END:VCALENDAR"].join(
    "\r\n",
  );
}

/** Stub global.fetch to return a canned .ics body (text/calendar, 200). */
function stubFetch(body: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      status: 200,
      ok: true,
      headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "text/calendar" : null) },
      text: async () => body,
    })),
  );
}

/** Route fetch by URL, for tests that sync more than one listing at once. */
function stubFetchByUrl(bodies: Record<string, string | { fail: true }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const entry = bodies[url];
      if (!entry || (typeof entry === "object" && "fail" in entry)) {
        return { status: 500, ok: false, headers: { get: () => null }, text: async () => "" };
      }
      return {
        status: 200,
        ok: true,
        headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? "text/calendar" : null) },
        text: async () => entry,
      };
    }),
  );
}

// Fixture dates always far in the future relative to the real clock, so the
// suite never rots as wall-clock time passes (see "4 pre-existing failures"
// diagnosis in the build log / task report — the previous fixtures used
// fixed 2026-08 dates that fell into the past). Formatted in the SAME
// hotel-local (America/New_York) convention parseICalData's default "today"
// now uses (@shared/dates.todayIso), so these stay aligned with production
// "today" semantics rather than the test process's own local timezone.
const BASE_DAYS_AHEAD = 400;
function offsetDate(daysAhead: number): Date {
  return new Date(Date.now() + daysAhead * 86_400_000);
}
/** ISO (YYYY-MM-DD), hotel-local (America/New_York) — matches todayIso(). */
function isoDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}
function yyyymmdd(d: Date): string {
  return isoDate(d).replace(/-/g, "");
}
/** yyyymmdd string for an event date `daysAhead` from now. */
function fd(daysAhead: number): string {
  return yyyymmdd(offsetDate(daysAhead));
}
/** ISO (YYYY-MM-DD) for `daysAhead` from now. */
function fi(daysAhead: number): string {
  return isoDate(offsetDate(daysAhead));
}

beforeEach(() => {
  store.blocks = [];
  store.strBookings = [];
  store.leases = [];
  store.upserts = [];
  store.deletes = [];
  store.listings = [];
  store.settings = {};
  store.escalationResult = { id: "esc1", kind: "CALENDAR_SYNC_FAILED", status: "OPEN" };
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

// ─── SSRF guards ──────────────────────────────────────────────────────────────

describe("SSRF guards", () => {
  it("rejects non-HTTPS URLs", () => {
    expect(() => validateUrl("http://example.com/cal.ics")).toThrow(/HTTPS/);
  });
  it("accepts a valid HTTPS URL", () => {
    expect(validateUrl("https://airbnb.com/calendar/x.ics").hostname).toBe("airbnb.com");
  });
  it("flags private / blocked IPs", () => {
    expect(isBlockedIP("10.0.0.1")).toBe(true);
    expect(isBlockedIP("192.168.1.5")).toBe(true);
    expect(isBlockedIP("127.0.0.1")).toBe(true);
    expect(isBlockedIP("169.254.1.1")).toBe(true);
    expect(isBlockedIP("100.64.0.1")).toBe(true); // CGNAT
    expect(isBlockedIP("8.8.8.8")).toBe(false);
  });
  it("throws when a literal blocked IP is used as the host", async () => {
    await expect(validateIP("169.254.169.254")).rejects.toThrow(/not allowed/);
  });
});

// ─── Parsing ──────────────────────────────────────────────────────────────────

describe("parseICalData", () => {
  it("keeps Reserved events, skips 'Not available' host-blocks and past events by default", async () => {
    const body = ics(
      vevent("a", "20260810", "20260814", "Reserved"),
      vevent("b", "20260901", "20260905", "Airbnb (Not available)"),
      vevent("c", "20200101", "20200103", "Reserved"), // past
    );
    const events = await parseICalData(body, { today: "2026-07-03" });
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe("a");
    expect(events[0].startDate).toBe("2026-08-10");
    expect(events[0].endDate).toBe("2026-08-14"); // DTEND exclusive, stored as-is
  });

  it("still skips host-blocks when honorHostBlocks is explicitly false", async () => {
    const body = ics(vevent("b", "20260901", "20260905", "Airbnb (Not available)"));
    const events = await parseICalData(body, { today: "2026-07-03", honorHostBlocks: false });
    expect(events).toHaveLength(0);
  });

  it("keeps host-blocks with a normalized summary when honorHostBlocks is true", async () => {
    const body = ics(
      vevent("a", "20260810", "20260814", "Reserved"),
      vevent("b", "20260901", "20260905", "CLOSED - Not Available"),
    );
    const events = await parseICalData(body, { today: "2026-07-03", honorHostBlocks: true });
    expect(events).toHaveLength(2);
    const block = events.find((e) => e.externalId === "b");
    expect(block?.summary).toBe("Airbnb (Not available)");
    expect(block?.startDate).toBe("2026-09-01");
  });
});

describe("dedup helpers", () => {
  it("isGenericPlaceholder matches Airbnb block phrasings", () => {
    expect(isGenericPlaceholder("Reserved")).toBe(true);
    expect(isGenericPlaceholder("CLOSED - Not available")).toBe(true);
    expect(isGenericPlaceholder("Jane Doe")).toBe(false);
  });
  it("isGenericPlaceholder matches the normalized host-block summary", () => {
    expect(isGenericPlaceholder("Airbnb (Not available)")).toBe(true);
  });
  it("fuzzyNameMatch handles first+last equality", () => {
    expect(fuzzyNameMatch("Jane Doe", "jane doe")).toBe(true);
    expect(fuzzyNameMatch("Jane A Doe", "Jane Doe")).toBe(true);
    expect(fuzzyNameMatch("Jane Doe", "John Smith")).toBe(false);
  });
});

// ─── syncFeed diff logic ───────────────────────────────────────────────────────

describe("syncListing — idempotent create/update/remove + dedup", () => {
  const strListing: IcalListing = {
    kind: "property",
    propertyId: "p1",
    roomId: null,
    url: "https://airbnb.com/calendar/villa.ics",
    label: "Villa",
  };

  it("creates blocks for each Reserved event on first sync (keyed to the listing)", async () => {
    store.blocks = [];
    stubFetch(
      ics(
        vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 4), "Reserved"),
        vevent("b", fd(BASE_DAYS_AHEAD + 10), fd(BASE_DAYS_AHEAD + 12), "Reserved"),
      ),
    );
    const r = await syncListing(strListing);
    expect(r.ok).toBe(true);
    expect(r.parsed).toBe(2);
    expect(r.created).toBe(2);
    expect(r.updated).toBe(0);
    expect(r.removed).toBe(0);
    expect(store.upserts).toHaveLength(2);
    // Blocks carry the listing keys, no feedId.
    expect(store.upserts[0]).toMatchObject({ propertyId: "p1", roomId: null });
    expect(store.upserts[0]).not.toHaveProperty("feedId");
  });

  it("is idempotent — re-running the same calendar updates in place, creates 0", async () => {
    store.blocks = [
      {
        id: "blk_a",
        propertyId: "p1",
        roomId: null,
        externalId: "a",
        startDate: fi(BASE_DAYS_AHEAD),
        endDate: fi(BASE_DAYS_AHEAD + 4),
        lastSynced: new Date(),
      },
    ];
    stubFetch(ics(vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 4), "Reserved")));
    const r = await syncListing(strListing);
    expect(r.created).toBe(0);
    expect(r.updated).toBe(1);
    expect(r.removed).toBe(0);
  });

  it("removes a block whose event vanished from the calendar", async () => {
    store.blocks = [
      {
        id: "blk_gone",
        propertyId: "p1",
        roomId: null,
        externalId: "gone",
        startDate: fi(BASE_DAYS_AHEAD + 20),
        endDate: fi(BASE_DAYS_AHEAD + 22),
        lastSynced: new Date(Date.now() - 86400000),
      },
    ];
    stubFetch(ics(vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 4), "Reserved")));
    const r = await syncListing(strListing);
    expect(r.created).toBe(1);
    expect(r.removed).toBe(1);
    expect(store.deletes).toContain("blk_gone");
  });

  it("skips an event that duplicates a BNP direct booking (round-trip guard)", async () => {
    store.blocks = [];
    // A confirmed direct booking overlapping the 'Reserved' event → dedup.
    store.strBookings = [
      { checkIn: fi(BASE_DAYS_AHEAD + 1), checkOut: fi(BASE_DAYS_AHEAD + 3), status: "CONFIRMED" },
    ];
    stubFetch(ics(vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 4), "Reserved")));
    const r = await syncListing(strListing);
    expect(r.skippedDuplicates).toBe(1);
    expect(r.created).toBe(0);
    expect(store.upserts).toHaveLength(0);
  });

  it("still dedupes a host-block that exactly matches a direct booking's dates when honoring host blocks", async () => {
    store.blocks = [];
    store.strBookings = [
      { checkIn: fi(BASE_DAYS_AHEAD + 1), checkOut: fi(BASE_DAYS_AHEAD + 3), status: "CONFIRMED" },
    ];
    stubFetch(
      ics(vevent("a", fd(BASE_DAYS_AHEAD + 1), fd(BASE_DAYS_AHEAD + 3), "Airbnb (Not available)")),
    );
    const r = await syncListing(strListing, false, true);
    expect(r.parsed).toBe(1);
    expect(r.skippedDuplicates).toBe(1);
    expect(store.upserts).toHaveLength(0);
  });

  it("captures a fetch failure on the result (no throw; status is derived)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ status: 500, ok: false, headers: { get: () => null }, text: async () => "" })),
    );
    const r = await syncListing(strListing);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/HTTP 500/);
    expect(store.upserts).toHaveLength(0);
  });
});

// ─── syncAllListings — host-blocks are never synced + sync-status bookkeeping ─

describe("syncAllListings", () => {
  const listingA: IcalListing = {
    kind: "property",
    propertyId: "p1",
    roomId: null,
    url: "https://airbnb.com/calendar/a.ics",
    label: "Villa A",
  };
  const listingB: IcalListing = {
    kind: "room",
    propertyId: "p2",
    roomId: "r1",
    url: "https://airbnb.com/calendar/b.ics",
    label: "Room 1",
  };

  it("skips host-blocks (only confirmed 'Reserved' events block the calendar)", async () => {
    store.listings = [listingA];
    store.settings = {};
    stubFetchByUrl({
      [listingA.url]: ics(vevent("hb", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 2), "Not available")),
    });
    await syncAllListings(false);
    expect(store.upserts).toHaveLength(0);
  });

  it("ignores any stray legacy ical_honor_host_blocks setting value — host-blocks are always skipped", async () => {
    store.listings = [listingA];
    store.settings = { ical_honor_host_blocks: "true" };
    stubFetchByUrl({
      [listingA.url]: ics(vevent("hb", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 2), "Not available")),
    });
    await syncAllListings(false);
    expect(store.upserts).toHaveLength(0);
  });

  it("writes ical_last_sync_at and ical_last_sync_result after a run, including when one listing failed", async () => {
    store.listings = [listingA, listingB];
    stubFetchByUrl({
      [listingA.url]: ics(vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 2), "Reserved")),
      [listingB.url]: { fail: true },
    });
    const result = await syncAllListings(false);

    expect(result.ok).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);

    expect(store.settings.ical_last_sync_at).toBeDefined();
    expect(() => new Date(store.settings.ical_last_sync_at as string).toISOString()).not.toThrow();

    const parsed = JSON.parse(store.settings.ical_last_sync_result as string);
    expect(parsed.totalListings).toBe(2);
    expect(parsed.ok).toBe(1);
    expect(parsed.failed).toBe(1);
    expect(parsed.created).toBe(1);
    expect(parsed.listings).toHaveLength(2);
    const failedEntry = parsed.listings.find((l: any) => l.key === "room:r1");
    expect(failedEntry.ok).toBe(false);
    expect(failedEntry.error).toMatch(/HTTP 500/);
  });

  it("never throws out of the sync when the settings write itself fails", async () => {
    store.listings = [listingA];
    stubFetchByUrl({
      [listingA.url]: ics(vevent("a", fd(BASE_DAYS_AHEAD), fd(BASE_DAYS_AHEAD + 2), "Reserved")),
    });
    vi.mocked(storage.setSetting).mockRejectedValue(new Error("db down"));
    await expect(syncAllListings(false)).resolves.toMatchObject({ ok: 1, failed: 0 });
  });
});

// ─── checkCalendarSyncHealth ────────────────────────────────────────────────

describe("checkCalendarSyncHealth", () => {
  it("is stale and alerts when no sync has ever run", async () => {
    store.settings = {};
    const health = await checkCalendarSyncHealth(new Date());
    expect(health.stale).toBe(true);
    expect(health.alerted).toBe(true);
    expect(storage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        leaseId: null,
        bookingId: null,
        kind: "CALENDAR_SYNC_FAILED",
        severity: "MEDIUM",
      }),
    );
    expect(notifyAdmin).toHaveBeenCalledWith(
      expect.objectContaining({ subject: "Airbnb calendar sync problem" }),
    );
  });

  it("is stale when the last sync is older than 3 hours", async () => {
    const now = new Date("2026-09-02T12:00:00Z");
    store.settings = {
      ical_last_sync_at: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      ical_last_sync_result: JSON.stringify({ failed: 0, listings: [] }),
    };
    const health = await checkCalendarSyncHealth(now);
    expect(health.stale).toBe(true);
    expect(health.failed).toBe(false);
    expect(health.alerted).toBe(true);
  });

  it("is not stale within 3 hours, but alerts when the last result had failures", async () => {
    const now = new Date("2026-09-02T12:00:00Z");
    store.settings = {
      ical_last_sync_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      ical_last_sync_result: JSON.stringify({
        failed: 1,
        listings: [{ key: "property:p1", label: "Villa", ok: false, error: "HTTP 500" }],
      }),
    };
    const health = await checkCalendarSyncHealth(now);
    expect(health.stale).toBe(false);
    expect(health.failed).toBe(true);
    expect(health.alerted).toBe(true);
  });

  it("is healthy — recent sync, no failures — and does not alert", async () => {
    const now = new Date("2026-09-02T12:00:00Z");
    store.settings = {
      ical_last_sync_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      ical_last_sync_result: JSON.stringify({ failed: 0, listings: [] }),
    };
    const health = await checkCalendarSyncHealth(now);
    expect(health.stale).toBe(false);
    expect(health.failed).toBe(false);
    expect(health.alerted).toBe(false);
    expect(storage.raiseEscalationOnce).not.toHaveBeenCalled();
    expect(notifyAdmin).not.toHaveBeenCalled();
  });

  it("does not notify when raiseEscalationOnce dedupes (an OPEN escalation already exists)", async () => {
    store.settings = {};
    store.escalationResult = null;
    // 2026-09-03T02:30:00Z is still 2026-09-02 22:30 in New York — the
    // dedupe key (scheduleSeq) must use the HOTEL-LOCAL day, not the
    // process-local (UTC on Vercel) day, or this would key off 20260903.
    const now = new Date("2026-09-03T02:30:00Z");
    const health = await checkCalendarSyncHealth(now);
    expect(health.stale).toBe(true);
    expect(health.alerted).toBe(false);
    expect(storage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ scheduleSeq: 20260902 }),
    );
    expect(notifyAdmin).not.toHaveBeenCalled();
  });
});

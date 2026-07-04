// server/lib/icalSync.test.ts
// iCal sync: SSRF guards, parse (skip "Not available" + past), and the idempotent
// create/update/remove/dedup diff logic in syncListing against a mocked storage.
// The feed URL is per-listing (properties/rooms.airbnb_ical_url); node-ical is
// real (pure parse); the network is stubbed via global.fetch.

import { describe, it, expect, vi, beforeEach } from "vitest";

// syncListing reaches storage for blocks + dedup reads. Reset each test.
const store = {
  blocks: [] as any[],
  strBookings: [] as any[],
  leases: [] as any[],
  upserts: [] as any[],
  deletes: [] as string[],
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
  },
}));

import {
  parseICalData,
  validateUrl,
  validateIP,
  isBlockedIP,
  isGenericPlaceholder,
  fuzzyNameMatch,
  syncListing,
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

beforeEach(() => {
  store.blocks = [];
  store.strBookings = [];
  store.leases = [];
  store.upserts = [];
  store.deletes = [];
  vi.unstubAllGlobals();
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
  it("keeps Reserved events, skips 'Not available' host-blocks and past events", async () => {
    const body = ics(
      vevent("a", "20260810", "20260814", "Reserved"),
      vevent("b", "20260901", "20260905", "Airbnb (Not available)"),
      vevent("c", "20200101", "20200103", "Reserved"), // past
    );
    const events = await parseICalData(body, "2026-07-03");
    expect(events).toHaveLength(1);
    expect(events[0].externalId).toBe("a");
    expect(events[0].startDate).toBe("2026-08-10");
    expect(events[0].endDate).toBe("2026-08-14"); // DTEND exclusive, stored as-is
  });
});

describe("dedup helpers", () => {
  it("isGenericPlaceholder matches Airbnb block phrasings", () => {
    expect(isGenericPlaceholder("Reserved")).toBe(true);
    expect(isGenericPlaceholder("CLOSED - Not available")).toBe(true);
    expect(isGenericPlaceholder("Jane Doe")).toBe(false);
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
    stubFetch(ics(vevent("a", "20260810", "20260814", "Reserved"), vevent("b", "20260820", "20260822", "Reserved")));
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
      { id: "blk_a", propertyId: "p1", roomId: null, externalId: "a", startDate: "2026-08-10", endDate: "2026-08-14", lastSynced: new Date() },
    ];
    stubFetch(ics(vevent("a", "20260810", "20260814", "Reserved")));
    const r = await syncListing(strListing);
    expect(r.created).toBe(0);
    expect(r.updated).toBe(1);
    expect(r.removed).toBe(0);
  });

  it("removes a block whose event vanished from the calendar", async () => {
    store.blocks = [
      { id: "blk_gone", propertyId: "p1", roomId: null, externalId: "gone", startDate: "2026-09-01", endDate: "2026-09-03", lastSynced: new Date(Date.now() - 86400000) },
    ];
    stubFetch(ics(vevent("a", "20260810", "20260814", "Reserved")));
    const r = await syncListing(strListing);
    expect(r.created).toBe(1);
    expect(r.removed).toBe(1);
    expect(store.deletes).toContain("blk_gone");
  });

  it("skips an event that duplicates a BNP direct booking (round-trip guard)", async () => {
    store.blocks = [];
    // A confirmed direct booking overlapping the 'Reserved' event → dedup.
    store.strBookings = [{ checkIn: "2026-08-11", checkOut: "2026-08-13", status: "CONFIRMED" }];
    stubFetch(ics(vevent("a", "20260810", "20260814", "Reserved")));
    const r = await syncListing(strListing);
    expect(r.skippedDuplicates).toBe(1);
    expect(r.created).toBe(0);
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

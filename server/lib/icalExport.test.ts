// server/lib/icalExport.test.ts
// Outbound calendar feed: which rows become events (BNP-owned sources only —
// never external_bookings), date semantics (lease end is inclusive, booking
// checkout is half-open), the "Reserved"-only / no-PII body, RFC 5545 folding,
// and token -> feed gating (inactive / placeholder / wrong type => null).

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = {
  strBookings: [] as any[],
  colivingBookings: [] as any[],
  leases: [] as any[],
  propertyBlocks: [] as any[],
  roomBlocks: [] as any[],
  propertyByToken: undefined as any,
  roomByToken: undefined as any,
  property: undefined as any,
};

vi.mock("../storage", () => ({
  storage: {
    getStrBookingsForProperty: vi.fn(async () => store.strBookings),
    getColivingBookingsForRoom: vi.fn(async () => store.colivingBookings),
    getRoomBlockingLeasesForRoom: vi.fn(async () => store.leases),
    getManualBlocksForProperty: vi.fn(async () => store.propertyBlocks),
    getManualBlocksForRoom: vi.fn(async () => store.roomBlocks),
    getExternalBlocksForProperty: vi.fn(async () => []),
    getExternalBlocksForRoom: vi.fn(async () => []),
    getPropertyByExportToken: vi.fn(async () => store.propertyByToken),
    getRoomByExportToken: vi.fn(async () => store.roomByToken),
    getProperty: vi.fn(async () => store.property),
  },
}));

import { storage } from "../storage";
import { buildPropertyExportEvents, buildRoomExportEvents, renderIcs, getExportFeed } from "./icalExport";

const TODAY = "2026-09-28";
const NOW = new Date("2026-09-28T17:00:00Z");

beforeEach(() => {
  vi.clearAllMocks();
  store.strBookings = [];
  store.colivingBookings = [];
  store.leases = [];
  store.propertyBlocks = [];
  store.roomBlocks = [];
  store.propertyByToken = undefined;
  store.roomByToken = undefined;
  store.property = undefined;
});

describe("buildPropertyExportEvents", () => {
  it("emits bookings (half-open) and property manual blocks, sorted", async () => {
    store.strBookings = [
      { id: "b2", status: "CONFIRMED", checkIn: "2026-10-10", checkOut: "2026-10-12" },
      { id: "b1", status: "CONFIRMED", checkIn: "2026-10-01", checkOut: "2026-10-04" },
    ];
    store.propertyBlocks = [{ id: "m1", startDate: "2026-10-05", endDate: "2026-10-07" }];
    const events = await buildPropertyExportEvents("p1", TODAY);
    expect(events).toEqual([
      { uid: "booking-b1@beniceproperties.com", start: "2026-10-01", end: "2026-10-04" },
      { uid: "block-m1@beniceproperties.com", start: "2026-10-05", end: "2026-10-07" },
      { uid: "booking-b2@beniceproperties.com", start: "2026-10-10", end: "2026-10-12" },
    ]);
  });

  it("never reads Airbnb-imported blocks (no echo back to Airbnb)", async () => {
    store.strBookings = [{ id: "b1", status: "CONFIRMED", checkIn: "2026-10-01", checkOut: "2026-10-04" }];
    await buildPropertyExportEvents("p1", TODAY);
    expect(storage.getExternalBlocksForProperty).not.toHaveBeenCalled();
    expect(storage.getExternalBlocksForRoom).not.toHaveBeenCalled();
  });

  it("drops cancelled/conflict, open-ended, past, and zero-length rows", async () => {
    store.strBookings = [
      { id: "x1", status: "CANCELLED", checkIn: "2026-10-01", checkOut: "2026-10-04" },
      { id: "x2", status: "CONFLICT", checkIn: "2026-10-01", checkOut: "2026-10-04" },
      { id: "x3", status: "CONFIRMED", checkIn: "2026-10-01", checkOut: null },
      { id: "x4", status: "CONFIRMED", checkIn: "2026-09-01", checkOut: "2026-09-05" },
      { id: "x5", status: "CONFIRMED", checkIn: "2026-10-01", checkOut: "2026-10-01" },
      { id: "ok", status: "CONFIRMED", checkIn: "2026-09-27", checkOut: "2026-09-28" },
    ];
    const events = await buildPropertyExportEvents("p1", TODAY);
    expect(events.map((e) => e.uid)).toEqual(["booking-ok@beniceproperties.com"]);
  });
});

describe("buildRoomExportEvents", () => {
  it("bumps the inclusive lease end one day; bookings and blocks stay half-open", async () => {
    store.leases = [{ id: "L1", startDate: "2026-10-01", endDate: "2026-10-31" }];
    store.colivingBookings = [{ id: "b1", status: "CONFIRMED", checkIn: "2026-11-05", checkOut: "2026-11-12" }];
    store.roomBlocks = [{ id: "m1", startDate: "2026-12-01", endDate: "2026-12-03" }];
    const events = await buildRoomExportEvents("r1", TODAY);
    expect(events).toEqual([
      { uid: "lease-L1-r1@beniceproperties.com", start: "2026-10-01", end: "2026-11-01" },
      { uid: "booking-b1@beniceproperties.com", start: "2026-11-05", end: "2026-11-12" },
      { uid: "block-m1@beniceproperties.com", start: "2026-12-01", end: "2026-12-03" },
    ]);
    expect(storage.getExternalBlocksForRoom).not.toHaveBeenCalled();
  });

  it("keeps UIDs stable across builds", async () => {
    store.leases = [{ id: "L1", startDate: "2026-10-01", endDate: "2026-10-31" }];
    const a = await buildRoomExportEvents("r1", TODAY);
    const b = await buildRoomExportEvents("r1", TODAY);
    expect(a.map((e) => e.uid)).toEqual(b.map((e) => e.uid));
  });
});

describe("renderIcs", () => {
  const events = [{ uid: "lease-L1-r1@beniceproperties.com", start: "2026-10-01", end: "2026-11-01" }];

  it("renders a valid all-day calendar with CRLF line endings", () => {
    const ics = renderIcs("Old Bill Cook — Room 2", events, NOW);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("VERSION:2.0");
    expect(ics).toContain("DTSTAMP:20260928T170000Z");
    expect(ics).toContain("DTSTART;VALUE=DATE:20261001");
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics.replace(/\r\n/g, "").includes("\n")).toBe(false);
  });

  it("carries no guest data: every event summary is exactly Reserved", () => {
    const ics = renderIcs("Cal", events, NOW);
    const summaries = ics.split("\r\n").filter((l) => l.startsWith("SUMMARY"));
    expect(summaries).toEqual(["SUMMARY:Reserved"]);
    expect(ics).not.toContain("DESCRIPTION");
    expect(ics).not.toContain("ATTENDEE");
  });

  it("folds long lines at 75 octets and the fold unfolds back to the original", () => {
    const ics = renderIcs("Cal", events, NOW);
    for (const line of ics.split("\r\n")) {
      expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
    }
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("UID:lease-L1-r1@beniceproperties.com");
  });

  it("escapes the calendar name and folds multi-byte names without splitting a character", () => {
    const name = "Casa, Verde; Room \\ 1 — " + "é".repeat(60);
    const ics = renderIcs(name, [], NOW);
    const unfolded = ics.replace(/\r\n /g, "");
    expect(unfolded).toContain("X-WR-CALNAME:Casa\\, Verde\\; Room \\\\ 1 — " + "é".repeat(60));
    expect(ics).not.toContain("�");
  });

  it("renders an empty (but valid) calendar when there are no events", () => {
    const ics = renderIcs("Cal", [], NOW);
    expect(ics).not.toContain("BEGIN:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });
});

describe("getExportFeed", () => {
  const strProperty = { id: "p1", name: "The Retreat", type: "STR", active: true, isPlaceholder: false };
  const coProperty = { id: "p2", name: "Old Bill Cook", type: "COLIVING", active: true, isPlaceholder: false };

  it("returns null for an unknown or empty token", async () => {
    expect(await getExportFeed("nope", NOW)).toBeNull();
    expect(await getExportFeed("", NOW)).toBeNull();
  });

  it("serves an STR property's feed", async () => {
    store.propertyByToken = strProperty;
    store.strBookings = [{ id: "b1", status: "CONFIRMED", checkIn: "2026-10-01", checkOut: "2026-10-04" }];
    const ics = await getExportFeed("tok", NOW);
    expect(ics).toContain("UID:booking-b1@beniceproperties.com");
    expect(ics).toContain("X-WR-CALNAME:The Retreat");
  });

  it.each([
    ["inactive", { ...strProperty, active: false }],
    ["placeholder", { ...strProperty, isPlaceholder: true }],
    ["co-living (wrong type for a property feed)", { ...strProperty, type: "COLIVING" }],
    ["LTR", { ...strProperty, type: "LTR" }],
  ])("returns null for a %s property", async (_label, property) => {
    store.propertyByToken = property;
    expect(await getExportFeed("tok", NOW)).toBeNull();
  });

  it("serves a co-living room's feed", async () => {
    store.roomByToken = { id: "r1", propertyId: "p2", name: "Room 2" };
    store.property = coProperty;
    store.leases = [{ id: "L1", startDate: "2026-10-01", endDate: "2026-10-31" }];
    const ics = await getExportFeed("tok", NOW);
    expect(ics).toContain("DTEND;VALUE=DATE:20261101");
    expect(ics).toContain("Old Bill Cook");
  });

  it.each([
    ["missing parent", undefined],
    ["inactive parent", { ...coProperty, active: false }],
    ["placeholder parent", { ...coProperty, isPlaceholder: true }],
    ["STR parent (rooms only publish under co-living)", { ...coProperty, type: "STR" }],
  ])("returns null for a room with %s", async (_label, parent) => {
    store.roomByToken = { id: "r1", propertyId: "p2", name: "Room 2" };
    store.property = parent;
    expect(await getExportFeed("tok", NOW)).toBeNull();
  });
});

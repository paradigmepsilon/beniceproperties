// server/lib/lease.test.ts
// Phase 2 — co-living lease-quote builder. Uses a mocked storage layer so no
// database is required. Verifies the preview is shaped from the shared canonical
// generator, multi-room weekly rates are summed, dueToday = schedule_seq 1, and
// the validation guards (property type, room availability, term ceiling) fire.

import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock the storage module the builder imports. vi.mock is hoisted above
// imports, so the mock object must be created with vi.hoisted to be available. ---
const mockStorage = vi.hoisted(() => ({
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
  getExternalBlocksForRoom: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { buildLeaseQuote, LeaseError } from "./lease";

const COLIVING_PROP = {
  id: "prop-1",
  name: "Old Bill Cook",
  type: "COLIVING",
  active: true,
};

function room(id: string, name: string, weeklyRent: string, status = "AVAILABLE") {
  return { id, name, roomNumber: name.slice(-1), weeklyRent, status, propertyId: "prop-1" };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  // Default: no external (Airbnb/OTA) blocks. Individual tests override.
  mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
});

/** An external (Airbnb) block. `end` is the exclusive DTEND (checkout morning). */
function extBlock(startDate: string, endDate: string) {
  return { startDate, endDate };
}

describe("buildLeaseQuote — happy path", () => {
  it("builds a weekly schedule, summing multi-room weekly rent", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce(room("r1", "Room 1", "250.00"))
      .mockResolvedValueOnce(room("r2", "Room 2", "200.00"));

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1", "r2"],
      startDate: "2026-07-01",
      endDate: "2026-07-28", // 28 days, 4 weekly periods
      cadence: "WEEKLY",
    });

    expect(q.weeklyRateTotal).toBe(450); // 250 + 200
    expect(q.schedule).toHaveLength(4);
    expect(q.schedule.every((r) => r.amount === 450)).toBe(true);
    expect(q.schedule[0].dueOnBooking).toBe(true);
    expect(q.schedule[0].dueDate).toBe("2026-07-01");
    expect(q.dueToday).toBe(450);
    expect(q.totalLeaseValue).toBe(1800);
    expect(q.rooms.map((r) => r.name)).toEqual(["Room 1", "Room 2"]);
  });

  it("marks only the first installment as dueOnBooking", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-21",
      cadence: "WEEKLY",
    });
    expect(q.schedule.filter((r) => r.dueOnBooking)).toHaveLength(1);
    expect(q.schedule[0].dueOnBooking).toBe(true);
  });
});

describe("buildLeaseQuote — guards", () => {
  it("rejects a non-co-living property", async () => {
    mockStorage.getProperty.mockResolvedValue({ ...COLIVING_PROP, type: "STR" });
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toBeInstanceOf(LeaseError);
  });

  it("rejects an unavailable room", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00", "OCCUPIED"));
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toThrow(/no longer available/i);
  });

  it("still prices a stay even if the room range looks taken (overlap is a creation-time guard, not a quote-time one)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    // A stale DRAFT/pending lease (or the guest's own in-progress one) must not
    // break the price preview. createLease() is where overlap is actually enforced.
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      cadence: "WEEKLY",
    });
    expect(q.schedule.length).toBeGreaterThan(0);
    expect(q.dueToday).toBeGreaterThan(0);
  });

  it("rejects a term over 90 days", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-10-15", cadence: "WEEKLY" }),
    ).rejects.toThrow(/90 days/i);
  });

  it("rejects a room from a different property", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue({ ...room("r1", "Room 1", "250.00"), propertyId: "other" });
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
    ).rejects.toThrow(/not found in this property/i);
  });
});

describe("buildLeaseQuote — external (Airbnb) block guard", () => {
  // Unlike the intentional NON-guard on lease overlaps (a stale/own draft must
  // never block the preview), a synced OTA reservation MUST block the quote —
  // otherwise the guest can price + proceed on top of an Airbnb booking and we
  // double-book. This guard is external-blocks-only.

  it("rejects a range overlapping this room's Airbnb block (409)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    // Airbnb block Jul 4 → Jul 18 (DTEND exclusive). Guest asks Jul 7 → Jul 9.
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([extBlock("2026-07-04", "2026-07-18")]);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-07", endDate: "2026-07-09" }),
    ).rejects.toThrow(/booked for those dates on Airbnb/i);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-07", endDate: "2026-07-09" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("allows a stay that STARTS on the block's exclusive DTEND (same-day turnover is free)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    // Block Jul 11 → Jul 18 (DTEND Jul 18 exclusive = prior guest gone Jul 18
    // morning). A new stay checking in Jul 18 turns over same-day → free. This
    // mirrors isRoomAvailableForRange exactly: startDate < b.endDate is false.
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([extBlock("2026-07-11", "2026-07-18")]);
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-18", endDate: "2026-07-25",
    });
    expect(q.schedule.length).toBeGreaterThan(0);
    expect(q.dueToday).toBeGreaterThan(0);
  });

  it("rejects a stay whose inclusive end day is the block's check-in day (they collide)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    // Block starts Jul 18 (Airbnb guest arrives Jul 18). Co-living occupies its
    // end date inclusively, so a stay ending Jul 18 still holds Jul 18 → conflict.
    // b.startDate (Jul 18) <= input.endDate (Jul 18) is true.
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([extBlock("2026-07-18", "2026-07-25")]);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-11", endDate: "2026-07-18" }),
    ).rejects.toThrow(/booked for those dates on Airbnb/i);
  });

  it("allows a range fully clear of any Airbnb block", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([extBlock("2026-08-01", "2026-08-10")]);
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14",
    });
    expect(q.schedule.length).toBeGreaterThan(0);
  });

  it("does NOT block on a lease overlap — only external blocks matter at quote time", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    // Room looks taken by a lease (e.g. the guest's own draft) but has NO Airbnb
    // block → the quote must still render. (Companion to the guard: proves we
    // didn't reintroduce the false-block on lease overlaps.)
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14",
    });
    expect(q.schedule.length).toBeGreaterThan(0);
  });

  it("multi-room: blocks the whole quote if ANY selected room is Airbnb-booked", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce(room("r1", "Room 1", "250.00"))
      .mockResolvedValueOnce(room("r2", "Room 2", "200.00"));
    // r1 clear, r2 blocked for the requested range.
    mockStorage.getExternalBlocksForRoom
      .mockResolvedValueOnce([]) // r1
      .mockResolvedValueOnce([extBlock("2026-07-05", "2026-07-12")]); // r2
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1", "r2"], startDate: "2026-07-07", endDate: "2026-07-10" }),
    ).rejects.toThrow(/Room 2 is booked for those dates on Airbnb/i);
  });
});

// Phase 3 — auto tier selection by stay length (cadence is derived, not sent).
function tieredRoom(id: string, name: string, weekly: string, daily?: string, monthly?: string, deposit?: string) {
  return {
    id, name, roomNumber: name.slice(-1), status: "AVAILABLE", propertyId: "prop-1",
    weeklyRent: weekly, dailyRate: daily ?? null, monthlyRate: monthly ?? null,
    depositAmount: deposit ?? null,
  };
}

describe("buildLeaseQuote — auto tier by stay length", () => {
  it("a 28-day term uses the MONTHLY rate; cadence defaults to weekly, guest may pick monthly", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    // monthly 2240 → effectiveNightly 80. The rate TIER is monthly; the billing
    // CADENCE is the guest's choice, gated by term (28 days → weekly or monthly).
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2240"));

    // Default (no cadence sent) → shortest allowed = WEEKLY: 4 × $560.
    const wk = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28", // 28 days
    });
    expect(wk.allowedCadences).toEqual(["WEEKLY", "MONTHLY"]);
    expect(wk.cadence).toBe("WEEKLY");
    expect(wk.schedule.every((r) => r.amount === 560)).toBe(true); // 80 × 7
    expect(wk.totalLeaseValue).toBe(2240);

    // Guest picks MONTHLY → a single $2240 installment.
    const mo = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28", cadence: "MONTHLY",
    });
    expect(mo.cadence).toBe("MONTHLY");
    expect(mo.schedule).toHaveLength(1);
    expect(mo.schedule[0].amount).toBe(2240); // 80 × 28
    expect(mo.totalLeaseValue).toBe(2240);
  });

  it("rejects a cadence not allowed for the term (e.g. monthly on a 2-week stay)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2240"));
    await expect(
      buildLeaseQuote({
        propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "MONTHLY",
      }),
    ).rejects.toThrow(/monthly.*isn't available|isn't available for a/i);
  });

  it("a 7..27 day term uses the WEEKLY rate", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2240"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", // 14 days
    });
    expect(q.cadence).toBe("WEEKLY");
    expect(q.schedule.every((r) => r.amount === 560)).toBe(true); // 80 × 7
  });

  it("a sub-7 day term uses the DAILY rate, billed weekly", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2240"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-04", // 4 days
    });
    expect(q.cadence).toBe("WEEKLY"); // daily tier still bills weekly
    expect(q.dueToday).toBe(400); // 100 × 4 (one short period)
  });

  it("falls back to weekly when the monthly rate is missing", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560")); // only weekly set
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28", // 28 days → monthly requested
    });
    expect(q.cadence).toBe("WEEKLY"); // fell back
    expect(q.schedule.every((r) => r.amount === 560)).toBe(true);
  });

  it("legacy weekly-only listing bills identically to pre-Phase-3", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "250")); // weekly_rent only
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28",
    });
    expect(q.schedule).toHaveLength(4);
    expect(q.schedule.every((r) => r.amount === 250)).toBe(true);
    expect(q.totalLeaseValue).toBe(1000);
  });

  it("quote==charge invariant: totalLeaseValue equals the sum of persisted amounts", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "555", "95", "2100"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-08-09", // 40 days → monthly
    });
    const sum = Math.round(q.schedule.reduce((a, r) => a + r.amount, 0) * 100) / 100;
    expect(q.totalLeaseValue).toBe(sum);
    expect(q.dueToday).toBe(q.schedule[0].amount);
  });
});

describe("buildLeaseQuote — deposit + allowed cadences", () => {
  it("surfaces the refundable deposit (summed across rooms) separate from rent", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce(tieredRoom("r1", "Room 1", "250", undefined, undefined, "300"))
      .mockResolvedValueOnce(tieredRoom("r2", "Room 2", "200", undefined, undefined, "250"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1", "r2"], startDate: "2026-07-01", endDate: "2026-07-14",
    });
    expect(q.depositTotal).toBe(550); // 300 + 250, NOT counted in rent
    expect(q.totalLeaseValue).not.toBe(550);
  });

  it("gates allowed cadences by term length", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560"));
    const shortTerm = await buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14" }); // 14d
    expect(shortTerm.allowedCadences).toEqual(["WEEKLY"]);
    const longTerm = await buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-09-25" }); // ~87d
    expect(longTerm.allowedCadences).toEqual(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
  });
});

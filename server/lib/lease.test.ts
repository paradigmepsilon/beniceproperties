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
  getManualBlocksForRoom: vi.fn(),
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
  // Default: no external (Airbnb/OTA) or manual blocks. Individual tests override.
  mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
  mockStorage.getManualBlocksForRoom.mockResolvedValue([]);
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

  it("sums the per-room cleaning fee across rooms (0 when unset)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce({ ...room("r1", "Room 1", "250.00"), cleaningFee: "75.00" })
      .mockResolvedValueOnce({ ...room("r2", "Room 2", "200.00"), cleaningFee: "50.00" });

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1", "r2"],
      startDate: "2026-07-01",
      endDate: "2026-07-28",
      cadence: "WEEKLY",
    });

    expect(q.cleaningFeeTotal).toBe(125); // 75 + 50
    // The fee is a move-in charge, NOT part of the recurring rent schedule.
    expect(q.schedule.every((r) => r.amount === 450)).toBe(true);
    expect(q.totalLeaseValue).toBe(1800);
  });

  it("returns cleaningFeeTotal 0 when no room carries a fee", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));

    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      cadence: "WEEKLY",
    });

    expect(q.cleaningFeeTotal).toBe(0);
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

  it("rejects a room under HOLD, MAINTENANCE, or INACTIVE (ROOM_UNBOOKABLE_STATUSES)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);

    for (const status of ["HOLD", "MAINTENANCE", "INACTIVE"]) {
      mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00", status));
      await expect(
        buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY" }),
      ).rejects.toThrow(/no longer available/i);
    }
  });

  it("does NOT reject a room with status OCCUPIED — occupancy is derived from date overlaps, not the status flag", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00", "OCCUPIED"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      cadence: "WEEKLY",
    });
    expect(q.schedule.length).toBeGreaterThan(0);
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

  it("rejects a range overlapping this room's manual block (409, non-Airbnb message)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    mockStorage.getManualBlocksForRoom.mockResolvedValue([extBlock("2026-07-04", "2026-07-18")]);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-07", endDate: "2026-07-09" }),
    ).rejects.toThrow(/isn't available for those dates/i);
    await expect(
      buildLeaseQuote({ propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-07", endDate: "2026-07-09" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("allows a stay that STARTS on a manual block's exclusive end (same-day turnover is free)", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(room("r1", "Room 1", "250.00"));
    mockStorage.getManualBlocksForRoom.mockResolvedValue([extBlock("2026-07-11", "2026-07-18")]);
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-18", endDate: "2026-07-25",
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

describe("buildLeaseQuote — the guest's CADENCE picks the rate", () => {
  it("TOTAL DIFFERS by cadence: weekly bills weekly_rent, monthly bills monthly_rate", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    // weekly 560 → 80/night. monthly 2100 → 75/night. A REAL discount, so the
    // two cadences cannot coincidentally agree the way 560/2240 would.
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2100"));
    const term = { propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28" }; // 28 days

    // Default (no cadence sent) → shortest allowed = WEEKLY: 4 × $560.
    const wk = await buildLeaseQuote(term);
    expect(wk.allowedCadences).toEqual(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
    expect(wk.cadence).toBe("WEEKLY");
    expect(wk.periodDays).toBe(7);
    expect(wk.installmentAmount).toBe(560);
    expect(wk.schedule.every((r) => r.amount === 560)).toBe(true);
    expect(wk.totalLeaseValue).toBe(2240);

    // Guest picks MONTHLY → a single installment at the monthly rate itself.
    const mo = await buildLeaseQuote({ ...term, cadence: "MONTHLY" });
    expect(mo.cadence).toBe("MONTHLY");
    expect(mo.periodDays).toBe(28);
    expect(mo.installmentAmount).toBe(2100);
    expect(mo.schedule).toHaveLength(1);
    expect(mo.schedule[0].amount).toBe(2100);
    expect(mo.totalLeaseValue).toBe(2100);

    // THE headline behavior change: paying monthly costs less than paying weekly.
    expect(mo.totalLeaseValue).toBeLessThan(wk.totalLeaseValue);
  });

  it("BIWEEKLY bills 2 x weekly_rent — same total as WEEKLY, half as many payments", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560"));
    // Biweekly needs a 84+ day term. 2026-07-01 → 2026-09-22 is exactly 84.
    const term = { propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-09-22" };
    const wk = await buildLeaseQuote({ ...term, cadence: "WEEKLY" });
    const bi = await buildLeaseQuote({ ...term, cadence: "BIWEEKLY" });
    expect(bi.allowedCadences).toEqual(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
    expect(bi.installmentAmount).toBe(1120); // 2 × 560
    expect(bi.periodDays).toBe(14);
    expect(bi.schedule).toHaveLength(6);
    expect(wk.schedule).toHaveLength(12);
    expect(bi.totalLeaseValue).toBe(wk.totalLeaseValue);
  });

  it("MONTHLY tail cascades to weeks then days, as ONE combined final payment", async () => {
    // Owner example: Sep 15 -> Nov 5 is 52 days. After the month there is not
    // another month available, so the remainder bills at the weekly rate, then
    // the daily rate — collected as a single final payment so a guest who chose
    // MONTHLY still makes monthly payments.
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(
      tieredRoom("r1", "Room 1", "300", "43", "1200"), // wk 300 / daily 43 / mo 1200
    );
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"],
      startDate: "2026-09-15", endDate: "2026-11-05", cadence: "MONTHLY",
    });
    expect(q.termDays).toBe(52);
    expect(q.schedule).toHaveLength(2);
    expect(q.schedule[0]).toMatchObject({ seq: 1, amount: 1200, daysCovered: 28, prorated: false });
    // 3 weeks x 300 + 3 days x 43 = 900 + 129
    expect(q.schedule[1]).toMatchObject({ seq: 2, amount: 1029, daysCovered: 24, prorated: true });
    expect(q.totalLeaseValue).toBe(2229);
    expect(q.prorationNote).toMatch(/3 weeks \+ 3 days/);
  });

  it("WEEKLY bills whole weeks, with the overage at the daily rate", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "300", "43", "1200"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"],
      startDate: "2026-09-15", endDate: "2026-11-05", cadence: "WEEKLY",
    });
    expect(q.schedule).toHaveLength(8); // 7 full weeks + 1 combined tail
    expect(q.schedule.slice(0, 7).every((r) => r.amount === 300)).toBe(true);
    expect(q.schedule[7]).toMatchObject({ amount: 129, daysCovered: 3, prorated: true });
    expect(q.totalLeaseValue).toBe(2229);
  });

  it("BIWEEKLY uses its OWN rate, not 2 x weekly, when one is set", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue({
      ...tieredRoom("r1", "Room 1", "300", "43", "1200"),
      biweeklyRate: "580", // a real discount vs 2 x 300
    });
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"],
      startDate: "2026-09-15", endDate: "2026-11-05", cadence: "BIWEEKLY",
    });
    // 52 days = 3 biweeks (42d) + 1 week + 3 days
    expect(q.schedule).toHaveLength(4);
    expect(q.schedule.slice(0, 3).every((r) => r.amount === 580)).toBe(true);
    expect(q.schedule[3]).toMatchObject({ amount: 429, daysCovered: 10 }); // 300 + 3x43
    expect(q.totalLeaseValue).toBe(2169);
  });

  it("an unset biweekly rate still falls back to 2 x weekly", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "300", "43", "1200"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"],
      startDate: "2026-09-15", endDate: "2026-10-12", cadence: "BIWEEKLY", // 28 days
    });
    expect(q.installmentAmount).toBe(600); // 2 x 300
    expect(q.schedule).toHaveLength(2);
  });

  it("biweekly is now offered on any month-plus term, not just 84+ days", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "300", "43", "1200"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-09-15", endDate: "2026-10-12",
    });
    expect(q.termDays).toBe(28);
    expect(q.allowedCadences).toEqual(["WEEKLY", "BIWEEKLY", "MONTHLY"]);
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

  it("bills leftover whole days at rooms.daily_rate, not a pro-rata slice of the week", async () => {
    // Owner rule 2026-09-08: the cascade ends at the DAILY tier, and a day is a
    // whole billable day (check-in 4pm, checkout 11am — no fractional days).
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560", "100", "2240"));
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-04", // 4 days
    });
    expect(q.cadence).toBe("WEEKLY");
    expect(q.dueToday).toBe(400); // 4 × $100 daily, not 4 × (560/7)
  });

  it("MONTHLY with no monthly_rate falls back to 4 x weekly_rent", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560")); // only weekly set
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-07-28",
      cadence: "MONTHLY",
    });
    expect(q.cadence).toBe("MONTHLY");
    expect(q.periodDays).toBe(28);
    expect(q.installmentAmount).toBe(2240); // 4 × 560
    expect(q.schedule).toHaveLength(1);
    expect(q.totalLeaseValue).toBe(2240);
  });

  it("the fallback is price-neutral: no monthly_rate means cadence cannot change the total", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom.mockResolvedValue(tieredRoom("r1", "Room 1", "560")); // no monthly rate
    const term = { propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-08-09" }; // 40 days
    const wk = await buildLeaseQuote({ ...term, cadence: "WEEKLY" });
    const mo = await buildLeaseQuote({ ...term, cadence: "MONTHLY" });
    expect(mo.totalLeaseValue).toBe(wk.totalLeaseValue); // 4×560/28 === 560/7 exactly
    // ...but the SHAPE differs, which is the whole point of picking a cadence.
    expect(wk.schedule).toHaveLength(6);
    expect(mo.schedule).toHaveLength(2);
  });

  it("MULTI-ROOM MONTHLY: a room with no monthly_rate contributes 4 x ITS OWN weekly rent", async () => {
    mockStorage.getProperty.mockResolvedValue(COLIVING_PROP);
    mockStorage.getRoom
      .mockResolvedValueOnce(tieredRoom("r1", "Room 1", "560", undefined, "2100")) // 75/night
      .mockResolvedValueOnce(tieredRoom("r2", "Room 2", "280")); // no monthly → 40/night
    const q = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1", "r2"],
      startDate: "2026-07-01", endDate: "2026-07-28", cadence: "MONTHLY",
    });
    // 115/night × 28 = 3220. Summing only the rooms that HAVE a monthly rate
    // would yield 2100 and silently rent Room 2 for free.
    expect(q.installmentAmount).toBe(3220);
    expect(q.installmentAmount).not.toBe(2100);
    expect(q.totalLeaseValue).toBe(3220);
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
    expect(q.installmentAmount).toBe(q.schedule[0].amount); // full period === row 1

    // Same invariant at MONTHLY, on a rate that does not divide evenly.
    const mo = await buildLeaseQuote({
      propertyId: "prop-1", roomIds: ["r1"], startDate: "2026-07-01", endDate: "2026-08-09",
      cadence: "MONTHLY",
    });
    const moSum = Math.round(mo.schedule.reduce((a, r) => a + r.amount, 0) * 100) / 100;
    expect(mo.totalLeaseValue).toBe(moSum);
    expect(mo.installmentAmount).toBe(mo.schedule[0].amount);
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

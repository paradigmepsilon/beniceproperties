// server/lib/booking.test.ts
// Phase 3 — STR quote uses the auto-selected rate tier. buildQuote is pure given
// a ResolvedBooking, so we test it directly (no storage needed). The tier math
// itself is covered in shared/rateSelection.test.ts.

import { describe, it, expect, vi, beforeEach } from "vitest";

// booking.ts imports ../storage, which throws at import time without DATABASE_URL.
// buildQuote is pure (no storage); resolveBooking needs a few methods stubbed.
// vi.mock is hoisted above module init, so the mock object must come from
// vi.hoisted() (mirrors the pattern in lease.test.ts / leaseFlow.test.ts).
const mockStorage = vi.hoisted(() => ({
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
  getBookings: vi.fn(async () => []),
  getExternalBlocksForProperty: vi.fn(async () => []),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import {
  buildQuote,
  strBaseTotal,
  resolveBooking,
  BookingError,
  type ResolvedBooking,
} from "./booking";
import { calculateBreakdown } from "@shared/pricing";
import type { Property } from "@shared/schema";

// Minimal STR property fixture. Only the pricing fields strBaseTotal reads matter;
// the rest are cast away. Weekday fields default null (no per-weekday pricing).
function strProperty(over: Partial<Property>): Property {
  return {
    id: "p1",
    name: "Villa",
    type: "STR",
    basePrice: null,
    dailyRate: null,
    weeklyRate: null,
    monthlyRate: null,
    monPrice: null,
    tuePrice: null,
    wedPrice: null,
    thuPrice: null,
    friPrice: null,
    satPrice: null,
    sunPrice: null,
    ...over,
  } as Property;
}

function strResolved(over: Partial<ResolvedBooking>): ResolvedBooking {
  return {
    model: "STR",
    property: { id: "p1", name: "Villa", type: "STR" } as ResolvedBooking["property"],
    checkIn: "2026-07-01",
    checkOut: "2026-07-11",
    baseAmount: 800,
    cleaningFee: 0,
    nights: 10,
    rateTier: "WEEKLY",
    effectiveNightly: 80,
    ...over,
  };
}

describe("buildQuote — STR tier labelling + totals", () => {
  it("labels the stay line with the weekly tier and totals via calculateBreakdown", () => {
    const q = buildQuote(strResolved({}), "STRIPE");
    expect(q.dueNow.lines[0].label).toContain("weekly rate");
    expect(q.dueNow.lines[0].amount).toBe(800);
    const expected = calculateBreakdown({ baseAmount: 800, cleaningFee: 0, paymentMethod: "STRIPE" });
    expect(q.dueNow.total).toBe(expected.total); // surcharge still applies
  });

  it("monthly tier shows the monthly label", () => {
    const q = buildQuote(
      strResolved({ nights: 40, baseAmount: 3200, rateTier: "MONTHLY", effectiveNightly: 80 }),
      "ZELLE",
    );
    expect(q.dueNow.lines[0].label).toContain("monthly rate");
    expect(q.dueNow.total).toBe(3200); // no surcharge for ZELLE
  });

  it("daily tier shows no tier suffix", () => {
    const q = buildQuote(
      strResolved({ nights: 3, baseAmount: 300, rateTier: "DAILY", effectiveNightly: 100 }),
      "ZELLE",
    );
    expect(q.dueNow.lines[0].label).not.toContain("rate");
    expect(q.dueNow.lines[0].label).toContain("3 nights");
  });
});

describe("strBaseTotal — per-weekday pricing (DAILY tier only)", () => {
  // 2026-07-03 = Friday, +1 = Sat, +2 = Sun.
  const weekday = {
    monPrice: "120",
    tuePrice: "120",
    wedPrice: "120",
    thuPrice: "140",
    friPrice: "200",
    satPrice: "250",
    sunPrice: "140",
  };

  it("DAILY tier with weekday prices → sums each night's weekday price", () => {
    const r = strBaseTotal(
      strProperty({ basePrice: "100", ...weekday }),
      3, // Fri, Sat, Sun
      "2026-07-03",
    );
    expect(r.tier).toBe("DAILY");
    expect(r.baseAmount).toBe(590); // 200 + 250 + 140
    expect(r.effectiveNightly).toBeCloseTo(590 / 3, 2); // display average
  });

  it("DAILY tier with a null weekday falls back to dailyRate ?? basePrice for that night", () => {
    const r = strBaseTotal(
      strProperty({ dailyRate: "100", basePrice: "999", ...weekday, satPrice: null }),
      3,
      "2026-07-03",
    );
    // 200 (Fri) + 100 (Sat → dailyRate fallback) + 140 (Sun)
    expect(r.baseAmount).toBe(440);
  });

  it("DAILY tier with NO weekday prices → byte-identical to legacy nightly × n", () => {
    const r = strBaseTotal(strProperty({ dailyRate: "100" }), 3, "2026-07-03");
    expect(r.tier).toBe("DAILY");
    expect(r.baseAmount).toBe(300); // 100 × 3
    expect(r.effectiveNightly).toBe(100);
  });

  it("back-compat: only base_price set (no dailyRate, no weekday) → base_price × n", () => {
    const r = strBaseTotal(strProperty({ basePrice: "150" }), 3, "2026-07-03");
    expect(r.baseAmount).toBe(450); // 150 × 3
  });

  it("WEEKLY tier IGNORES weekday prices (scalar weekly rate)", () => {
    const r = strBaseTotal(
      strProperty({ weeklyRate: "560", ...weekday }), // weekday set but tier is WEEKLY
      10,
      "2026-07-03",
    );
    expect(r.tier).toBe("WEEKLY");
    expect(r.baseAmount).toBe(800); // (560 / 7) × 10, weekday prices not used
  });

  it("MONTHLY tier IGNORES weekday prices (scalar monthly rate)", () => {
    const r = strBaseTotal(
      strProperty({ monthlyRate: "2240", ...weekday }),
      40,
      "2026-07-03",
    );
    expect(r.tier).toBe("MONTHLY");
    expect(r.baseAmount).toBe(3200); // (2240 / 28) × 40
  });
});

describe("resolveBooking — co-living term gate (7–28 = booking, else rejected)", () => {
  const COLIVING = { id: "p2", name: "Old Bill Cook", type: "COLIVING", active: true } as never;
  const ROOM = {
    id: "r1",
    propertyId: "p2",
    name: "Room 2 - Garden",
    roomNumber: "2",
    status: "AVAILABLE",
    weeklyRent: "700",
    depositAmount: "500",
    dailyRate: null,
  } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getProperty.mockResolvedValue(COLIVING);
    mockStorage.getRoom.mockResolvedValue(ROOM);
    mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  });

  it("prices a 10-night stay as 1 week + 3 days (weekly/7 daily fallback)", async () => {
    // 2026-07-01 → 2026-07-11 = 10 nights (differenceInCalendarDays).
    const r = await resolveBooking({
      propertyId: "p2",
      roomId: "r1",
      checkIn: "2026-07-01",
      checkOut: "2026-07-11",
    });
    expect(r.model).toBe("COLIVING");
    expect(r.nights).toBe(10);
    expect(r.checkOut).toBe("2026-07-11");
    // 1 × 700 + 3 × (700/7 = 100) = 1000
    expect(r.baseAmount).toBe(1000);
    expect(r.shortStay).toMatchObject({ weeks: 1, remainderDays: 3 });
  });

  it("rejects a stay under the 7-night minimum", async () => {
    await expect(
      resolveBooking({ propertyId: "p2", roomId: "r1", checkIn: "2026-07-01", checkOut: "2026-07-06" }),
    ).rejects.toThrow(/7-night minimum/i);
  });

  it("rejects a stay over 28 nights (routes to the lease flow)", async () => {
    await expect(
      resolveBooking({ propertyId: "p2", roomId: "r1", checkIn: "2026-07-01", checkOut: "2026-08-15" }),
    ).rejects.toThrow(/lease/i);
  });

  it("rejects when the room is not free for the range", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    await expect(
      resolveBooking({ propertyId: "p2", roomId: "r1", checkIn: "2026-07-01", checkOut: "2026-07-11" }),
    ).rejects.toThrow(BookingError);
  });

  it("requires move-in and move-out dates", async () => {
    await expect(resolveBooking({ propertyId: "p2", roomId: "r1" })).rejects.toThrow(/dates/i);
  });

  it("reads the per-room cleaning fee onto the resolved short stay", async () => {
    mockStorage.getRoom.mockResolvedValue({ ...ROOM, cleaningFee: "75" } as never);
    const r = await resolveBooking({
      propertyId: "p2",
      roomId: "r1",
      checkIn: "2026-07-01",
      checkOut: "2026-07-11",
    });
    expect(r.cleaningFee).toBe(75);
  });
});

describe("buildQuote — co-living short stay (weeks + daily remainder, no recurring)", () => {
  function coResolved(over: Partial<ResolvedBooking>): ResolvedBooking {
    return {
      model: "COLIVING",
      property: { id: "p2", name: "Old Bill Cook", type: "COLIVING" } as ResolvedBooking["property"],
      room: { id: "r1", name: "Room 2", weeklyRent: "700" } as ResolvedBooking["room"],
      checkIn: "2026-07-01",
      checkOut: "2026-07-11",
      baseAmount: 1000,
      cleaningFee: 0,
      nights: 10,
      shortStay: { weeks: 1, remainderDays: 3, weeklyRate: 700, dailyRate: 100 },
      ...over,
    };
  }

  it("renders a week line + a day line and no recurring block", () => {
    const q = buildQuote(coResolved({}), "ZELLE");
    expect(q.model).toBe("COLIVING");
    expect(q.recurring).toBeUndefined();
    expect(q.dueNow.lines.some((l) => /1 week/.test(l.label))).toBe(true);
    expect(q.dueNow.lines.some((l) => /3 days/.test(l.label))).toBe(true);
    expect(q.dueNow.total).toBe(1000); // no surcharge for ZELLE
  });

  it("adds a cleaning-fee line and folds it into the total (like STR)", () => {
    const q = buildQuote(coResolved({ cleaningFee: 75 }), "ZELLE");
    const fee = q.dueNow.lines.find((l) => l.label === "Cleaning fee");
    expect(fee?.amount).toBe(75);
    // subtotal = base 1000 + cleaning 75; no surcharge for ZELLE.
    expect(q.dueNow.subtotal).toBe(1075);
    expect(q.dueNow.total).toBe(1075);
  });

  it("omits the cleaning-fee line when the fee is zero", () => {
    const q = buildQuote(coResolved({ cleaningFee: 0 }), "ZELLE");
    expect(q.dueNow.lines.some((l) => l.label === "Cleaning fee")).toBe(false);
    expect(q.dueNow.total).toBe(1000);
  });

  it("omits the day line when the stay is whole weeks", () => {
    const q = buildQuote(
      coResolved({ nights: 14, baseAmount: 1400, shortStay: { weeks: 2, remainderDays: 0, weeklyRate: 700, dailyRate: 100 } }),
      "ZELLE",
    );
    expect(q.dueNow.lines.filter((l) => /day/.test(l.label))).toHaveLength(0);
    expect(q.dueNow.total).toBe(1400);
  });

  it("adds the card surcharge for STRIPE", () => {
    const q = buildQuote(coResolved({}), "STRIPE");
    const expected = calculateBreakdown({ baseAmount: 1000, paymentMethod: "STRIPE" });
    expect(q.dueNow.total).toBe(expected.total);
    expect(q.dueNow.surcharge).toBeGreaterThan(0);
  });
});

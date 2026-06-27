// shared/leaseSchedule.test.ts
// Phase 1 — canonical co-living payment-schedule generator.
// Covers: first-payment-due-on-booking, each cadence's spacing + amount,
// multi-room amounts, day-prorated final installment, total = sum of rows,
// and the ≤ 90-day term ceiling.

import { describe, it, expect } from "vitest";
import { generateSchedule, inclusiveDays, ScheduleError } from "./leaseSchedule";

describe("inclusiveDays", () => {
  it("counts both endpoints", () => {
    expect(inclusiveDays("2026-07-01", "2026-07-01")).toBe(1);
    expect(inclusiveDays("2026-07-01", "2026-07-07")).toBe(7);
    expect(inclusiveDays("2026-07-01", "2026-07-28")).toBe(28);
  });
});

describe("generateSchedule — first payment due on booking", () => {
  it("row 1 is always due on the start/booking date for every cadence", () => {
    for (const cadence of ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const) {
      const s = generateSchedule({
        startDate: "2026-07-01",
        endDate: "2026-07-28",
        cadence,
        weeklyRate: 250,
        roomCount: 1,
      });
      expect(s.installments[0].seq).toBe(1);
      expect(s.installments[0].dueDate).toBe("2026-07-01");
    }
  });
});

describe("generateSchedule — WEEKLY", () => {
  it("one payment every 7 days, each = weeklyRate × rooms", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-28", // 28 inclusive days → 4 weekly periods
      cadence: "WEEKLY",
      weeklyRate: 250,
      roomCount: 1,
    });
    expect(s.installments.map((i) => i.dueDate)).toEqual([
      "2026-07-01",
      "2026-07-08",
      "2026-07-15",
      "2026-07-22",
    ]);
    expect(s.installments.every((i) => i.amount === 250)).toBe(true);
    expect(s.installments.every((i) => !i.prorated)).toBe(true);
    expect(s.totalLeaseValue).toBe(1000);
  });
});

describe("generateSchedule — BIWEEKLY", () => {
  it("every 14 days, each = weeklyRate × 2 × rooms", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-28", // 28 days → 2 biweekly periods
      cadence: "BIWEEKLY",
      weeklyRate: 250,
      roomCount: 1,
    });
    expect(s.installments.map((i) => i.dueDate)).toEqual(["2026-07-01", "2026-07-15"]);
    expect(s.installments.every((i) => i.amount === 500)).toBe(true);
    expect(s.totalLeaseValue).toBe(1000);
  });
});

describe("generateSchedule — MONTHLY", () => {
  it("every 28 days, each = weeklyRate × 4 × rooms; first month due on booking", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-28", // exactly one 28-day period
      cadence: "MONTHLY",
      weeklyRate: 250,
      roomCount: 1,
    });
    expect(s.installments).toHaveLength(1);
    expect(s.installments[0].dueDate).toBe("2026-07-01");
    expect(s.installments[0].amount).toBe(1000); // 250 × 4
    expect(s.totalLeaseValue).toBe(1000);
  });
});

describe("generateSchedule — multi-room", () => {
  it("multiplies the installment by room count", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-14", // 14 days → 2 weekly periods
      cadence: "WEEKLY",
      weeklyRate: 200,
      roomCount: 3,
    });
    expect(s.installments.every((i) => i.amount === 600)).toBe(true); // 200 × 3
    expect(s.totalLeaseValue).toBe(1200);
  });
});

describe("generateSchedule — proration of the final installment", () => {
  it("day-prorates the trailing partial period and notes it", () => {
    // 35 inclusive days, WEEKLY: 5 full weeks would be 35 days exactly → no
    // proration. Use 31 days to force a 3-day tail (4 full weeks + 3 days).
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-31", // 31 inclusive days
      cadence: "WEEKLY",
      weeklyRate: 280, // perDay = 280/7 = 40
      roomCount: 1,
    });
    // 4 full weekly periods (28 days) + 3-day prorated tail.
    expect(s.installments).toHaveLength(5);
    const tail = s.installments[4];
    expect(tail.prorated).toBe(true);
    expect(tail.daysCovered).toBe(3);
    expect(tail.amount).toBe(120); // 40 × 3
    expect(s.totalLeaseValue).toBe(280 * 4 + 120);
    expect(s.prorationNote).toMatch(/prorated/i);
    expect(s.prorationNote).toMatch(/booking date/i);
  });

  it("emits a no-proration note when the term divides evenly", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-07-14",
      cadence: "WEEKLY",
      weeklyRate: 250,
      roomCount: 1,
    });
    expect(s.installments.some((i) => i.prorated)).toBe(false);
    expect(s.prorationNote).toMatch(/no proration/i);
  });
});

describe("generateSchedule — invariants & guards", () => {
  it("totalLeaseValue always equals the sum of installment amounts", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-08-20", // 51 days, biweekly → mixed full + prorated
      cadence: "BIWEEKLY",
      weeklyRate: 333,
      roomCount: 2,
    });
    const sum = Math.round(s.installments.reduce((a, i) => a + i.amount, 0) * 100) / 100;
    expect(s.totalLeaseValue).toBe(sum);
  });

  it("rejects a term over the 90-day ceiling", () => {
    expect(() =>
      generateSchedule({
        startDate: "2026-07-01",
        endDate: "2026-10-15", // > 90 inclusive days
        cadence: "WEEKLY",
        weeklyRate: 250,
        roomCount: 1,
      }),
    ).toThrow(ScheduleError);
  });

  it("rejects end before start, non-positive rate, and zero rooms", () => {
    expect(() =>
      generateSchedule({ startDate: "2026-07-10", endDate: "2026-07-01", cadence: "WEEKLY", weeklyRate: 250, roomCount: 1 }),
    ).toThrow(ScheduleError);
    expect(() =>
      generateSchedule({ startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY", weeklyRate: 0, roomCount: 1 }),
    ).toThrow(ScheduleError);
    expect(() =>
      generateSchedule({ startDate: "2026-07-01", endDate: "2026-07-14", cadence: "WEEKLY", weeklyRate: 250, roomCount: 0 }),
    ).toThrow(ScheduleError);
  });

  it("allows exactly 90 days", () => {
    const s = generateSchedule({
      startDate: "2026-07-01",
      endDate: "2026-09-28", // 90 inclusive days
      cadence: "WEEKLY",
      weeklyRate: 250,
      roomCount: 1,
    });
    expect(s.totalDays).toBe(90);
    expect(s.installments.length).toBeGreaterThan(0);
  });
});

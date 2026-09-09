import { describe, it, expect, vi, afterEach } from "vitest";
import { todayIso, addDaysIso, daysUntil } from "./dates";

afterEach(() => vi.useRealTimers());

describe("todayIso", () => {
  it("returns the New York calendar day, not the UTC day", () => {
    // 2026-09-03T02:30Z is still Sep 2 in New York (EDT, UTC-4).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T02:30:00Z"));
    expect(todayIso()).toBe("2026-09-02");
  });
});

describe("addDaysIso", () => {
  it("adds calendar days without timezone drift", () => {
    expect(addDaysIso("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysIso("2026-03-08", 1)).toBe("2026-03-09"); // DST start weekend
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("daysUntil", () => {
  it("counts forward, backward, and same-day", () => {
    expect(daysUntil("2026-10-03", "2026-10-01")).toBe(2);
    expect(daysUntil("2026-10-01", "2026-10-01")).toBe(0);
    expect(daysUntil("2026-09-29", "2026-10-01")).toBe(-2);
  });

  it("crosses month and year boundaries", () => {
    expect(daysUntil("2026-10-01", "2026-09-30")).toBe(1);
    expect(daysUntil("2027-01-01", "2026-12-31")).toBe(1);
  });

  // Both DST transitions. The arithmetic is pinned to T00:00:00Z precisely so a
  // 23- or 25-hour civil day still rounds to one whole day — a reminder job that
  // drifted here would fire on the wrong date twice a year.
  it("is unaffected by DST transitions", () => {
    expect(daysUntil("2026-11-02", "2026-11-01")).toBe(1); // DST ends
    expect(daysUntil("2026-03-09", "2026-03-08")).toBe(1); // DST begins
    expect(daysUntil("2026-03-15", "2026-03-01")).toBe(14); // spans the change
  });

  it("agrees with addDaysIso in both directions", () => {
    for (const n of [-30, -1, 0, 1, 2, 14, 90]) {
      expect(daysUntil(addDaysIso("2026-06-15", n), "2026-06-15")).toBe(n);
    }
  });
});

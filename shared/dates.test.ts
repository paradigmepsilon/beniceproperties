import { describe, it, expect, vi, afterEach } from "vitest";
import { todayIso, addDaysIso } from "./dates";

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

import { describe, it, expect, vi, afterEach } from "vitest";
import {
  todayIso,
  addDaysIso,
  daysUntil,
  friendlyDate,
  hotelHour,
  earliestMoveInIso,
  isMoveInAllowed,
  moveInTooEarlyMessage,
  CHECK_IN_HOUR_ET,
} from "./dates";

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

describe("friendlyDate", () => {
  it("formats a guest-readable date with no hour count", () => {
    expect(friendlyDate("2026-10-02")).toBe("Friday 2 October");
  });

  // Noon-UTC anchoring is what keeps this stable: a T00:00:00Z anchor would
  // render the PREVIOUS day in any timezone west of UTC.
  it("never drifts a day", () => {
    expect(friendlyDate("2026-03-08")).toBe("Sunday 8 March");
    expect(friendlyDate("2026-01-01")).toBe("Thursday 1 January");
  });
});

describe("hotelHour", () => {
  it("returns the New York hour, not the UTC hour", () => {
    // 19:59Z in EDT (UTC-4) is 15:59 in New York.
    expect(hotelHour(new Date("2026-09-27T19:59:00Z"))).toBe(15);
    expect(hotelHour(new Date("2026-09-27T20:01:00Z"))).toBe(16);
  });

  // Some ICU builds render midnight as "24" under the h24 cycle rather than
  // "00". An off-by-24 here would make every midnight booking look like 4pm
  // had passed, silently pushing move-in to tomorrow.
  it("reports midnight as 0, never 24", () => {
    expect(hotelHour(new Date("2026-09-27T04:30:00Z"))).toBe(0);
  });
});

describe("earliestMoveInIso", () => {
  it("allows today right up to check-in, and tomorrow after it", () => {
    expect(CHECK_IN_HOUR_ET).toBe(16);
    // 15:59 ET — check-in has not passed, so today is still bookable.
    expect(earliestMoveInIso(new Date("2026-09-27T19:59:00Z"))).toBe("2026-09-27");
    // 16:01 ET — check-in has passed; the earliest we can take is tomorrow.
    expect(earliestMoveInIso(new Date("2026-09-27T20:01:00Z"))).toBe("2026-09-28");
  });

  // The whole point of resolving the offset per-instant instead of hardcoding
  // -4 or -5: the SAME UTC wall time one day apart lands on opposite sides of
  // 4pm, and gives opposite answers. A fixed offset gets one of these wrong.
  it("is correct across the DST fall-back", () => {
    // Oct 31 is EDT (UTC-4) → 16:30 ET → check-in passed → tomorrow.
    expect(earliestMoveInIso(new Date("2026-10-31T20:30:00Z"))).toBe("2026-11-01");
    // Nov 1 is EST (UTC-5) → 15:30 ET → still today.
    expect(earliestMoveInIso(new Date("2026-11-01T20:30:00Z"))).toBe("2026-11-01");
  });

  it("is correct on the spring-forward day", () => {
    // Mar 8 after 2am local is EDT (UTC-4) → 16:30 ET → tomorrow.
    expect(earliestMoveInIso(new Date("2026-03-08T20:30:00Z"))).toBe("2026-03-09");
  });

  it("agrees with todayIso and addDaysIso", () => {
    for (const iso of ["2026-09-27T19:59:00Z", "2026-11-01T20:30:00Z"]) {
      const now = new Date(iso);
      expect(earliestMoveInIso(now)).toBe(todayIso(now));
    }
    for (const iso of ["2026-09-27T20:01:00Z", "2026-10-31T20:30:00Z"]) {
      const now = new Date(iso);
      expect(earliestMoveInIso(now)).toBe(addDaysIso(todayIso(now), 1));
    }
  });
});

describe("isMoveInAllowed", () => {
  it("accepts the earliest permitted date and everything after it", () => {
    const beforeCutoff = new Date("2026-09-27T19:59:00Z"); // 15:59 ET
    expect(isMoveInAllowed("2026-09-27", beforeCutoff)).toBe(true);
    expect(isMoveInAllowed("2026-09-28", beforeCutoff)).toBe(true);
    expect(isMoveInAllowed("2026-12-01", beforeCutoff)).toBe(true);
  });

  it("rejects today once check-in has passed", () => {
    const afterCutoff = new Date("2026-09-27T20:01:00Z"); // 16:01 ET
    expect(isMoveInAllowed("2026-09-27", afterCutoff)).toBe(false);
    expect(isMoveInAllowed("2026-09-28", afterCutoff)).toBe(true);
  });

  // The hole this closes: every booking and lease write path currently accepts
  // a move-in date in the past.
  it("rejects a past date at every hour of the day", () => {
    for (const h of [0, 3, 9, 15, 16, 17, 23]) {
      const now = new Date(`2026-09-27T${String(h).padStart(2, "0")}:30:00Z`);
      expect(isMoveInAllowed("2026-09-26", now)).toBe(false);
      expect(isMoveInAllowed("2025-01-01", now)).toBe(false);
    }
  });
});

describe("moveInTooEarlyMessage", () => {
  it("names the earliest date we can take", () => {
    const msg = moveInTooEarlyMessage(new Date("2026-09-27T20:01:00Z"));
    expect(msg).toContain("Monday 28 September");
  });

  // This is a policy, not an availability fact. Saying or implying the dates
  // are taken would be untrue, and would send the guest hunting for other dates
  // when the real fix is picking a later move-in.
  it("never implies the dates are unavailable", () => {
    const msg = moveInTooEarlyMessage(new Date("2026-09-27T20:01:00Z")).toLowerCase();
    for (const word of ["unavailable", "booked", "taken", "sold out", "not available"]) {
      expect(msg).not.toContain(word);
    }
  });

  // The repo-wide rule: 24 is the only hour figure any guest message may state,
  // because the production cron runs daily. 4pm is a clock time, not a duration.
  it("states no hour count", () => {
    const msg = moveInTooEarlyMessage(new Date("2026-09-27T20:01:00Z"));
    expect(msg).not.toMatch(/\d+\s*hours?/i);
  });
});

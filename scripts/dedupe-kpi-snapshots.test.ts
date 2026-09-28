// scripts/dedupe-kpi-snapshots.test.ts
// planDedupe decides which historical rows get deleted, so it is pinned here
// rather than trusted to a script that needs a database to exercise. The
// script itself never runs from a test — the isDirectRun guard keeps importing
// it side-effect free.

import { describe, it, expect } from "vitest";
import { planDedupe } from "./dedupe-kpi-snapshots.mjs";

const row = (over: Record<string, unknown>) => ({
  id: "x",
  snapshot_date: "2026-09-15",
  created_at: "2026-09-15T10:00:00Z",
  pushed_to_uo: false,
  pushed_at: null,
  rooms_occupied: 5,
  occupancy_pct: "83.33",
  ...over,
});

describe("planDedupe — choosing the survivor", () => {
  it("keeps the newest computation of the day", () => {
    const plan = planDedupe([
      row({ id: "early", created_at: "2026-09-15T01:00:00Z", rooms_occupied: 4 }),
      row({ id: "late", created_at: "2026-09-15T23:00:00Z", rooms_occupied: 5 }),
      row({ id: "mid", created_at: "2026-09-15T12:00:00Z", rooms_occupied: 4 }),
    ]);
    expect(plan).toHaveLength(1);
    expect(plan[0].keep.id).toBe("late");
    expect(plan[0].dropIds.sort()).toEqual(["early", "mid"]);
    expect(plan[0].duplicates).toBe(2);
  });

  it("leaves a date that already has exactly one row alone", () => {
    const plan = planDedupe([row({ id: "only" })]);
    expect(plan[0].duplicates).toBe(0);
    expect(plan[0].dropIds).toEqual([]);
    expect(plan[0].patch).toBeNull();
  });

  it("groups per date and never merges across dates", () => {
    const plan = planDedupe([
      row({ id: "a", snapshot_date: "2026-09-15" }),
      row({ id: "b", snapshot_date: "2026-09-15", created_at: "2026-09-15T20:00:00Z" }),
      row({ id: "c", snapshot_date: "2026-09-16" }),
    ]);
    expect(plan.map((p) => p.date)).toEqual(["2026-09-15", "2026-09-16"]);
    expect(plan[0].duplicates).toBe(1);
    expect(plan[1].duplicates).toBe(0);
  });

  it("is deterministic when created_at ties", () => {
    const rows = [row({ id: "bbb" }), row({ id: "aaa" })];
    expect(planDedupe(rows)[0].keep.id).toBe("aaa");
    expect(planDedupe([...rows].reverse())[0].keep.id).toBe("aaa");
  });

  it("handles a Date object for snapshot_date, as the driver returns", () => {
    const plan = planDedupe([row({ snapshot_date: new Date("2026-09-15T00:00:00Z") })]);
    expect(plan[0].date).toBe("2026-09-15");
  });
});

describe("planDedupe — preserving the record of a push to Unified Ops", () => {
  it("carries pushed state onto a survivor that was never pushed itself", () => {
    // The deleted row is the one UO saw. Losing that would make it look like
    // the date was never pushed.
    const plan = planDedupe([
      row({ id: "pushed", created_at: "2026-09-15T01:00:00Z", pushed_to_uo: true, pushed_at: "2026-09-15T02:00:00Z" }),
      row({ id: "newest", created_at: "2026-09-15T23:00:00Z" }),
    ]);
    expect(plan[0].keep.id).toBe("newest");
    expect(plan[0].patch).toMatchObject({ pushedToUo: true });
    expect(plan[0].patch.pushedAt.toISOString()).toBe("2026-09-15T02:00:00.000Z");
  });

  it("keeps the EARLIEST push time — when UO first saw the date", () => {
    const plan = planDedupe([
      row({ id: "first", created_at: "2026-09-15T01:00:00Z", pushed_to_uo: true, pushed_at: "2026-09-15T02:00:00Z" }),
      row({ id: "later", created_at: "2026-09-15T20:00:00Z", pushed_to_uo: true, pushed_at: "2026-09-15T21:00:00Z" }),
    ]);
    expect(plan[0].keep.id).toBe("later");
    expect(plan[0].patch.pushedAt.toISOString()).toBe("2026-09-15T02:00:00.000Z");
  });

  it("needs no patch when the survivor already holds the earliest push", () => {
    const plan = planDedupe([
      row({ id: "keep", created_at: "2026-09-15T23:00:00Z", pushed_to_uo: true, pushed_at: "2026-09-15T02:00:00Z" }),
      row({ id: "drop", created_at: "2026-09-15T01:00:00Z" }),
    ]);
    expect(plan[0].keep.id).toBe("keep");
    expect(plan[0].patch).toBeNull();
  });

  it("does not invent a push when nothing for that date was ever pushed", () => {
    const plan = planDedupe([
      row({ id: "a", created_at: "2026-09-15T01:00:00Z" }),
      row({ id: "b", created_at: "2026-09-15T02:00:00Z" }),
    ]);
    expect(plan[0].patch).toBeNull();
  });

  it("ignores a row flagged pushed but carrying no timestamp", () => {
    const plan = planDedupe([
      row({ id: "bogus", created_at: "2026-09-15T01:00:00Z", pushed_to_uo: true, pushed_at: null }),
      row({ id: "newest", created_at: "2026-09-15T23:00:00Z" }),
    ]);
    expect(plan[0].patch).toBeNull();
  });
});

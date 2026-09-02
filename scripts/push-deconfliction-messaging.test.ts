// scripts/push-deconfliction-messaging.test.ts
// The push script runs against the live Neon database and is never executed by
// a test, so its DDL is pinned by reading the source. Two properties matter:
//
//   ADDITIVE + IDEMPOTENT — re-running must be a no-op. Every statement carries
//   an IF NOT EXISTS / IF EXISTS guard, and constraints are added inside a
//   `DO $$ … IF NOT EXISTS (SELECT 1 FROM pg_constraint …)` block (Postgres has
//   no ADD CONSTRAINT IF NOT EXISTS).
//
//   SCOPED ROWS — `guest_messages.lease_id` and `lifecycle_events.lease_id`
//   became nullable so a short-stay booking can own a thread. Without a CHECK,
//   a row with BOTH ids null is writable and then unreachable by every thread,
//   portal, and dedupe lookup.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const src = readFileSync(new URL("./push-deconfliction-messaging.mjs", import.meta.url), "utf8");

/** The `DO $$ … END $$` block that guards a named constraint, if present. */
function guardedBlockFor(constraint: string): string | null {
  const blocks = src.split("`DO $$").slice(1);
  const hit = blocks.find((b) => b.includes(constraint));
  return hit ? hit.split("END $$")[0] : null;
}

describe("scope CHECK constraints", () => {
  it.each([
    ["guest_messages_scope_chk", "guest_messages"],
    ["lifecycle_events_scope_chk", "lifecycle_events"],
  ])("adds %s so a row can never be orphaned from both a lease and a booking", (name, table) => {
    const block = guardedBlockFor(name);
    expect(block).not.toBeNull();
    expect(block).toContain(`FROM pg_constraint WHERE conname = '${name}'`);
    expect(block).toContain(`ALTER TABLE ${table} ADD CONSTRAINT ${name}`);
    expect(block).toContain("CHECK (lease_id IS NOT NULL OR booking_id IS NOT NULL)");
  });

  it("adds them the same idempotent way as the exclusion constraints", () => {
    for (const name of [
      "guest_messages_scope_chk",
      "lifecycle_events_scope_chk",
      "bookings_room_no_overlap",
      "bookings_str_no_overlap",
    ]) {
      expect(guardedBlockFor(name)).toContain("IF NOT EXISTS (SELECT 1 FROM pg_constraint");
    }
  });

  it("never drops, truncates, or deletes anything", () => {
    expect(src).not.toMatch(/\bDROP\s+(TABLE|COLUMN|CONSTRAINT|INDEX)\b/i);
    expect(src).not.toMatch(/\bTRUNCATE\b/i);
    expect(src).not.toMatch(/\bDELETE\s+FROM\b/i);
  });
});

describe("seeded settings", () => {
  it("seeds the guest auto-notification key the app actually reads", () => {
    // Cross-checked against shared/schema.ts's GUEST_AUTO_NOTIFICATIONS_SETTING
    // in server/lib/lifecycle.test.ts.
    expect(src).toContain("VALUES ('guest_auto_notifications', 'true') ON CONFLICT (key) DO NOTHING");
  });
});

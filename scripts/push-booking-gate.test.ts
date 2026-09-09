// scripts/push-booking-gate.test.ts
// The push script runs against the live Neon database and is never executed by a
// test, so its DDL is pinned by reading the source instead. Two properties have
// to hold, and both are load-bearing:
//
//   ADDITIVE — the CLAUDE.md floor forbids a destructive migration without a
//   prior export. This script must therefore contain no DROP, no TRUNCATE, no
//   DELETE, and no ALTER of an existing object. It is also why the gate reuses
//   CANCELLED for a declined booking rather than adding a non-blocking status:
//   a new non-blocking status would force DROP CONSTRAINT / ADD CONSTRAINT on
//   the live bookings exclusion constraints — an ACCESS EXCLUSIVE lock, a full
//   validating scan, and a window with no double-booking guard at all.
//
//   IDEMPOTENT — the migration is run by a human against production, possibly
//   twice. Every statement carries IF NOT EXISTS.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";

const src = readFileSync(new URL("./push-booking-gate.mjs", import.meta.url), "utf8");

/** The DDL statements, without the surrounding prose. */
const statements = src
  .split("const statements = [")[1]
  .split("\n];")[0]
  .split("`")
  .filter((chunk) => /^\s*(CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|TRUNCATE)\b/i.test(chunk));

describe("the migration is ADDITIVE", () => {
  it("contains no destructive verb anywhere in the file", () => {
    // Checked over the WHOLE source, not just the statements, so a destructive
    // statement smuggled into a helper is caught too.
    for (const verb of ["DROP ", "TRUNCATE", "DELETE FROM"]) {
      expect(src.toUpperCase()).not.toContain(verb);
    }
  });

  it("never alters an existing table or column", () => {
    for (const stmt of statements) {
      expect(stmt.toUpperCase()).not.toMatch(/\bALTER\s+TABLE\b/);
    }
  });

  it("only creates tables and indexes", () => {
    expect(statements.length).toBeGreaterThan(0);
    for (const stmt of statements) {
      expect(stmt.trim().toUpperCase()).toMatch(/^CREATE (TABLE|UNIQUE INDEX|INDEX)/);
    }
  });
});

describe("the migration is IDEMPOTENT", () => {
  it("guards every single statement with IF NOT EXISTS", () => {
    for (const stmt of statements) {
      expect(stmt.toUpperCase(), stmt.slice(0, 60)).toContain("IF NOT EXISTS");
    }
  });

  it("asserts pre- and post-state so a partial apply is visible", () => {
    expect(src).toContain("pre-state:");
    expect(src).toContain("post-state FAILED");
    expect(src).toContain("process.exit(1)");
  });
});

describe("the objects the app depends on", () => {
  it.each(["booking_gate", "payment_refunds", "property_access_info", "room_access_info"])(
    "creates %s",
    (table) => {
      expect(src).toContain(`CREATE TABLE IF NOT EXISTS "${table}"`);
      expect(src).toContain(`"${table}"`);
    },
  );

  // The token IS the credential for the guest's document page. A duplicate would
  // hand one guest another guest's licence upload form.
  it("makes the gate token unique", () => {
    expect(src).toContain(
      `CREATE UNIQUE INDEX IF NOT EXISTS "booking_gate_token_uidx" ON "booking_gate" ("gate_token")`,
    );
  });

  // The structural guarantee that one Stripe refund is recorded exactly once,
  // however many times the daily sweep retries past the 24h idempotency window.
  it("makes the Stripe refund id unique", () => {
    expect(src).toContain(
      `CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_stripe_uidx" ON "payment_refunds" ("stripe_refund_id")`,
    );
  });

  it("indexes the columns the daily sweep and the admin queue scan", () => {
    expect(src).toContain(`"booking_gate_deadline_idx" ON "booking_gate" ("docs_deadline_at")`);
    expect(src).toContain(`"booking_gate_verif_idx" ON "booking_gate" ("verification_status")`);
  });

  it("gives booking_gate a PRIMARY KEY on booking_id, so one gate per booking is a DB guarantee", () => {
    expect(src).toMatch(/"booking_id"\s+varchar\s+PRIMARY KEY/);
  });

  it("defaults both jsonb access-info columns to an empty object, never null", () => {
    const jsonbDefaults = src.match(/"info" jsonb NOT NULL DEFAULT '\{\}'::jsonb/g) ?? [];
    expect(jsonbDefaults).toHaveLength(2);
  });
});

describe("what the migration deliberately does NOT do", () => {
  // PENDING_APPROVAL and REFUNDED are new VALUES in plain text columns with no
  // CHECK constraint, so they need no DDL. If someone ever adds a CHECK to
  // bookings.status this test is the reminder that the migration must change too.
  it("adds no DDL for the new status values (both columns are unconstrained text)", () => {
    // Scoped to the STATEMENTS: the file's header comment explains why these
    // values need no migration, and that prose is the point, not a violation.
    for (const stmt of statements) {
      expect(stmt).not.toContain("PENDING_APPROVAL");
      expect(stmt).not.toContain("REFUNDED");
      expect(stmt.toUpperCase()).not.toContain("ADD CONSTRAINT");
    }
  });

  it("does not touch the deconfliction exclusion constraints", () => {
    expect(src).not.toContain("bookings_room_no_overlap");
    expect(src).not.toContain("bookings_str_no_overlap");
  });
});

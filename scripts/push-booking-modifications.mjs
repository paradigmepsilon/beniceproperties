// scripts/push-booking-modifications.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE, ADDITIVE migration for UO booking edits. Creates
// ONE new table and touches no existing one:
//
//   booking_modifications — one row per admin edit made from Unified Ops (date
//                           change, price override, lease payment-plan change),
//                           and the idempotency anchor for the money it moves.
//
// Every statement is CREATE ... IF NOT EXISTS. Running it twice is a no-op, and
// it never drops, alters, or deletes anything — the CLAUDE.md additive floor.
// Mirrors scripts/push-booking-gate.mjs, including its pre/post-state assertions.
//
//   Run: node scripts/push-booking-modifications.mjs
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the Neon branch first.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

const EXPECTED_TABLES = ["booking_modifications"];

const statements = [
  `CREATE TABLE IF NOT EXISTS "booking_modifications" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "booking_id" varchar,
    "lease_id" varchar,
    "kind" text NOT NULL,
    "before" jsonb NOT NULL,
    "after" jsonb NOT NULL,
    "old_total" numeric(12, 2) NOT NULL,
    "new_total" numeric(12, 2) NOT NULL,
    "paid_net" numeric(12, 2) NOT NULL,
    "delta" numeric(12, 2) NOT NULL,
    "reason" text,
    "refund_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "uo_invoice_id" text,
    "actor" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "booking_modifications_booking_idx" ON "booking_modifications" ("booking_id")`,
  `CREATE INDEX IF NOT EXISTS "booking_modifications_lease_idx" ON "booking_modifications" ("lease_id")`,
];

async function presentTables() {
  const rows = await db.execute(
    raw.raw(
      `SELECT table_name FROM information_schema.tables
       WHERE table_name = ANY(ARRAY[${EXPECTED_TABLES.map((t) => `'${t}'`).join(",")}])`,
    ),
  );
  return (rows.rows ?? rows).map((r) => r.table_name);
}

async function run() {
  const pre = await presentTables();
  console.log(`pre-state: ${pre.length}/${EXPECTED_TABLES.length} tables present`);

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }

  const post = await presentTables();
  const missing = EXPECTED_TABLES.filter((t) => !post.includes(t));
  if (missing.length) {
    console.error(`post-state FAILED — missing tables: [${missing.join(", ")}]`);
    process.exit(1);
  }
  console.log(`\npost-state: all ${EXPECTED_TABLES.length} tables present.`);
  console.log("Booking-modifications schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

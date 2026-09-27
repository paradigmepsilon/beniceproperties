// scripts/push-listing-interest.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE additive migration for the listing_interest table
// — the conversion path for a PLACEHOLDER listing. Adds a single standalone
// table:
//   - listing_interest (id, property_id, room_id, name, email, phone, move_in,
//     message, created_at)
//
// A placeholder listing renders publicly but can never be booked (see
// shared/placeholder.ts and the guards in server/lib/booking.ts and
// server/lib/lease.ts), so this is what it produces instead of a checkout.
// Kept separate from ltr_inquiries on purpose: that is a real lead pipeline and
// speculative demand does not belong in it.
//
// CREATE TABLE IF NOT EXISTS, so running it twice is a no-op and it NEVER drops
// or alters anything. Mirrors scripts/push-ltr-inquiries.mjs — same reason it
// exists instead of `drizzle-kit push` (push prompts to disambiguate new-column
// vs rename, which fails in a non-TTY shell). No UNIQUE constraint: these are
// append-only leads (a person may ask twice). Additive-only per the CLAUDE.md
// floor — a brand-new empty table, so no migration backup is required.
//
//   Run: node scripts/push-listing-interest.mjs
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// Each entry is a single DDL statement (neon http driver runs one at a time).
const statements = [
  `CREATE TABLE IF NOT EXISTS "listing_interest" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "property_id" text,
    "room_id" text,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "move_in" text,
    "message" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
];

async function tableExists() {
  const rows = await db.execute(
    raw.raw(`SELECT 1 FROM information_schema.tables WHERE table_name = 'listing_interest'`),
  );
  return (rows.rows ?? rows).length > 0;
}

async function run() {
  // Pre-state (documented rigor: prove we're not mid-partial-migration).
  const pre = await tableExists();
  console.log(`pre-state: listing_interest table ${pre ? "present" : "absent"}`);

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }

  // Post-state (prove the table now exists).
  const post = await tableExists();
  if (!post) {
    console.error("post-state FAILED — listing_interest table is still absent");
    process.exit(1);
  }
  console.log("\npost-state: listing_interest table present.");
  console.log("Listing-interest schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });

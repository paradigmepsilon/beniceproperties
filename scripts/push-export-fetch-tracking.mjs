// scripts/push-export-fetch-tracking.mjs
// Add properties/rooms.export_last_fetched_at — the timestamp icalExport.ts
// stamps on every successful outbound-feed render, used to infer whether
// Airbnb is actively pulling a listing's calendar (see
// server/lib/calendarSyncStatus.ts). Additive + idempotent (ADD COLUMN IF NOT
// EXISTS), nullable, no default — so the destructive-migration backup floor
// does not apply. Same idempotent-DDL pattern as the other scripts/push-*.mjs
// (NOT drizzle-kit, which prompts interactively and fails in a non-TTY shell).
//
// RUN THIS BEFORE DEPLOYING the code that reads/writes the column: drizzle
// selects every column, so a deploy ahead of the migration breaks all
// property/room queries.
//
//   node scripts/push-export-fetch-tracking.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "export_last_fetched_at" timestamp`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "export_last_fetched_at" timestamp`,
];

for (const [i, stmt] of statements.entries()) {
  try {
    await db.execute(sql.raw(stmt));
    console.log(`[${i + 1}/${statements.length}] OK  ${stmt.slice(0, 70).replace(/\s+/g, " ")}...`);
  } catch (err) {
    console.error(`[${i + 1}/${statements.length}] FAIL`, err.message);
    process.exit(1);
  }
}
console.log("\nexport_last_fetched_at columns applied (null is the expected, correct value for every existing row — it means Airbnb hasn't fetched that listing's feed yet).");

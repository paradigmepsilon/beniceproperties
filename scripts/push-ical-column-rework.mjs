// scripts/push-ical-column-rework.mjs
// Repoint Airbnb-iCal storage from the (retired) external_calendar_feeds table to
// the per-listing airbnb_ical_url column on properties/rooms (the single source
// of truth, also managed from Unified-Ops). Idempotent, run against the live BNP
// Neon DB via the app's own connection. Both affected tables were EMPTY when this
// ran (external_calendar_feeds = 0 rows, external_bookings = 0 rows), so the
// column drop + table drop lose no data. Same idempotent-DDL pattern the repo
// uses elsewhere (NOT drizzle-kit). Re-running is a safe no-op.
//
//   node scripts/push-ical-column-rework.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  // 1. Additive column adds (already physically present — harmless no-op).
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "airbnb_ical_url" text`,
  `ALTER TABLE "rooms"      ADD COLUMN IF NOT EXISTS "airbnb_ical_url" text`,
  // 2. Rekey external_bookings: drop the feed FK + feed indexes + feed_id column,
  //    add the new (listing, external_id) idempotency indexes.
  `ALTER TABLE "external_bookings" DROP CONSTRAINT IF EXISTS "external_bookings_feed_id_external_calendar_feeds_id_fk"`,
  `DROP INDEX IF EXISTS "ext_bookings_feed_external_idx"`,
  `DROP INDEX IF EXISTS "ext_bookings_feed_idx"`,
  `ALTER TABLE "external_bookings" DROP COLUMN IF EXISTS "feed_id"`,
  `CREATE INDEX IF NOT EXISTS "ext_bookings_property_external_idx" ON "external_bookings" ("property_id","external_id")`,
  `CREATE INDEX IF NOT EXISTS "ext_bookings_room_external_idx" ON "external_bookings" ("room_id","external_id")`,
  // 3. Drop the retired duplicate feeds table (its FKs to properties/rooms drop with it).
  `DROP TABLE IF EXISTS "external_calendar_feeds"`,
];

for (const [i, stmt] of statements.entries()) {
  try {
    await db.execute(sql.raw(stmt));
    console.log(`[${i + 1}/${statements.length}] OK  ${stmt.slice(0, 60).replace(/\s+/g, " ")}...`);
  } catch (err) {
    console.error(`[${i + 1}/${statements.length}] FAIL`, err.message);
    process.exit(1);
  }
}
console.log("\nical-column rework applied.");

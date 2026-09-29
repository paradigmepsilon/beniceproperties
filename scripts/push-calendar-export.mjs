// scripts/push-calendar-export.mjs
// Add the per-listing outbound-calendar secret token (properties/rooms.export_token).
// Additive + idempotent (ADD COLUMN IF NOT EXISTS / CREATE UNIQUE INDEX IF NOT EXISTS);
// no DROP, so the destructive-migration backup floor does not apply. The DEFAULT is
// volatile (gen_random_uuid), so Postgres fills every EXISTING row with its own value
// at ALTER time. Same idempotent-DDL pattern as the other scripts/push-*.mjs (NOT
// drizzle-kit, which prompts interactively and fails in a non-TTY shell).
//
// RUN THIS BEFORE DEPLOYING the code that reads the column: drizzle selects every
// column, so a deploy ahead of the migration breaks all property/room queries.
//
//   node scripts/push-calendar-export.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "export_token" text DEFAULT gen_random_uuid()::text`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "export_token" text DEFAULT gen_random_uuid()::text`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "properties_export_token_idx" ON "properties" ("export_token")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "rooms_export_token_idx" ON "rooms" ("export_token")`,
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

// Sanity: no listing may be left without a token (would 404 its feed forever).
const missing = await db.execute(sql.raw(
  `SELECT (SELECT count(*) FROM properties WHERE export_token IS NULL) AS properties_missing,
          (SELECT count(*) FROM rooms WHERE export_token IS NULL) AS rooms_missing`,
));
console.log("\nrows missing a token:", JSON.stringify(missing.rows?.[0] ?? missing));
console.log("calendar export token columns applied.");

// scripts/push-biweekly-rate.mjs
// Add the biweekly rate tier to properties (STR) and rooms (co-living).
// Owner rule 2026-09-08: biweekly is a priced tier set per property/room, not a
// derived 2 x weekly. Nullable — an unset biweekly rate falls back to 2 x weekly
// exactly as before, so this is a no-op for existing pricing until a rate is set.
// Additive + idempotent (ADD COLUMN IF NOT EXISTS), same pattern as
// scripts/push-ltr-pricing.mjs. Re-running is a safe no-op.
//
//   node scripts/push-biweekly-rate.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "biweekly_rate" numeric(10,2)`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "biweekly_rate" numeric(10,2)`,
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
console.log("biweekly_rate columns present on properties + rooms.");

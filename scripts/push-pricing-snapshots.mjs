// scripts/push-pricing-snapshots.mjs
// Add the two pricing-term snapshot columns to leases (2026-09-08). The late fee
// per day and the card surcharge rate became admin-editable app_settings; each
// lease freezes the values in force when it was created so a later edit never
// changes a signed agreement. Nullable — existing leases read null and fall back
// to the current setting. Additive + idempotent (ADD COLUMN IF NOT EXISTS), same
// pattern as scripts/push-biweekly-rate.mjs. Re-running is a safe no-op.
//
// RUN BEFORE deploying the BNP build that reads these columns:
//   node scripts/push-pricing-snapshots.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "late_fee_per_day_snapshot" numeric(10,2)`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "card_surcharge_rate_snapshot" numeric(6,4)`,
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
console.log("pricing snapshot columns present on leases.");

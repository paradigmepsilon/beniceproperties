// scripts/push-ltr-pricing.mjs
// Add the LTR down-payment column to properties. LTR listings are inquiry-only;
// their two prices are monthly_rate (existing) + down_payment (this column),
// managed from Unified-Ops. Additive + idempotent (ADD COLUMN IF NOT EXISTS),
// run against the live BNP Neon DB via the app's own connection. Same idempotent-
// DDL pattern the repo uses elsewhere (NOT drizzle-kit, which prompts interactively
// and fails in a non-TTY shell). Re-running is a safe no-op.
//
//   node scripts/push-ltr-pricing.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  // One-time move-in amount for LTR properties. Nullable — STR/COLIVING never set it.
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "down_payment" numeric(10,2)`,
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
console.log("\nLTR pricing column applied.");

// scripts/push-room-cleaning-fee.mjs
// Add the per-room cleaning fee and its lease-time snapshot. Mirrors the existing
// STR properties.cleaning_fee. Additive + idempotent (ADD COLUMN IF NOT EXISTS),
// run against the live BNP Neon DB via the app's own connection. Same idempotent-
// DDL pattern the repo uses elsewhere (NOT drizzle-kit, which prompts interactively
// and fails in a non-TTY shell). Re-running is a safe no-op.
//
//   node scripts/push-room-cleaning-fee.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  // Per-room cleaning fee (selectable per room). Mirrors properties.cleaning_fee.
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "cleaning_fee" numeric(10,2) DEFAULT '0'`,
  // Lease-time snapshot of the summed room cleaning fee (frozen at booking, like
  // deposit_amount_snapshot) plus its charge-tracking columns. Non-refundable,
  // charged as its own CLEANING_FEE PaymentIntent at move-in.
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "cleaning_fee_snapshot" numeric(10,2) DEFAULT '0'`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "cleaning_fee_status" text NOT NULL DEFAULT 'PENDING'`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "cleaning_fee_stripe_payment_intent_id" text`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "cleaning_fee_paid_at" timestamp`,
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
console.log("\nroom cleaning fee columns applied.");

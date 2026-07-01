// scripts/push-verification-schema.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE additive migration for tenant identity verification
// (Phase 6.5). Adds:
//   - six verification columns on "leases" (verification_status + license/review
//     metadata) — the license IMAGE lives in R2; only its object key is stored.
//   - the "vehicles" table (one row per lease; parking identification).
//
// Every statement is ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS, so
// running it twice is a no-op and it NEVER drops or alters an existing column.
// Mirrors scripts/push-lease-schema.mjs — same reason it exists instead of
// `drizzle-kit push` (push prompts to disambiguate new-column vs rename, which
// fails in a non-TTY shell). Additive-only per the CLAUDE.md floor.
//
//   Run: node scripts/push-verification-schema.mjs
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the Neon test branch first.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// Each entry is a single DDL statement (neon http driver runs one at a time).
const statements = [
  // --- verification columns on leases (additive) ---
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "verification_status" text NOT NULL DEFAULT 'NOT_SUBMITTED'`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "license_r2_key" text`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "license_uploaded_at" timestamp`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "verification_reviewed_at" timestamp`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "verification_reviewed_by" text`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "verification_rejection_reason" text`,

  // --- vehicles (one row per lease) ---
  `CREATE TABLE IF NOT EXISTS "vehicles" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "has_vehicle" boolean NOT NULL DEFAULT true,
    "make" text,
    "model" text,
    "year" integer,
    "color" text,
    "plate" text,
    "plate_state" text,
    "photo_r2_key" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "vehicles_lease_idx" ON "vehicles" ("lease_id")`,
];

// Columns/tables this migration is responsible for — used for pre/post checks.
const EXPECTED_LEASE_COLUMNS = [
  "verification_status",
  "license_r2_key",
  "license_uploaded_at",
  "verification_reviewed_at",
  "verification_reviewed_by",
  "verification_rejection_reason",
];

async function leaseVerificationColumns() {
  const rows = await db.execute(
    raw.raw(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'leases' AND column_name = ANY(ARRAY[${EXPECTED_LEASE_COLUMNS.map(
         (c) => `'${c}'`,
       ).join(",")}])`,
    ),
  );
  return (rows.rows ?? rows).map((r) => r.column_name);
}

async function vehiclesExists() {
  const rows = await db.execute(
    raw.raw(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'vehicles'`,
    ),
  );
  return (rows.rows ?? rows).length > 0;
}

async function run() {
  // Pre-state (documented rigor: prove we're not mid-partial-migration).
  const preCols = await leaseVerificationColumns();
  const preVehicles = await vehiclesExists();
  console.log(
    `pre-state: leases has ${preCols.length}/${EXPECTED_LEASE_COLUMNS.length} verification columns; vehicles table ${preVehicles ? "present" : "absent"}`,
  );

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }

  // Post-state (prove every expected object now exists).
  const postCols = await leaseVerificationColumns();
  const postVehicles = await vehiclesExists();
  const missing = EXPECTED_LEASE_COLUMNS.filter((c) => !postCols.includes(c));
  if (missing.length || !postVehicles) {
    console.error(
      `post-state FAILED — missing columns: [${missing.join(", ")}], vehicles: ${postVehicles}`,
    );
    process.exit(1);
  }
  console.log(
    `\npost-state: all ${EXPECTED_LEASE_COLUMNS.length} verification columns + vehicles table present.`,
  );
  console.log("Verification schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });

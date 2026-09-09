// scripts/push-booking-gate.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE, ADDITIVE migration for the short-stay approval
// gate. Creates four NEW tables and touches no existing one:
//
//   booking_gate         — 1:1 with bookings: e-signature, licence, admin
//                          decision, door code, deadline, extension ordinal.
//   payment_refunds      — one row per Stripe refund, UNIQUE on the refund id.
//   property_access_info — wifi / directions / parking / entry code (jsonb).
//   room_access_info     — how to find the room once inside (jsonb).
//
// WHY NOTHING IS ALTERED. `bookings.status` gains the value 'PENDING_APPROVAL'
// and `payments.status` gains 'REFUNDED', but both are plain `text` columns with
// no CHECK constraint, so those are VALUE changes needing no DDL. And the
// deconfliction exclusion constraints read `status NOT IN
// ('CANCELLED','CONFLICT')`, so a new status blocks dates automatically — which
// is exactly the behaviour a paid-but-unapproved booking needs.
//
// Every statement is CREATE ... IF NOT EXISTS. Running it twice is a no-op, and
// it never drops, alters, or deletes anything — the CLAUDE.md additive floor.
// Mirrors scripts/push-verification-schema.mjs, including its pre/post-state
// assertions, and exists instead of `drizzle-kit push` because push prompts to
// disambiguate new-column-vs-rename and that fails in a non-TTY shell.
//
//   Run: node scripts/push-booking-gate.mjs
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

const EXPECTED_TABLES = [
  "booking_gate",
  "payment_refunds",
  "property_access_info",
  "room_access_info",
];

// One DDL statement per entry (the neon http driver runs them one at a time).
const statements = [
  `CREATE TABLE IF NOT EXISTS "booking_gate" (
    "booking_id" varchar PRIMARY KEY NOT NULL,
    "gate_token" text NOT NULL,
    "docs_deadline_at" timestamp,
    "agreement_signed_name" text,
    "agreement_signed_at" timestamp,
    "agreement_signed_ip" text,
    "agreement_document_url" text,
    "agreement_document_html" text,
    "verification_status" text NOT NULL DEFAULT 'NOT_SUBMITTED',
    "license_r2_key" text,
    "license_uploaded_at" timestamp,
    "verification_reviewed_at" timestamp,
    "verification_reviewed_by" text,
    "verification_rejection_reason" text,
    "approved_at" timestamp,
    "approved_by" text,
    "name_matches_ack" boolean NOT NULL DEFAULT false,
    "door_code" text,
    "fix_requested_at" timestamp,
    "fix_requested_by" text,
    "fix_requested_reason" text,
    "fix_request_count" integer NOT NULL DEFAULT 0,
    "cancel_reason" text,
    "cancelled_by" text,
    "original_check_out" date,
    "extension_count" integer NOT NULL DEFAULT 0,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  // The token IS the credential for the guest's document page, so it must be
  // unique — a collision would hand one guest another's licence upload form.
  `CREATE UNIQUE INDEX IF NOT EXISTS "booking_gate_token_uidx" ON "booking_gate" ("gate_token")`,
  // The ghost sweep scans on the deadline every day.
  `CREATE INDEX IF NOT EXISTS "booking_gate_deadline_idx" ON "booking_gate" ("docs_deadline_at")`,
  // The admin approval queue filters on this.
  `CREATE INDEX IF NOT EXISTS "booking_gate_verif_idx" ON "booking_gate" ("verification_status")`,

  `CREATE TABLE IF NOT EXISTS "payment_refunds" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "payment_id" varchar NOT NULL,
    "booking_id" varchar,
    "lease_id" varchar,
    "stripe_refund_id" text NOT NULL,
    "stripe_payment_intent_id" text NOT NULL,
    "amount" numeric(10, 2) NOT NULL,
    "kind" text NOT NULL,
    "reason" text,
    "actor" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  // The structural guarantee that one Stripe refund is recorded exactly once,
  // however many times a daily sweep retries past the 24h idempotency window.
  `CREATE UNIQUE INDEX IF NOT EXISTS "payment_refunds_stripe_uidx" ON "payment_refunds" ("stripe_refund_id")`,
  `CREATE INDEX IF NOT EXISTS "payment_refunds_payment_idx" ON "payment_refunds" ("payment_id")`,
  `CREATE INDEX IF NOT EXISTS "payment_refunds_booking_idx" ON "payment_refunds" ("booking_id")`,

  `CREATE TABLE IF NOT EXISTS "property_access_info" (
    "property_id" varchar PRIMARY KEY NOT NULL,
    "info" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "updated_by" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS "room_access_info" (
    "room_id" varchar PRIMARY KEY NOT NULL,
    "info" jsonb NOT NULL DEFAULT '{}'::jsonb,
    "updated_by" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
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
  // Pre-state: prove we are not resuming a half-applied migration.
  const pre = await presentTables();
  console.log(
    `pre-state: ${pre.length}/${EXPECTED_TABLES.length} gate tables present${
      pre.length ? ` (${pre.join(", ")})` : ""
    }`,
  );

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }

  // Post-state: prove every expected object now exists.
  const post = await presentTables();
  const missing = EXPECTED_TABLES.filter((t) => !post.includes(t));
  if (missing.length) {
    console.error(`post-state FAILED — missing tables: [${missing.join(", ")}]`);
    process.exit(1);
  }
  console.log(`\npost-state: all ${EXPECTED_TABLES.length} gate tables present.`);
  console.log("Booking-gate schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

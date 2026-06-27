// scripts/push-lease-schema.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE additive migration for the co-living lease model
// (Phase 1–3). Adds the four lease tables + their indexes and the three additive
// columns (properties.entity, rooms.room_number, leases.signed_document_html).
//
// Every statement is IF NOT EXISTS / ADD COLUMN IF NOT EXISTS, so running this
// twice is a no-op and it NEVER drops or alters an existing column. Safe to run
// against any branch that already has the original BNP tables.
//
// Why this exists instead of `drizzle-kit push`: drizzle-kit push prompts
// interactively to disambiguate new-column vs rename, which fails in a
// non-TTY shell. This applies the exact additive delta deterministically.
//
//   Run: node scripts/push-lease-schema.mjs
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// Each entry is a single DDL statement (neon http driver runs one at a time).
const statements = [
  // --- additive columns on existing tables ---
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "entity" text NOT NULL DEFAULT 'BNP'`,
  `ALTER TABLE "rooms" ADD COLUMN IF NOT EXISTS "room_number" text`,

  // --- leases ---
  `CREATE TABLE IF NOT EXISTS "leases" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "property_id" varchar NOT NULL,
    "guest_id" varchar NOT NULL,
    "start_date" date NOT NULL,
    "end_date" date NOT NULL,
    "payment_cadence" text NOT NULL,
    "weekly_rate_snapshot" numeric(10,2) NOT NULL,
    "total_lease_value" numeric(12,2) NOT NULL,
    "proration_note" text,
    "status" text NOT NULL DEFAULT 'DRAFT',
    "signed_name" text,
    "signed_at" timestamp,
    "signed_ip" text,
    "signed_pdf_url" text,
    "signed_document_html" text,
    "stripe_customer_id" text,
    "stripe_payment_method_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "signed_document_html" text`,
  `CREATE INDEX IF NOT EXISTS "leases_property_idx" ON "leases" ("property_id")`,
  `CREATE INDEX IF NOT EXISTS "leases_guest_idx" ON "leases" ("guest_id")`,
  `CREATE INDEX IF NOT EXISTS "leases_status_idx" ON "leases" ("status")`,

  // --- lease_rooms ---
  `CREATE TABLE IF NOT EXISTS "lease_rooms" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "room_id" varchar NOT NULL,
    "room_number_snapshot" text,
    "room_name_snapshot" text NOT NULL,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "lease_rooms_lease_idx" ON "lease_rooms" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "lease_rooms_room_idx" ON "lease_rooms" ("room_id")`,

  // --- payment_schedule ---
  `CREATE TABLE IF NOT EXISTS "payment_schedule" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "schedule_seq" integer NOT NULL,
    "due_date" date NOT NULL,
    "amount" numeric(10,2) NOT NULL,
    "status" text NOT NULL DEFAULT 'SCHEDULED',
    "paid_at" timestamp,
    "payment_method" text NOT NULL DEFAULT 'CARD_ON_FILE',
    "stripe_payment_intent_id" text,
    "manual_note" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "payment_schedule_lease_idx" ON "payment_schedule" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "payment_schedule_status_idx" ON "payment_schedule" ("status")`,
  `CREATE INDEX IF NOT EXISTS "payment_schedule_due_date_idx" ON "payment_schedule" ("due_date")`,

  // --- late_fees ---
  `CREATE TABLE IF NOT EXISTS "late_fees" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "schedule_seq" integer NOT NULL,
    "accrual_date" date NOT NULL,
    "amount" numeric(10,2) NOT NULL DEFAULT '25.00',
    "status" text NOT NULL DEFAULT 'ACCRUED',
    "stripe_payment_intent_id" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "late_fees_lease_idx" ON "late_fees" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "late_fees_status_idx" ON "late_fees" ("status")`,
  `CREATE INDEX IF NOT EXISTS "late_fees_unique_accrual_idx" ON "late_fees" ("lease_id","schedule_seq","accrual_date")`,

  // --- Phase 5: notification_log ---
  `CREATE TABLE IF NOT EXISTS "notification_log" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "schedule_seq" integer,
    "kind" text NOT NULL,
    "send_date" date NOT NULL,
    "email_sent" boolean NOT NULL DEFAULT false,
    "sms_sent" boolean NOT NULL DEFAULT false,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "notification_log_lease_idx" ON "notification_log" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "notification_log_dedupe_idx" ON "notification_log" ("lease_id","schedule_seq","kind","send_date")`,

  // --- Phase 5: app_settings ---
  `CREATE TABLE IF NOT EXISTS "app_settings" (
    "key" varchar PRIMARY KEY NOT NULL,
    "value" text NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,

  // --- Phase 5: uo_escalations ---
  `CREATE TABLE IF NOT EXISTS "uo_escalations" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "schedule_seq" integer,
    "kind" text NOT NULL,
    "severity" text NOT NULL DEFAULT 'MEDIUM',
    "status" text NOT NULL DEFAULT 'OPEN',
    "detail" text,
    "resolved_at" timestamp,
    "resolved_by" text,
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "uo_escalations_lease_idx" ON "uo_escalations" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "uo_escalations_status_idx" ON "uo_escalations" ("status")`,
  `CREATE INDEX IF NOT EXISTS "uo_escalations_open_kind_idx" ON "uo_escalations" ("lease_id","schedule_seq","kind","status")`,

  // --- Phase 6: portal token + guest_messages ---
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "portal_token" text`,
  `CREATE TABLE IF NOT EXISTS "guest_messages" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "lease_id" varchar NOT NULL,
    "guest_id" varchar NOT NULL,
    "thread_id" varchar NOT NULL,
    "author_role" text NOT NULL DEFAULT 'GUEST',
    "category" text NOT NULL DEFAULT 'QUESTION',
    "subject" text,
    "body" text NOT NULL,
    "status" text NOT NULL DEFAULT 'OPEN',
    "created_at" timestamp DEFAULT now() NOT NULL,
    "updated_at" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS "guest_messages_lease_idx" ON "guest_messages" ("lease_id")`,
  `CREATE INDEX IF NOT EXISTS "guest_messages_thread_idx" ON "guest_messages" ("thread_id")`,
  `CREATE INDEX IF NOT EXISTS "guest_messages_status_idx" ON "guest_messages" ("status")`,
];

async function run() {
  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }
  console.log("\nLease schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });

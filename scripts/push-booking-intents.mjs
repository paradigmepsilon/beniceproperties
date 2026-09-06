// scripts/push-booking-intents.mjs
// Adds the booking_intents table (a row per checkout a guest STARTED — see
// shared/schema.ts). Additive + idempotent (IF NOT EXISTS throughout), run
// against the live BNP Neon DB via the app's own connection. Same idempotent-
// DDL pattern as scripts/push-deconfliction-messaging.mjs. Re-running is a
// safe no-op. Nothing existing is altered.
//
//   node scripts/push-booking-intents.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `CREATE TABLE IF NOT EXISTS "booking_intents" (
     "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     "reference" text NOT NULL UNIQUE,
     "stripe_payment_intent_id" text NOT NULL,
     "property_id" varchar NOT NULL,
     "room_id" varchar,
     "model" text NOT NULL,
     "check_in" date NOT NULL,
     "check_out" date,
     "quoted_total" numeric(10,2) NOT NULL,
     "guest_name" text, "guest_email" text, "guest_phone" text,
     "contact_attached_at" timestamp,
     "created_at" timestamp NOT NULL DEFAULT now(),
     "updated_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS booking_intents_pi_idx ON booking_intents(stripe_payment_intent_id)`,
  `CREATE INDEX IF NOT EXISTS booking_intents_email_idx ON booking_intents(guest_email)`,
  `CREATE INDEX IF NOT EXISTS booking_intents_created_idx ON booking_intents(created_at)`,
];

for (const stmt of statements) {
  const label = stmt.replace(/\s+/g, " ").slice(0, 90);
  try {
    await db.execute(sql.raw(stmt));
    console.log(`ok   ${label}`);
  } catch (err) {
    console.error(`FAIL ${label}\n     ${err.message}`);
    process.exit(1);
  }
}
console.log("booking_intents ready.");

// scripts/push-deconfliction-messaging.mjs
// Adds manual_blocks + message_log, makes lease_id nullable + adds booking_id on
// guest_messages / lifecycle_events / uo_escalations, and installs the two
// exclusion constraints that make double-booking a room or STR property
// structurally impossible (CONFLICT/CANCELLED rows exempt). Additive + idempotent
// (IF NOT EXISTS / IF EXISTS guards throughout), run against the live BNP Neon DB
// via the app's own connection. Same idempotent-DDL pattern the repo uses
// elsewhere (NOT drizzle-kit, which prompts interactively and fails in a non-TTY
// shell). Re-running is a safe no-op.
//
// Run scripts/backup-tables.mjs for the affected tables FIRST — see its header.
//
//   node scripts/push-deconfliction-messaging.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `CREATE EXTENSION IF NOT EXISTS btree_gist`,
  `CREATE TABLE IF NOT EXISTS "manual_blocks" (
     "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     "property_id" varchar NOT NULL REFERENCES "properties"("id"),
     "room_id" varchar REFERENCES "rooms"("id"),
     "start_date" date NOT NULL, "end_date" date NOT NULL,
     "kind" text NOT NULL DEFAULT 'OTHER', "note" text, "guest_name" text,
     "source" text NOT NULL DEFAULT 'ADMIN', "created_by" text,
     "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
     CONSTRAINT manual_blocks_range_chk CHECK (end_date > start_date))`,
  `CREATE INDEX IF NOT EXISTS manual_blocks_property_range_idx ON manual_blocks(property_id, start_date, end_date)`,
  `CREATE INDEX IF NOT EXISTS manual_blocks_room_range_idx ON manual_blocks(room_id, start_date, end_date)`,
  `CREATE TABLE IF NOT EXISTS "message_log" (
     "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     "booking_id" varchar, "lease_id" varchar, "guest_id" varchar,
     "direction" text NOT NULL DEFAULT 'OUTBOUND', "audience" text NOT NULL DEFAULT 'GUEST',
     "channel" text NOT NULL, "kind" text NOT NULL DEFAULT 'MANUAL',
     "to_address" text, "subject" text, "body" text NOT NULL, "status" text NOT NULL,
     "provider_ref" text, "error" text, "sent_by" text NOT NULL DEFAULT 'system',
     "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS message_log_booking_idx ON message_log(booking_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_lease_idx ON message_log(lease_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_guest_idx ON message_log(guest_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_created_idx ON message_log(created_at)`,
  `ALTER TABLE "guest_messages" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "guest_messages" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS guest_messages_booking_idx ON guest_messages(booking_id)`,
  `ALTER TABLE "lifecycle_events" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "lifecycle_events" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS lifecycle_events_booking_idx ON lifecycle_events(booking_id)`,
  `ALTER TABLE "uo_escalations" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "uo_escalations" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS uo_escalations_booking_idx ON uo_escalations(booking_id)`,
  // Exclusion constraints: two live bookings can never overlap on one room /
  // one whole-property STR. CONFLICT and CANCELLED rows are exempt.
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_room_no_overlap') THEN
       ALTER TABLE bookings ADD CONSTRAINT bookings_room_no_overlap
         EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&)
         WHERE (room_id IS NOT NULL AND check_out IS NOT NULL AND status NOT IN ('CANCELLED','CONFLICT'));
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_str_no_overlap') THEN
       ALTER TABLE bookings ADD CONSTRAINT bookings_str_no_overlap
         EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out) WITH &&)
         WHERE (room_id IS NULL AND model = 'STR' AND check_out IS NOT NULL AND status NOT IN ('CANCELLED','CONFLICT'));
     END IF;
   END $$`,
  `INSERT INTO app_settings (key, value) VALUES ('ical_honor_host_blocks', 'true') ON CONFLICT (key) DO NOTHING`,
  `INSERT INTO app_settings (key, value) VALUES ('guest_auto_notifications', 'true') ON CONFLICT (key) DO NOTHING`,
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
console.log("\ndeconfliction + messaging schema applied.");

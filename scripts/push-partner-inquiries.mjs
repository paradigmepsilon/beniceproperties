// scripts/push-partner-inquiries.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE additive migration for the partner_inquiries table
// (B2B lead-capture list for the /partner page). Adds a single standalone table:
//   - partner_inquiries (id, name, email, phone, company, interest, message,
//     created_at)
//
// The statement is CREATE TABLE IF NOT EXISTS, so running it twice is a no-op and
// it NEVER drops or alters anything. Mirrors scripts/push-ltr-inquiries.mjs —
// same reason it exists instead of `drizzle-kit push` (push prompts to
// disambiguate new-column vs rename, which fails in a non-TTY shell). Like LTR
// inquiries there is NO UNIQUE constraint: inquiries are append-only leads (a
// person may inquire more than once). `interest` is a text[] array (multi-select
// offerings), defaulting to an empty array. Additive-only per the CLAUDE.md floor
// — a brand-new empty table, so no migration backup is required.
//
//   Run: node scripts/push-partner-inquiries.mjs
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// Each entry is a single DDL statement (neon http driver runs one at a time).
const statements = [
  `CREATE TABLE IF NOT EXISTS "partner_inquiries" (
    "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "name" text NOT NULL,
    "email" text NOT NULL,
    "phone" text,
    "company" text,
    "interest" text[] NOT NULL DEFAULT ARRAY[]::text[],
    "message" text,
    "created_at" timestamp DEFAULT now() NOT NULL
  )`,
];

async function tableExists() {
  const rows = await db.execute(
    raw.raw(
      `SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_inquiries'`,
    ),
  );
  return (rows.rows ?? rows).length > 0;
}

async function run() {
  // Pre-state (documented rigor: prove we're not mid-partial-migration).
  const pre = await tableExists();
  console.log(`pre-state: partner_inquiries table ${pre ? "present" : "absent"}`);

  for (const stmt of statements) {
    const label = stmt.trim().split("\n")[0].slice(0, 70);
    await db.execute(raw.raw(stmt));
    console.log("ok:", label);
  }

  // Post-state (prove the table now exists).
  const post = await tableExists();
  if (!post) {
    console.error("post-state FAILED — partner_inquiries table is still absent");
    process.exit(1);
  }
  console.log("\npost-state: partner_inquiries table present.");
  console.log("Partner inquiries schema applied (idempotent, additive only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });

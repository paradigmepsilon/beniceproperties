// scripts/push-placeholder-flag.mjs
// =============================================================================
// Idempotent, NON-INTERACTIVE additive migration for properties.is_placeholder
// — the flag that separates "the world can SEE this listing" (properties.active)
// from "the business COUNTS this listing" (is_placeholder). See
// shared/placeholder.ts for the rule and server/storage.ts for the aggregates
// that honour it.
//
//   ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_placeholder
//     boolean NOT NULL DEFAULT false
//
// Additive, defaulted false, so applying it changes NO existing behaviour on its
// own: every property stays real until something marks it. Re-running is a safe
// no-op. Same pattern as scripts/push-biweekly-rate.mjs (and the same reason it
// exists instead of `drizzle-kit push`, which prompts in a non-TTY shell).
//
// MODES
//   node scripts/push-placeholder-flag.mjs             # add the column only
//   node scripts/push-placeholder-flag.mjs --list      # show what --backfill would mark
//   node scripts/push-placeholder-flag.mjs --backfill  # add the column, then mark
//
// --backfill marks the listings that are ALREADY placeholders in practice but
// have never been flagged as such:
//   1. the market-test inventory, tagged prior_names ? 'market-test-2026-09'
//      (six fictional co-living houses applied to production 2026-09-14 — see
//      docs/market-experiment-2026-09.md)
//   2. the LTR placeholder rows seeded by scripts/seed-ltr-placeholders.mjs,
//      named '[PLACEHOLDER] ...'
// It only ever sets the flag TRUE, never false, so it cannot un-mark a listing
// someone marked by hand. Run --list first; it prints the exact rows.
// =============================================================================

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}

const args = process.argv.slice(2);
const wantBackfill = args.includes("--backfill");
const listOnly = args.includes("--list");

const db = drizzle({ client: neon(process.env.DATABASE_URL) });
const rowsOf = (r) => r.rows ?? r;

// The two populations that are placeholders in practice today.
const BACKFILL_PREDICATE = `(prior_names ? 'market-test-2026-09' OR name LIKE '[PLACEHOLDER]%')`;

const statements = [
  `ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "is_placeholder" boolean NOT NULL DEFAULT false`,
];

async function columnExists() {
  const r = await db.execute(
    raw.raw(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'properties' AND column_name = 'is_placeholder'`,
    ),
  );
  return rowsOf(r).length > 0;
}

async function candidates() {
  const r = await db.execute(
    raw.raw(
      `SELECT id, name, type, active FROM properties WHERE ${BACKFILL_PREDICATE} ORDER BY name`,
    ),
  );
  return rowsOf(r);
}

async function markedCount() {
  const r = await db.execute(
    raw.raw(`SELECT count(*)::int AS n FROM properties WHERE is_placeholder = true`),
  );
  return rowsOf(r)[0].n;
}

async function run() {
  if (listOnly) {
    const rows = await candidates();
    console.log(`--list: ${rows.length} propert${rows.length === 1 ? "y" : "ies"} match the backfill predicate:\n`);
    for (const p of rows) {
      console.log(`  ${p.name}  [${p.type}]  active=${p.active}  ${p.id}`);
    }
    console.log("\nNothing was written. Re-run with --backfill to mark these.");
    return;
  }

  const pre = await columnExists();
  console.log(`pre-state: properties.is_placeholder ${pre ? "present" : "absent"}`);

  for (const stmt of statements) {
    await db.execute(raw.raw(stmt));
    console.log("ok:", stmt.slice(0, 80).replace(/\s+/g, " "));
  }

  if (!(await columnExists())) {
    console.error("post-state FAILED — properties.is_placeholder is still absent");
    process.exit(1);
  }
  console.log("post-state: properties.is_placeholder present.");

  if (!wantBackfill) {
    const rows = await candidates();
    console.log(
      `\nColumn added, nothing marked (every property defaults to real).\n` +
        `${rows.length} propert${rows.length === 1 ? "y" : "ies"} look like placeholders — ` +
        `run --list to see them, --backfill to mark them.`,
    );
    return;
  }

  const before = await markedCount();
  const rows = await candidates();
  console.log(`\nbackfill: marking ${rows.length} propert${rows.length === 1 ? "y" : "ies"} as placeholders`);
  for (const p of rows) console.log(`  ${p.name}  [${p.type}]  ${p.id}`);

  // TRUE only — never flips a hand-marked listing back to real.
  await db.execute(
    raw.raw(
      `UPDATE properties SET is_placeholder = true, updated_at = now()
       WHERE ${BACKFILL_PREDICATE} AND is_placeholder = false`,
    ),
  );

  const after = await markedCount();
  console.log(`\nis_placeholder = true: ${before} -> ${after}`);
  console.log("Placeholder flag applied (idempotent, additive, mark-only).");
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });

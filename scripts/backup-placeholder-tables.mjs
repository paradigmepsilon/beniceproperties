// scripts/backup-placeholder-tables.mjs
// =============================================================================
// Pre-flight backup for the placeholder-listings rollout. CLAUDE.md floor #1
// says no destructive migration without exporting the affected tables first.
// The two migrations in this rollout are additive (ADD COLUMN IF NOT EXISTS /
// CREATE TABLE IF NOT EXISTS), but two later steps DO write:
//
//   push-placeholder-flag.mjs --backfill   UPDATEs properties.is_placeholder
//   seed-market-experiment.mjs --open      DELETEs the tagged manual_blocks
//
// So this dumps both affected tables, plus rooms for context, in the same
// shape as the existing files in docs/migration-backups/ (a plain JSON array
// per table, one file each, dated).
//
// Read-only. Writes nothing to the database.
//
//   Run: node scripts/backup-placeholder-tables.mjs
// =============================================================================

import "dotenv/config";
import { writeFileSync, mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);
const stamp = new Date().toISOString().slice(0, 10);
const dir = "docs/migration-backups";
mkdirSync(dir, { recursive: true });

const exports = [
  ["properties", `SELECT * FROM properties ORDER BY name`],
  ["rooms", `SELECT * FROM rooms ORDER BY property_id, room_number`],
  // Only the market-test blocks: these are what --open deletes. Other manual
  // blocks (real off-platform bookings, maintenance) are untouched by any step
  // in this rollout, so dumping them would be noise.
  [
    "manual-blocks-market-test",
    `SELECT * FROM manual_blocks WHERE created_by = 'market-test-2026-09' ORDER BY room_id`,
  ],
];

let total = 0;
for (const [label, query] of exports) {
  const rows = await sql(query);
  const path = `${dir}/${stamp}-pre-placeholder-${label}.json`;
  writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
  console.log(`${String(rows.length).padStart(4)} rows -> ${path}`);
  total += rows.length;
}

console.log(`\n${total} rows exported. Safe to run the migrations.`);

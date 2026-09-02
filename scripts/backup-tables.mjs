// scripts/backup-tables.mjs
// Run before any push script: `node scripts/backup-tables.mjs bookings guest_messages lifecycle_events uo_escalations`.
//
// Exports every row of each named table to docs/migration-backups/<YYYY-MM-DD>-<table>.json
// via `SELECT *` (mask nothing — the folder is gitignored). This is the NON-NEGOTIABLE
// FLOOR from CLAUDE.md: no destructive migration without a backup export first.
//
//   node scripts/backup-tables.mjs <table> [<table> ...]
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

const tables = process.argv.slice(2);
if (tables.length === 0) {
  console.error("Usage: node scripts/backup-tables.mjs <table> [<table> ...]");
  process.exit(1);
}

// Table names come from argv (operator-supplied), not user input — still guard
// against anything that isn't a plausible identifier before interpolating.
const IDENT_RE = /^[a-z_][a-z0-9_]*$/;
for (const t of tables) {
  if (!IDENT_RE.test(t)) {
    console.error(`Refusing to back up "${t}" — not a valid table identifier`);
    process.exit(1);
  }
}

const db = drizzle({ client: neon(url) });
const dateStamp = new Date().toISOString().slice(0, 10);
const outDir = path.join(process.cwd(), "docs", "migration-backups");
mkdirSync(outDir, { recursive: true });

for (const table of tables) {
  try {
    const result = await db.execute(sql.raw(`SELECT * FROM "${table}"`));
    const rows = Array.isArray(result) ? result : (result.rows ?? []);
    const outPath = path.join(outDir, `${dateStamp}-${table}.json`);
    writeFileSync(outPath, JSON.stringify(rows, null, 2));
    console.log(`OK  ${table} — ${rows.length} row(s) -> ${path.relative(process.cwd(), outPath)}`);
  } catch (err) {
    console.error(`FAIL ${table}`, err.message);
    process.exit(1);
  }
}
console.log("\nbackup complete.");

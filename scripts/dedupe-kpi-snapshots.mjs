// scripts/dedupe-kpi-snapshots.mjs
// =============================================================================
// Collapse the duplicate kpi_snapshots rows, then add the unique index that
// stops them coming back.
//
// THE BUG: storage.createSnapshot() inserted unconditionally, and the rollup
// runs on every scheduler sweep — hourly from the local scheduler, daily from
// the Vercel cron. Any day with a dev server running collected a row per tick:
// 652 rows by 2026-09-28, 23 of them for a single date. No reported number was
// ever wrong (each row is self-consistent), but the table can't be read as
// history and a unique index can't be created over it.
//
// The code side is already fixed — createSnapshot now upserts per date — so
// this is a one-time cleanup of what the old behaviour left behind.
//
// WHICH ROW SURVIVES: the newest `created_at` for each date, i.e. the last
// figure computed that day. Two things carry over from the rows being removed:
// if ANY row for a date was pushed to Unified Ops, the survivor keeps
// pushed_to_uo = true and the EARLIEST pushed_at (when UO first saw that day),
// so the cleanup can't erase the record that a push happened.
//
// THIS IS DESTRUCTIVE — it deletes rows. Per the CLAUDE.md floor it exports
// the whole table to docs/migration-backups/ before deleting anything, and it
// is a dry run until --apply.
//
//   node scripts/dedupe-kpi-snapshots.mjs            # dry run
//   node scripts/dedupe-kpi-snapshots.mjs --apply    # collapse + add index
//   node scripts/dedupe-kpi-snapshots.mjs --apply --no-index
// =============================================================================

/**
 * Normalize a snapshot_date to YYYY-MM-DD. The Neon driver hands back a Date
 * for a `date` column, and String(date).slice(0, 10) gives "Mon Sep 14" — which
 * as a grouping key would collapse two dates that merely share a weekday and
 * month-day (they recur every few years), deleting live rows. Date columns come
 * back at UTC midnight, so toISOString is the correct read.
 */
export function isoDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Pure: given every row, decide what to keep, what to delete, and what to
 * carry over onto each survivor. Exported and unit-tested — deciding which
 * historical rows to destroy is not logic to leave untested inside a script
 * that needs a database to run.
 *
 * Returns one entry per snapshot_date, each with the surviving row, the ids to
 * delete, and any pushed-state patch the survivor needs.
 */
export function planDedupe(rows) {
  const byDate = new Map();
  for (const r of rows) {
    const date = isoDate(r.snapshot_date);
    if (!byDate.has(date)) byDate.set(date, []);
    byDate.get(date).push(r);
  }

  const plan = [];
  for (const [date, group] of Array.from(byDate.entries()).sort()) {
    // Newest computation for the day wins. created_at ties break on id so the
    // choice is deterministic across runs.
    const sorted = [...group].sort((a, b) => {
      const d = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      return d !== 0 ? d : String(a.id).localeCompare(String(b.id));
    });
    const keep = sorted[0];
    const drop = sorted.slice(1);

    // Preserve the fact that UO saw this date, and when it first did.
    const pushedRows = group.filter((r) => r.pushed_to_uo && r.pushed_at);
    let patch = null;
    if (pushedRows.length) {
      const earliest = pushedRows
        .map((r) => new Date(r.pushed_at))
        .sort((a, b) => a.getTime() - b.getTime())[0];
      const keepPushedAt = keep.pushed_at ? new Date(keep.pushed_at).getTime() : null;
      if (!keep.pushed_to_uo || keepPushedAt !== earliest.getTime()) {
        patch = { pushedToUo: true, pushedAt: earliest };
      }
    }

    plan.push({ date, keep, dropIds: drop.map((r) => r.id), duplicates: drop.length, patch });
  }
  return plan;
}

import "dotenv/config";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const INDEX_SQL = `CREATE UNIQUE INDEX IF NOT EXISTS "kpi_snapshots_date_unique" ON "kpi_snapshots" ("snapshot_date")`;

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const withIndex = !args.includes("--no-index");
  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql(
    `SELECT id, snapshot_date, created_at, pushed_to_uo, pushed_at,
            rooms_occupied, occupancy_pct
       FROM kpi_snapshots`,
  );
  const plan = planDedupe(rows);
  const dupPlan = plan.filter((p) => p.duplicates > 0);
  const totalDrop = dupPlan.reduce((n, p) => n + p.duplicates, 0);

  console.log(`rows: ${rows.length}   distinct dates: ${plan.length}\n`);
  if (dupPlan.length) {
    console.log(`${"date".padEnd(12)} ${"rows".padEnd(6)} ${"keeping".padEnd(30)} carried over`);
    console.log("-".repeat(78));
    for (const p of dupPlan) {
      const keeping = `${p.keep.rooms_occupied}/? = ${p.keep.occupancy_pct}%`;
      console.log(
        `${p.date.padEnd(12)} ${String(p.duplicates + 1).padEnd(6)} ${keeping.padEnd(30)} ` +
          `${p.patch ? "pushed_to_uo + earliest pushed_at" : ""}`,
      );
    }
  }
  console.log(
    `\n${totalDrop} duplicate row(s) across ${dupPlan.length} date(s) would be deleted, ` +
      `leaving ${plan.length}.`,
  );

  if (!apply) {
    console.log(`\nDRY RUN — nothing written.`);
    console.log(`Re-run with --apply to delete the duplicates${withIndex ? " and add the unique index" : ""}.`);
    return;
  }

  // Full export before any delete (CLAUDE.md floor #1).
  const stamp = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/migration-backups", { recursive: true });
  const all = await sql(`SELECT * FROM kpi_snapshots ORDER BY snapshot_date`);
  const path = `docs/migration-backups/${stamp}-pre-dedupe-kpi-snapshots.json`;
  writeFileSync(path, JSON.stringify(all, null, 2) + "\n");
  console.log(`\nbacked up ${all.length} rows -> ${path}`);

  for (const p of dupPlan) {
    if (p.patch) {
      await sql(`UPDATE kpi_snapshots SET pushed_to_uo = true, pushed_at = $1 WHERE id = $2`, [
        p.patch.pushedAt.toISOString(),
        p.keep.id,
      ]);
    }
    // Chunked so a date with dozens of duplicates stays inside parameter limits.
    for (let i = 0; i < p.dropIds.length; i += 50) {
      const chunk = p.dropIds.slice(i, i + 50);
      const params = chunk.map((_, n) => `$${n + 1}`).join(",");
      await sql(`DELETE FROM kpi_snapshots WHERE id IN (${params})`, chunk);
    }
  }
  console.log(`\n${totalDrop} duplicate row(s) deleted.`);

  if (withIndex) {
    await sql(INDEX_SQL);
    console.log("unique index kpi_snapshots_date_unique created (one row per date, enforced).");
  }

  const after = await sql(`SELECT count(*)::int AS n FROM kpi_snapshots`);
  console.log(`\nkpi_snapshots now holds ${after[0].n} row(s).`);
}

// Same convention as seed-market-experiment.mjs: importing this module (the
// unit test does) must not run it or touch a database.
const isDirectRun =
  process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("dedupe failed:", err.message);
    process.exit(1);
  });
}

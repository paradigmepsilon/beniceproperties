// scripts/recompute-kpi-snapshots.mjs
// =============================================================================
// Correct the occupancy figures in kpi_snapshots rows written while placeholder
// rooms were counted as real inventory.
//
// THE BUG: until 2026-09-27, storage.getKpiAggregates() selected from `rooms`
// with no join to `properties`, so the 22 market-test rooms were in the
// occupancy count. Worse than padding: they were all OCCUPIED (the --close
// manual block set them so), which inflated the NUMERATOR harder than the
// denominator. BNP reported ~89% occupancy against a true ~50%, and the daily
// cron cached that into kpi_snapshots and pushed it to Unified Ops.
//
// WHAT CAN AND CANNOT BE RECOVERED: room statuses have no history, so a
// snapshot cannot be genuinely recomputed from source. What IS recoverable is
// arithmetic: each row stores rooms_occupied and occupancy_pct, which together
// imply the total room count it divided by. Back the placeholder rooms out of
// both sides and the row becomes what it should have said.
//
//   impliedTotal      = rooms_occupied / (occupancy_pct / 100)
//   correctedOccupied = rooms_occupied - <placeholder rooms occupied that day>
//   correctedTotal    = impliedTotal   - <placeholder rooms that day>
//   correctedPct      = correctedOccupied / correctedTotal * 100
//
// Only occupancy_pct and rooms_occupied were ever wrong. booking_count and
// revenue_total are untouched: placeholder properties have never had a booking
// or a payment, so those columns were always right.
//
// EVERY row is checked before it is trusted. A row is SKIPPED (never guessed
// at) when occupancy_pct is 0, when the implied total isn't a clean integer,
// or when backing the placeholders out would give a negative or impossible
// result. Skips are reported, not silently dropped.
//
// DRY RUN BY DEFAULT. It prints the full before/after table and writes nothing
// until --apply, which first exports the table to docs/migration-backups/.
//
//   node scripts/recompute-kpi-snapshots.mjs                  # dry run
//   node scripts/recompute-kpi-snapshots.mjs --apply          # write
//   node scripts/recompute-kpi-snapshots.mjs --from 2026-09-14 --to 2026-09-26
//   node scripts/recompute-kpi-snapshots.mjs --placeholder-rooms 22
//
// WINDOW: defaults to 2026-09-14 (the day the market-test rooms were applied
// AND closed, so they read OCCUPIED from that date) through 2026-09-26 (the
// last full day before the exclusion deployed). Rows outside it are left
// alone — before, the rooms didn't exist; after, the code already excludes
// them. Check the printed table against those dates before applying.
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
 * The whole correction, as a pure function of one row plus the placeholder room
 * count — exported and unit-tested in recompute-kpi-snapshots.test.ts, because
 * arithmetic that rewrites history should not live only inside a script that
 * needs a database to run.
 *
 * Returns either { skip: "<reason>" } or the full before/after set. It refuses
 * rather than guesses: a row whose implied total isn't a clean integer, or
 * where backing the placeholders out goes negative, is left for a human.
 */
export function correctSnapshot(occupied, pct, placeholderRooms) {
  if (!Number.isFinite(occupied) || !Number.isFinite(pct)) {
    return { occupied, pct, skip: "non-numeric stored values" };
  }
  if (pct <= 0) {
    return { occupied, pct, skip: "occupancy_pct is 0 — the total it divided by can't be recovered" };
  }
  const impliedTotal = (occupied / pct) * 100;
  if (Math.abs(impliedTotal - Math.round(impliedTotal)) > 0.02) {
    return { occupied, pct, skip: `implied total ${impliedTotal.toFixed(3)} isn't a clean integer` };
  }
  const total = Math.round(impliedTotal);
  const newOccupied = occupied - placeholderRooms;
  const newTotal = total - placeholderRooms;
  if (newTotal <= 0) {
    return { occupied, pct, total, skip: `backing out ${placeholderRooms} rooms leaves a total of ${newTotal}` };
  }
  if (newOccupied < 0) {
    return { occupied, pct, total, skip: `backing out ${placeholderRooms} occupied leaves ${newOccupied}` };
  }
  return {
    occupied,
    pct,
    total,
    newOccupied,
    newTotal,
    newPct: Math.round((newOccupied / newTotal) * 10000) / 100,
  };
}

import "dotenv/config";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const i = args.indexOf(name);
    return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
  };
  const apply = args.includes("--apply");
  const from = flag("--from", "2026-09-14");
  const to = flag("--to", "2026-09-26");
  const roomsOverride = flag("--placeholder-rooms", null);

  const sql = neon(process.env.DATABASE_URL);

  // How many rooms belong to placeholder properties. Counted live rather than
  // hardcoded; --open deleted blocks, not rooms, so today's count is the same
  // count that was wrongly included during the window.
  const phRooms =
    roomsOverride != null
      ? Number(roomsOverride)
      : (
          await sql(
            `SELECT count(*)::int AS n FROM rooms r
               JOIN properties p ON p.id = r.property_id
              WHERE p.is_placeholder = true`,
          )
        )[0].n;

  if (!Number.isFinite(phRooms) || phRooms <= 0) {
    console.error(
      `Placeholder room count came back as ${phRooms}. Run push-placeholder-flag.mjs --backfill ` +
        `first, or pass --placeholder-rooms <n>.`,
    );
    process.exit(1);
  }

  const rows = await sql(
    `SELECT id, snapshot_date, rooms_occupied, occupancy_pct, booking_count, revenue_total, pushed_to_uo
       FROM kpi_snapshots
      WHERE snapshot_date >= $1 AND snapshot_date <= $2
      ORDER BY snapshot_date`,
    [from, to],
  );

  console.log(`placeholder rooms excluded from each row: ${phRooms}`);
  console.log(`window: ${from} .. ${to}`);
  console.log(`snapshots in window: ${rows.length}\n`);
  if (rows.length === 0) {
    console.log("Nothing to do.");
    return;
  }

  const plan = rows.map((r) => ({
    date: isoDate(r.snapshot_date),
    r,
    ...correctSnapshot(Number(r.rooms_occupied), Number(r.occupancy_pct), phRooms),
  }));

  console.log(`${"date".padEnd(12)} ${"stored".padEnd(24)} ${"corrected".padEnd(24)} note`);
  console.log("-".repeat(88));
  for (const p of plan) {
    const stored = `${p.occupied}/${p.total ?? "?"} = ${p.pct}%`;
    const corrected = p.skip ? "SKIP" : `${p.newOccupied}/${p.newTotal} = ${p.newPct}%`;
    console.log(`${p.date.padEnd(12)} ${stored.padEnd(24)} ${corrected.padEnd(24)} ${p.skip ?? ""}`);
  }

  const fixable = plan.filter((p) => !p.skip);
  const skipped = plan.filter((p) => p.skip);
  console.log(`\n${fixable.length} row(s) correctable, ${skipped.length} skipped.`);
  if (fixable.length) {
    const before = fixable.reduce((s, p) => s + p.pct, 0) / fixable.length;
    const after = fixable.reduce((s, p) => s + p.newPct, 0) / fixable.length;
    console.log(`mean reported occupancy over the window: ${before.toFixed(2)}% -> ${after.toFixed(2)}%`);
  }

  if (!apply) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply to write these corrections.");
    return;
  }
  if (!fixable.length) {
    console.log("\nNothing correctable; nothing written.");
    return;
  }

  // Export the whole table before touching it (CLAUDE.md floor #1).
  const stamp = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/migration-backups", { recursive: true });
  const all = await sql(`SELECT * FROM kpi_snapshots ORDER BY snapshot_date`);
  const path = `docs/migration-backups/${stamp}-pre-recompute-kpi-snapshots.json`;
  writeFileSync(path, JSON.stringify(all, null, 2) + "\n");
  console.log(`\nbacked up ${all.length} rows -> ${path}`);

  for (const p of fixable) {
    await sql(`UPDATE kpi_snapshots SET rooms_occupied = $1, occupancy_pct = $2 WHERE id = $3`, [
      p.newOccupied,
      p.newPct.toFixed(2),
      p.r.id,
    ]);
  }
  console.log(`\n${fixable.length} snapshot(s) corrected.`);

  const pushed = fixable.filter((p) => p.r.pushed_to_uo).length;
  if (pushed) {
    console.log(
      `NOTE: ${pushed} of these had already been pushed to Unified Ops with the OLD numbers.\n` +
        `This fixes BNP's copy. UO's stored history is not rewritten from here.`,
    );
  }
}

// Same convention as scripts/seed-market-experiment.mjs: importing this module
// (the unit test does) must not run it or touch a database.
const isDirectRun =
  process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("recompute failed:", err.message);
    process.exit(1);
  });
}

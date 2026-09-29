// scripts/push-expired-status.mjs
// =============================================================================
// Teach the DATABASE about the EXPIRED booking status.
//
// EXPIRED (added 2026-09-28) means "never paid, check-in has passed" and is in
// NON_BLOCKING_BOOKING_STATUSES — an unpaid lapsed booking must stop holding
// dates. But that list exists TWICE. The app reads it from shared/schema.ts;
// Postgres has its own copy baked into two EXCLUDE constraints on `bookings`:
//
//   WHERE (... AND status NOT IN ('CANCELLED','CONFLICT'))
//
// Change only the app and the two disagree in the worst possible direction:
// the site offers dates that look free, and the INSERT is then rejected by the
// constraint with a 23P01 — a booking that fails for no reason a guest or an
// admin can see. This script rebuilds both constraints with 'EXPIRED' added.
//
// NOT purely additive: it DROPs and re-ADDs two constraints. Per the CLAUDE.md
// floor it exports `bookings` first, and it is a dry run until --apply.
// Re-running is a safe no-op — it checks the live definition and exits early
// if both already exempt EXPIRED.
//
// SAFE TO RUN BEFORE OR AFTER the code deploys. Until it runs, an EXPIRED
// booking simply keeps blocking dates exactly as it does today; nothing breaks
// in either order.
//
// A constraint rebuild revalidates the whole table. On a table this size that
// is instant; it would need more thought at scale.
//
//   node scripts/push-expired-status.mjs            # dry run
//   node scripts/push-expired-status.mjs --apply
// =============================================================================

export const CONSTRAINTS = [
  {
    name: "bookings_room_no_overlap",
    ddl: `ALTER TABLE bookings ADD CONSTRAINT bookings_room_no_overlap
            EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&)
            WHERE (room_id IS NOT NULL AND check_out IS NOT NULL
                   AND status NOT IN ('CANCELLED','CONFLICT','EXPIRED'))`,
  },
  {
    name: "bookings_str_no_overlap",
    ddl: `ALTER TABLE bookings ADD CONSTRAINT bookings_str_no_overlap
            EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out) WITH &&)
            WHERE (room_id IS NULL AND model = 'STR' AND check_out IS NOT NULL
                   AND status NOT IN ('CANCELLED','CONFLICT','EXPIRED'))`,
  },
];

/**
 * Pure: does this live constraint definition already exempt EXPIRED?
 * Exported for the unit test — the check that decides whether to drop a
 * production constraint should not be untested.
 */
export function alreadyExemptsExpired(definition) {
  if (!definition) return false;
  return definition.includes("'EXPIRED'");
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
  const apply = process.argv.includes("--apply");
  const sql = neon(process.env.DATABASE_URL);

  const live = await sql(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conname IN ('bookings_room_no_overlap','bookings_str_no_overlap')`,
  );
  const byName = new Map(live.map((r) => [r.conname, r.def]));

  console.log("current constraint definitions:\n");
  for (const { name } of CONSTRAINTS) {
    const def = byName.get(name);
    console.log(`  ${name}`);
    console.log(`    ${def ?? "** MISSING **"}`);
    console.log(`    exempts EXPIRED: ${alreadyExemptsExpired(def)}\n`);
  }

  const missing = CONSTRAINTS.filter(({ name }) => !byName.has(name));
  if (missing.length) {
    console.error(
      `Refusing: ${missing.map((c) => c.name).join(", ")} not found. Run ` +
        `scripts/push-deconfliction-messaging.mjs first — this script rebuilds, it does not create.`,
    );
    process.exit(1);
  }

  const todo = CONSTRAINTS.filter(({ name }) => !alreadyExemptsExpired(byName.get(name)));
  if (todo.length === 0) {
    console.log("Both constraints already exempt EXPIRED — nothing to do.");
    return;
  }
  console.log(`${todo.length} constraint(s) to rebuild: ${todo.map((c) => c.name).join(", ")}`);

  if (!apply) {
    console.log("\nDRY RUN — nothing written. Re-run with --apply.");
    return;
  }

  // Export `bookings` before touching a constraint on it (CLAUDE.md floor #1).
  const stamp = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/migration-backups", { recursive: true });
  const rows = await sql(`SELECT * FROM bookings ORDER BY created_at`);
  const path = `docs/migration-backups/${stamp}-pre-expired-status-bookings.json`;
  writeFileSync(path, JSON.stringify(rows, null, 2) + "\n");
  console.log(`\nbacked up ${rows.length} booking(s) -> ${path}`);

  for (const { name, ddl } of todo) {
    // Drop and re-add. Postgres has no ALTER for an EXCLUDE predicate, and
    // there is a window between the two where overlaps are unenforced — which
    // is why this runs as an owner-supervised one-off, not in a request path.
    await sql(`ALTER TABLE bookings DROP CONSTRAINT ${name}`);
    await sql(ddl);
    console.log(`rebuilt ${name}`);
  }

  const after = await sql(
    `SELECT conname, pg_get_constraintdef(oid) AS def
       FROM pg_constraint
      WHERE conname IN ('bookings_room_no_overlap','bookings_str_no_overlap')`,
  );
  const bad = after.filter((r) => !alreadyExemptsExpired(r.def));
  if (bad.length || after.length !== CONSTRAINTS.length) {
    console.error("\npost-state FAILED — constraints are not as expected:");
    for (const r of after) console.error(`  ${r.conname}: ${r.def}`);
    process.exit(1);
  }
  console.log("\npost-state: both constraints now exempt CANCELLED, CONFLICT and EXPIRED.");
}

const isDirectRun =
  process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("push failed:", err.message);
    process.exit(1);
  });
}

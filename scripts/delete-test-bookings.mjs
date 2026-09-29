// scripts/delete-test-bookings.mjs
// =============================================================================
// Delete the launch-week test bookings.
//
// Eleven bookings were created 2026-07-04 21:17 → 2026-07-05 17:09, during the
// commits that built the checkout (e729cc8, 4cfa77f, 515e29b, 31896d7). They
// are the manual QA of that work: six carry an identical 392.27 total across
// five different months on one property, one guest_id holds three physically
// overlapping stays, and four were cancelled 800ms apart by a loop.
//
// WHY A HARDCODED LIST AND A PREDICATE. Either alone is unsafe. A list alone
// deletes whatever a mistyped reference happens to match. A predicate alone
// sweeps up anything new that looks similar — and something did look similar:
//
//   BNP-5F2B-WNJM, BNP-BGFK-W3FL, BNP-A85H-U2MH were created seconds apart
//   with identical 362.25 totals, which is exactly the shape of test data.
//   They are REAL GUESTS WHO WERE IN THEIR ROOMS. That timestamp belongs to
//   scripts/materialize-lost-bookings.mjs, a backfill for two Stripe
//   PaymentIntents that succeeded without a webhook. A "created together,
//   round total" predicate would have deleted paying guests.
//
// So: a row must be on the list, must pass the launch-week window check, and
// must not be on the protected list. All three, every time.
//
// THIS DELETES FROM MONEY TABLES. bookings has NOT NULL foreign keys from
// payments, subscriptions and booking_gate with no cascade, so the child rows
// go first or the delete fails. Four more tables (uo_escalations,
// guest_messages, lifecycle_events, message_log) carry a booking_id with NO
// foreign key — they would silently dangle, so they are cleared too.
//
// BNP-9WTA-NNYK carries a PAID $392.27 Stripe charge. It is included at the
// owner's explicit instruction and NO REFUND IS ISSUED — this script does not
// talk to Stripe. After it runs, the backup JSON is the only record that
// charge existed, and docs/migration-backups/ is gitignored, so that backup
// lives on one machine. Copy it somewhere durable.
//
// Dry run until --apply. Exports every affected row first.
//
//   node scripts/delete-test-bookings.mjs            # dry run
//   node scripts/delete-test-bookings.mjs --apply
// =============================================================================

/** The eleven launch-week QA bookings. Nothing outside this list is touched. */
export const TEST_REFERENCES = [
  "BNP-FK9E-EHDV",
  "BNP-VP2S-NMJ6",
  "BNP-9WTA-NNYK",
  "BNP-XNR7-8Q3R",
  "BNP-SL75-F83H",
  "BNP-E8UR-MEW6",
  "BNP-CZTA-FSE8",
  "BNP-QCYX-3SK2",
  "BNP-F5ME-Y8P9",
  "BNP-D7KB-ZWRF",
  "BNP-2548-YP52",
];

/**
 * Real guests, recorded here so no future edit of the list above can reach
 * them. See materialize-lost-bookings.mjs — their created_at is a backfill
 * script's timestamp, not a booking's.
 */
export const NEVER_DELETE = ["BNP-5F2B-WNJM", "BNP-BGFK-W3FL", "BNP-A85H-U2MH"];

/** Everything on the list was created before this. Anything newer is not ours. */
export const LAUNCH_WEEK_BEFORE = "2026-07-06";

/**
 * Pure: may this booking be deleted? Exported and unit-tested. Every condition
 * is a reason to STOP, never a warning to log past.
 */
export function canDeleteBooking({ booking, today }) {
  if (!booking) return { ok: false, reason: "no booking found for that reference" };
  const ref = booking.reference;

  if (NEVER_DELETE.includes(ref)) {
    return { ok: false, reason: `${ref} is a REAL GUEST booking on the protected list` };
  }
  if (!TEST_REFERENCES.includes(ref)) {
    return { ok: false, reason: `${ref} is not on the test-booking list` };
  }
  const created = String(booking.created_at instanceof Date ? booking.created_at.toISOString() : booking.created_at);
  if (created >= LAUNCH_WEEK_BEFORE) {
    return {
      ok: false,
      reason: `${ref} was created ${created.slice(0, 10)}, outside the launch-week window (before ${LAUNCH_WEEK_BEFORE})`,
    };
  }
  // Belt to the braces: never delete a stay someone could be sitting in.
  if (booking.status === "ACTIVE") {
    return { ok: false, reason: `${ref} is ACTIVE — a guest may be in the room` };
  }
  if (today && booking.check_out) {
    const out = isoDate(booking.check_out);
    const inn = isoDate(booking.check_in);
    if (inn <= today && out > today) {
      return { ok: false, reason: `${ref} covers today (${inn} → ${out})` };
    }
  }
  return { ok: true };
}

/** YYYY-MM-DD; the driver hands back a Date for a `date` column. */
export function isoDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

import "dotenv/config";
import { basename } from "node:path";
import { fileURLToPath } from "node:url";
import { writeFileSync, mkdirSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

// Child rows, in the order they must go. The first three have NOT NULL foreign
// keys to bookings; the last four have a booking_id with no constraint at all
// and would dangle invisibly.
const CHILD_TABLES = [
  "payment_refunds",
  "payments",
  "subscriptions",
  "booking_gate",
  "uo_escalations",
  "guest_messages",
  "lifecycle_events",
  "message_log",
];

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  const sql = neon(process.env.DATABASE_URL);
  const today = new Date().toISOString().slice(0, 10);

  const rows = await sql(
    `SELECT id, reference, status, model, check_in, check_out, quoted_total, created_at, guest_id
       FROM bookings WHERE reference = ANY($1) ORDER BY created_at`,
    [TEST_REFERENCES],
  );
  const found = new Set(rows.map((r) => r.reference));
  const absent = TEST_REFERENCES.filter((r) => !found.has(r));

  console.log(`targets on the list: ${TEST_REFERENCES.length}`);
  console.log(`found in the database: ${rows.length}${absent.length ? ` (already gone: ${absent.join(", ")})` : ""}\n`);

  const plan = [];
  for (const booking of rows) {
    const verdict = canDeleteBooking({ booking, today });
    const counts = {};
    for (const t of CHILD_TABLES) {
      const c = await sql(`SELECT count(*)::int AS n FROM ${t} WHERE booking_id = $1`, [booking.id]);
      counts[t] = c[0].n;
    }
    plan.push({ booking, verdict, counts });

    const children = Object.entries(counts).filter(([, n]) => n > 0).map(([t, n]) => `${t}:${n}`).join(" ");
    console.log(
      `  ${booking.reference}  ${String(booking.status).padEnd(16)} ` +
        `${isoDate(booking.check_in)} → ${isoDate(booking.check_out) ?? "open"}  ` +
        `$${booking.quoted_total}  ${verdict.ok ? "OK" : "REFUSE"}`,
    );
    if (children) console.log(`      children: ${children}`);
    if (!verdict.ok) console.log(`      ${verdict.reason}`);
  }

  const blocked = plan.filter((p) => !p.verdict.ok);
  if (blocked.length) {
    console.error(`\nRefusing: ${blocked.length} target(s) failed their safety check. Nothing was deleted.`);
    process.exit(1);
  }
  console.log(`\nAll ${plan.length} target(s) pass. Protected and untouched: ${NEVER_DELETE.join(", ")}`);

  if (!apply) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply.");
    return;
  }

  // Export the bookings AND every child row before deleting anything.
  const stamp = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/migration-backups", { recursive: true });
  const ids = plan.map((p) => p.booking.id);
  const dump = { deletedAt: new Date().toISOString(), bookings: rows, children: {} };
  for (const t of CHILD_TABLES) {
    dump.children[t] = await sql(`SELECT * FROM ${t} WHERE booking_id = ANY($1)`, [ids]);
  }
  const path = `docs/migration-backups/${stamp}-deleted-test-bookings.json`;
  writeFileSync(path, JSON.stringify(dump, null, 2) + "\n");
  const childTotal = Object.values(dump.children).reduce((n, r) => n + r.length, 0);
  console.log(`\nbacked up ${rows.length} booking(s) + ${childTotal} child row(s) -> ${path}`);

  // payment_refunds can also hang off a payment without carrying booking_id.
  await sql(
    `DELETE FROM payment_refunds
      WHERE payment_id IN (SELECT id FROM payments WHERE booking_id = ANY($1))`,
    [ids],
  );
  for (const t of CHILD_TABLES) {
    const r = await sql(`DELETE FROM ${t} WHERE booking_id = ANY($1)`, [ids]);
    void r;
  }
  await sql(`DELETE FROM bookings WHERE id = ANY($1)`, [ids]);

  const after = await sql(`SELECT count(*)::int AS n FROM bookings WHERE id = ANY($1)`, [ids]);
  if (after[0].n !== 0) {
    console.error(`post-state FAILED — ${after[0].n} booking(s) still present`);
    process.exit(1);
  }
  console.log(`\nDeleted ${ids.length} test booking(s) and their child rows.`);

  // Guests left with nothing attached. Reported, never deleted here — that is
  // a separate decision about stored personal data.
  const orphans = await sql(
    `SELECT g.id, g.email FROM guests g
      WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.guest_id = g.id)
        AND NOT EXISTS (SELECT 1 FROM leases l WHERE l.guest_id = g.id)`,
  );
  if (orphans.length) {
    console.log(
      `\n${orphans.length} guest row(s) now have no booking or lease. Not deleted — they are\n` +
        `stored personal data and removing them is a separate call. Ids:\n` +
        orphans.map((g) => `  ${g.id}`).join("\n"),
    );
  }
  console.log("\nThe backup above is the only remaining record. docs/migration-backups/ is gitignored.");
}

const isDirectRun =
  process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("delete failed:", err.message);
    process.exit(1);
  });
}

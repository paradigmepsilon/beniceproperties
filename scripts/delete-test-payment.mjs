// scripts/delete-test-payment.mjs
// =============================================================================
// Delete the launch-day test payment that sat in the reconcile queue.
//
// The row: $435 CashApp against booking BNP-2548-YP52, created and cancelled
// three minutes apart on 2026-07-05. Its booking has been CANCELLED ever since,
// but the PENDING payment survived because cancelBooking() never touches
// pending payment rows, and the queue never checked booking status.
//
// NOTE ON SCOPE: the queue now excludes payments on cancelled bookings
// (storage.getPendingManualPayments), so this row is ALREADY out of the admin's
// way. Running this script is about tidying the table, not fixing the count.
//
// THIS DELETES A ROW FROM A MONEY TABLE. Every other cleanup in this repo
// (clean-stale-coliving-bookings.mjs, cleanup-tutorial-test-lease.mjs) updates
// a status instead, so this is the first. The record that a test charge existed
// goes with it — deliberately, at the owner's instruction. Per the CLAUDE.md
// floor it exports the row first, and it is a dry run until --apply.
//
// It refuses unless EVERY expectation holds, so it can't delete a real payment
// if an id or reference is ever mistyped.
//
//   node scripts/delete-test-payment.mjs                        # dry run
//   node scripts/delete-test-payment.mjs --apply
//   node scripts/delete-test-payment.mjs --reference BNP-XXXX-YYYY
// =============================================================================

export const DEFAULT_REFERENCE = "BNP-2548-YP52";

/** YYYY-MM-DD. The driver returns a Date for a `date` column, and printing that
 *  raw gives "Mon Aug 10 2026 00:00:00 GMT-0400 (...)" across the output. */
export function isoDate(value) {
  if (value == null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

/**
 * Pure: may this payment be deleted? Exported and unit-tested, because the one
 * thing that must never happen here is deleting a live payment.
 *
 * Every condition is a reason to STOP, not a warning to log past.
 */
export function canDeletePayment({ payment, booking, refundCount }) {
  if (!payment) return { ok: false, reason: "no payment found for that reference" };
  if (!booking) return { ok: false, reason: "payment has no booking — refusing to guess" };
  if (payment.status !== "PENDING") {
    return { ok: false, reason: `payment is ${payment.status}, not PENDING — money may have moved` };
  }
  if (payment.method === "STRIPE") {
    return { ok: false, reason: "Stripe payment — it has a real PaymentIntent behind it" };
  }
  if (payment.paid_at) return { ok: false, reason: "payment has a paid_at timestamp" };
  if (payment.stripe_ref) return { ok: false, reason: "payment carries a stripe_ref" };
  if (booking.status !== "CANCELLED") {
    return { ok: false, reason: `booking is ${booking.status}, not CANCELLED — this is a live reservation` };
  }
  // payment_refunds.payment_id is a NOT NULL FK, so the delete would fail on
  // the constraint anyway. A clear refusal beats a raw Postgres error.
  if (refundCount > 0) {
    return { ok: false, reason: `${refundCount} refund row(s) reference this payment` };
  }
  return { ok: true };
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
  const apply = args.includes("--apply");
  const refIdx = args.indexOf("--reference");
  const reference = refIdx >= 0 && args[refIdx + 1] ? args[refIdx + 1] : DEFAULT_REFERENCE;

  const sql = neon(process.env.DATABASE_URL);

  const rows = await sql(
    `SELECT p.*, b.reference, b.status AS booking_status, b.check_in, b.check_out
       FROM payments p
       JOIN bookings b ON b.id = p.booking_id
      WHERE b.reference = $1`,
    [reference],
  );

  console.log(`reference: ${reference}`);
  console.log(`payment rows on that booking: ${rows.length}\n`);
  if (rows.length === 0) {
    console.log("Nothing found. Already deleted, or the reference is wrong.");
    return;
  }
  if (rows.length > 1) {
    console.error(
      `Refusing: ${rows.length} payments on this booking. This script deletes exactly one row.`,
    );
    process.exit(1);
  }

  const payment = rows[0];
  const booking = { status: payment.booking_status };
  const refunds = await sql(`SELECT count(*)::int AS n FROM payment_refunds WHERE payment_id = $1`, [
    payment.id,
  ]);
  const refundCount = refunds[0].n;

  console.log(`  id            ${payment.id}`);
  console.log(`  amount        ${payment.amount} (${payment.method})`);
  console.log(`  payment       ${payment.status}, paid_at=${payment.paid_at ?? "null"}, stripe_ref=${payment.stripe_ref ?? "null"}`);
  console.log(`  booking       ${payment.reference} — ${payment.booking_status}`);
  console.log(`  stay          ${isoDate(payment.check_in)} → ${isoDate(payment.check_out) ?? "open-ended"}`);
  console.log(`  refund rows   ${refundCount}`);

  const verdict = canDeletePayment({ payment, booking, refundCount });
  if (!verdict.ok) {
    console.error(`\nREFUSING: ${verdict.reason}`);
    process.exit(1);
  }
  console.log("\nAll safety checks pass: pending, unpaid, non-Stripe, cancelled booking, no refunds.");

  if (!apply) {
    console.log("\nDRY RUN — nothing deleted. Re-run with --apply.");
    return;
  }

  const stamp = new Date().toISOString().slice(0, 10);
  mkdirSync("docs/migration-backups", { recursive: true });
  const path = `docs/migration-backups/${stamp}-deleted-test-payment-${reference}.json`;
  writeFileSync(path, JSON.stringify(payment, null, 2) + "\n");
  console.log(`\nbacked up the row -> ${path}`);

  await sql(`DELETE FROM payments WHERE id = $1`, [payment.id]);
  const after = await sql(`SELECT count(*)::int AS n FROM payments WHERE id = $1`, [payment.id]);
  if (after[0].n !== 0) {
    console.error("post-state FAILED — the row is still present");
    process.exit(1);
  }
  console.log("Deleted. The backup above is now the only record of that row.");
}

// Same convention as the other scripts: importing this module (the unit test
// does) must not run it or touch a database.
const isDirectRun =
  process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("delete failed:", err.message);
    process.exit(1);
  });
}

// scripts/cleanup-tutorial-test-lease.mjs
// =============================================================================
// One-off cleanup for the single test lease created while recording the guest
// booking-flow tutorial video (2026-07-27). Signing a lease holds the room
// (ROOM_BLOCKING_LEASE_STATUSES in server/storage.ts includes
// PENDING_FIRST_PAYMENT), so this real production lease was blocking the room
// for real guests on those dates until the deposit either got paid or the
// lease was terminated.
//
// SAFE BY DEFAULT: dry-run. Prints the current lease row and exits. Pass
// --confirm to actually set status='TERMINATED'.
//
//   node scripts/cleanup-tutorial-test-lease.mjs           # dry run
//   node scripts/cleanup-tutorial-test-lease.mjs --confirm # terminate it
//
// TERMINATED is not in ROOM_BLOCKING_LEASE_STATUSES, so this alone frees the
// room. The room's own `status` column never flipped OCCUPIED (that only
// happens at deposit-paid, and the deposit was never paid), so no room-row
// fix is needed. Nothing is deleted — fully auditable, matches the pattern in
// clean-stale-coliving-bookings.mjs.
// =============================================================================

import { config } from "dotenv";
config({ quiet: true });
import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set — aborting.");
  process.exit(1);
}
const sql = neon(DATABASE_URL);

const LEASE_ID = "ec1c7d55-05a1-4492-8acc-4b64d46e4d16";
const confirm = process.argv.includes("--confirm");

async function main() {
  const rows = await sql`
    SELECT id, status, start_date, end_date, guest_id, deposit_status
    FROM leases WHERE id = ${LEASE_ID}`;
  if (rows.length === 0) {
    console.log(`No lease found with id ${LEASE_ID} — nothing to do.`);
    process.exit(0);
  }
  const lease = rows[0];
  console.log("Current lease row:", lease);

  if (lease.status === "TERMINATED") {
    console.log("Already TERMINATED — nothing to do.");
    process.exit(0);
  }

  if (!confirm) {
    console.log("\nDry run — would set status TERMINATED. Re-run with --confirm to apply.");
    process.exit(0);
  }

  await sql`UPDATE leases SET status = 'TERMINATED', updated_at = now() WHERE id = ${LEASE_ID}`;
  console.log(`Lease ${LEASE_ID} set to TERMINATED — room freed.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

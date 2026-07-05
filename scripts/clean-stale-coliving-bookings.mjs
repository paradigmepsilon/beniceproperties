// scripts/clean-stale-coliving-bookings.mjs
// =============================================================================
// List (and optionally cancel) non-cancelled CO-LIVING bookings that are holding
// dates on rooms. These silently block the quote path while — until the
// buildRoomAvailability fix — being invisible on the calendar. Use this to clear
// stale/abandoned/test bookings.
//
// SAFE BY DEFAULT: dry-run. It only reports. To actually cancel, pass a specific
// booking reference (or id) with --cancel:
//
//   node scripts/clean-stale-coliving-bookings.mjs                 # list all (dry run)
//   node scripts/clean-stale-coliving-bookings.mjs --room <roomId> # list one room
//   node scripts/clean-stale-coliving-bookings.mjs --cancel <ref>  # cancel one booking
//
// Cancelling sets status=CANCELLED (both availability paths exclude it) and frees
// the room if it was OCCUPIED. Nothing is deleted — a cancelled booking is fully
// auditable and reversible by hand.
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

const args = process.argv.slice(2);
const roomArg = args.includes("--room") ? args[args.indexOf("--room") + 1] : null;
const cancelArg = args.includes("--cancel") ? args[args.indexOf("--cancel") + 1] : null;

const today = new Date().toISOString().slice(0, 10);

// The Neon driver returns `date` columns as JS Date objects; normalize to a plain
// YYYY-MM-DD string for both display and comparison (so the `today` string compare
// and the printout are correct).
function ymd(v) {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

async function main() {
  if (cancelArg) {
    // Cancel a single booking by reference or id.
    const rows = await sql`
      SELECT id, reference, status, room_id, check_in, check_out
      FROM bookings
      WHERE reference = ${cancelArg} OR id = ${cancelArg}`;
    if (rows.length === 0) {
      console.error(`No booking found for "${cancelArg}".`);
      process.exit(1);
    }
    const b = rows[0];
    if (b.status === "CANCELLED") {
      console.log(`Booking ${b.reference} is already CANCELLED — nothing to do.`);
      process.exit(0);
    }
    await sql`UPDATE bookings SET status = 'CANCELLED', updated_at = now() WHERE id = ${b.id}`;
    // Free the room if this booking had it OCCUPIED.
    if (b.room_id) {
      const rooms = await sql`SELECT id, status FROM rooms WHERE id = ${b.room_id}`;
      if (rooms[0]?.status === "OCCUPIED") {
        await sql`UPDATE rooms SET status = 'AVAILABLE', updated_at = now() WHERE id = ${b.room_id}`;
        console.log(`  freed room ${b.room_id} (OCCUPIED → AVAILABLE)`);
      }
    }
    console.log(`Cancelled booking ${b.reference} (${ymd(b.check_in)}→${ymd(b.check_out)}).`);
    process.exit(0);
  }

  // Dry-run: list non-cancelled co-living bookings (optionally for one room).
  const rows = roomArg
    ? await sql`
        SELECT b.id, b.reference, b.status, b.room_id, b.check_in, b.check_out,
               b.payment_method, b.created_at, r.name AS room_name
        FROM bookings b LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.model = 'COLIVING' AND b.status <> 'CANCELLED' AND b.room_id = ${roomArg}
        ORDER BY b.check_in`
    : await sql`
        SELECT b.id, b.reference, b.status, b.room_id, b.check_in, b.check_out,
               b.payment_method, b.created_at, r.name AS room_name
        FROM bookings b LEFT JOIN rooms r ON r.id = b.room_id
        WHERE b.model = 'COLIVING' AND b.status <> 'CANCELLED'
        ORDER BY r.name, b.check_in`;

  if (rows.length === 0) {
    console.log("No non-cancelled co-living bookings found.");
    process.exit(0);
  }

  console.log(`Non-cancelled CO-LIVING bookings (today=${today}):\n`);
  for (const b of rows) {
    const checkIn = ymd(b.check_in);
    const checkOut = ymd(b.check_out);
    // A booking blocks dates while its checkOut is today or later (half-open).
    const active = checkOut && checkOut >= today ? "" : "  [past — no longer blocks]";
    console.log(
      `  ${(b.room_name ?? "?").slice(0, 40).padEnd(40)}  ${checkIn}→${checkOut}  ` +
        `${b.status.padEnd(15)} ${(b.payment_method ?? "").padEnd(7)} ref=${b.reference}${active}`,
    );
  }
  console.log(`\n${rows.length} booking(s). To cancel one: --cancel <reference>`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

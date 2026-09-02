// scripts/materialize-lost-bookings.mjs
// =============================================================================
// One-off backfill for short-stay bookings whose Stripe PaymentIntent SUCCEEDED
// but never reached the app, because the Stripe webhook endpoint was not
// subscribed to `payment_intent.succeeded` (found 2026-09-02). Mirrors the
// happy path of materializeShortStayBooking() in server/routes.ts exactly:
// upsert guest -> create CONFIRMED/ACTIVE booking -> room OCCUPIED -> PAID payment.
//
// Deliberately does NOT run the availability re-check + auto-refund branch:
// the owner confirmed both guests are physically in their rooms and asked that
// no refund happen without explicit approval. Anything the re-check would have
// flagged is reported instead.
//
// SAFE BY DEFAULT: dry-run. Prints what it would write. Pass --confirm to write.
//
//   node scripts/materialize-lost-bookings.mjs            # dry run
//   node scripts/materialize-lost-bookings.mjs --confirm  # write rows
//
// Idempotent by booking reference — re-running after --confirm is a no-op.
// Sends NO guest notification (no email/SMS code path is touched).
// =============================================================================

import { config } from "dotenv";
config({ quiet: true });
import Stripe from "stripe";
import { neon } from "@neondatabase/serverless";

const PI_IDS = ["pi_3UAea7CSfkiL9dJC0S1GwvVW", "pi_3UBHrWCSfkiL9dJC0Utikovg"];
const confirm = process.argv.includes("--confirm");

const DATABASE_URL = process.env.DATABASE_URL;
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
if (!DATABASE_URL || !STRIPE_SECRET_KEY) {
  console.error("DATABASE_URL and STRIPE_SECRET_KEY must be set — aborting.");
  process.exit(1);
}
const sql = neon(DATABASE_URL);
const stripe = new Stripe(STRIPE_SECRET_KEY);

const mask = (e) => (e ? e.replace(/^(.).*(@.*)$/, "$1***$2") : null);
const val = (v) => (v && v !== "null" ? v : null);

async function main() {
  for (const piId of PI_IDS) {
    const pi = await stripe.paymentIntents.retrieve(piId);
    const m = pi.metadata ?? {};
    const reference = m.reference;
    console.log(`\n== ${piId} ${pi.status} $${pi.amount / 100} ref=${reference} ${m.property_name} / ${m.room_name} ${m.check_in} -> ${m.check_out} guest=${mask(m.guest_email)}`);

    if (pi.status !== "succeeded") { console.log("   not succeeded — skipping"); continue; }
    if (m.entity !== "BNP" || m.payment_kind !== "BOOKING_DEPOSIT" || val(m.lease_id)) { console.log("   not a lease-less BNP short stay — skipping"); continue; }
    if (!reference || !val(m.guest_name) || !val(m.guest_email)) { console.log("   missing reference/guest contact — skipping"); continue; }

    const existing = await sql`SELECT id, status FROM bookings WHERE reference = ${reference}`;
    if (existing.length) { console.log(`   booking already exists (${existing[0].status}) — idempotent no-op`); continue; }

    const propertyId = m.property_id;
    const roomId = val(m.room_id);
    const checkIn = val(m.check_in);
    const checkOut = val(m.check_out);
    const model = m.model === "COLIVING" ? "COLIVING" : "STR";
    const status = model === "COLIVING" ? "ACTIVE" : "CONFIRMED";

    // Report (not enforce) what the live availability gate would say.
    const overlapBookings = roomId
      ? await sql`SELECT reference, status, check_in, check_out FROM bookings WHERE room_id = ${roomId} AND status <> 'CANCELLED' AND check_in < ${checkOut} AND check_out > ${checkIn}`
      : [];
    const overlapLeases = roomId
      ? await sql`SELECT l.id, l.status FROM lease_rooms lr JOIN leases l ON l.id = lr.lease_id WHERE lr.room_id = ${roomId} AND l.status IN ('DRAFT','PENDING_SIGNATURE','PENDING_FIRST_PAYMENT','PENDING_VERIFICATION','ACTIVE') AND l.start_date <= ${checkOut} AND l.end_date >= ${checkIn}`
      : [];
    const overlapExternal = roomId
      ? await sql`SELECT summary, start_date, end_date FROM external_bookings WHERE room_id = ${roomId} AND start_date < ${checkOut} AND end_date > ${checkIn}`
      : [];
    const room = roomId ? (await sql`SELECT status FROM rooms WHERE id = ${roomId}`)[0] : null;
    console.log(`   room status=${room?.status ?? "n/a"} | overlapping: bookings=${overlapBookings.length} leases=${overlapLeases.length} external=${overlapExternal.length}`);
    if (overlapBookings.length || overlapLeases.length || overlapExternal.length) {
      console.log("   NOTE: the webhook path would have refunded this. Writing anyway per owner instruction (no auto-refund).");
    }

    if (!confirm) { console.log("   dry run — would upsert guest, create booking, set room OCCUPIED, create PAID payment."); continue; }

    // upsertGuestByEmail equivalent
    const guests = await sql`SELECT id FROM guests WHERE email = ${m.guest_email} LIMIT 1`;
    let guestId;
    if (guests.length) {
      guestId = guests[0].id;
      await sql`UPDATE guests SET name = ${m.guest_name}, phone = COALESCE(${val(m.guest_phone)}, phone), updated_at = now() WHERE id = ${guestId}`;
    } else {
      guestId = (await sql`INSERT INTO guests (name, email, phone) VALUES (${m.guest_name}, ${m.guest_email}, ${val(m.guest_phone)}) RETURNING id`)[0].id;
    }

    const booking = (await sql`
      INSERT INTO bookings (property_id, room_id, guest_id, model, check_in, check_out, status, payment_method, reference, quoted_total)
      VALUES (${propertyId}, ${roomId}, ${guestId}, ${model}, ${checkIn}, ${checkOut}, ${status}, 'STRIPE', ${reference}, ${m.quoted_total ?? "0"})
      RETURNING id`)[0];
    if (roomId) await sql`UPDATE rooms SET status = 'OCCUPIED', updated_at = now() WHERE id = ${roomId}`;
    await sql`
      INSERT INTO payments (booking_id, type, method, amount, surcharge, status, stripe_ref, confirmed_by, paid_at)
      VALUES (${booking.id}, 'ONE_TIME', 'STRIPE', ${m.amount ?? "0"}, ${m.surcharge ?? "0"}, 'PAID', ${pi.id}, NULL, ${new Date(pi.created * 1000).toISOString()})`;
    console.log(`   WROTE booking ${booking.id} (${status}) + PAID payment + room OCCUPIED`);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });

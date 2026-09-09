// server/lib/bookingConflicts.ts
// =============================================================================
// Admin resolution of a paid booking — the two deliberate human actions that
// close out a CONFLICT (see server/lib/materialize.ts), and the general
// admin-cancel path.
//
//   confirmConflictBooking() — re-runs the availability gate (excluding the
//     booking itself) and, only if the dates are genuinely free now, promotes it
//     to CONFIRMED (STR) / ACTIVE (co-living), occupies the room, resolves the
//     escalation and fires the guest + admin confirmation.
//
//   cancelBooking() — CANCELLED, frees the room ONLY when nothing else covers it
//     today, resolves any open BOOKING_CONFLICT escalation, and refunds ONLY when
//     the caller explicitly passes `refund: true`. Never a refund by default;
//     never an implicit one. Each refund is idempotency-keyed on the
//     PaymentIntent (`refund:<pi>`) so a retry or a double-click cannot send the
//     money twice.
// =============================================================================

import { storage } from "../storage";
import { BookingError, strHasConflict } from "./booking";
import { refundPaymentIntent } from "./stripe";
import { onBookingConfirmed } from "./lifecycle";
import { todayIso } from "@shared/dates";
import { log } from "../server-log";
import type { Booking } from "@shared/schema";
import { postPaymentStatusFor } from "@shared/bookingGate";

/** Postgres `exclusion_violation` — the range-overlap constraint rejected the row. */
const PG_EXCLUSION_VIOLATION = "23P01";

/** Close any OPEN BOOKING_CONFLICT escalation attached to this booking. */
async function resolveConflictEscalations(bookingId: string, actor: string): Promise<number> {
  const open = await storage.getEscalations({ status: "OPEN", bookingId });
  const mine = open.filter((e) => e.kind === "BOOKING_CONFLICT");
  for (const esc of mine) {
    await storage.updateEscalation(esc.id, {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedBy: actor,
    });
  }
  return mine.length;
}

/**
 * Promote a CONFLICT booking to a live one, but only if the dates are actually
 * free now. Throws BookingError(409) otherwise, having changed nothing.
 *
 * Restricted to `status === "CONFLICT"` on purpose: this is the resolution
 * action for a paid-but-conflicted booking, not a general status setter. Without
 * the guard it would happily resurrect a CANCELLED (possibly already refunded)
 * booking into ACTIVE and re-occupy its room.
 */
export async function confirmConflictBooking(bookingId: string, actor: string): Promise<Booking> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);
  if (booking.status !== "CONFLICT") {
    throw new BookingError(
      `Only a CONFLICT booking can be confirmed here (this one is ${booking.status})`,
      409,
    );
  }

  // Re-run the same gate the guest-facing flow uses, excluding THIS booking so a
  // CONFLICT row can't block its own confirmation.
  if (booking.model === "COLIVING") {
    if (!booking.roomId || !booking.checkOut) {
      throw new BookingError("Co-living booking is missing a room or check-out date", 409);
    }
    const free = await storage.isRoomAvailableForRange({
      roomId: booking.roomId,
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      endExclusive: true,
      excludeBookingId: booking.id,
    });
    if (!free) {
      throw new BookingError("Those dates are still taken for this room — cannot confirm", 409);
    }
  } else {
    if (!booking.checkOut) throw new BookingError("Booking is missing a check-out date", 409);
    const taken = await strHasConflict(
      booking.propertyId,
      booking.checkIn,
      booking.checkOut,
      booking.id,
    );
    if (taken) {
      throw new BookingError("Those dates are still taken for this property — cannot confirm", 409);
    }
  }

  // Resolving a CONFLICT hands the booking back into the normal lifecycle, which
  // for a gated co-living stay means PENDING_APPROVAL — not ACTIVE. Confirming
  // out of conflict must not be a way around the ID check.
  const status = postPaymentStatusFor(booking);
  // The gate above is a read-then-write race window: another confirmation (or a
  // fresh paid booking) can take the dates between the check and this UPDATE. The
  // Postgres exclusion constraint is the real arbiter, and it raises 23P01 —
  // surface that as the same 409 the gate would have returned rather than a 500.
  let updated: Booking;
  try {
    updated = (await storage.updateBooking(booking.id, { status })) ?? { ...booking, status };
  } catch (err) {
    if ((err as { code?: string }).code === PG_EXCLUSION_VIOLATION) {
      log(
        `booking ${booking.reference} (${booking.id}) confirm rejected by exclusion constraint`,
        "admin",
      );
      throw new BookingError("Those dates were just taken — cannot confirm", 409);
    }
    throw err;
  }
  if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
  await resolveConflictEscalations(booking.id, actor);

  const [property, room, guest] = await Promise.all([
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
    storage.getGuest(booking.guestId),
  ]);
  if (property && guest) {
    await onBookingConfirmed({ booking: updated, property, room: room ?? null, guest });
  }

  log(`booking ${booking.reference} (${booking.id}) confirmed out of CONFLICT by ${actor}`, "admin");
  return updated;
}

export interface CancelBookingResult {
  reference: string;
  alreadyCancelled: boolean;
  roomFreed: boolean;
  /** True when the money is back with the guest — whether we refunded it on this
   *  pass or Stripe told us it was already refunded on an earlier one. */
  refunded: boolean;
  /** Stripe refund ids created by THIS call. */
  refundIds: string[];
  /** PaymentIntents Stripe reported as already refunded — a retry outside the
   *  24h idempotency-key window. Money is back; there is just no new refund id. */
  alreadyRefunded: string[];
}

/**
 * Cancel a booking. Refunds ONLY when `refund === true` — the caller (an admin
 * action) is the authorization.
 *
 * Idempotent, and deliberately NOT short-circuited on an already-CANCELLED
 * booking when a refund was asked for. The cancel is written before the refund
 * loop, so a Stripe error mid-refund leaves a CANCELLED booking with the money
 * still held; an `alreadyCancelled` early return would then make the refund
 * unretryable and strand the guest's money. Re-attempts are safe because every
 * refund carries the stable `refund:<stripeRef>` idempotency key — Stripe
 * returns the original refund rather than issuing a second one.
 */
export async function cancelBooking(args: {
  bookingId: string;
  actor: string;
  refund?: boolean;
}): Promise<CancelBookingResult> {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);

  const alreadyCancelled = booking.status === "CANCELLED";
  if (alreadyCancelled && args.refund !== true) {
    return {
      reference: booking.reference,
      alreadyCancelled: true,
      roomFreed: false,
      refunded: false,
      refundIds: [],
      alreadyRefunded: [],
    };
  }

  if (!alreadyCancelled) await storage.updateBooking(booking.id, { status: "CANCELLED" });

  // Free the co-living room ONLY if nothing else covers it today. The status
  // update above already excludes this booking from that computation, so a room held by
  // another live booking/lease/block stays OCCUPIED.
  let roomFreed = false;
  if (booking.roomId && !alreadyCancelled) {
    const occupiedToday = await storage.getOccupiedRoomIdsOn(todayIso());
    if (!occupiedToday.has(booking.roomId)) {
      const room = await storage.getRoom(booking.roomId);
      if (room && room.status === "OCCUPIED") {
        await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
        roomFreed = true;
      }
    } else {
      log(
        `booking ${booking.reference} cancelled but room ${booking.roomId} is still covered today — left OCCUPIED`,
        "admin",
      );
    }
  }

  // --- Refund: explicit opt-in only ---
  const refundIds: string[] = [];
  const alreadyRefunded: string[] = [];
  if (args.refund === true) {
    const payments = await storage.getPaymentsByBooking(booking.id);
    for (const p of payments) {
      if (p.method !== "STRIPE" || p.status !== "PAID" || !p.stripeRef) continue;
      try {
        const refund = await refundPaymentIntent({
          paymentIntentId: p.stripeRef,
          // Stable key: a retry WITHIN 24 HOURS returns the same refund instead of
          // a second one. Stripe expires idempotency keys after that, so the key
          // is only the first line of defence — see the catch below.
          idempotencyKey: `refund:${p.stripeRef}`,
        });
        refundIds.push(refund.id);
        log(
          `booking ${booking.reference}: refunded payment ${p.id} (PI ${p.stripeRef}) → ${refund.id} by ${args.actor}`,
          "admin",
        );
      } catch (err) {
        // Past the 24h key window Stripe stops deduping and instead rejects the
        // second attempt as `charge_already_refunded`. That is the SUCCESS case:
        // the guest's money is already back. Treating it as a failure would make
        // a daily retry (the ghost-booking sweep) look permanently broken and
        // leave an operator unable to tell whether money had moved.
        if ((err as { code?: string }).code === "charge_already_refunded") {
          alreadyRefunded.push(p.stripeRef);
          log(
            `booking ${booking.reference}: PI ${p.stripeRef} was already refunded — treating as done`,
            "admin",
          );
          continue;
        }
        throw err;
      }
    }
    if (refundIds.length === 0 && alreadyRefunded.length === 0) {
      log(
        `booking ${booking.reference}: refund requested but no PAID Stripe payment to refund (manual payments settle off-band)`,
        "admin",
      );
    }
  }

  await resolveConflictEscalations(booking.id, args.actor);
  log(`booking ${booking.reference} (${booking.id}) CANCELLED by ${args.actor}`, "admin");

  return {
    reference: booking.reference,
    alreadyCancelled,
    roomFreed,
    refunded: refundIds.length > 0 || alreadyRefunded.length > 0,
    refundIds,
    alreadyRefunded,
  };
}

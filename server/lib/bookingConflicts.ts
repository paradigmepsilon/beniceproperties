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
 * Promote a CONFLICT (or otherwise unconfirmed) booking to a live one, but only
 * if the dates are actually free now. Throws BookingError(409) otherwise, having
 * changed nothing.
 */
export async function confirmConflictBooking(bookingId: string, actor: string): Promise<Booking> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);

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

  const status = booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED";
  const updated = (await storage.updateBooking(booking.id, { status })) ?? { ...booking, status };
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
  refunded: boolean;
  refundIds: string[];
}

/**
 * Cancel a booking. Refunds ONLY when `refund === true` — the caller (an admin
 * action) is the authorization. Idempotent: cancelling an already-CANCELLED
 * booking is a no-op and never refunds on the second pass.
 */
export async function cancelBooking(args: {
  bookingId: string;
  actor: string;
  refund?: boolean;
}): Promise<CancelBookingResult> {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);

  if (booking.status === "CANCELLED") {
    return {
      reference: booking.reference,
      alreadyCancelled: true,
      roomFreed: false,
      refunded: false,
      refundIds: [],
    };
  }

  await storage.updateBooking(booking.id, { status: "CANCELLED" });

  // Free the co-living room ONLY if nothing else covers it today. The status
  // update above already excludes this booking from that computation, so a room held by
  // another live booking/lease/block stays OCCUPIED.
  let roomFreed = false;
  if (booking.roomId) {
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
  if (args.refund === true) {
    const payments = await storage.getPaymentsByBooking(booking.id);
    for (const p of payments) {
      if (p.method !== "STRIPE" || p.status !== "PAID" || !p.stripeRef) continue;
      const refund = await refundPaymentIntent({
        paymentIntentId: p.stripeRef,
        // Stable key: a retry returns the SAME refund instead of a second one.
        idempotencyKey: `refund:${p.stripeRef}`,
      });
      refundIds.push(refund.id);
      log(
        `booking ${booking.reference}: refunded payment ${p.id} (PI ${p.stripeRef}) → ${refund.id} by ${args.actor}`,
        "admin",
      );
    }
    if (refundIds.length === 0) {
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
    alreadyCancelled: false,
    roomFreed,
    refunded: refundIds.length > 0,
    refundIds,
  };
}

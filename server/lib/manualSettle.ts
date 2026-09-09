// server/lib/manualSettle.ts
// =============================================================================
// Admin "Mark Paid" for a CashApp/Zelle short-stay booking. Extracted from
// routes.ts so the two invariants are unit-tested:
//   1. The availability gate is RE-RUN (excluding the booking itself) before the
//      booking goes live — a pending manual booking can sit for days, and an
//      Airbnb block or another booking may have landed meanwhile. Taken dates →
//      BookingError(409) and nothing changes.
//   2. The guest gets the same confirmation card bookings get, via
//      onBookingConfirmed (deduped through lifecycle_events), plus the existing
//      "marked paid by <admin>" operator alert.
// Dependencies are injectable, defaulting to the real modules.
// =============================================================================

import { storage as realStorage } from "../storage";
import { BookingError, strHasConflict as realStrHasConflict } from "./booking";
import { onBookingConfirmed as realOnBookingConfirmed } from "./lifecycle";
import { notifyAdmin as realNotifyAdmin } from "./notifications";
import type { Booking, Payment } from "@shared/schema";
import { postPaymentStatusFor } from "@shared/bookingGate";

export interface ManualSettleDeps {
  storage: Pick<
    typeof realStorage,
    | "getPayment"
    | "getBooking"
    | "getGuest"
    | "getProperty"
    | "getRoom"
    | "updatePayment"
    | "updateBooking"
    | "updateRoom"
    | "isRoomAvailableForRange"
  >;
  strHasConflict: typeof realStrHasConflict;
  onBookingConfirmed: typeof realOnBookingConfirmed;
  notifyAdmin: typeof realNotifyAdmin;
}

const defaultDeps = (): ManualSettleDeps => ({
  storage: realStorage,
  strHasConflict: realStrHasConflict,
  onBookingConfirmed: realOnBookingConfirmed,
  notifyAdmin: realNotifyAdmin,
});

export async function settleManualBookingPayment(
  args: { paymentId: string; adminId: string; actor: string },
  deps: ManualSettleDeps = defaultDeps(),
): Promise<{ payment: Payment; booking: Booking | null }> {
  const { storage } = deps;
  const payment = await storage.getPayment(args.paymentId);
  if (!payment) throw new BookingError("Payment not found", 404);
  if (payment.method === "STRIPE") {
    throw new BookingError("Stripe payments are confirmed by webhook, not manually", 400);
  }
  const booking = await storage.getBooking(payment.bookingId);
  if (payment.status === "PAID") return { payment, booking: booking ?? null };

  // Gate BEFORE any write. Exclude this booking so a pending row can't block
  // its own settlement.
  if (booking && booking.checkOut) {
    if (booking.model === "COLIVING" && booking.roomId) {
      const free = await storage.isRoomAvailableForRange({
        roomId: booking.roomId,
        startDate: booking.checkIn,
        endDate: booking.checkOut,
        endExclusive: true,
        excludeBookingId: booking.id,
      });
      if (!free) {
        throw new BookingError("Those dates are no longer available for this room — cannot mark paid", 409);
      }
    } else if (booking.model === "STR") {
      if (await deps.strHasConflict(booking.propertyId, booking.checkIn, booking.checkOut, booking.id)) {
        throw new BookingError("Those dates are no longer available — cannot mark paid", 409);
      }
    }
  }

  const updatedPayment =
    (await storage.updatePayment(payment.id, {
      status: "PAID",
      confirmedBy: args.adminId,
      paidAt: new Date(),
    })) ?? payment;

  if (!booking) return { payment: updatedPayment, booking: null };

  // A manually-settled CashApp/Zelle booking goes through the SAME approval gate
  // as a card one — otherwise settling by hand would be the way to skip the ID
  // check. See shared/bookingGate.ts.
  const liveStatus = postPaymentStatusFor(booking);
  const updatedBooking = (await storage.updateBooking(booking.id, { status: liveStatus })) ?? {
    ...booking,
    status: liveStatus,
  };
  if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });

  const [guest, property, room] = await Promise.all([
    storage.getGuest(booking.guestId),
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
  ]);
  if (guest && property) {
    await deps.onBookingConfirmed({ booking: updatedBooking, property, room: room ?? null, guest });
    const settledTail = `marked PAID by ${args.actor}. Booking is now ${liveStatus}.`;
    await deps.notifyAdmin({
      subject: `Manual payment marked paid — ${booking.reference}`,
      body:
        `${payment.method} payment of $${payment.amount} for ${booking.reference} ` +
        `(${guest.name}, ${guest.email}) ${settledTail}`,
      // Telegram: name only, no contact details (third-party channel).
      telegramText:
        `${payment.method} payment of $${payment.amount} for ${booking.reference} (${guest.name}) ${settledTail}`,
      context: { bookingId: booking.id, guestId: guest.id, kind: "MANUAL_PAYMENT_CONFIRMED", sentBy: args.actor },
    });
  }
  return { payment: updatedPayment, booking: updatedBooking };
}

// server/lib/bookingGateDecline.ts
// =============================================================================
// TERMINAL DECLINE of a gated short stay: cancel the booking, release the dates,
// and refund the guest in full.
//
// THIS IS THE ONLY MODULE IN THE APP THAT MOVES MONEY OUTWARD WITHOUT A HUMAN
// NECESSARILY CLICKING SOMETHING. Two callers:
//   - an admin pressing "Decline & refund" (a human decision), and
//   - the 72h silence sweep (no human at all).
// Everything below is written for the second case.
//
// FOUR GUARDS, in order of how much they matter:
//
//   1. `confirm` must equal the booking reference verbatim. A mis-click cannot
//      produce a reference, and a stale admin tab cannot either.
//   2. `expectedRefundAmount`, when supplied, must match the server-computed
//      PAID-Stripe total. A stale client must never refund a different number
//      than the operator was looking at.
//   3. Stripe's `charge_already_refunded` is treated as SUCCESS. The idempotency
//      key expires after 24h and the sweep retries daily, so this — not the key
//      — is what actually prevents a double refund being reported as a failure.
//   4. UNIQUE(stripe_refund_id) in the database. Even if everything above were
//      bypassed, one Stripe refund can be recorded exactly once.
//
// WHAT IS NEVER ROLLED BACK: the CANCELLED status. If the refund fails, the
// booking STAYS cancelled and the dates STAY released — the guest was declined,
// they must not keep the room — and a HIGH REFUND_FAILED escalation pages a
// human. Un-cancelling would strand the guest in limbo AND make the refund
// unretryable, which is the same reasoning cancelBooking already documents for
// not early-returning on an already-cancelled booking.
// =============================================================================

import { storage } from "../storage";
import { cancelBooking } from "./bookingConflicts";
import { refundPaymentIntent } from "./stripe";
import { LeaseError } from "./errorResponse";
import { notifyAdmin } from "./notifications";
import { onStayDeclined } from "./stayLifecycle";
import {
  buildRoomBookingChargeMetadata,
  buildStrChargeMetadata,
  buildRefundMetadata,
  assertCompleteRefundMetadata,
  type StripeChargeMetadata,
  type RefundKind,
} from "./paymentMetadata";
import { fmtMoney } from "./formatShared";
import { log } from "../server-log";
import type { Payment } from "@shared/schema";

/** Stripe's answer when the charge was refunded on an earlier, expired attempt. */
const CHARGE_ALREADY_REFUNDED = "charge_already_refunded";

/** Half a cent — the same tolerance the existing admin refund UI uses. */
const AMOUNT_TOLERANCE = 0.005;

export interface DeclineResult {
  reference: string;
  refunded: { paymentId: string; stripeRefundId: string | null; amount: string }[];
  failed: { paymentId: string; stripePaymentIntentId: string; error: string }[];
  totalRefunded: number;
  datesReleased: boolean;
  roomFreed: boolean;
}

/** Sum of everything actually refundable through Stripe on this booking. */
export function refundableTotal(payments: Payment[]): number {
  return payments
    .filter((p) => p.method === "STRIPE" && p.status === "PAID" && p.stripeRef)
    .reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge ?? "0"), 0);
}

export async function declineAndRefundBooking(args: {
  bookingId: string;
  actor: string;
  reason: string;
  /** Mis-click guard: MUST equal booking.reference verbatim. */
  confirm: string;
  kind: Extract<RefundKind, "GATE_DECLINE" | "GATE_AUTO_DECLINE">;
  /** Amount the caller believes will be refunded. Checked when supplied. */
  expectedRefundAmount?: number;
}): Promise<DeclineResult> {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);

  // --- Guard 1: the typed reference. Checked BEFORE anything is read or written.
  if (args.confirm !== booking.reference) {
    throw new LeaseError(
      "Confirmation did not match the booking reference — nothing was changed.",
      400,
    );
  }
  if (!args.reason || args.reason.trim().length < 5) {
    throw new LeaseError("A reason of at least 5 characters is required to decline.", 400);
  }

  const payments = await storage.getPaymentsByBooking(booking.id);
  const refundable = payments.filter(
    (p) => p.method === "STRIPE" && p.status === "PAID" && p.stripeRef,
  );

  // A gated booking is paid by card by definition. Nothing to refund means
  // something is wrong with our picture of it — stop rather than silently
  // cancelling a booking whose money we cannot see.
  if (refundable.length === 0) {
    throw new LeaseError(
      "No settled card payment found for this booking — resolve it by hand rather than declining.",
      409,
    );
  }

  // --- Guard 2: the amount the operator was looking at.
  const total = refundableTotal(payments);
  if (
    args.expectedRefundAmount !== undefined &&
    Math.abs(args.expectedRefundAmount - total) > AMOUNT_TOLERANCE
  ) {
    throw new LeaseError(
      `Refund amount has changed (expected ${fmtMoney(args.expectedRefundAmount)}, ` +
        `now ${fmtMoney(total)}) — reload and try again.`,
      409,
    );
  }

  const [property, room, guest] = await Promise.all([
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
    storage.getGuest(booking.guestId),
  ]);
  if (!property || !guest) throw new LeaseError("Booking is missing its property or guest", 409);

  // Cancel FIRST, with refund:false — this module owns the refund loop so it can
  // attach metadata, write the ledger, and contain a per-payment failure, none of
  // which cancelBooking does. Status/date release happening before the money is
  // deliberate: a declined guest must not keep the room even if Stripe is down.
  const cancelled = await cancelBooking({
    bookingId: booking.id,
    actor: args.actor,
    refund: false,
  });

  // Rebuild the SAME entity/property/room breakout the original charge carried,
  // so a refund reconciles against the charge it reverses rather than appearing
  // as an unattributed debit.
  const baseMetadata: StripeChargeMetadata = room
    ? buildRoomBookingChargeMetadata({
        entity: property.entity,
        property,
        room,
        paymentKind: "BOOKING_DEPOSIT",
      })
    : buildStrChargeMetadata({
        entity: property.entity,
        property,
        paymentKind: "BOOKING_DEPOSIT",
      });

  const result: DeclineResult = {
    reference: booking.reference,
    refunded: [],
    failed: [],
    totalRefunded: 0,
    datesReleased: true,
    roomFreed: cancelled.roomFreed,
  };

  for (const payment of refundable) {
    const amount = parseFloat(payment.amount) + parseFloat(payment.surcharge ?? "0");
    const metadata = buildRefundMetadata({
      base: baseMetadata,
      kind: args.kind,
      paymentIntentId: payment.stripeRef!,
      paymentId: payment.id,
      reference: booking.reference,
      actor: args.actor,
      // Truncated and stripped of newlines: this reaches Stripe, and a reason is
      // operator free-text. It must never carry contact details or an access code.
      reason: args.reason.replace(/\s+/g, " ").slice(0, 400),
    });
    assertCompleteRefundMetadata(metadata);

    try {
      const refund = await refundPaymentIntent({
        paymentIntentId: payment.stripeRef!,
        idempotencyKey: `refund:${payment.stripeRef}`,
        metadata,
        reason: "requested_by_customer",
      });
      await storage.recordPaymentRefund({
        paymentId: payment.id,
        bookingId: booking.id,
        leaseId: null,
        stripeRefundId: refund.id,
        stripePaymentIntentId: payment.stripeRef!,
        amount: amount.toFixed(2),
        kind: args.kind,
        reason: args.reason.slice(0, 400),
        actor: args.actor,
      });
      await storage.updatePayment(payment.id, { status: "REFUNDED" });
      result.refunded.push({ paymentId: payment.id, stripeRefundId: refund.id, amount: amount.toFixed(2) });
      result.totalRefunded += amount;
      log(
        `stay ${booking.reference}: refunded ${payment.id} (PI ${payment.stripeRef}) → ${refund.id} by ${args.actor}`,
        "admin",
      );
    } catch (err) {
      // --- Guard 3. Past the 24h idempotency window Stripe rejects the second
      // attempt instead of deduping it. The money IS back; there is simply no new
      // refund id to record. Flip the payment so the retry stops recurring.
      if ((err as { code?: string }).code === CHARGE_ALREADY_REFUNDED) {
        await storage.updatePayment(payment.id, { status: "REFUNDED" });
        result.refunded.push({ paymentId: payment.id, stripeRefundId: null, amount: amount.toFixed(2) });
        result.totalRefunded += amount;
        log(
          `stay ${booking.reference}: PI ${payment.stripeRef} was already refunded — treated as done`,
          "admin",
        );
        continue;
      }
      // Contain it: one failing payment must not abandon the others.
      result.failed.push({
        paymentId: payment.id,
        stripePaymentIntentId: payment.stripeRef!,
        error: (err as Error).message,
      });
      log(
        `stay ${booking.reference}: REFUND FAILED for ${payment.id} (PI ${payment.stripeRef}): ${(err as Error).message}`,
        "admin",
      );
    }
  }

  if (result.failed.length > 0) {
    // The booking is cancelled and the dates are back on sale, but the guest's
    // money has NOT come back. That is a person-must-act situation, and the alert
    // carries PI ids and amounts only — no contact details, no access code.
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "REFUND_FAILED",
      severity: "HIGH",
      detail:
        `Booking ${booking.reference} was cancelled but ${result.failed.length} refund(s) FAILED: ` +
        result.failed.map((f) => `${f.stripePaymentIntentId} (${f.error})`).join("; ") +
        `. The dates are released. Refund by hand in Stripe, then re-run the decline.`,
    });
    const alert =
      `Booking ${booking.reference} at ${property.name} was cancelled, but ` +
      `${result.failed.length} refund(s) FAILED. The guest's money has NOT been returned and ` +
      `the dates are back on sale. Refund in Stripe by hand: ` +
      result.failed.map((f) => f.stripePaymentIntentId).join(", ");
    await notifyAdmin({
      subject: `REFUND FAILED - ${booking.reference} cancelled but not refunded`,
      body: alert,
      telegramText: alert,
      context: { bookingId: booking.id, guestId: guest.id, kind: "REFUND_FAILED" },
    });
  }

  // Only tell the guest their money is back when at least some of it is.
  if (result.refunded.length > 0) {
    await onStayDeclined(
      {
        booking: { ...booking, status: "CANCELLED" },
        gate: await storage.getBookingGate(booking.id).then((g) => g ?? null),
        guest,
        property,
        room: room ?? null,
      },
      {
        reason: args.kind === "GATE_AUTO_DECLINE" ? null : args.reason,
        refundAmount: result.totalRefunded,
        auto: args.kind === "GATE_AUTO_DECLINE",
      },
    );
  }

  // Record WHY and BY WHOM on the gate row, so the decision survives the booking
  // becoming an ordinary CANCELLED row indistinguishable from a guest cancellation.
  await storage.updateBookingGate(booking.id, {
    cancelReason: args.reason.slice(0, 1000),
    cancelledBy: args.actor,
  });

  log(
    `stay ${booking.reference}: declined by ${args.actor} — ${result.refunded.length} refunded, ` +
      `${result.failed.length} failed`,
    "admin",
  );
  return result;
}

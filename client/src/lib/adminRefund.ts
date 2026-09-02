// client/src/lib/adminRefund.ts
// Pure helpers for the admin "Cancel + refund" control on a CONFLICT booking
// (Task 8). Refund is real money, so eligibility and the confirmation amount
// are computed here — testable in isolation — rather than inline in JSX.
//
// `amount` on a payment row is the charge MINUS the card surcharge (see
// shared/schema.ts payments.amount); what Stripe actually charged, and what a
// refund returns, is amount + surcharge. That's also how the Payments tab
// already renders a payment's total, so this stays consistent.

export interface RefundEligibility {
  /** Show the "Cancel + refund" control at all. */
  eligible: boolean;
  /** Sum of PAID Stripe payments for this booking, in dollars. */
  amount: number;
}

interface PaymentLike {
  method: string;
  status: string;
  amount: string;
  surcharge: string;
  stripeRef: string | null;
}

interface BookingLike {
  paymentMethod: string;
}

/**
 * Sum of PAID Stripe payments for one booking's payment rows, in dollars.
 * Mirrors the server's own refund filter exactly (server/lib/bookingConflicts.ts
 * cancelBooking: `p.method !== "STRIPE" || p.status !== "PAID" || !p.stripeRef`)
 * — a PAID Stripe row with no stripeRef can't actually be refunded, so it must
 * not be counted here either, or the typed confirmation amount would never
 * match what the server actually refunds.
 */
export function paidStripeTotal(payments: PaymentLike[]): number {
  return payments
    .filter((p) => p.method === "STRIPE" && p.status === "PAID" && p.stripeRef)
    .reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge), 0);
}

/**
 * "Cancel + refund" is offered only for a Stripe-paid booking with at least
 * one PAID Stripe payment — never for CashApp/Zelle (those settle off-band,
 * so there's nothing here to refund automatically).
 */
export function refundEligibility(booking: BookingLike, payments: PaymentLike[]): RefundEligibility {
  const amount = paidStripeTotal(payments);
  return { eligible: booking.paymentMethod === "STRIPE" && amount > 0, amount };
}

/**
 * The admin must type the exact PAID-Stripe total before the refund button
 * enables. Tolerant of "$", commas, and whitespace; a half-cent tolerance
 * absorbs floating-point sum drift, not fat-fingering.
 */
export function amountMatches(typed: string, expected: number): boolean {
  const cleaned = typed.replace(/[$,\s]/g, "");
  if (cleaned === "") return false;
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return false;
  return Math.abs(n - expected) < 0.005;
}

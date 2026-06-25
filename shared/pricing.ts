// shared/pricing.ts
// =============================================================================
// BNP (Be Nice Properties) — single source of truth for ALL financial constants
// and the one canonical money calculation used by BOTH client and server.
//
// CONTRACT: the number the guest is QUOTED is the number that is CHARGED.
// Client and server both import calculateBreakdown() from this file so there is
// exactly one implementation. Never compute a total any other way.
//
// DELIBERATE DIVERGENCE FROM TRAD: The TRAD app ABSORBS its card fee into the
// subtotal (PRICE_UPLIFT_RATE) and shows the guest one clean number. BNP does
// the OPPOSITE on purpose — the Stripe surcharge is a VISIBLE line item, and it
// is dropped entirely for CashApp/Zelle. That is why `paymentMethod` is
// load-bearing here (it is inert in TRAD's calculateFinancialBreakdown).
// =============================================================================

// -----------------------------------------------------------------------------
// Constants (locked Phase 0)
// -----------------------------------------------------------------------------

/**
 * Stripe processing surcharge, ADDED to the guest's total as a visible line item
 * for STRIPE payments only. 3.5% flat (matches TRAD's CREDIT_CARD_RATE). Slightly
 * over-recovers Stripe's published 2.9% + $0.30 on most bookings; intentional and
 * consistent across the portfolio. Tune before going live if desired.
 */
export const CREDIT_CARD_RATE = 0.035;

/**
 * Tax rate. v1 = 0 (lodging/occupancy tax handled OUTSIDE the app for now).
 * Per-location tax (Atlanta GA hotel-motel, Antigua ABST) is deferred — flag for
 * an accountant before turning this on. The breakdown formula below already
 * threads tax through correctly so flipping this on is a one-line change.
 */
export const TAX_RATE = 0.0;

/** Default cleaning fee when a property does not override it. */
export const DEFAULT_CLEANING_FEE = 0;

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type PaymentMethod = "STRIPE" | "CASHAPP" | "ZELLE";

export interface BreakdownInput {
  /** STR: nightly subtotal for the selected range. COLIVING: the deposit amount. */
  baseAmount: number;
  /** STR only; 0 for co-living deposits and weekly rent. */
  cleaningFee?: number;
  /** Optional add-ons total. */
  extrasTotal?: number;
  /** Optional promo/discount applied before tax & surcharge. */
  promoDiscount?: number;
  /** LOAD-BEARING: STRIPE adds the surcharge line; CASHAPP/ZELLE do not. */
  paymentMethod: PaymentMethod;
}

export interface BreakdownResult {
  baseAmount: number;
  cleaningFee: number;
  extrasTotal: number;
  discount: number;
  /** base + cleaning + extras − discount (never below 0). */
  subtotal: number;
  /** TAX_RATE × subtotal. */
  tax: number;
  /** CREDIT_CARD_RATE × (subtotal + tax) for STRIPE; 0 for CASHAPP/ZELLE. */
  surcharge: number;
  /** subtotal + tax + surcharge — exactly what is charged. */
  total: number;
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

/** Round to cents. Half-up at the 1/100 boundary. */
const roundCurrency = (v: number) => Math.round(v * 100) / 100;

// -----------------------------------------------------------------------------
// Canonical breakdown — the ONLY money calculation in the app
// -----------------------------------------------------------------------------

/**
 * Compute the full price breakdown for a booking quote.
 *
 * Surcharge is computed POST-TAX (on subtotal + tax) so it fully recovers
 * Stripe's cost — Stripe charges its fee on the entire captured amount, tax
 * included. With TAX_RATE = 0 in v1 this is effectively 3.5% × subtotal, but the
 * formula is already correct for when tax is enabled.
 *
 * For CASHAPP and ZELLE the surcharge is 0: there is no processor taking a cut,
 * so the guest pays exactly subtotal + tax.
 */
export const calculateBreakdown = ({
  baseAmount,
  cleaningFee = DEFAULT_CLEANING_FEE,
  extrasTotal = 0,
  promoDiscount = 0,
  paymentMethod,
}: BreakdownInput): BreakdownResult => {
  const cf = roundCurrency(cleaningFee);
  const extras = roundCurrency(extrasTotal);
  const discount = roundCurrency(Math.max(0, promoDiscount));

  const subtotal = roundCurrency(Math.max(0, baseAmount + cf + extras - discount));
  const tax = roundCurrency(subtotal * TAX_RATE);

  const surcharge =
    paymentMethod === "STRIPE" ? roundCurrency((subtotal + tax) * CREDIT_CARD_RATE) : 0;

  const total = roundCurrency(subtotal + tax + surcharge);

  return {
    baseAmount: roundCurrency(baseAmount),
    cleaningFee: cf,
    extrasTotal: extras,
    discount,
    subtotal,
    tax,
    surcharge,
    total,
  };
};

/**
 * Convenience wrapper for the recurring weekly co-living rent charge.
 * The recurring charge is rent only (no cleaning fee, no extras). Surcharge
 * applies per charge for Stripe subscriptions; CashApp/Zelle weekly rent is
 * reconciled manually, so no surcharge.
 */
export const calculateWeeklyCharge = (
  weeklyRent: number,
  paymentMethod: PaymentMethod,
): BreakdownResult => calculateBreakdown({ baseAmount: weeklyRent, paymentMethod });

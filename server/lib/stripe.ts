// server/lib/stripe.ts
// =============================================================================
// Stripe integration. PCI scope stays minimal: we use Checkout Sessions
// (hosted) for one-time/deposit payments and Stripe Subscriptions for weekly
// co-living rent. We NEVER capture raw card data — Stripe hosts the card form.
//
// Everything is gated on STRIPE_SECRET_KEY. With only a placeholder key set,
// isStripeConfigured() is false and routes return a clear "not configured"
// error instead of throwing. Webhooks are the source of truth for payment
// state — the client is never trusted.
// =============================================================================

import Stripe from "stripe";
import { CREDIT_CARD_RATE } from "@shared/pricing";
import type { StripeChargeMetadata } from "./paymentMetadata";
import { assertCompleteMetadata } from "./paymentMetadata";

const secret = process.env.STRIPE_SECRET_KEY;

// A real key starts with sk_test_ / sk_live_ and isn't our placeholder.
export function isStripeConfigured(): boolean {
  return Boolean(secret && secret.startsWith("sk_") && !secret.includes("placeholder"));
}

// Pin the API version so the SDK and the webhook endpoint agree on payload
// shapes (the handler reads version-sensitive fields like invoice.subscription
// vs invoice.parent). Keep this in lockstep with the webhook endpoint's
// version in the Stripe dashboard.
export const stripe: Stripe | null = isStripeConfigured()
  ? new Stripe(secret as string, { apiVersion: "2025-08-27.basil" })
  : null;

function requireStripe(): Stripe {
  if (!stripe) {
    throw Object.assign(
      new Error("Stripe is not configured — set a test secret key (sk_test_…) in STRIPE_SECRET_KEY"),
      { status: 503 },
    );
  }
  return stripe;
}

const toCents = (dollars: number) => Math.round(dollars * 100);

/**
 * One-time Checkout Session (STR full payment or co-living deposit).
 * `amount` is the FINAL charged total (already includes surcharge).
 */
export async function createCheckoutSession(opts: {
  amount: number;
  description: string;
  reference: string;
  guestEmail: string;
  successUrl: string;
  cancelUrl: string;
  // Full Stripe Metadata Contract — stamped on BOTH the session and the
  // underlying PaymentIntent so reconciliation can map the charge by metadata.
  metadata: StripeChargeMetadata;
}): Promise<Stripe.Checkout.Session> {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  // Carry the booking reference alongside the contract for the session lookup.
  const sessionMetadata = { ...opts.metadata, reference: opts.reference, kind: "one_time" };
  return s.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: toCents(opts.amount),
          product_data: { name: opts.description },
        },
      },
    ],
    client_reference_id: opts.reference,
    metadata: sessionMetadata,
    // The contract must live on the PaymentIntent itself (the charge), not only
    // the session, so reconciliation by metadata works against the charge.
    payment_intent_data: { metadata: opts.metadata },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

/**
 * Weekly co-living rent subscription. Creates an inline weekly recurring price
 * for the rent + surcharge, and starts billing one week out (deposit covers the
 * first period via the separate Checkout). Returns the Checkout Session that
 * collects the card and starts the subscription.
 */
export async function createWeeklySubscriptionCheckout(opts: {
  weeklyRent: number;
  reference: string;
  guestEmail: string;
  roomName: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<Stripe.Checkout.Session> {
  const s = requireStripe();
  // Surcharge is applied to the weekly charge (Stripe takes its cut each week).
  const weeklyTotal = opts.weeklyRent * (1 + CREDIT_CARD_RATE);
  return s.checkout.sessions.create({
    mode: "subscription",
    customer_email: opts.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: toCents(weeklyTotal),
          recurring: { interval: "week" },
          product_data: { name: `Weekly rent — ${opts.roomName}` },
        },
      },
    ],
    client_reference_id: opts.reference,
    metadata: { reference: opts.reference, kind: "weekly_subscription" },
    subscription_data: { metadata: { reference: opts.reference } },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl,
  });
}

/** Verify + construct a webhook event from the raw body + signature. */
export function constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  const s = requireStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret || whSecret.includes("placeholder")) {
    throw Object.assign(new Error("STRIPE_WEBHOOK_SECRET not configured"), { status: 503 });
  }
  return s.webhooks.constructEvent(rawBody, signature, whSecret);
}

// =============================================================================
// PHASE 4 — saved-card-on-file PaymentIntents (co-living lease payments). We use
// PaymentIntents + a Stripe Customer (NOT Stripe Subscriptions, per the locked
// decision) so our own scheduler drives recurring rent. Card data never touches
// our server — the client collects it with Stripe Elements (PaymentElement),
// and `setup_future_usage` saves it to the Customer for off-session charges.
// =============================================================================

/** Get or create the Stripe Customer for a guest. Reference only — no card data. */
export async function ensureCustomer(opts: {
  existingCustomerId?: string | null;
  email: string;
  name: string;
}): Promise<string> {
  const s = requireStripe();
  if (opts.existingCustomerId) return opts.existingCustomerId;
  const customer = await s.customers.create({ email: opts.email, name: opts.name });
  return customer.id;
}

/**
 * Create the FIRST-PAYMENT PaymentIntent for a co-living lease: charges the
 * amount now AND saves the card to the Customer for future off-session rent
 * (`setup_future_usage: "off_session"`). Returns the PI (client confirms it with
 * Elements using the client_secret). Full metadata is enforced.
 */
export async function createFirstPaymentIntent(opts: {
  amount: number; // final charged total in dollars (already includes surcharge)
  customerId: string;
  metadata: StripeChargeMetadata;
  idempotencyKey: string;
}): Promise<Stripe.PaymentIntent> {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  return s.paymentIntents.create(
    {
      amount: toCents(opts.amount),
      currency: "usd",
      customer: opts.customerId,
      // Save the card for later off-session scheduled rent.
      setup_future_usage: "off_session",
      automatic_payment_methods: { enabled: true },
      metadata: opts.metadata,
    },
    { idempotencyKey: opts.idempotencyKey },
  );
}

/**
 * Charge a saved card OFF-SESSION for a scheduled rent installment or a late fee.
 * Uses the customer's default saved payment method. Throws on decline (caller
 * maps that to the FAILED path). Idempotency key prevents double-charging on
 * scheduler re-runs.
 */
export async function chargeSavedCard(opts: {
  amount: number;
  customerId: string;
  paymentMethodId: string;
  metadata: StripeChargeMetadata;
  idempotencyKey: string;
}): Promise<Stripe.PaymentIntent> {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  return s.paymentIntents.create(
    {
      amount: toCents(opts.amount),
      currency: "usd",
      customer: opts.customerId,
      payment_method: opts.paymentMethodId,
      off_session: true,
      confirm: true, // charge immediately
      metadata: opts.metadata,
    },
    { idempotencyKey: opts.idempotencyKey },
  );
}

/** Retrieve a PaymentIntent (e.g. to read the saved payment_method after first pay). */
export async function retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
  return requireStripe().paymentIntents.retrieve(id);
}

/**
 * Refund a captured PaymentIntent in full (used to return a refundable security
 * deposit at move-out). Idempotency key prevents a double refund on retry.
 */
export async function refundPaymentIntent(opts: {
  paymentIntentId: string;
  idempotencyKey: string;
}): Promise<Stripe.Refund> {
  return requireStripe().refunds.create(
    { payment_intent: opts.paymentIntentId },
    { idempotencyKey: opts.idempotencyKey },
  );
}

export const stripePublishableConfigured = (): boolean =>
  Boolean(process.env.VITE_STRIPE_PUBLIC_KEY?.startsWith("pk_"));

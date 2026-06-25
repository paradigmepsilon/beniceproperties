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

const secret = process.env.STRIPE_SECRET_KEY;

// A real key starts with sk_test_ / sk_live_ and isn't our placeholder.
export function isStripeConfigured(): boolean {
  return Boolean(secret && secret.startsWith("sk_") && !secret.includes("placeholder"));
}

export const stripe: Stripe | null = isStripeConfigured()
  ? new Stripe(secret as string)
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
}): Promise<Stripe.Checkout.Session> {
  const s = requireStripe();
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
    metadata: { reference: opts.reference, kind: "one_time" },
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

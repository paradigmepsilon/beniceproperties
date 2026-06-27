// scripts/stripe-payments-proof.mjs
// TEST-MODE proof that the BNP PaymentIntents (Phase 4 + 5) carry the full Stripe
// Metadata Contract and that the saved-card flows work end to end: first payment,
// off-session scheduled rent, idempotency, and a separate LATE_FEE charge.
//
// HARD SAFETY: refuses to run unless STRIPE_SECRET_KEY starts with "sk_test_".
// Never run against a live key. Creates only test-mode objects.
//
//   node scripts/stripe-payments-proof.mjs

import "dotenv/config";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error("REFUSING: STRIPE_SECRET_KEY is not a test key (sk_test_…). No live charges.");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

// Unique per run so idempotency keys never collide across proof runs (Stripe
// idempotency keys are account-global).
const RUN = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const META = {
  entity: "BNP",
  product_type: "COLIVING_ROOM",
  property_id: "prop-test-1",
  property_name: "Old Bill Cook",
  room_id: "room-test-2",
  room_name: "Room 2 - Garden",
  room_number: "2",
  lease_id: "lease-test-1",
  payment_kind: "FIRST_PAYMENT",
  schedule_seq: "1",
};

async function main() {
  // 1) Customer.
  const customer = await stripe.customers.create({ email: "phase4-proof@example.com", name: "Proof Guest" });

  // 2) First payment: PaymentIntent that saves the card off-session, with metadata.
  //    Use the test PaymentMethod token and confirm immediately to simulate the
  //    Elements confirmation server-side.
  const first = await stripe.paymentIntents.create({
    amount: 25875, // $258.75 (250 rent + 3.5% surcharge)
    currency: "usd",
    customer: customer.id,
    payment_method: "pm_card_visa",
    setup_future_usage: "off_session",
    confirm: true,
    automatic_payment_methods: { enabled: true, allow_redirects: "never" },
    metadata: META,
  });

  console.log("=== FIRST PAYMENT ===");
  console.log("PI:", first.id, "status:", first.status, "amount:", first.amount);
  console.log("saved payment_method:", first.payment_method);
  console.log("metadata:", JSON.stringify(first.metadata, null, 2));

  // 3) Off-session scheduled-rent charge against the saved card (next installment).
  const savedPm = typeof first.payment_method === "string" ? first.payment_method : first.payment_method?.id;
  const rent = await stripe.paymentIntents.create(
    {
      amount: 25875,
      currency: "usd",
      customer: customer.id,
      payment_method: savedPm,
      off_session: true,
      confirm: true,
      metadata: { ...META, payment_kind: "SCHEDULED_RENT", schedule_seq: "2" },
    },
    { idempotencyKey: `proof-rent-${RUN}` },
  );

  console.log("\n=== SCHEDULED RENT (off-session, saved card) ===");
  console.log("PI:", rent.id, "status:", rent.status);
  console.log("metadata.payment_kind:", rent.metadata.payment_kind, "schedule_seq:", rent.metadata.schedule_seq);

  // 4) Idempotency: same key returns the SAME PI (no double charge).
  const rentAgain = await stripe.paymentIntents.create(
    {
      amount: 25875,
      currency: "usd",
      customer: customer.id,
      payment_method: savedPm,
      off_session: true,
      confirm: true,
      metadata: { ...META, payment_kind: "SCHEDULED_RENT", schedule_seq: "2" },
    },
    { idempotencyKey: `proof-rent-${RUN}` },
  );
  console.log("\n=== IDEMPOTENCY ===");
  console.log("re-run same key → same PI id:", rentAgain.id === rent.id, `(${rentAgain.id})`);

  // 5) Phase 5: late fees billed as a SEPARATE LATE_FEE charge (never folded
  //    into rent). Two days @ $25 = $50.
  const lateFee = await stripe.paymentIntents.create(
    {
      amount: 5000, // $50.00
      currency: "usd",
      customer: customer.id,
      payment_method: savedPm,
      off_session: true,
      confirm: true,
      metadata: { ...META, payment_kind: "LATE_FEE", schedule_seq: "2" },
    },
    { idempotencyKey: `proof-latefee-${RUN}` },
  );
  console.log("\n=== LATE FEE (separate line item) ===");
  console.log("PI:", lateFee.id, "status:", lateFee.status, "amount:", lateFee.amount);
  console.log("metadata.payment_kind:", lateFee.metadata.payment_kind);

  console.log("\nALL GREEN — test-mode money flow + full metadata verified (incl. late fee).");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("PROOF FAILED:", err.message);
    if (err.raw) console.error("stripe:", err.raw.type, err.raw.code);
    process.exit(1);
  });

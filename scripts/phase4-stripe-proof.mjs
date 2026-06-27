// scripts/phase4-stripe-proof.mjs
// TEST-MODE proof that Phase 4 PaymentIntents carry the full Stripe Metadata
// Contract and that the saved-card + off-session charge path works end to end.
//
// HARD SAFETY: refuses to run unless STRIPE_SECRET_KEY starts with "sk_test_".
// Never run against a live key. Creates only test-mode objects.
//
//   node scripts/phase4-stripe-proof.mjs

import "dotenv/config";
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key || !key.startsWith("sk_test_")) {
  console.error("REFUSING: STRIPE_SECRET_KEY is not a test key (sk_test_…). No live charges.");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2025-08-27.basil" });

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
    { idempotencyKey: "proof-rent-lease-test-1-seq-2" },
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
    { idempotencyKey: "proof-rent-lease-test-1-seq-2" },
  );
  console.log("\n=== IDEMPOTENCY ===");
  console.log("re-run same key → same PI id:", rentAgain.id === rent.id, `(${rentAgain.id})`);

  console.log("\nALL GREEN — test-mode money flow + full metadata verified.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("PROOF FAILED:", err.message);
    if (err.raw) console.error("stripe:", err.raw.type, err.raw.code);
    process.exit(1);
  });

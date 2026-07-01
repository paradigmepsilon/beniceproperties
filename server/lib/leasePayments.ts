// server/lib/leasePayments.ts
// =============================================================================
// Co-living lease PAYMENTS (Phase 4). Saved-card-on-file model with OUR OWN
// scheduler (not Stripe Subscriptions).
//
//   startFirstPayment()   after signature, creates a Stripe Customer + a
//                         first-payment PaymentIntent (schedule_seq 1) that ALSO
//                         saves the card (setup_future_usage). Returns the client
//                         secret for the guest to confirm with Elements. The
//                         lease becomes ACTIVE only when the PI succeeds — handled
//                         in finalizeFirstPayment() (called from the webhook).
//
//   finalizeFirstPayment() on payment_intent.succeeded for a FIRST_PAYMENT:
//                         mark schedule_seq 1 PAID, persist the saved card +
//                         customer on the lease, move lease → ACTIVE. Idempotent.
//
//   runScheduledRentSweep() the scheduler job: find due CARD_ON_FILE installments
//                         and charge the saved card off-session. Success → PAID;
//                         decline → FAILED (Phase 5 owns dunning). Idempotent: a
//                         row already carrying a PaymentIntent id, or not in a
//                         chargeable status, is skipped; a per-(lease,seq) Stripe
//                         idempotency key prevents double charges on re-runs.
//
// Every PaymentIntent's metadata is built by paymentMetadata.ts so the contract
// is always complete. No card data is ever stored in our DB.
// =============================================================================

import { storage } from "../storage";
import {
  ensureCustomer,
  createFirstPaymentIntent,
  chargeSavedCard,
  retrievePaymentIntent,
  refundPaymentIntent,
} from "./stripe";
import { buildLeaseChargeMetadata } from "./paymentMetadata";
import { calculateBreakdown } from "@shared/pricing";
import { LeaseError } from "./lease";
import { handleChargeFailure, billAccruedLateFees } from "./dunning";
import { onLeaseActivated, onPaymentReceived, onDepositReceived } from "./lifecycle";
import { log } from "../server-log";
import type { Lease, Property, LeaseRoom, PaymentScheduleRow } from "@shared/schema";

/** Statuses a scheduled installment can be charged from. */
const CHARGEABLE_STATUSES = new Set(["SCHEDULED", "DUE"]);

interface LeaseContext {
  lease: Lease;
  property: Property;
  rooms: LeaseRoom[];
}

async function loadLeaseContext(leaseId: string): Promise<LeaseContext> {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property not found", 500);
  const rooms = await storage.getLeaseRooms(lease.id);
  return { lease, property, rooms };
}

/**
 * The amount actually charged for an installment. Card-on-file charges carry the
 * Stripe surcharge (we pay Stripe per charge); the stored `amount` is rent only,
 * so the surcharge is added on at charge time via the canonical breakdown.
 */
function chargeTotalFor(rentAmount: number): number {
  return calculateBreakdown({ baseAmount: rentAmount, paymentMethod: "STRIPE" }).total;
}

// ---------------------------------------------------------------------------
// First payment (schedule_seq 1) + save card
// ---------------------------------------------------------------------------

export interface StartFirstPaymentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  portalToken: string | null;
}

export async function startFirstPayment(leaseId: string): Promise<StartFirstPaymentResult> {
  const { lease, property, rooms } = await loadLeaseContext(leaseId);

  // Gate: must be signed and awaiting first payment.
  if (lease.status !== "PENDING_FIRST_PAYMENT") {
    throw new LeaseError(
      `First payment can only be taken once the lease is signed (status is ${lease.status})`,
      409,
    );
  }
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) throw new LeaseError("Lease has no first installment", 500);
  if (first.status === "PAID") throw new LeaseError("First payment is already paid", 409);

  const guest = await storage.getGuest(lease.guestId);
  if (!guest) throw new LeaseError("Lease guest not found", 500);

  const customerId = await ensureCustomer({
    existingCustomerId: lease.stripeCustomerId,
    email: guest.email,
    name: guest.name,
  });
  if (customerId !== lease.stripeCustomerId) {
    await storage.updateLease(lease.id, { stripeCustomerId: customerId });
  }

  const amount = chargeTotalFor(parseFloat(first.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "FIRST_PAYMENT",
    scheduleSeq: 1,
  });

  const pi = await createFirstPaymentIntent({
    amount,
    customerId,
    metadata,
    // Stable per-lease first-payment key: retrying startFirstPayment reuses the
    // same PI instead of creating duplicates.
    idempotencyKey: `lease-first-${lease.id}`,
  });

  // Record the PI id on the installment so the webhook can match it.
  await storage.updateScheduleRow(first.id, { stripePaymentIntentId: pi.id });

  if (!pi.client_secret) throw new LeaseError("Stripe did not return a client secret", 502);
  return {
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    amount,
    portalToken: lease.portalToken ?? null,
  };
}

/**
 * Finalize a successful FIRST_PAYMENT (called from the webhook). Idempotent:
 * if the lease is already ACTIVE / row already PAID, it no-ops.
 */
export async function finalizeFirstPayment(paymentIntentId: string): Promise<void> {
  const lease = await findLeaseByFirstPaymentIntent(paymentIntentId);
  if (!lease) return; // not a first-payment PI we track
  if (lease.status === "ACTIVE") return; // already finalized

  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) return;

  // Read the saved payment method off the PI so future rent can charge it.
  let savedPaymentMethodId: string | null = lease.stripePaymentMethodId ?? null;
  try {
    const pi = await retrievePaymentIntent(paymentIntentId);
    if (typeof pi.payment_method === "string") savedPaymentMethodId = pi.payment_method;
    else if (pi.payment_method && "id" in pi.payment_method) savedPaymentMethodId = pi.payment_method.id;
  } catch (err) {
    log(`could not read saved payment method for ${paymentIntentId}: ${(err as Error).message}`, "stripe");
  }

  if (first.status !== "PAID") {
    await storage.updateScheduleRow(first.id, {
      status: "PAID",
      paidAt: new Date(),
      stripePaymentIntentId: paymentIntentId,
    });
  }
  await storage.updateLease(lease.id, {
    status: "ACTIVE",
    stripePaymentMethodId: savedPaymentMethodId ?? undefined,
  });
  // Room occupation is owned by the DEPOSIT step (finalizeDepositPayment) — the
  // deposit is what secures the room. By the time a first payment finalizes the
  // room is already OCCUPIED. Re-assert defensively in case a deposit-less legacy
  // lease reaches here, so an ACTIVE lease never has an AVAILABLE room.
  const rooms = await storage.getLeaseRooms(lease.id);
  for (const lr of rooms) {
    const room = await storage.getRoom(lr.roomId);
    if (room && room.status !== "OCCUPIED") {
      await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
    }
  }
  log(`lease ${lease.id} ACTIVE via first payment ${paymentIntentId}`, "stripe");

  // Fire activation lifecycle (welcome + schedule recap + admin notice). The
  // first installment's receipt is also sent (idempotent). Non-fatal on error.
  try {
    await onLeaseActivated(lease.id);
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (property && guest) {
      await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: 1, amount: first.amount } });
    }
  } catch (err) {
    log(`lifecycle activation error lease ${lease.id}: ${(err as Error).message}`, "stripe");
  }
}

async function findLeaseByFirstPaymentIntent(piId: string): Promise<Lease | undefined> {
  // The first installment carries the PI id; find the lease that owns it.
  const leases = await storage.getLeases();
  for (const lease of leases) {
    const schedule = await storage.getScheduleByLease(lease.id);
    const first = schedule.find((s) => s.scheduleSeq === 1);
    if (first?.stripePaymentIntentId === piId) return lease;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Deposit (secures the room) + first-week rent
// ---------------------------------------------------------------------------
//
// The DEPOSIT is the securing payment. Flow:
//   1. startDepositPayment() — after signature, create a BOOKING_DEPOSIT PI for
//      the snapshotted deposit that ALSO saves the card (setup_future_usage).
//   2. finalizeDepositPayment() — on that PI succeeding (webhook): mark the
//      deposit PAID, save the card, OCCUPY the room(s) — the room is now secured
//      — then immediately charge the first week's rent (schedule_seq 1)
//      off-session on the saved card. If the first-week charge succeeds the lease
//      goes ACTIVE; if it declines the lease stays PENDING_FIRST_PAYMENT and the
//      guest can retry from the portal (dunning owns the follow-up).
//
// Room occupation lives HERE, not in finalizeFirstPayment — paying the deposit is
// what secures the room.

export interface StartDepositPaymentResult {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  portalToken: string | null;
}

export async function startDepositPayment(leaseId: string): Promise<StartDepositPaymentResult> {
  const { lease, property, rooms } = await loadLeaseContext(leaseId);

  // Gate: signed, awaiting payment, deposit not yet paid.
  if (lease.status !== "PENDING_FIRST_PAYMENT") {
    throw new LeaseError(
      `The deposit can only be taken once the lease is signed (status is ${lease.status})`,
      409,
    );
  }
  if (lease.depositStatus === "PAID") throw new LeaseError("The deposit is already paid", 409);

  const depositAmount = parseFloat(lease.depositAmountSnapshot ?? "0");
  if (!(depositAmount > 0)) {
    // No deposit configured on the room(s). Nothing to secure with — fall back to
    // the first-week payment as the securing charge. Surface a clear error so the
    // owner sets a deposit rather than silently skipping the securing step.
    throw new LeaseError(
      "No deposit is set for this room. Set a deposit amount before taking a booking.",
      409,
    );
  }

  const guest = await storage.getGuest(lease.guestId);
  if (!guest) throw new LeaseError("Lease guest not found", 500);

  const customerId = await ensureCustomer({
    existingCustomerId: lease.stripeCustomerId,
    email: guest.email,
    name: guest.name,
  });
  if (customerId !== lease.stripeCustomerId) {
    await storage.updateLease(lease.id, { stripeCustomerId: customerId });
  }

  // The deposit is a flat refundable amount — NOT rent — so no card surcharge is
  // added (surcharge only applies to rent charges via chargeTotalFor()).
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "BOOKING_DEPOSIT",
    scheduleSeq: null,
  });

  const pi = await createFirstPaymentIntent({
    amount: depositAmount,
    customerId,
    metadata,
    // Stable per-lease deposit key: retrying reuses the same PI, no duplicates.
    idempotencyKey: `lease-deposit-${lease.id}`,
  });

  await storage.updateLease(lease.id, { depositStripePaymentIntentId: pi.id });

  if (!pi.client_secret) throw new LeaseError("Stripe did not return a client secret", 502);
  return {
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    amount: depositAmount,
    portalToken: lease.portalToken ?? null,
  };
}

/**
 * Finalize a successful deposit (called from the webhook). Idempotent. Marks the
 * deposit PAID, saves the card, OCCUPIES the room(s) — the room is now secured —
 * then charges the first week's rent off-session. Lease → ACTIVE iff that
 * first-week charge succeeds; otherwise it stays PENDING_FIRST_PAYMENT.
 */
export async function finalizeDepositPayment(paymentIntentId: string): Promise<void> {
  const lease = await findLeaseByDepositPaymentIntent(paymentIntentId);
  if (!lease) return; // not a deposit PI we track
  if (lease.depositStatus === "PAID") return; // already finalized

  // Read the saved payment method off the deposit PI so rent can charge it.
  let savedPaymentMethodId: string | null = lease.stripePaymentMethodId ?? null;
  try {
    const pi = await retrievePaymentIntent(paymentIntentId);
    if (typeof pi.payment_method === "string") savedPaymentMethodId = pi.payment_method;
    else if (pi.payment_method && "id" in pi.payment_method) savedPaymentMethodId = pi.payment_method.id;
  } catch (err) {
    log(`could not read saved payment method for deposit ${paymentIntentId}: ${(err as Error).message}`, "stripe");
  }

  await storage.updateLease(lease.id, {
    depositStatus: "PAID",
    depositPaidAt: new Date(),
    depositStripePaymentIntentId: paymentIntentId,
    stripePaymentMethodId: savedPaymentMethodId ?? undefined,
  });

  // Secure the room(s): deposit paid → OCCUPIED.
  const leaseRooms = await storage.getLeaseRooms(lease.id);
  for (const lr of leaseRooms) {
    await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
  }
  log(`lease ${lease.id} deposit PAID via ${paymentIntentId}; room(s) secured`, "stripe");

  // Deposit receipt (non-fatal).
  try {
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (property && guest) await onDepositReceived({ lease, property, guest });
  } catch (err) {
    log(`deposit receipt error lease ${lease.id}: ${(err as Error).message}`, "stripe");
  }

  // Now charge the first week's rent (schedule_seq 1) off-session on the saved
  // card. Success → lease ACTIVE. Decline → stays PENDING_FIRST_PAYMENT (guest
  // retries from the portal; dunning owns the follow-up).
  if (savedPaymentMethodId) {
    await chargeFirstWeekOffSession(lease.id, savedPaymentMethodId).catch((err) => {
      log(`first-week charge after deposit failed lease ${lease.id}: ${(err as Error).message}`, "stripe");
    });
  }
}

async function findLeaseByDepositPaymentIntent(piId: string): Promise<Lease | undefined> {
  const leases = await storage.getLeases();
  return leases.find((l) => l.depositStripePaymentIntentId === piId);
}

/**
 * Refund a lease's security deposit (admin action, e.g. at move-out). Full refund
 * of the deposit PaymentIntent; marks depositStatus REFUNDED. Idempotent: a
 * non-PAID deposit (or already REFUNDED) is a no-op guard.
 */
export async function refundDeposit(leaseId: string): Promise<void> {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.depositStatus === "REFUNDED") return;
  if (lease.depositStatus !== "PAID" || !lease.depositStripePaymentIntentId) {
    throw new LeaseError("This lease has no paid deposit to refund", 409);
  }
  await refundPaymentIntent({
    paymentIntentId: lease.depositStripePaymentIntentId,
    idempotencyKey: `lease-deposit-refund-${lease.id}`,
  });
  await storage.updateLease(lease.id, { depositStatus: "REFUNDED" });
  log(`lease ${lease.id} deposit REFUNDED`, "stripe");
}

/**
 * Charge schedule_seq 1 (first week's rent) off-session on the saved card, right
 * after the deposit secures the room. On success: seq 1 PAID, lease ACTIVE,
 * activation lifecycle fires. Idempotent per (lease, seq 1).
 */
async function chargeFirstWeekOffSession(leaseId: string, paymentMethodId: string): Promise<void> {
  const { lease, property, rooms } = await loadLeaseContext(leaseId);
  if (lease.status === "ACTIVE") return;
  if (!lease.stripeCustomerId) throw new LeaseError("Lease has no Stripe customer", 500);

  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) throw new LeaseError("Lease has no first installment", 500);
  if (first.status === "PAID") return;

  const amount = chargeTotalFor(parseFloat(first.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "FIRST_PAYMENT",
    scheduleSeq: 1,
  });

  const pi = await chargeSavedCard({
    amount,
    customerId: lease.stripeCustomerId,
    paymentMethodId,
    metadata,
    idempotencyKey: `lease-first-${lease.id}`,
  });

  await storage.updateScheduleRow(first.id, {
    status: "PAID",
    paidAt: new Date(),
    stripePaymentIntentId: pi.id,
  });
  await storage.updateLease(lease.id, { status: "ACTIVE" });
  log(`lease ${lease.id} ACTIVE — first week charged off-session ${pi.id}`, "stripe");

  // Activation lifecycle (welcome + schedule recap + admin notice) + first receipt.
  try {
    await onLeaseActivated(lease.id);
    const guest = await storage.getGuest(lease.guestId);
    if (guest) {
      await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: 1, amount: first.amount } });
    }
  } catch (err) {
    log(`lifecycle activation error lease ${lease.id}: ${(err as Error).message}`, "stripe");
  }
}

// ---------------------------------------------------------------------------
// Scheduled rent sweep (the scheduler job)
// ---------------------------------------------------------------------------

export interface RentSweepResult {
  considered: number;
  charged: number;
  failed: number;
  skipped: number;
}

/**
 * Charge every CARD_ON_FILE installment that is due (due_date <= today) and still
 * chargeable. `today` is injectable for tests. Returns counts. Never throws on a
 * single decline — it records FAILED and moves on.
 */
export async function runScheduledRentSweep(today: string = todayYmd()): Promise<RentSweepResult> {
  const result: RentSweepResult = { considered: 0, charged: 0, failed: 0, skipped: 0 };

  // Only ACTIVE leases have ongoing rent. (PENDING_FIRST_PAYMENT seq 1 is handled
  // by the first-payment flow, not the sweep.)
  const leases = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases) {
    if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) {
      continue; // no saved card → nothing to auto-charge (shouldn't happen for ACTIVE)
    }
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);

    for (const row of schedule) {
      if (row.scheduleSeq === 1) continue; // first payment handled elsewhere
      if (row.paymentMethod !== "CARD_ON_FILE") continue; // manual rows are not auto-charged
      if (row.dueDate > today) continue; // not due yet
      if (!CHARGEABLE_STATUSES.has(row.status)) {
        continue; // already PAID/FAILED/WAIVED/LATE — idempotent skip
      }
      // Idempotency: if a PI id is already recorded, don't charge again.
      if (row.stripePaymentIntentId) {
        result.skipped += 1;
        continue;
      }

      result.considered += 1;
      await chargeInstallment(lease, property, rooms, row, result);
    }
  }

  if (result.considered > 0) {
    log(
      `rent sweep: ${result.charged} charged, ${result.failed} failed, ${result.skipped} skipped`,
      "scheduler",
    );
  }
  return result;
}

async function chargeInstallment(
  lease: Lease,
  property: Property,
  rooms: LeaseRoom[],
  row: PaymentScheduleRow,
  result: RentSweepResult,
): Promise<void> {
  const amount = chargeTotalFor(parseFloat(row.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "SCHEDULED_RENT",
    scheduleSeq: row.scheduleSeq,
  });

  try {
    const pi = await chargeSavedCard({
      amount,
      customerId: lease.stripeCustomerId!,
      paymentMethodId: lease.stripePaymentMethodId!,
      metadata,
      // One charge per (lease, installment) — re-runs hit the same key.
      idempotencyKey: `lease-rent-${lease.id}-seq-${row.scheduleSeq}`,
    });

    if (pi.status === "succeeded") {
      await storage.updateScheduleRow(row.id, {
        status: "PAID",
        paidAt: new Date(),
        stripePaymentIntentId: pi.id,
      });
      result.charged += 1;
      // Any late fees accrued against this installment are now billed as a
      // SEPARATE charge (never folded into rent).
      try {
        await billAccruedLateFees({ lease, property, rooms, scheduleSeq: row.scheduleSeq });
      } catch (feeErr) {
        log(`late-fee billing failed lease ${lease.id} seq ${row.scheduleSeq}: ${(feeErr as Error).message}`, "scheduler");
      }
      // Payment-received receipt (idempotent per installment).
      try {
        const guest = await storage.getGuest(lease.guestId);
        if (guest) {
          await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: row.scheduleSeq, amount: row.amount } });
        }
      } catch (rcptErr) {
        log(`receipt error lease ${lease.id} seq ${row.scheduleSeq}: ${(rcptErr as Error).message}`, "scheduler");
      }
    } else {
      // requires_action / processing etc. — record the PI, leave as DUE so the
      // webhook can settle it; do not double-charge next sweep (PI id set).
      await storage.updateScheduleRow(row.id, {
        status: "DUE",
        stripePaymentIntentId: pi.id,
      });
      result.skipped += 1;
    }
  } catch (err) {
    // Decline / card error → FAILED, then the dunning failure path (UO flag +
    // fix-card message).
    const piId = (err as { raw?: { payment_intent?: { id?: string } } })?.raw?.payment_intent?.id;
    const failedRow =
      (await storage.updateScheduleRow(row.id, {
        status: "FAILED",
        stripePaymentIntentId: piId ?? row.stripePaymentIntentId ?? null,
      })) ?? row;
    result.failed += 1;
    log(`rent charge FAILED lease ${lease.id} seq ${row.scheduleSeq}: ${(err as Error).message}`, "scheduler");
    try {
      const guest = await storage.getGuest(lease.guestId);
      if (guest) {
        await handleChargeFailure({
          lease,
          guest,
          scheduleRow: failedRow,
          reason: (err as Error).message,
        });
      }
    } catch (notifyErr) {
      log(`failure-path error lease ${lease.id} seq ${row.scheduleSeq}: ${(notifyErr as Error).message}`, "scheduler");
    }
  }
}

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

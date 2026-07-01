// server/lib/leasePayments.test.ts
// Phase 4 — co-living payment flows. Mocks storage + the Stripe wrapper so no
// network/DB is touched. Locks the money-safety invariants:
//   - first payment only from PENDING_FIRST_PAYMENT, saves card, never charges twice
//   - finalize moves lease → ACTIVE, marks seq 1 PAID, occupies rooms, idempotent
//   - the rent sweep charges ONLY due CARD_ON_FILE rows, skips manual/paid/future/
//     already-charged (idempotency), and a decline marks the row FAILED
//   - the Stripe surcharge is added to the charged amount

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLease: vi.fn(),
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  getLeaseRooms: vi.fn(),
  getScheduleByLease: vi.fn(),
  getGuest: vi.fn(),
  updateLease: vi.fn(),
  updateScheduleRow: vi.fn(),
  updateRoom: vi.fn(),
  hasLifecycleEvent: vi.fn(),
  recordLifecycleEvent: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({
  ensureCustomer: vi.fn(),
  createFirstPaymentIntent: vi.fn(),
  chargeSavedCard: vi.fn(),
  retrievePaymentIntent: vi.fn(),
  refundPaymentIntent: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);

import {
  startFirstPayment,
  finalizeFirstPayment,
  startDepositPayment,
  finalizeDepositPayment,
  refundDeposit,
  runScheduledRentSweep,
} from "./leasePayments";
import { LeaseError } from "./lease";

const PROP = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP", location: "Atlanta" };
const ROOMS = [{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" }];

function lease(overrides: Record<string, unknown> = {}) {
  return {
    id: "lease-1",
    propertyId: "prop-1",
    guestId: "g1",
    status: "PENDING_FIRST_PAYMENT",
    stripeCustomerId: null,
    stripePaymentMethodId: null,
    ...overrides,
  };
}
function schedRow(seq: number, overrides: Record<string, unknown> = {}) {
  return {
    id: `row-${seq}`,
    scheduleSeq: seq,
    dueDate: "2026-07-01",
    amount: "250",
    status: "SCHEDULED",
    paymentMethod: "CARD_ON_FILE",
    stripePaymentIntentId: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("startFirstPayment", () => {
  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
    mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1)]);
    mockStorage.updateLease.mockResolvedValue(undefined);
    mockStorage.updateScheduleRow.mockResolvedValue(undefined);
    mockStripe.ensureCustomer.mockResolvedValue("cus_123");
    mockStripe.createFirstPaymentIntent.mockResolvedValue({
      id: "pi_first_1",
      client_secret: "pi_first_1_secret",
    });
  });

  it("creates a customer + first-payment PI and records its id, with surcharge added", async () => {
    mockStorage.getLease.mockResolvedValue(lease());
    const res = await startFirstPayment("lease-1");

    expect(res.clientSecret).toBe("pi_first_1_secret");
    // 250 rent + 3.5% surcharge = 258.75
    expect(res.amount).toBe(258.75);
    const piArgs = mockStripe.createFirstPaymentIntent.mock.calls[0][0];
    expect(piArgs.amount).toBe(258.75);
    expect(piArgs.customerId).toBe("cus_123");
    expect(piArgs.metadata.payment_kind).toBe("FIRST_PAYMENT");
    expect(piArgs.metadata.schedule_seq).toBe("1");
    expect(piArgs.idempotencyKey).toBe("lease-first-lease-1");
    // PI id recorded on the installment for webhook matching.
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith("row-1", { stripePaymentIntentId: "pi_first_1" });
  });

  it("refuses if the lease is not PENDING_FIRST_PAYMENT", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ status: "ACTIVE" }));
    await expect(startFirstPayment("lease-1")).rejects.toBeInstanceOf(LeaseError);
    expect(mockStripe.createFirstPaymentIntent).not.toHaveBeenCalled();
  });

  it("refuses if the first installment is already paid", async () => {
    mockStorage.getLease.mockResolvedValue(lease());
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1, { status: "PAID" })]);
    await expect(startFirstPayment("lease-1")).rejects.toThrow(/already paid/i);
  });
});

describe("finalizeFirstPayment", () => {
  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
    mockStorage.updateLease.mockResolvedValue(undefined);
    mockStorage.updateScheduleRow.mockResolvedValue(undefined);
    mockStorage.updateRoom.mockResolvedValue(undefined);
    // Defensive re-occupy path: a deposit-less legacy lease reaching first payment
    // finds its room still AVAILABLE and flips it OCCUPIED.
    mockStorage.getRoom.mockResolvedValue({ id: "r1", status: "AVAILABLE" });
    mockStripe.retrievePaymentIntent.mockResolvedValue({ id: "pi_first_1", payment_method: "pm_saved_1" });
  });

  it("marks seq 1 PAID, saves the card on the lease, activates it, and occupies rooms", async () => {
    mockStorage.getLeases.mockResolvedValue([lease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1, { stripePaymentIntentId: "pi_first_1" })]);

    await finalizeFirstPayment("pi_first_1");

    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith(
      "row-1",
      expect.objectContaining({ status: "PAID" }),
    );
    expect(mockStorage.updateLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ status: "ACTIVE", stripePaymentMethodId: "pm_saved_1" }),
    );
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
  });

  it("is idempotent: a lease already ACTIVE is left alone", async () => {
    mockStorage.getLeases.mockResolvedValue([lease({ status: "ACTIVE" })]);
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1, { stripePaymentIntentId: "pi_first_1" })]);
    await finalizeFirstPayment("pi_first_1");
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });

  it("no-ops for a PI it doesn't track", async () => {
    mockStorage.getLeases.mockResolvedValue([lease()]);
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1, { stripePaymentIntentId: "pi_other" })]);
    await finalizeFirstPayment("pi_unknown");
    expect(mockStorage.updateLease).not.toHaveBeenCalled();
  });
});

describe("startDepositPayment", () => {
  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
    mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
    mockStorage.updateLease.mockResolvedValue(undefined);
    mockStripe.ensureCustomer.mockResolvedValue("cus_123");
    mockStripe.createFirstPaymentIntent.mockResolvedValue({ id: "pi_dep_1", client_secret: "cs_dep_1" });
  });

  it("creates a deposit PI for the snapshotted amount and stores its id", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositAmountSnapshot: "300", depositStatus: "PENDING" }));
    const res = await startDepositPayment("lease-1");
    expect(res.clientSecret).toBe("cs_dep_1");
    expect(res.amount).toBe(300);
    // Deposit charged flat (no surcharge added — it's not rent).
    expect(mockStripe.createFirstPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 300, idempotencyKey: "lease-deposit-lease-1" }),
    );
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", { depositStripePaymentIntentId: "pi_dep_1" });
  });

  it("refuses when the deposit is already paid", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositAmountSnapshot: "300", depositStatus: "PAID" }));
    await expect(startDepositPayment("lease-1")).rejects.toThrow(/already paid/i);
  });

  it("refuses when no deposit is configured (amount 0)", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositAmountSnapshot: "0", depositStatus: "PENDING" }));
    await expect(startDepositPayment("lease-1")).rejects.toThrow(/no deposit/i);
    expect(mockStripe.createFirstPaymentIntent).not.toHaveBeenCalled();
  });
});

describe("finalizeDepositPayment", () => {
  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
    mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com", phone: null });
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1)]);
    mockStorage.updateLease.mockResolvedValue(undefined);
    mockStorage.updateScheduleRow.mockResolvedValue(undefined);
    mockStorage.updateRoom.mockResolvedValue(undefined);
    mockStorage.hasLifecycleEvent.mockResolvedValue(true); // suppress lifecycle sends
    mockStripe.retrievePaymentIntent.mockResolvedValue({ id: "pi_dep_1", payment_method: "pm_saved_1" });
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_first_1" });
  });

  it("same-day move-in: deposit PAID secures + activates, then charges the first week off-session", async () => {
    mockStorage.getLeases.mockResolvedValue([
      lease({ depositStatus: "PENDING", depositStripePaymentIntentId: "pi_dep_1", stripeCustomerId: "cus_123" }),
    ]);
    // loadLeaseContext re-fetches the lease inside chargeFirstWeekOffSession.
    mockStorage.getLease.mockResolvedValue(
      lease({ depositStatus: "PAID", depositStripePaymentIntentId: "pi_dep_1", stripeCustomerId: "cus_123" }),
    );

    await finalizeDepositPayment("pi_dep_1");

    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", expect.objectContaining({ depositStatus: "PAID" }));
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(mockStripe.chargeSavedCard).toHaveBeenCalledWith(
      expect.objectContaining({ paymentMethodId: "pm_saved_1", idempotencyKey: "lease-first-lease-1" }),
    );
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", expect.objectContaining({ status: "ACTIVE" }));
  });

  it("defers the first week for a FUTURE move-in: secures + activates, does NOT charge rent yet", async () => {
    mockStorage.getLeases.mockResolvedValue([
      lease({ depositStatus: "PENDING", depositStripePaymentIntentId: "pi_dep_1", stripeCustomerId: "cus_123" }),
    ]);
    mockStorage.getLease.mockResolvedValue(
      lease({ depositStatus: "PAID", depositStripePaymentIntentId: "pi_dep_1", stripeCustomerId: "cus_123" }),
    );
    // seq 1 due far in the future → not chargeable now; rent sweep charges it on move-in.
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(1, { dueDate: "2099-01-01" })]);

    await finalizeDepositPayment("pi_dep_1");

    // Room secured + lease activated by the DEPOSIT, regardless of move-in date.
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", expect.objectContaining({ status: "ACTIVE" }));
    // But the first week's rent is NOT charged yet — it's due on move-in.
    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-PAID deposit is left alone", async () => {
    mockStorage.getLeases.mockResolvedValue([
      lease({ depositStatus: "PAID", depositStripePaymentIntentId: "pi_dep_1" }),
    ]);
    await finalizeDepositPayment("pi_dep_1");
    expect(mockStorage.updateRoom).not.toHaveBeenCalled();
    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
  });
});

describe("refundDeposit", () => {
  beforeEach(() => {
    mockStorage.updateLease.mockResolvedValue(undefined);
    mockStripe.refundPaymentIntent.mockResolvedValue({ id: "re_1" });
  });

  it("refunds a PAID deposit and marks it REFUNDED", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositStatus: "PAID", depositStripePaymentIntentId: "pi_dep_1" }));
    await refundDeposit("lease-1");
    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({ paymentIntentId: "pi_dep_1", idempotencyKey: "lease-deposit-refund-lease-1" }),
    );
    expect(mockStorage.updateLease).toHaveBeenCalledWith("lease-1", { depositStatus: "REFUNDED" });
  });

  it("no-ops if already refunded", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositStatus: "REFUNDED" }));
    await refundDeposit("lease-1");
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("refuses if there is no paid deposit", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ depositStatus: "PENDING" }));
    await expect(refundDeposit("lease-1")).rejects.toThrow(/no paid deposit/i);
  });
});

describe("runScheduledRentSweep", () => {
  const activeLease = lease({
    status: "ACTIVE",
    stripeCustomerId: "cus_123",
    stripePaymentMethodId: "pm_saved_1",
  });

  beforeEach(() => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getLeaseRooms.mockResolvedValue(ROOMS);
    mockStorage.updateScheduleRow.mockResolvedValue(undefined);
    mockStorage.getLeases.mockResolvedValue([activeLease]);
  });

  it("charges a due CARD_ON_FILE installment and marks it PAID (with surcharge)", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      schedRow(1, { status: "PAID" }), // first payment, skipped
      schedRow(2, { dueDate: "2026-07-08" }),
    ]);
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_rent_2", status: "succeeded" });

    const res = await runScheduledRentSweep("2026-07-10");

    expect(res.charged).toBe(1);
    const args = mockStripe.chargeSavedCard.mock.calls[0][0];
    expect(args.amount).toBe(258.75); // 250 + surcharge
    expect(args.idempotencyKey).toBe("lease-rent-lease-1-seq-2");
    expect(args.metadata.payment_kind).toBe("SCHEDULED_RENT");
    expect(args.metadata.schedule_seq).toBe("2");
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith(
      "row-2",
      expect.objectContaining({ status: "PAID", stripePaymentIntentId: "pi_rent_2" }),
    );
  });

  it("does NOT charge: future rows, manual rows, paid rows, or rows already carrying a PI", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([
      schedRow(2, { dueDate: "2026-08-01" }), // future
      schedRow(3, { dueDate: "2026-07-01", paymentMethod: "MANUAL" }), // manual
      schedRow(4, { dueDate: "2026-07-01", status: "PAID" }), // already paid
      schedRow(5, { dueDate: "2026-07-01", stripePaymentIntentId: "pi_existing" }), // idempotent skip
    ]);

    const res = await runScheduledRentSweep("2026-07-10");

    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
    expect(res.charged).toBe(0);
    expect(res.skipped).toBe(1); // the row with an existing PI id
  });

  it("marks a declined installment FAILED and keeps sweeping", async () => {
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(2, { dueDate: "2026-07-01" })]);
    const declineErr = Object.assign(new Error("Your card was declined."), {
      raw: { payment_intent: { id: "pi_declined" } },
    });
    mockStripe.chargeSavedCard.mockRejectedValue(declineErr);

    const res = await runScheduledRentSweep("2026-07-10");

    expect(res.failed).toBe(1);
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith(
      "row-2",
      expect.objectContaining({ status: "FAILED", stripePaymentIntentId: "pi_declined" }),
    );
  });

  it("skips leases with no saved card", async () => {
    mockStorage.getLeases.mockResolvedValue([lease({ status: "ACTIVE", stripeCustomerId: null })]);
    mockStorage.getScheduleByLease.mockResolvedValue([schedRow(2, { dueDate: "2026-07-01" })]);
    const res = await runScheduledRentSweep("2026-07-10");
    expect(mockStripe.chargeSavedCard).not.toHaveBeenCalled();
    expect(res.considered).toBe(0);
  });

  it("charges a deferred first week (seq 1) once it comes due on the move-in date", async () => {
    // Future move-in: the deposit finalizer left seq 1 SCHEDULED. On/after the
    // move-in date the sweep charges it like any due installment.
    mockStorage.getScheduleByLease.mockResolvedValue([
      schedRow(1, { dueDate: "2026-07-10" }), // move-in day
    ]);
    mockStripe.chargeSavedCard.mockResolvedValue({ id: "pi_rent_1", status: "succeeded" });

    const res = await runScheduledRentSweep("2026-07-10");

    expect(res.charged).toBe(1);
    expect(mockStorage.updateScheduleRow).toHaveBeenCalledWith(
      "row-1",
      expect.objectContaining({ status: "PAID", stripePaymentIntentId: "pi_rent_1" }),
    );
  });
});

// server/lib/bookingGateDecline.test.ts
// =============================================================================
// The only module that moves money OUTWARD without a human necessarily clicking.
// Every test here is a way that could go wrong.
//
// The two most important assertions in the file:
//   - a bad `confirm` or a short `reason` makes ZERO Stripe calls (mirroring how
//     materialize.test.ts asserts refundPaymentIntent is never reached), and
//   - `charge_already_refunded` is SUCCESS, because the idempotency key expires
//     after 24h and the sweep retries daily.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(),
  getPaymentsByBooking: vi.fn(),
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  getGuest: vi.fn(),
  getBookingGate: vi.fn(),
  updateBookingGate: vi.fn(),
  updatePayment: vi.fn(),
  recordPaymentRefund: vi.fn(),
  raiseEscalationOnce: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ refundPaymentIntent: vi.fn() }));
const mockCancel = vi.hoisted(() => ({ cancelBooking: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyAdmin: vi.fn() }));
const mockStayLifecycle = vi.hoisted(() => ({ onStayDeclined: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./bookingConflicts", () => mockCancel);
vi.mock("./notifications", () => mockNotify);
vi.mock("./stayLifecycle", () => mockStayLifecycle);

import { declineAndRefundBooking, refundableTotal } from "./bookingGateDecline";

const REFERENCE = "BNP-7QK4-2F9X";
const BOOKING = {
  id: "bk-1", reference: REFERENCE, propertyId: "prop-1", roomId: "r1", guestId: "g1",
  model: "COLIVING", checkIn: "2026-10-01", checkOut: "2026-10-12",
  status: "PENDING_APPROVAL", quotedTotal: "980.00",
};
const PROPERTY = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP" };
const ROOM = { id: "r1", name: "Garden", roomNumber: "2" };
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };

const paidStripe = (over = {}) => ({
  id: "pay-1", bookingId: "bk-1", method: "STRIPE", status: "PAID",
  amount: "950.00", surcharge: "30.00", stripeRef: "pi_123", ...over,
});

const ARGS = {
  bookingId: "bk-1",
  actor: "admin@beniceproperties.com",
  reason: "The name on the licence did not match the booking.",
  confirm: REFERENCE,
  kind: "GATE_DECLINE" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getPaymentsByBooking.mockResolvedValue([paidStripe()]);
  mockStorage.getProperty.mockResolvedValue(PROPERTY);
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getBookingGate.mockResolvedValue({ bookingId: "bk-1", gateToken: "tok" });
  mockStorage.updateBookingGate.mockResolvedValue({});
  mockStorage.updatePayment.mockResolvedValue({});
  mockStorage.recordPaymentRefund.mockResolvedValue({ id: "ref-row-1" });
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStripe.refundPaymentIntent.mockResolvedValue({ id: "re_1" });
  mockCancel.cancelBooking.mockResolvedValue({
    reference: REFERENCE, alreadyCancelled: false, roomFreed: true, refunded: false,
    refundIds: [], alreadyRefunded: [],
  });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockStayLifecycle.onStayDeclined.mockResolvedValue(undefined);
});

describe("refundableTotal", () => {
  it("sums amount plus surcharge across settled card payments only", () => {
    expect(refundableTotal([paidStripe()] as never)).toBeCloseTo(980);
    expect(
      refundableTotal([
        paidStripe(),
        paidStripe({ id: "pay-2", method: "CASHAPP", stripeRef: null }),
        paidStripe({ id: "pay-3", status: "PENDING" }),
        paidStripe({ id: "pay-4", status: "REFUNDED" }),
      ] as never),
    ).toBeCloseTo(980);
  });

  it("is 0 with nothing refundable, never NaN", () => {
    expect(refundableTotal([])).toBe(0);
    expect(refundableTotal([paidStripe({ surcharge: null })] as never)).toBeCloseTo(950);
  });
});

describe("Guard 1 — the typed reference", () => {
  it("refuses a mismatched confirmation and makes ZERO Stripe calls", async () => {
    await expect(
      declineAndRefundBooking({ ...ARGS, confirm: "BNP-WRONG-0000" }),
    ).rejects.toMatchObject({ status: 400 });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    expect(mockCancel.cancelBooking).not.toHaveBeenCalled();
  });

  it("refuses an empty confirmation", async () => {
    await expect(declineAndRefundBooking({ ...ARGS, confirm: "" })).rejects.toMatchObject({
      status: 400,
    });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("is checked BEFORE the booking is cancelled, not after", async () => {
    await expect(
      declineAndRefundBooking({ ...ARGS, confirm: "nope" }),
    ).rejects.toBeTruthy();
    expect(mockCancel.cancelBooking).not.toHaveBeenCalled();
    expect(mockStorage.updateBookingGate).not.toHaveBeenCalled();
  });

  it("requires a real reason, and moves nothing without one", async () => {
    for (const reason of ["", "   ", "no"]) {
      vi.clearAllMocks();
      mockStorage.getBooking.mockResolvedValue(BOOKING);
      await expect(declineAndRefundBooking({ ...ARGS, reason })).rejects.toMatchObject({
        status: 400,
      });
      expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
      expect(mockCancel.cancelBooking).not.toHaveBeenCalled();
    }
  });

  it("404s an unknown booking", async () => {
    mockStorage.getBooking.mockResolvedValue(undefined);
    await expect(declineAndRefundBooking(ARGS)).rejects.toMatchObject({ status: 404 });
  });
});

describe("Guard 2 — the amount the operator was looking at", () => {
  it("refuses when the expected amount no longer matches", async () => {
    await expect(
      declineAndRefundBooking({ ...ARGS, expectedRefundAmount: 500 }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("accepts the matching amount, and tolerates half-cent rounding", async () => {
    await expect(
      declineAndRefundBooking({ ...ARGS, expectedRefundAmount: 980 }),
    ).resolves.toBeTruthy();
    vi.clearAllMocks();
    beforeEachState();
    await expect(
      declineAndRefundBooking({ ...ARGS, expectedRefundAmount: 980.004 }),
    ).resolves.toBeTruthy();
  });

  it("skips the check when the caller supplies no expectation (the sweep)", async () => {
    await expect(
      declineAndRefundBooking({ ...ARGS, kind: "GATE_AUTO_DECLINE", actor: "system:gate-sweep" }),
    ).resolves.toBeTruthy();
  });
});

describe("nothing to refund", () => {
  it("409s rather than silently cancelling a booking whose money we cannot see", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      paidStripe({ method: "CASHAPP", stripeRef: null }),
    ]);
    await expect(declineAndRefundBooking(ARGS)).rejects.toMatchObject({ status: 409 });
    expect(mockCancel.cancelBooking).not.toHaveBeenCalled();
  });

  it("never refunds a manual payment through Stripe", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      paidStripe(),
      paidStripe({ id: "pay-2", method: "ZELLE", stripeRef: null }),
    ]);
    await declineAndRefundBooking(ARGS);
    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockStripe.refundPaymentIntent.mock.calls[0][0].paymentIntentId).toBe("pi_123");
  });
});

describe("the happy path", () => {
  it("cancels, refunds, flips the payment, writes the ledger, and tells the guest", async () => {
    const res = await declineAndRefundBooking(ARGS);

    expect(mockCancel.cancelBooking).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk-1", refund: false }),
    );
    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockStorage.updatePayment).toHaveBeenCalledWith("pay-1", { status: "REFUNDED" });
    expect(mockStorage.recordPaymentRefund).toHaveBeenCalledWith(
      expect.objectContaining({ stripeRefundId: "re_1", amount: "980.00", kind: "GATE_DECLINE" }),
    );
    expect(mockStayLifecycle.onStayDeclined).toHaveBeenCalledTimes(1);
    expect(res.totalRefunded).toBeCloseTo(980);
    expect(res.failed).toEqual([]);
  });

  // cancelBooking owns the release; this module must not do it a second way.
  it("delegates the cancel and passes refund:false — it owns the refund loop itself", async () => {
    await declineAndRefundBooking(ARGS);
    expect(mockCancel.cancelBooking.mock.calls[0][0].refund).toBe(false);
  });

  it("uses the stable per-PaymentIntent idempotency key", async () => {
    await declineAndRefundBooking(ARGS);
    expect(mockStripe.refundPaymentIntent.mock.calls[0][0].idempotencyKey).toBe("refund:pi_123");
  });

  it("records why and by whom on the gate row, so the decision survives", async () => {
    await declineAndRefundBooking(ARGS);
    expect(mockStorage.updateBookingGate).toHaveBeenCalledWith("bk-1", {
      cancelReason: ARGS.reason,
      cancelledBy: ARGS.actor,
    });
  });

  it("marks an automatic decline as automatic to the guest", async () => {
    await declineAndRefundBooking({ ...ARGS, kind: "GATE_AUTO_DECLINE", actor: "system:gate-sweep" });
    expect(mockStayLifecycle.onStayDeclined.mock.calls[0][1]).toMatchObject({
      auto: true,
      reason: null, // an auto decline explains itself; it does not quote internal text
    });
  });

  it("quotes the admin's reason back to the guest on a human decline", async () => {
    await declineAndRefundBooking(ARGS);
    expect(mockStayLifecycle.onStayDeclined.mock.calls[0][1]).toMatchObject({
      auto: false,
      reason: ARGS.reason,
    });
  });
});

describe("the refund metadata contract", () => {
  it("carries the full charge breakout plus the refund keys", async () => {
    await declineAndRefundBooking(ARGS);
    const { metadata } = mockStripe.refundPaymentIntent.mock.calls[0][0];
    expect(metadata).toMatchObject({
      entity: "BNP",
      product_type: "COLIVING_ROOM",
      property_id: "prop-1",
      room_id: "r1",
      refund_kind: "GATE_DECLINE",
      refunded_payment_intent: "pi_123",
      refunded_payment_id: "pay-1",
      booking_reference: REFERENCE,
      actor: ARGS.actor,
    });
  });

  it("uses the STR shape when there is no room", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, roomId: null, model: "STR" });
    mockStorage.getRoom.mockResolvedValue(undefined);
    await declineAndRefundBooking(ARGS);
    const { metadata } = mockStripe.refundPaymentIntent.mock.calls[0][0];
    expect(metadata.product_type).toBe("STR_WHOLE");
    expect(metadata.room_id).toBe("null");
  });

  // The reason is operator free-text that reaches Stripe. Newlines are collapsed
  // and it is truncated, so it cannot smuggle a wall of text into metadata.
  it("normalises the reason it sends to Stripe", async () => {
    await declineAndRefundBooking({ ...ARGS, reason: "line one\n\nline two   spaced" });
    expect(mockStripe.refundPaymentIntent.mock.calls[0][0].metadata.refund_reason).toBe(
      "line one line two spaced",
    );
  });
});

describe("Guard 3 — charge_already_refunded is SUCCESS", () => {
  // The whole reason this branch exists: the Stripe idempotency key lives 24h and
  // the silence sweep retries DAILY, so this is the normal steady state on a
  // retry, not an exceptional case.
  it("counts it as refunded and still flips the payment status", async () => {
    mockStripe.refundPaymentIntent.mockRejectedValueOnce(
      Object.assign(new Error("Charge has already been refunded."), {
        code: "charge_already_refunded",
      }),
    );
    const res = await declineAndRefundBooking(ARGS);

    expect(res.failed).toEqual([]);
    expect(res.refunded).toEqual([
      { paymentId: "pay-1", stripeRefundId: null, amount: "980.00" },
    ]);
    expect(res.totalRefunded).toBeCloseTo(980);
    expect(mockStorage.updatePayment).toHaveBeenCalledWith("pay-1", { status: "REFUNDED" });
    // No new Stripe refund id, so nothing new to record.
    expect(mockStorage.recordPaymentRefund).not.toHaveBeenCalled();
    expect(mockStorage.raiseEscalationOnce).not.toHaveBeenCalled();
  });
});

describe("a genuine refund failure", () => {
  const stripeDown = () =>
    mockStripe.refundPaymentIntent.mockRejectedValueOnce(
      Object.assign(new Error("Stripe is unavailable"), { code: "api_error" }),
    );

  it("does NOT roll the cancellation back — a declined guest must not keep the room", async () => {
    stripeDown();
    const res = await declineAndRefundBooking(ARGS);
    expect(res.datesReleased).toBe(true);
    expect(res.failed).toHaveLength(1);
    expect(res.totalRefunded).toBe(0);
  });

  it("raises a HIGH escalation and pages a human", async () => {
    stripeDown();
    await declineAndRefundBooking(ARGS);
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "REFUND_FAILED", severity: "HIGH" }),
    );
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("never tells the guest their money is back when it is not", async () => {
    stripeDown();
    await declineAndRefundBooking(ARGS);
    expect(mockStayLifecycle.onStayDeclined).not.toHaveBeenCalled();
  });

  it("keeps guest contact details out of the failure alert", async () => {
    stripeDown();
    await declineAndRefundBooking(ARGS);
    const { body, telegramText } = mockNotify.notifyAdmin.mock.calls[0][0];
    for (const text of [body, telegramText]) {
      expect(text).not.toContain(GUEST.email);
      expect(text).not.toContain(GUEST.phone);
    }
    expect(body).toContain("pi_123"); // but DOES name what to fix
  });

  it("contains a per-payment failure — the others still refund", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      paidStripe(),
      paidStripe({ id: "pay-2", stripeRef: "pi_456", amount: "100.00", surcharge: "0" }),
    ]);
    mockStripe.refundPaymentIntent
      .mockRejectedValueOnce(Object.assign(new Error("boom"), { code: "api_error" }))
      .mockResolvedValueOnce({ id: "re_2" });

    const res = await declineAndRefundBooking(ARGS);
    expect(res.failed).toHaveLength(1);
    expect(res.refunded).toHaveLength(1);
    expect(res.refunded[0].paymentId).toBe("pay-2");
    expect(res.totalRefunded).toBeCloseTo(100);
  });
});

describe("re-running after a partial failure", () => {
  it("is safe: the ledger's unique index absorbs a duplicate record", async () => {
    // recordPaymentRefund returns null when the refund id is already on file.
    mockStorage.recordPaymentRefund.mockResolvedValue(null);
    const res = await declineAndRefundBooking(ARGS);
    expect(res.failed).toEqual([]);
    expect(res.refunded).toHaveLength(1);
  });

  it("skips a payment already marked REFUNDED", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([paidStripe({ status: "REFUNDED" })]);
    await expect(declineAndRefundBooking(ARGS)).rejects.toMatchObject({ status: 409 });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });
});

/** Re-seed the mocks mid-test where a second call is made after clearAllMocks. */
function beforeEachState() {
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getPaymentsByBooking.mockResolvedValue([paidStripe()]);
  mockStorage.getProperty.mockResolvedValue(PROPERTY);
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getBookingGate.mockResolvedValue({ bookingId: "bk-1", gateToken: "tok" });
  mockStorage.recordPaymentRefund.mockResolvedValue({ id: "ref-row-1" });
  mockStripe.refundPaymentIntent.mockResolvedValue({ id: "re_1" });
  mockCancel.cancelBooking.mockResolvedValue({
    reference: REFERENCE, alreadyCancelled: false, roomFreed: true, refunded: false,
    refundIds: [], alreadyRefunded: [],
  });
  mockStayLifecycle.onStayDeclined.mockResolvedValue(undefined);
}

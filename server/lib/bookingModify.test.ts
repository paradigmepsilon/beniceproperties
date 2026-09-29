// server/lib/bookingModify.test.ts
// =============================================================================
// UO booking edits move money in both directions. The assertions that matter:
//   - a stale `expectedDelta` changes NOTHING and calls Stripe zero times,
//   - a shortened stay refunds only the difference, card fee share included,
//     keyed per (edit, payment), and records it in the refund ledger,
//   - `charge_already_refunded` is success; any other Stripe error pages a human
//     and leaves the new dates standing.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(),
  getProperty: vi.fn(),
  getRoom: vi.fn(),
  getGuest: vi.fn(),
  getGuestByEmail: vi.fn(),
  updateGuest: vi.fn(),
  countGuestReferences: vi.fn(),
  getPaymentsByBooking: vi.fn(),
  getRefundsByBooking: vi.fn(),
  getBookingModificationsByBooking: vi.fn(),
  getBookingModification: vi.fn(),
  createBookingModification: vi.fn(),
  updateBookingModification: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
  updateBooking: vi.fn(),
  getBookingGate: vi.fn(),
  updateBookingGate: vi.fn(),
  updatePayment: vi.fn(),
  recordPaymentRefund: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  getPaymentByStripeRef: vi.fn(),
  createPayment: vi.fn(),
  getBookings: vi.fn(),
  getExternalBlocksForProperty: vi.fn(),
  getManualBlocksForProperty: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ refundPaymentIntent: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyAdmin: vi.fn(), notifyGuest: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./notifications", () => mockNotify);
vi.mock("./pricingSettings", () => ({ getCardSurchargeRate: vi.fn().mockResolvedValue(0.035) }));
vi.mock("@shared/dates", async (orig) => ({
  ...(await orig<typeof import("@shared/dates")>()),
  todayIso: () => "2026-09-28",
}));

import {
  applyModification,
  paymentPositions,
  planRefund,
  quoteModification,
  recordExternalPayment,
  updateGuestContact,
} from "./bookingModify";

// 14 nights in a room at $350/wk + $50 cleaning = $750 base; card fee 3.5% = $26.25.
const BOOKING = {
  id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1", roomId: "r1", guestId: "g1",
  model: "COLIVING", checkIn: "2026-10-01", checkOut: "2026-10-15", status: "CONFIRMED",
  paymentMethod: "STRIPE", quotedTotal: "776.25",
};
const PROPERTY = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP" };
const ROOM = {
  id: "r1", propertyId: "prop-1", name: "Garden", roomNumber: "2",
  weeklyRent: "350", dailyRate: "60", biweeklyRate: null, monthlyRate: "1200", cleaningFee: "50",
};
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };
const payment = (over: Record<string, unknown> = {}) => ({
  id: "pay-1", bookingId: "bk-1", method: "STRIPE", status: "PAID",
  amount: "750.00", surcharge: "26.25", stripeRef: "pi_1", paidAt: new Date("2026-09-20"), ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getProperty.mockResolvedValue(PROPERTY);
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.countGuestReferences.mockResolvedValue(1);
  mockStorage.getPaymentsByBooking.mockResolvedValue([payment()]);
  mockStorage.getRefundsByBooking.mockResolvedValue([]);
  mockStorage.getBookingModificationsByBooking.mockResolvedValue([]);
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStorage.updateBooking.mockResolvedValue({});
  mockStorage.getBookingGate.mockResolvedValue(undefined);
  mockStorage.createBookingModification.mockResolvedValue({ id: "mod-1" });
  mockStorage.updateBookingModification.mockResolvedValue({});
  mockStorage.recordPaymentRefund.mockResolvedValue({ id: "ref-row" });
  mockStripe.refundPaymentIntent.mockResolvedValue({ id: "re_1" });
});

describe("paymentPositions / planRefund", () => {
  it("nets ledger refunds and treats an unledgered REFUNDED row as fully returned", () => {
    const pos = paymentPositions(
      [payment(), payment({ id: "pay-2", status: "REFUNDED", stripeRef: "pi_2" }), payment({ id: "pay-3", status: "FAILED" })] as never,
      [{ paymentId: "pay-1", amount: "103.50" }] as never,
    );
    expect(pos).toHaveLength(2);
    expect(pos[0]).toMatchObject({ charged: 776.25, refunded: 103.5, remaining: 672.75, remainingBase: 650 });
    expect(pos[1]).toMatchObject({ remaining: 0, remainingBase: 0 });
  });

  it("spreads a refund newest-first, carries the card fee share, and leaves manual money to a human", () => {
    const pos = paymentPositions(
      [
        payment({ id: "old", stripeRef: "pi_old", amount: "100.00", surcharge: "3.50", paidAt: new Date("2026-09-01") }),
        payment({ id: "new", stripeRef: "pi_new", amount: "200.00", surcharge: "7.00", paidAt: new Date("2026-09-10") }),
        payment({ id: "zelle", method: "ZELLE", stripeRef: null, amount: "50.00", surcharge: "0" }),
      ] as never,
      [],
    );
    const plan = planRefund(pos, 250);
    expect(plan.card).toEqual([
      { paymentId: "new", stripePaymentIntentId: "pi_new", amount: 207, baseAmount: 200, full: true },
      { paymentId: "old", stripePaymentIntentId: "pi_old", amount: 51.75, baseAmount: 50, full: false },
    ]);
    expect(plan.manual).toBe(0);
    expect(planRefund(pos, 320).manual).toBe(20);
  });
});

describe("quoteModification", () => {
  it("re-prices an extension with the room cascade and asks for the difference", async () => {
    const q = await quoteModification("bk-1", { checkOut: "2026-10-22" });
    // 21 nights = 3 weeks ($1050) + $50 cleaning.
    expect(q.newBase).toBe(1100);
    expect(q.paidBase).toBe(750);
    expect(q.delta).toBe(350);
    expect(q.proposed.quotedTotal).toBe(1138.5);
    expect(q.refundPlan).toBeNull();
    expect(mockStorage.isRoomAvailableForRange).toHaveBeenCalledWith(
      expect.objectContaining({ roomId: "r1", startDate: "2026-10-01", endDate: "2026-10-22", excludeBookingId: "bk-1" }),
    );
  });

  it("shortening produces a refund plan instead", async () => {
    const q = await quoteModification("bk-1", { checkOut: "2026-10-08" });
    expect(q.newBase).toBe(400);
    expect(q.delta).toBe(-350);
    expect(q.refundPlan?.card).toEqual([
      { paymentId: "pay-1", stripePaymentIntentId: "pi_1", amount: 362.25, baseAmount: 350, full: false },
    ]);
  });

  it("an override needs a reason, and nets out manual refunds earlier edits promised", async () => {
    await expect(quoteModification("bk-1", { overrideTotal: 700 })).rejects.toMatchObject({ status: 400 });
    mockStorage.getBookingModificationsByBooking.mockResolvedValue([{ after: { manualRefund: 25 } }]);
    const q = await quoteModification("bk-1", { overrideTotal: 700, reason: "Goodwill discount" });
    expect(q.paidBase).toBe(725);
    expect(q.delta).toBe(-25);
  });

  it("flags unavailable dates and refuses a cancelled booking", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    expect((await quoteModification("bk-1", { checkOut: "2026-10-22" })).available).toBe(false);
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, status: "CANCELLED" });
    await expect(quoteModification("bk-1", {})).rejects.toMatchObject({ status: 409 });
  });
});

describe("applyModification", () => {
  const shorten = { bookingId: "bk-1", input: { checkOut: "2026-10-08" }, expectedDelta: -350, refund: true, actor: "uo:ops@bnp.com" };

  it("a stale expected delta changes nothing and never reaches Stripe", async () => {
    await expect(applyModification({ ...shorten, expectedDelta: -300 })).rejects.toMatchObject({ status: 409 });
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("moves the dates, refunds the difference, records it, and emails the guest", async () => {
    const r = await applyModification(shorten);
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", {
      checkIn: "2026-10-01", checkOut: "2026-10-08", quotedTotal: "414.00", status: "CONFIRMED",
    });
    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentIntentId: "pi_1",
        amount: 362.25,
        idempotencyKey: "modify-refund:mod-1:pay-1",
        metadata: expect.objectContaining({ refund_kind: "ADMIN", booking_modification_id: "mod-1" }),
      }),
    );
    expect(mockStorage.recordPaymentRefund).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-1", stripeRefundId: "re_1", amount: "362.25", kind: "ADMIN" }),
    );
    // A partial refund leaves the payment PAID.
    expect(mockStorage.updatePayment).not.toHaveBeenCalled();
    expect(mockNotify.notifyGuest).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com", subject: expect.stringContaining("BNP-7QK4-2F9X") }),
    );
    expect(r).toMatchObject({ modificationId: "mod-1", delta: -350, guestNotified: true, failed: [] });
  });

  it("refund:false records the edit and withholds the money", async () => {
    const r = await applyModification({ ...shorten, refund: false });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(r.refundWithheld).toBe(350);
    expect(mockStorage.createBookingModification).toHaveBeenCalledWith(
      expect.objectContaining({ after: expect.objectContaining({ refundWithheld: 350 }) }),
    );
  });

  it("re-derives the status from the new dates, as the daily lifecycle job would", async () => {
    // Today is pinned below; a stay moved to have ended already reads COMPLETED.
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, status: "ACTIVE", checkIn: "2026-09-20", checkOut: "2026-10-04" });
    mockStorage.getPaymentsByBooking.mockResolvedValue([payment()]);
    const q = await quoteModification("bk-1", { checkOut: "2026-09-27" });
    await applyModification({ ...shorten, input: { checkOut: "2026-09-27" }, expectedDelta: q.delta, refund: false });
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", expect.objectContaining({ status: "COMPLETED" }));
  });

  it("an extension moves the dates and moves no money here", async () => {
    await applyModification({ ...shorten, input: { checkOut: "2026-10-22" }, expectedDelta: 350 });
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", expect.objectContaining({ checkOut: "2026-10-22" }));
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("the exclusion constraint turns into a 409 before any money moves", async () => {
    mockStorage.updateBooking.mockRejectedValue(Object.assign(new Error("overlap"), { code: "23P01" }));
    await expect(applyModification(shorten)).rejects.toMatchObject({ status: 409 });
    expect(mockStorage.createBookingModification).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("charge_already_refunded is success; any other failure escalates and keeps the dates", async () => {
    mockStripe.refundPaymentIntent.mockRejectedValueOnce(Object.assign(new Error("x"), { code: "charge_already_refunded" }));
    expect((await applyModification(shorten)).failed).toEqual([]);

    mockStripe.refundPaymentIntent.mockRejectedValueOnce(new Error("card_declined"));
    const r = await applyModification(shorten);
    expect(r.failed).toHaveLength(1);
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "REFUND_FAILED", severity: "HIGH", bookingId: "bk-1" }),
    );
    expect(mockNotify.notifyAdmin).toHaveBeenCalled();
  });

  it("refuses when nothing changes", async () => {
    await expect(
      applyModification({ ...shorten, input: {}, expectedDelta: 0 }),
    ).rejects.toMatchObject({ status: 400 });
  });
});

describe("recordExternalPayment / updateGuestContact", () => {
  const input = { stripePaymentIntentId: "pi_uo_1", amount: 350, surcharge: 12.25 };

  it("records a UO-collected payment once", async () => {
    mockStorage.getPaymentByStripeRef.mockResolvedValueOnce(undefined);
    mockStorage.createPayment.mockResolvedValue({ id: "pay-new" });
    const first = await recordExternalPayment({ bookingId: "bk-1", input, actor: "uo:x" });
    expect(first.created).toBe(true);
    expect(mockStorage.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: "350.00", surcharge: "12.25", status: "PAID", stripeRef: "pi_uo_1" }),
    );

    mockStorage.getPaymentByStripeRef.mockResolvedValueOnce({ id: "pay-new", bookingId: "bk-1" });
    expect((await recordExternalPayment({ bookingId: "bk-1", input, actor: "uo:x" })).created).toBe(false);
    mockStorage.getPaymentByStripeRef.mockResolvedValueOnce({ id: "pay-x", bookingId: "other" });
    await expect(recordExternalPayment({ bookingId: "bk-1", input, actor: "uo:x" })).rejects.toMatchObject({ status: 409 });
  });

  it("refuses an email another guest already owns", async () => {
    mockStorage.getGuestByEmail.mockResolvedValue({ id: "g2" });
    await expect(
      updateGuestContact({ guestId: "g1", input: { email: "taken@example.com" }, actor: "uo:x" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockStorage.updateGuest).not.toHaveBeenCalled();

    mockStorage.getGuestByEmail.mockResolvedValue(undefined);
    mockStorage.countGuestReferences.mockResolvedValue(3);
    const r = await updateGuestContact({ guestId: "g1", input: { email: "new@example.com", phone: "" }, actor: "uo:x" });
    expect(mockStorage.updateGuest).toHaveBeenCalledWith("g1", { email: "new@example.com", phone: null });
    expect(r.references).toBe(3);
  });
});

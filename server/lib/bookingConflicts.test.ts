// server/lib/bookingConflicts.test.ts
// Admin resolution of a paid-but-conflicted booking. Mocks storage, the Stripe
// wrapper, the availability gate and notifications so no DB/network is touched.
//
// Money-safety invariants locked here:
//   - cancelBooking NEVER refunds unless the caller explicitly asks (refund:true),
//   - a refund is idempotency-keyed on the PaymentIntent (`refund:<stripeRef>`),
//     so a double-click can't double-refund,
//   - confirmConflictBooking re-runs the availability gate and refuses (409)
//     when the dates are still taken, leaving the booking untouched,
//   - a room is only freed on cancel when nothing else covers it today.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(),
  updateBooking: vi.fn(),
  getRoom: vi.fn(),
  updateRoom: vi.fn(),
  getProperty: vi.fn(),
  getGuest: vi.fn(),
  getPaymentsByBooking: vi.fn(),
  getEscalations: vi.fn(),
  updateEscalation: vi.fn(),
  getOccupiedRoomIdsOn: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ refundPaymentIntent: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyAdmin: vi.fn() }));
const mockLifecycle = vi.hoisted(() => ({ onBookingConfirmed: vi.fn() }));
const mockBookingGate = vi.hoisted(() => ({ strHasConflict: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./notifications", () => mockNotify);
vi.mock("./lifecycle", () => mockLifecycle);
// Stub only the STR availability gate — BookingError stays real so `instanceof`
// and the HTTP status mapping in routes.ts behave exactly as in production.
vi.mock("./booking", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./booking")>()),
  strHasConflict: mockBookingGate.strHasConflict,
}));

import { confirmConflictBooking, cancelBooking } from "./bookingConflicts";
import { BookingError } from "./booking";

const PROP = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP" };
const ROOM = { id: "r1", propertyId: "prop-1", name: "Garden", roomNumber: "2", status: "AVAILABLE" };
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };

function booking(overrides: Record<string, unknown> = {}) {
  return {
    id: "bk-1",
    propertyId: "prop-1",
    roomId: "r1",
    guestId: "g1",
    model: "COLIVING",
    checkIn: "2026-07-01",
    checkOut: "2026-07-10",
    status: "CONFLICT",
    paymentMethod: "STRIPE",
    reference: "BNP-7QK4-2F9X",
    quotedTotal: "980.00",
    ...overrides,
  };
}

const paidStripePayment = {
  id: "pay-1",
  bookingId: "bk-1",
  method: "STRIPE",
  status: "PAID",
  stripeRef: "pi_123",
  amount: "950.00",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(booking());
  mockStorage.updateBooking.mockImplementation(async (id: string, u: Record<string, unknown>) => ({
    ...booking(),
    ...u,
    id,
  }));
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.updateRoom.mockResolvedValue(ROOM);
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getPaymentsByBooking.mockResolvedValue([paidStripePayment]);
  mockStorage.getEscalations.mockResolvedValue([]);
  mockStorage.updateEscalation.mockResolvedValue({});
  mockStorage.getOccupiedRoomIdsOn.mockResolvedValue(new Set<string>());
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStripe.refundPaymentIntent.mockResolvedValue({ id: "re_1" });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockLifecycle.onBookingConfirmed.mockResolvedValue(undefined);
  mockBookingGate.strHasConflict.mockResolvedValue(false);
});

describe("cancelBooking", () => {
  it("cancels without refunding when refund is not requested", async () => {
    const res = await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp" });

    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", { status: "CANCELLED" });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    expect(res.refunded).toBe(false);
    expect(res.refundIds).toEqual([]);
  });

  it("refunds the PAID Stripe payment with a stable idempotency key when asked", async () => {
    const res = await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp", refund: true });

    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledTimes(1);
    expect(mockStripe.refundPaymentIntent).toHaveBeenCalledWith({
      paymentIntentId: "pi_123",
      idempotencyKey: "refund:pi_123",
    });
    expect(res.refunded).toBe(true);
    expect(res.refundIds).toEqual(["re_1"]);
  });

  it("never refunds a manual (CashApp/Zelle) or unpaid payment through Stripe", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      { ...paidStripePayment, id: "pay-2", method: "CASHAPP", stripeRef: null },
      { ...paidStripePayment, id: "pay-3", status: "PENDING" },
    ]);
    const res = await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp", refund: true });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    expect(res.refunded).toBe(false);
  });

  it("frees the room when nothing else covers it today", async () => {
    mockStorage.getRoom.mockResolvedValue({ ...ROOM, status: "OCCUPIED" });
    await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp" });
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "AVAILABLE" });
  });

  it("leaves the room OCCUPIED when another live stay still covers it today", async () => {
    mockStorage.getRoom.mockResolvedValue({ ...ROOM, status: "OCCUPIED" });
    mockStorage.getOccupiedRoomIdsOn.mockResolvedValue(new Set(["r1"]));
    await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp" });
    expect(mockStorage.updateRoom).not.toHaveBeenCalled();
  });

  it("resolves the open BOOKING_CONFLICT escalation for the booking", async () => {
    mockStorage.getEscalations.mockResolvedValue([
      { id: "esc-1", bookingId: "bk-1", kind: "BOOKING_CONFLICT", status: "OPEN" },
    ]);
    await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp" });
    expect(mockStorage.updateEscalation).toHaveBeenCalledWith(
      "esc-1",
      expect.objectContaining({ status: "RESOLVED", resolvedBy: "admin@bnp" }),
    );
  });

  it("is idempotent on an already-cancelled booking and does not re-cancel", async () => {
    mockStorage.getBooking.mockResolvedValue(booking({ status: "CANCELLED" }));
    const res = await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp" });
    expect(res.alreadyCancelled).toBe(true);
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  // A refund that threw must stay retryable. The booking is CANCELLED by then,
  // so an `alreadyCancelled` short-circuit would strand the guest's money.
  it("still refunds on a retry after the first refund attempt threw", async () => {
    mockStripe.refundPaymentIntent.mockRejectedValueOnce(new Error("Stripe timeout"));

    await expect(
      cancelBooking({ bookingId: "bk-1", actor: "admin@bnp", refund: true }),
    ).rejects.toThrow("Stripe timeout");
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", { status: "CANCELLED" });

    // Retry: the booking is now CANCELLED, but the refund must still go through.
    mockStorage.getBooking.mockResolvedValue(booking({ status: "CANCELLED" }));
    const res = await cancelBooking({ bookingId: "bk-1", actor: "admin@bnp", refund: true });

    expect(res.refunded).toBe(true);
    expect(res.alreadyCancelled).toBe(true);
    // Same idempotency key both times — Stripe returns the one refund.
    for (const call of mockStripe.refundPaymentIntent.mock.calls) {
      expect(call[0]).toEqual({ paymentIntentId: "pi_123", idempotencyKey: "refund:pi_123" });
    }
    // Cancelling twice must not re-write the status.
    expect(mockStorage.updateBooking).toHaveBeenCalledTimes(1);
  });

  it("404s on an unknown booking", async () => {
    mockStorage.getBooking.mockResolvedValue(undefined);
    await expect(cancelBooking({ bookingId: "nope", actor: "admin@bnp" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("confirmConflictBooking", () => {
  it("refuses with 409 and changes nothing when the room is still taken", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);

    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toBeInstanceOf(BookingError);
    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toMatchObject({ status: 409 });

    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockStorage.updateRoom).not.toHaveBeenCalled();
    expect(mockLifecycle.onBookingConfirmed).not.toHaveBeenCalled();
  });

  it("re-runs the gate excluding this booking, then activates it and notifies", async () => {
    mockStorage.getEscalations.mockResolvedValue([
      { id: "esc-1", bookingId: "bk-1", kind: "BOOKING_CONFLICT", status: "OPEN" },
    ]);

    const res = await confirmConflictBooking("bk-1", "admin@bnp");

    expect(mockStorage.isRoomAvailableForRange).toHaveBeenCalledWith({
      roomId: "r1",
      startDate: "2026-07-01",
      endDate: "2026-07-10",
      endExclusive: true,
      excludeBookingId: "bk-1",
    });
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", { status: "ACTIVE" });
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(mockStorage.updateEscalation).toHaveBeenCalledWith(
      "esc-1",
      expect.objectContaining({ status: "RESOLVED", resolvedBy: "admin@bnp" }),
    );
    expect(mockLifecycle.onBookingConfirmed).toHaveBeenCalledTimes(1);
    expect(mockLifecycle.onBookingConfirmed.mock.calls[0][0].booking.status).toBe("ACTIVE");
    expect(res.status).toBe("ACTIVE");
  });

  it("confirms an STR booking as CONFIRMED and never touches a room", async () => {
    mockStorage.getBooking.mockResolvedValue(booking({ model: "STR", roomId: null }));
    mockStorage.updateBooking.mockImplementation(async (id: string, u: Record<string, unknown>) => ({
      ...booking({ model: "STR", roomId: null }),
      ...u,
      id,
    }));

    const res = await confirmConflictBooking("bk-1", "admin@bnp");

    expect(res.status).toBe("CONFIRMED");
    expect(mockBookingGate.strHasConflict).toHaveBeenCalledWith(
      "prop-1",
      "2026-07-01",
      "2026-07-10",
      "bk-1", // exclude self — a CONFLICT row must not block its own confirmation
    );
    expect(mockStorage.updateRoom).not.toHaveBeenCalled();
    expect(mockLifecycle.onBookingConfirmed).toHaveBeenCalledTimes(1);
  });

  it("refuses an STR confirmation while the property dates are still taken", async () => {
    mockStorage.getBooking.mockResolvedValue(booking({ model: "STR", roomId: null }));
    mockBookingGate.strHasConflict.mockResolvedValue(true);
    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toMatchObject({ status: 409 });
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
  });

  it("404s on an unknown booking", async () => {
    mockStorage.getBooking.mockResolvedValue(undefined);
    await expect(confirmConflictBooking("nope", "admin@bnp")).rejects.toMatchObject({ status: 404 });
  });

  // The app-level gate and the UPDATE are not one transaction: another
  // confirmation can take the dates in between. Postgres then rejects the row
  // with 23P01, and the admin deserves the same 409 the gate would have given —
  // not a 500 that looks like the app broke.
  it("turns a Postgres exclusion violation on the UPDATE into a 409, not a 500", async () => {
    mockStorage.getBooking.mockResolvedValue(booking());
    mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
    mockStorage.updateBooking.mockRejectedValue(
      Object.assign(new Error("conflicting key value violates exclusion constraint"), { code: "23P01" }),
    );

    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toBeInstanceOf(BookingError);
    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toMatchObject({ status: 409 });
    // Nothing downstream ran: no room grabbed, no guest confirmation sent.
    expect(mockStorage.updateRoom).not.toHaveBeenCalled();
    expect(mockLifecycle.onBookingConfirmed).not.toHaveBeenCalled();
  });

  it("rethrows a non-exclusion UPDATE error untouched", async () => {
    mockStorage.getBooking.mockResolvedValue(booking());
    mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
    mockStorage.updateBooking.mockRejectedValue(Object.assign(new Error("boom"), { code: "42P01" }));
    await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toThrow("boom");
  });

  // Only a CONFLICT booking is resolvable this way — otherwise this endpoint
  // would resurrect a CANCELLED (possibly refunded) booking into ACTIVE.
  it.each(["CANCELLED", "ACTIVE", "CONFIRMED", "COMPLETED", "PENDING_PAYMENT"])(
    "refuses to confirm a booking in status %s",
    async (status) => {
      mockStorage.getBooking.mockResolvedValue(booking({ status }));
      await expect(confirmConflictBooking("bk-1", "admin@bnp")).rejects.toMatchObject({ status: 409 });
      expect(mockStorage.updateBooking).not.toHaveBeenCalled();
      expect(mockStorage.updateRoom).not.toHaveBeenCalled();
      expect(mockLifecycle.onBookingConfirmed).not.toHaveBeenCalled();
    },
  );
});

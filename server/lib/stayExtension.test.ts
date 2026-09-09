// server/lib/stayExtension.test.ts
// The centrepiece is the TIER-CROSSING case: 21 nights re-priced to 28 costs
// $200 for 7 more nights, not $400, because the cascade bills whole periods and
// a month is cheaper than four weeks. Pricing the added nights in isolation would
// create a second, divergent money rule for one stay.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(), getRoom: vi.fn(), getProperty: vi.fn(), getGuest: vi.fn(),
  getBookingGate: vi.fn(), updateBookingGate: vi.fn(), updateBooking: vi.fn(),
  getPaymentsByBooking: vi.fn(), getPaymentByStripeRef: vi.fn(), createPayment: vi.fn(),
  isRoomAvailableForRange: vi.fn(), raiseEscalationOnce: vi.fn(), getSetting: vi.fn(),
  getSettingNumber: vi.fn(),
}));
const mockStripe = vi.hoisted(() => ({ createOneTimePaymentIntent: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyAdmin: vi.fn() }));
const mockLifecycle = vi.hoisted(() => ({ onStayExtended: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./notifications", () => mockNotify);
vi.mock("./stayLifecycle", async (orig) => ({
  ...(await orig<typeof import("./stayLifecycle")>()),
  ...mockLifecycle,
}));

import { quoteExtension, startExtension, applyExtension, extensionOptions } from "./stayExtension";

// weekly 400 / monthly 1400 — the rates that make the tier boundary visible.
const ROOM = {
  id: "r1", name: "Garden", roomNumber: "2",
  dailyRate: "70.00", weeklyRent: "400.00", biweeklyRate: null, monthlyRate: "1400.00",
  cleaningFee: null,
};
// 21 nights, billed 3 weeks = $1200. No surcharge in the fixture for clarity.
const BOOKING = {
  id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1", roomId: "r1", guestId: "g1",
  model: "COLIVING", checkIn: "2026-10-01", checkOut: "2026-10-22",
  status: "ACTIVE", quotedTotal: "1200.00",
};
const GATE = { bookingId: "bk-1", gateToken: "tok", extensionCount: 0, originalCheckOut: null };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getRoom.mockResolvedValue(ROOM);
  mockStorage.getProperty.mockResolvedValue({ id: "prop-1", name: "Old Bill Cook", entity: "BNP" });
  mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
  mockStorage.getBookingGate.mockResolvedValue(GATE);
  mockStorage.updateBookingGate.mockResolvedValue(GATE);
  mockStorage.updateBooking.mockResolvedValue(BOOKING);
  mockStorage.getPaymentsByBooking.mockResolvedValue([
    { id: "pay-1", status: "PAID", amount: "1200.00", surcharge: "0" },
  ]);
  mockStorage.getPaymentByStripeRef.mockResolvedValue(undefined);
  mockStorage.createPayment.mockResolvedValue({ id: "pay-2" });
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.getSetting.mockResolvedValue(undefined);
  mockStorage.getSettingNumber.mockResolvedValue(0); // 0% surcharge for clean arithmetic
  mockStripe.createOneTimePaymentIntent.mockResolvedValue({ id: "pi_ext", client_secret: "cs_1" });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockLifecycle.onStayExtended.mockResolvedValue(undefined);
});

describe("quoteExtension — re-prices the WHOLE stay", () => {
  // 21 nights = 3 weeks = $1200. 28 nights = 1 month = $1400. Delta $200 for 7
  // nights, where pricing them alone would charge $400.
  it("charges the tier-crossing delta, not the added nights in isolation", async () => {
    const q = await quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" });
    expect(q.currentNights).toBe(21);
    expect(q.newNights).toBe(28);
    expect(q.addedNights).toBe(7);
    expect(q.newStayTotal).toBeCloseTo(1400);
    expect(q.alreadyPaid).toBeCloseTo(1200);
    expect(q.delta).toBeCloseTo(200);
  });

  it("prices a within-tier extension the ordinary way", async () => {
    // 21 -> 24 nights: 3 weeks + 3 days = 1200 + 210 = 1410, delta 210.
    const q = await quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-25" });
    expect(q.delta).toBeCloseTo(210);
  });

  it("nets out EVERY prior payment, so a second extension composes", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      { id: "pay-1", status: "PAID", amount: "1200.00", surcharge: "0" },
      { id: "pay-2", status: "PAID", amount: "200.00", surcharge: "0" },
    ]);
    // Already at 28 nights' worth of money; extend to 35 = 1 month + 1 week = 1800.
    const q = await quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-11-05" });
    expect(q.alreadyPaid).toBeCloseTo(1400);
    expect(q.newStayTotal).toBeCloseTo(1800);
    expect(q.delta).toBeCloseTo(400);
  });

  it("ignores unpaid and failed payments when netting", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      { id: "pay-1", status: "PAID", amount: "1200.00", surcharge: "0" },
      { id: "pay-2", status: "FAILED", amount: "999.00", surcharge: "0" },
    ]);
    const q = await quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" });
    expect(q.alreadyPaid).toBeCloseTo(1200);
  });

  // An extension must never move money outward. That decision goes to a human.
  it("REFUSES a non-positive delta rather than refunding the difference", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      { id: "pay-1", status: "PAID", amount: "5000.00", surcharge: "0" },
    ]);
    await expect(
      quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("400s a date at or before the current checkout", async () => {
    for (const d of ["2026-10-22", "2026-10-20"]) {
      await expect(quoteExtension({ bookingId: "bk-1", newCheckOut: d })).rejects.toMatchObject({
        status: 400,
      });
    }
  });

  // The owner's explicit override: an extension MAY carry a stay past 28 nights,
  // which requiresLease() would otherwise route to the lease flow. Flagged for
  // counsel, but the code must honour the decision.
  it("ALLOWS an extension past 28 nights (owner override)", async () => {
    const q = await quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-11-19" });
    expect(q.newNights).toBe(49);
    expect(q.delta).toBeGreaterThan(0);
  });

  it("409s an open-ended stay and a whole-property booking", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, checkOut: null });
    await expect(
      quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" }),
    ).rejects.toMatchObject({ status: 409 });

    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, roomId: null });
    await expect(
      quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it("409s a booking that is not live", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, status: "CANCELLED" });
    await expect(
      quoteExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("extensionOptions", () => {
  it("stops at the first unavailable night — never offers what we cannot honour", async () => {
    let call = 0;
    mockStorage.isRoomAvailableForRange.mockImplementation(async () => ++call <= 3);
    const { maxNewCheckOut, options } = await extensionOptions("bk-1");
    expect(maxNewCheckOut).toBe("2026-10-25"); // +3 nights
    expect(options.every((o) => o.addedNights <= 3)).toBe(true);
  });

  it("returns no maximum when the room is booked straight after", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    const { maxNewCheckOut, options } = await extensionOptions("bk-1");
    expect(maxNewCheckOut).toBeNull();
    expect(options).toEqual([]);
  });

  it("skips an unpriceable candidate without failing the whole picker", async () => {
    mockStorage.getPaymentsByBooking.mockResolvedValue([
      { id: "pay-1", status: "PAID", amount: "1300.00", surcharge: "0" },
    ]);
    // At +1 night (22n = 3wk+1d = 1270) the delta is negative and refused; longer
    // ones are fine. The picker must still return those.
    const { options } = await extensionOptions("bk-1");
    expect(options.length).toBeGreaterThan(0);
    expect(options.every((o) => o.dueNow > 0)).toBe(true);
  });
});

describe("startExtension — payment-first", () => {
  it("does NOT move the dates", async () => {
    await startExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" });
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
  });

  it("keys the intent per target date, so a double-tap reuses it", async () => {
    await startExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" });
    expect(mockStripe.createOneTimePaymentIntent.mock.calls[0][0].idempotencyKey).toBe(
      "extend:bk-1:2026-10-29",
    );
  });

  it("carries the metadata the webhook needs to apply it without re-quoting", async () => {
    await startExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" });
    const { metadata } = mockStripe.createOneTimePaymentIntent.mock.calls[0][0];
    expect(metadata).toMatchObject({
      extension_booking_id: "bk-1",
      extension_from: "2026-10-22",
      extension_to: "2026-10-29",
      entity: "BNP",
      property_id: "prop-1",
      room_id: "r1",
    });
    expect(metadata.amount).toBe("200.00");
  });

  it("409s when the nights are taken between the quote and the intent", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    await expect(
      startExtension({ bookingId: "bk-1", newCheckOut: "2026-10-29" }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockStripe.createOneTimePaymentIntent).not.toHaveBeenCalled();
  });
});

describe("applyExtension — the webhook", () => {
  const pi = (over: Record<string, string> = {}) =>
    ({
      id: "pi_ext",
      metadata: {
        extension_booking_id: "bk-1", extension_from: "2026-10-22",
        extension_to: "2026-10-29", amount: "200.00", surcharge: "0", ...over,
      },
    }) as unknown as import("stripe").Stripe.PaymentIntent;

  it("moves check_out, records the money, and confirms to the guest", async () => {
    const res = await applyExtension(pi());
    expect(res).toEqual({ applied: true, conflicted: false });
    expect(mockStorage.updateBooking).toHaveBeenCalledWith("bk-1", { checkOut: "2026-10-29" });
    expect(mockStorage.createPayment).toHaveBeenCalledTimes(1);
    expect(mockLifecycle.onStayExtended).toHaveBeenCalledTimes(1);
  });

  it("increments the extension ordinal and preserves the original term once", async () => {
    await applyExtension(pi());
    expect(mockStorage.updateBookingGate).toHaveBeenCalledWith("bk-1", {
      extensionCount: 1,
      originalCheckOut: "2026-10-22",
    });
  });

  it("does not overwrite an originalCheckOut already recorded", async () => {
    mockStorage.getBookingGate.mockResolvedValue({ ...GATE, extensionCount: 1, originalCheckOut: "2026-10-15" });
    await applyExtension(pi());
    expect(mockStorage.updateBookingGate.mock.calls[0][1]).toMatchObject({
      extensionCount: 2,
      originalCheckOut: "2026-10-15",
    });
  });

  it("is idempotent across Stripe retries", async () => {
    mockStorage.getBooking.mockResolvedValue({ ...BOOKING, checkOut: "2026-10-29" });
    const res = await applyExtension(pi());
    expect(res.applied).toBe(true);
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
    expect(mockStorage.createPayment).not.toHaveBeenCalled();
  });

  it("does not double-record a payment already on file", async () => {
    mockStorage.getPaymentByStripeRef.mockResolvedValue({ id: "pay-2", status: "PAID" });
    await applyExtension(pi());
    expect(mockStorage.createPayment).not.toHaveBeenCalled();
  });

  it("ignores a PaymentIntent with no extension metadata", async () => {
    const res = await applyExtension({ id: "pi_x", metadata: {} } as never);
    expect(res).toEqual({ applied: false, conflicted: false });
    expect(mockStorage.updateBooking).not.toHaveBeenCalled();
  });

  // THE money rule: the charge stands, nothing is auto-refunded, a human decides.
  describe("when the dates were taken in flight (23P01)", () => {
    beforeEach(() => {
      mockStorage.updateBooking.mockRejectedValue(
        Object.assign(new Error("conflicting key value violates exclusion constraint"), {
          code: "23P01",
        }),
      );
    });

    it("records the payment but leaves check_out UNCHANGED", async () => {
      const res = await applyExtension(pi());
      expect(res).toEqual({ applied: false, conflicted: true });
      expect(mockStorage.createPayment).toHaveBeenCalledTimes(1);
    });

    it("raises a HIGH escalation and pages a human", async () => {
      await applyExtension(pi());
      expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
        expect.objectContaining({ kind: "EXTENSION_CONFLICT", severity: "HIGH" }),
      );
      expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
    });

    it("never tells the guest the extension worked", async () => {
      await applyExtension(pi());
      expect(mockLifecycle.onStayExtended).not.toHaveBeenCalled();
    });

    it("says plainly in the alert that the charge was NOT refunded", async () => {
      await applyExtension(pi());
      const { detail } = mockStorage.raiseEscalationOnce.mock.calls[0][0];
      expect(detail).toMatch(/NOT refunded/i);
    });

    it("rethrows a non-exclusion database error rather than swallowing it", async () => {
      mockStorage.updateBooking.mockRejectedValue(
        Object.assign(new Error("connection lost"), { code: "08006" }),
      );
      await expect(applyExtension(pi())).rejects.toThrow(/connection lost/);
    });
  });
});

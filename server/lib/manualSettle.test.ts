// server/lib/manualSettle.test.ts
// Admin "Mark Paid" on a CashApp/Zelle booking. Two things this pins:
//   1. the dates are re-checked before the booking goes live (an Airbnb block or
//      another booking may have landed while the payment was pending) — a 409,
//      and NOTHING changes, when they are taken;
//   2. on success the guest gets their confirmation through the same lifecycle
//      spine card bookings use (onBookingConfirmed), not just an admin ping.

import { describe, it, expect, vi } from "vitest";

// Real deps are injected per test; the module-level defaults must not pull in
// the live DB / Stripe / SMTP layers.
vi.mock("../storage", () => ({ storage: {} }));
vi.mock("./stripe", () => ({}));
vi.mock("./notifications", () => ({ notifyAdmin: vi.fn() }));
vi.mock("./lifecycle", () => ({ onBookingConfirmed: vi.fn() }));

import { settleManualBookingPayment, type ManualSettleDeps } from "./manualSettle";
import { BookingError } from "./booking";

function makeDeps(over: Partial<{ free: boolean; method: string; roomId: string | null }> = {}) {
  const payment = { id: "pay1", bookingId: "b1", method: over.method ?? "CASHAPP", status: "PENDING", amount: "300.00" };
  const booking = {
    id: "b1", propertyId: "p1", roomId: over.roomId === undefined ? "r1" : over.roomId, guestId: "g1", model: "COLIVING",
    checkIn: "2026-10-01", checkOut: "2026-10-10", status: "PENDING_PAYMENT", reference: "BNP-TEST-0001", quotedTotal: "300.00",
  };
  const calls: string[] = [];
  const deps: ManualSettleDeps = {
    storage: {
      getPayment: vi.fn(async () => payment),
      getBooking: vi.fn(async () => booking),
      getGuest: vi.fn(async () => ({ id: "g1", name: "Pat Guest", email: "pat@example.com", phone: null })),
      getProperty: vi.fn(async () => ({ id: "p1", name: "Hutchens", type: "COLIVING" })),
      getRoom: vi.fn(async () => ({ id: "r1", name: "Room 2", status: "AVAILABLE" })),
      updatePayment: vi.fn(async (_id, u) => { calls.push("updatePayment"); return { ...payment, ...u }; }),
      updateBooking: vi.fn(async (_id, u) => { calls.push("updateBooking"); return { ...booking, ...u }; }),
      updateRoom: vi.fn(async () => { calls.push("updateRoom"); return undefined; }),
      isRoomAvailableForRange: vi.fn(async () => over.free ?? true),
    } as unknown as ManualSettleDeps["storage"],
    strHasConflict: vi.fn(async () => !(over.free ?? true)),
    onBookingConfirmed: vi.fn(async () => { calls.push("onBookingConfirmed"); }),
    notifyAdmin: vi.fn(async () => { calls.push("notifyAdmin"); return {} as never; }),
  };
  return { deps, calls, payment, booking };
}

describe("settleManualBookingPayment", () => {
  it("refuses a Stripe payment (those are confirmed by webhook only)", async () => {
    const { deps } = makeDeps({ method: "STRIPE" });
    await expect(settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps)).rejects.toMatchObject({ status: 400 });
  });

  it("409s and changes nothing when the room is no longer free for the dates", async () => {
    const { deps, calls } = makeDeps({ free: false });
    await expect(settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps)).rejects.toBeInstanceOf(BookingError);
    expect(calls).toEqual([]);
  });

  it("re-checks the room excluding the booking itself (a pending row must not block its own settlement)", async () => {
    const { deps } = makeDeps();
    await settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps);
    expect(deps.storage.isRoomAvailableForRange).toHaveBeenCalledWith(expect.objectContaining({ roomId: "r1", excludeBookingId: "b1", endExclusive: true }));
  });

  // Settling by hand must NOT be the way around the approval gate. The fixture is
  // a 9-night co-living stay, so it is gated: the payment goes PAID and the room
  // is occupied, but the booking waits on the guest's ID + signature.
  it("marks the payment PAID and occupies the room, but holds a gated co-living stay for approval", async () => {
    const { deps, calls } = makeDeps();
    const result = await settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps);
    expect(result.payment.status).toBe("PAID");
    expect(result.booking.status).toBe("PENDING_APPROVAL");
    expect(deps.storage.updatePayment).toHaveBeenCalledWith("pay1", expect.objectContaining({ status: "PAID", confirmedBy: "a1" }));
    expect(deps.storage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(deps.onBookingConfirmed).toHaveBeenCalledWith(expect.objectContaining({ booking: expect.objectContaining({ id: "b1", status: "PENDING_APPROVAL" }) }));
    expect(calls.indexOf("updatePayment")).toBeLessThan(calls.indexOf("onBookingConfirmed"));
  });

  // The gate is length-scoped, not model-scoped: an open-ended co-living stay has
  // unknowable nights, so it keeps the pre-gate behaviour.
  it("still activates an open-ended co-living stay (null checkOut is ungated)", async () => {
    const { deps } = makeDeps();
    (deps.storage.getBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "b1", propertyId: "p1", roomId: "r1", guestId: "g1", model: "COLIVING",
      checkIn: "2026-10-01", checkOut: null,
      status: "PENDING_PAYMENT", reference: "BNP-TEST-0003", quotedTotal: "300.00",
    });
    const result = await settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps);
    expect(result.booking.status).toBe("ACTIVE");
  });

  it("uses the STR gate for a whole-property booking and confirms it as CONFIRMED", async () => {
    const { deps } = makeDeps({ roomId: null });
    (deps.storage.getBooking as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "b1", propertyId: "p1", roomId: null, guestId: "g1", model: "STR", checkIn: "2026-10-01", checkOut: "2026-10-04",
      status: "PENDING_PAYMENT", reference: "BNP-TEST-0002", quotedTotal: "500.00",
    });
    const result = await settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps);
    expect(deps.strHasConflict).toHaveBeenCalledWith("p1", "2026-10-01", "2026-10-04", "b1");
    expect(result.booking.status).toBe("CONFIRMED");
    expect(deps.storage.updateRoom).not.toHaveBeenCalled();
  });

  it("is idempotent: an already-PAID payment returns without re-confirming", async () => {
    const { deps, calls } = makeDeps();
    (deps.storage.getPayment as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "pay1", bookingId: "b1", method: "ZELLE", status: "PAID", amount: "1" });
    await settleManualBookingPayment({ paymentId: "pay1", adminId: "a1", actor: "admin@x" }, deps);
    expect(calls).toEqual([]);
  });
});

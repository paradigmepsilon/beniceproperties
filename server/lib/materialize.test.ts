// server/lib/materialize.test.ts
// Short-stay materialization from a succeeded PaymentIntent. Storage, the
// availability gate, notifications and the lifecycle hook are all injected, so
// this exercises the real decision tree with no DB/network.
//
// The money-safety invariants locked here:
//   - a paid booking is NEVER auto-refunded (refundPaymentIntent is not even
//     reachable from this module),
//   - a gate failure or a Postgres exclusion violation (23P01) still writes the
//     paid booking — as CONFLICT, which blocks no dates — plus the PAID payment
//     row and a HIGH BOOKING_CONFLICT escalation,
//   - a CONFLICT booking never occupies a room and never emails the guest,
//   - Stripe retries are idempotent (keyed on `reference`).

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStripe = vi.hoisted(() => ({ refundPaymentIntent: vi.fn() }));
const mockPosthog = vi.hoisted(() => ({ posthog: { capture: vi.fn() } }));
vi.mock("./stripe", () => mockStripe);
vi.mock("./posthog", () => mockPosthog);
// The module's default deps reach for the real DB layer at import time; every
// call below injects its own storage, so an empty stub is enough.
vi.mock("../storage", () => ({ storage: {} }));

import { materializeShortStayBooking, type MaterializeDeps } from "./materialize";
import { BookingError } from "./booking";

const PROP = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP" };
const ROOM = { id: "r1", propertyId: "prop-1", name: "Garden", roomNumber: "2", status: "AVAILABLE" };
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };

function pi(metadata: Record<string, string> = {}) {
  return {
    id: "pi_123",
    metadata: {
      reference: "BNP-7QK4-2F9X",
      guest_name: "Jane Doe",
      guest_email: "jane@example.com",
      guest_phone: "+15551234567",
      property_id: "prop-1",
      room_id: "r1",
      check_in: "2026-07-01",
      check_out: "2026-07-10",
      model: "COLIVING",
      quoted_total: "980.00",
      amount: "950.00",
      surcharge: "30.00",
      ...metadata,
    },
  } as unknown as import("stripe").Stripe.PaymentIntent;
}

/** Fully-mocked dep bundle. `run()` casts it — the real dep types are checked
 *  against the production wiring by `npm run check`, not by test generics. */
function makeDeps() {
  return {
    storage: {
      getBookingByReference: vi.fn().mockResolvedValue(undefined),
      getPaymentByStripeRef: vi.fn().mockResolvedValue(undefined),
      updatePayment: vi.fn().mockResolvedValue({}),
      upsertGuestByEmail: vi.fn().mockResolvedValue(GUEST),
      createBooking: vi.fn().mockImplementation(async (b: Record<string, unknown>) => ({ id: "bk-1", ...b })),
      createPayment: vi.fn().mockResolvedValue({ id: "pay-1" }),
      updateRoom: vi.fn().mockResolvedValue({}),
      getProperty: vi.fn().mockResolvedValue(PROP),
      getRoom: vi.fn().mockResolvedValue(ROOM),
      raiseEscalationOnce: vi.fn().mockResolvedValue({ id: "esc-1" }),
    },
    resolveBooking: vi.fn().mockResolvedValue({}),
    notifyAdmin: vi.fn().mockResolvedValue({ email: { sent: true }, telegram: { sent: true } }),
    onBookingConfirmed: vi.fn().mockResolvedValue(undefined),
  };
}

const run = (
  intent: import("stripe").Stripe.PaymentIntent,
  deps: ReturnType<typeof makeDeps>,
) => materializeShortStayBooking(intent, deps as unknown as MaterializeDeps);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("materializeShortStayBooking — happy path", () => {
  it("writes a CONFIRMED/ACTIVE booking, occupies the room, and fires the confirmation", async () => {
    const deps = makeDeps();
    await run(pi(), deps);

    const created = deps.storage.createBooking.mock.calls[0][0];
    expect(created.status).toBe("ACTIVE"); // COLIVING short stay
    expect(created.reference).toBe("BNP-7QK4-2F9X");
    expect(deps.storage.updateRoom).toHaveBeenCalledWith("r1", { status: "OCCUPIED" });
    expect(deps.storage.createPayment.mock.calls[0][0]).toMatchObject({
      status: "PAID",
      stripeRef: "pi_123",
    });
    expect(deps.onBookingConfirmed).toHaveBeenCalledTimes(1);
    expect(deps.storage.raiseEscalationOnce).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("is idempotent across Stripe retries (booking already exists for the reference)", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue({ id: "bk-1", reference: "BNP-7QK4-2F9X" });
    deps.storage.getPaymentByStripeRef.mockResolvedValue({ id: "pay-1", status: "PENDING" });

    await run(pi(), deps);

    expect(deps.storage.createBooking).not.toHaveBeenCalled();
    expect(deps.storage.updatePayment).toHaveBeenCalledWith(
      "pay-1",
      expect.objectContaining({ status: "PAID" }),
    );
  });
});

describe("materializeShortStayBooking — CONFLICT instead of auto-refund", () => {
  it("saves the paid booking as CONFLICT when the availability gate fails", async () => {
    const deps = makeDeps();
    deps.resolveBooking.mockRejectedValue(
      new BookingError("Those dates are not available for this room", 409),
    );

    await run(pi(), deps);

    const created = deps.storage.createBooking.mock.calls[0][0];
    expect(created.status).toBe("CONFLICT");
    // Money is still recorded — the guest paid.
    expect(deps.storage.createPayment.mock.calls[0][0]).toMatchObject({ status: "PAID" });
    // NEVER a refund, and never a silent drop.
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    // A CONFLICT booking must not take the room.
    expect(deps.storage.updateRoom).not.toHaveBeenCalled();
    // No guest confirmation for an unresolved conflict.
    expect(deps.onBookingConfirmed).not.toHaveBeenCalled();

    expect(deps.storage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "bk-1",
        leaseId: null,
        kind: "BOOKING_CONFLICT",
        severity: "HIGH",
      }),
    );
    const alert = deps.notifyAdmin.mock.calls[0][0];
    expect(alert.subject).toContain("CONFLICT");
    expect(alert.body).toContain("BNP-7QK4-2F9X");
    expect(alert.context).toMatchObject({ bookingId: "bk-1", kind: "BOOKING_CONFLICT" });
  });

  it("retries as CONFLICT when the DB exclusion constraint rejects the insert (23P01)", async () => {
    const deps = makeDeps();
    deps.storage.createBooking
      .mockRejectedValueOnce(Object.assign(new Error("conflicting key value violates exclusion constraint"), { code: "23P01" }))
      .mockImplementationOnce(async (b: Record<string, unknown>) => ({ id: "bk-1", ...b }));

    await run(pi(), deps);

    expect(deps.storage.createBooking).toHaveBeenCalledTimes(2);
    expect(deps.storage.createBooking.mock.calls[0][0].status).toBe("ACTIVE");
    expect(deps.storage.createBooking.mock.calls[1][0].status).toBe("CONFLICT");
    expect(deps.storage.createPayment.mock.calls[0][0]).toMatchObject({ status: "PAID" });
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
    expect(deps.onBookingConfirmed).not.toHaveBeenCalled();
  });

  it("rethrows a non-exclusion insert error rather than swallowing it", async () => {
    const deps = makeDeps();
    deps.storage.createBooking.mockRejectedValue(Object.assign(new Error("boom"), { code: "42P01" }));
    await expect(run(pi(), deps)).rejects.toThrow("boom");
  });
});

describe("materializeShortStayBooking — guards", () => {
  it("does nothing without a reference", async () => {
    const deps = makeDeps();
    await run({ id: "pi_1", metadata: {} } as unknown as import("stripe").Stripe.PaymentIntent, deps);
    expect(deps.storage.createBooking).not.toHaveBeenCalled();
  });

  it("does not materialize a booking with no guest contact", async () => {
    const deps = makeDeps();
    await run(pi({ guest_email: "null" }), deps);
    expect(deps.storage.createBooking).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });
});

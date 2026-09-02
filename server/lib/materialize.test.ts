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

import { readFileSync } from "node:fs";
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
      property_name: "Old Bill Cook",
      room_id: "r1",
      room_name: "Room 2 — Garden",
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
function existingBooking(overrides: Record<string, unknown> = {}) {
  return {
    id: "bk-1",
    reference: "BNP-7QK4-2F9X",
    propertyId: "prop-1",
    roomId: "r1",
    guestId: "g1",
    model: "COLIVING",
    checkIn: "2026-07-01",
    checkOut: "2026-07-10",
    status: "ACTIVE",
    quotedTotal: "980.00",
    ...overrides,
  };
}

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
      getGuest: vi.fn().mockResolvedValue(GUEST),
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
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "CONFIRMED" }));
    deps.storage.getPaymentByStripeRef.mockResolvedValue({ id: "pay-1", status: "PENDING" });

    await run(pi(), deps);

    expect(deps.storage.createBooking).not.toHaveBeenCalled();
    expect(deps.storage.updatePayment).toHaveBeenCalledWith(
      "pay-1",
      expect.objectContaining({ status: "PAID" }),
    );
  });
});

// A retry is not automatically a no-op: the first attempt may have died partway
// through, so each step re-runs under its own idempotency guard.
describe("materializeShortStayBooking — partial-retry repair", () => {
  it("writes the missing PAID payment row when the booking exists but the payment does not", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "ACTIVE" }));
    deps.storage.getPaymentByStripeRef.mockResolvedValue(undefined);

    await run(pi(), deps);

    expect(deps.storage.createBooking).not.toHaveBeenCalled();
    expect(deps.storage.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk-1", status: "PAID", stripeRef: "pi_123" }),
    );
    expect(deps.storage.updatePayment).not.toHaveBeenCalled();
  });

  it("does not duplicate an already-PAID payment row", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "ACTIVE" }));
    deps.storage.getPaymentByStripeRef.mockResolvedValue({ id: "pay-1", status: "PAID" });

    await run(pi(), deps);

    expect(deps.storage.createPayment).not.toHaveBeenCalled();
    expect(deps.storage.updatePayment).not.toHaveBeenCalled();
  });

  it("re-runs the escalation + admin alert when the existing booking is a CONFLICT", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "CONFLICT" }));
    deps.storage.getPaymentByStripeRef.mockResolvedValue({ id: "pay-1", status: "PAID" });

    await run(pi(), deps);

    expect(deps.storage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ bookingId: "bk-1", leaseId: null, kind: "BOOKING_CONFLICT" }),
    );
    expect(deps.notifyAdmin).toHaveBeenCalledTimes(1);
    expect(deps.notifyAdmin.mock.calls[0][0].subject).toContain("CONFLICT");
    // Still never a confirmation and never a room grab.
    expect(deps.onBookingConfirmed).not.toHaveBeenCalled();
    expect(deps.storage.updateRoom).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();
  });

  it("does not re-page an admin when the CONFLICT escalation is already open", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "CONFLICT" }));
    deps.storage.raiseEscalationOnce.mockResolvedValue(null); // dedupe hit

    await run(pi(), deps);

    expect(deps.notifyAdmin).not.toHaveBeenCalled();
  });

  it("re-fires the (idempotent) confirmation when the existing booking is already live", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "CONFIRMED" }));

    await run(pi(), deps);

    expect(deps.onBookingConfirmed).toHaveBeenCalledTimes(1);
    expect(deps.storage.raiseEscalationOnce).not.toHaveBeenCalled();
  });

  it("leaves a CANCELLED booking alone", async () => {
    const deps = makeDeps();
    deps.storage.getBookingByReference.mockResolvedValue(existingBooking({ status: "CANCELLED" }));

    await run(pi(), deps);

    expect(deps.onBookingConfirmed).not.toHaveBeenCalled();
    expect(deps.storage.raiseEscalationOnce).not.toHaveBeenCalled();
    expect(deps.notifyAdmin).not.toHaveBeenCalled();
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
  // A paid PaymentIntent that cannot become a booking must never just be
  // logged — money moved and nobody would know. Every bail-out branch pages.
  it("pages an admin (contact-free) when the intent carries no reference", async () => {
    const deps = makeDeps();
    await run(
      {
        id: "pi_1",
        metadata: { guest_email: "jane@example.com", guest_phone: "+15551234567", property_name: "Old Bill Cook" },
      } as unknown as import("stripe").Stripe.PaymentIntent,
      deps,
    );
    expect(deps.storage.createBooking).not.toHaveBeenCalled();
    expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();

    expect(deps.notifyAdmin).toHaveBeenCalledTimes(1);
    const alert = deps.notifyAdmin.mock.calls[0][0];
    expect(alert.context).toMatchObject({ kind: "BOOKING_MATERIALIZE_FAILED" });
    expect(alert.body).toContain("pi_1");
    expect(alert.body).toContain("reference");
    expect(alert.body).toContain("Old Bill Cook");
    expect(alert.body).not.toContain("jane@example.com");
    expect(alert.body).not.toContain("+15551234567");
  });

  it.each(["guest_email", "guest_name"])(
    "pages an admin (contact-free) when %s is missing",
    async (field) => {
      const deps = makeDeps();
      await run(pi({ [field]: "null" }), deps);
      expect(deps.storage.createBooking).not.toHaveBeenCalled();
      expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();

      expect(deps.notifyAdmin).toHaveBeenCalledTimes(1);
      const alert = deps.notifyAdmin.mock.calls[0][0];
      expect(alert.context).toMatchObject({ kind: "BOOKING_MATERIALIZE_FAILED" });
      expect(alert.body).toContain("pi_123");
      expect(alert.body).toContain("BNP-7QK4-2F9X");
      expect(alert.body).toContain(field);
      // The one contact field that IS present must not ride along.
      expect(alert.body).not.toContain("jane@example.com");
      expect(alert.body).not.toContain("+15551234567");
      // …but the operator still gets enough to find it: listing names.
      expect(alert.body).toContain("Old Bill Cook");
    },
  );

  it.each(["property_id", "check_in"])(
    "refuses to write a booking with no %s and pages an admin instead",
    async (field) => {
      const deps = makeDeps();
      await run(pi({ [field]: "null" }), deps);

      expect(deps.storage.createBooking).not.toHaveBeenCalled();
      expect(deps.storage.createPayment).not.toHaveBeenCalled();
      expect(mockStripe.refundPaymentIntent).not.toHaveBeenCalled();

      const alert = deps.notifyAdmin.mock.calls[0][0];
      expect(alert.context).toMatchObject({ kind: "BOOKING_MATERIALIZE_FAILED" });
      expect(alert.body).toContain("pi_123");
      expect(alert.body).toContain("BNP-7QK4-2F9X");
      // Paging about a broken intent must not leak the guest's contact details.
      expect(alert.body).not.toContain("jane@example.com");
      expect(alert.body).not.toContain("+15551234567");
    },
  );
});

describe("materializeShortStayBooking — structural guarantee", () => {
  // The strongest form of "never auto-refunds": the refund helper is not
  // reachable from this module at all. A spy assertion would pass even if a
  // refund call were added behind an untested branch; this cannot.
  it("does not import the Stripe module at all", () => {
    const src = readFileSync(new URL("./materialize.ts", import.meta.url), "utf8");
    expect(src).not.toMatch(/from\s+["']\.\/stripe["']/);
    expect(src).not.toContain("refundPaymentIntent");
  });
});

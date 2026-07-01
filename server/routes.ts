// server/routes.ts
// =============================================================================
// Full REST surface for BNP.
//   Public:  inventory browse/detail, quote, create booking, guest lookup
//   Stripe:  webhook (source of truth for payment state)
//   Admin:   dashboard aggregates, bookings, reconciliation (mark-paid),
//            inventory CRUD, payments/subscriptions view, KPI push-now
// All DB access goes through `storage`. Money is always computed server-side via
// the canonical breakdown (see server/lib/booking.ts).
// =============================================================================

import express, { type Express } from "express";
import { z } from "zod";
import { setupAuth, requireAdmin } from "./auth";
import { storage } from "./storage";
import {
  quoteRequestSchema,
  createBookingSchema,
  leaseQuoteRequestSchema,
  type CreateBookingResponse,
} from "@shared/api-types";
import {
  insertPropertySchema,
  insertRoomSchema,
} from "@shared/schema";
import {
  resolveBooking,
  buildQuote,
  generateReference,
  BookingError,
} from "./lib/booking";
import { buildLeaseQuote, LeaseError } from "./lib/lease";
import {
  buildStrChargeMetadata,
  buildLeaseChargeMetadata,
} from "./lib/paymentMetadata";
import { createDraftLease, previewLease, signLease } from "./lib/leaseFlow";
import {
  startFirstPayment,
  finalizeFirstPayment,
  startDepositPayment,
  finalizeDepositPayment,
  refundDeposit,
} from "./lib/leasePayments";
import { billAccruedLateFees, handleChargeFailure } from "./lib/dunning";
import {
  getPortalView,
  payInstallmentNow,
  submitMessage,
  replyToThread,
  getThread,
} from "./lib/portal";
import { requireServiceToken } from "./lib/serviceAuth";
import * as uo from "./lib/uoApi";
import { buildReconciliationReport } from "./lib/reconciliation";
import {
  createDraftLeaseSchema,
  signLeaseSchema,
} from "@shared/api-types";
import { stripePublishableConfigured } from "./lib/stripe";
import {
  isStripeConfigured,
  createCheckoutSession,
  createWeeklySubscriptionCheckout,
  constructWebhookEvent,
} from "./lib/stripe";
import { buildAndPushSnapshot } from "./integrations/kpiRollup";
import { log } from "./server-log";

function appUrl(req: express.Request, path: string): string {
  const proto = req.protocol;
  const host = req.get("host");
  return `${proto}://${host}${path}`;
}

// Shared reconciliation handler (Phase 9). Module-level so both the UO and admin
// routes reference it regardless of registration order.
async function reconciliationHandler(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
): Promise<void> {
  try {
    const schema = z.object({
      from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "from and to (YYYY-MM-DD) required" });
      return;
    }
    const report = await buildReconciliationReport(parsed.data.from, parsed.data.to, new Date().toISOString());
    res.json(report);
  } catch (err) {
    next(err);
  }
}

export async function registerRoutes(app: Express): Promise<void> {
  // -------------------------------------------------------------------------
  // Stripe webhook MUST receive the raw body for signature verification, so it
  // is registered BEFORE express.json() (mounted in index.ts). We use a
  // route-specific raw parser here.
  // -------------------------------------------------------------------------
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return res.status(400).json({ message: "Missing stripe-signature" });
      }
      let event;
      try {
        event = constructWebhookEvent(req.body as Buffer, sig);
      } catch (err) {
        log(`webhook verify failed: ${(err as Error).message}`, "stripe");
        return res.status(400).json({ message: "Invalid signature" });
      }

      try {
        await handleStripeEvent(event);
      } catch (err) {
        log(`webhook handler error: ${(err as Error).message}`, "stripe");
        // Return 200 so Stripe doesn't hammer retries on our bugs; we logged it.
      }
      res.json({ received: true });
    },
  );

  // Session-based admin auth (adds /api/admin/login, /logout, /me).
  await setupAuth(app);

  // ---- Health ----
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "bnp",
      stripe: isStripeConfigured() ? "configured" : "test-placeholder",
      time: new Date().toISOString(),
    });
  });

  // =========================================================================
  // PUBLIC — inventory
  // =========================================================================
  app.get("/api/properties", async (_req, res, next) => {
    try {
      res.json(await storage.getProperties({ activeOnly: true }));
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/properties/:id", async (req, res, next) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || !property.active) {
        return res.status(404).json({ message: "Property not found" });
      }
      const rooms =
        property.type === "COLIVING" ? await storage.getRoomsByProperty(property.id) : [];
      res.json({ property, rooms });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/rooms/:id", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const property = await storage.getProperty(room.propertyId);
      res.json({ room, property });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — quote (method-aware; computed server-side)
  // =========================================================================
  app.post("/api/quote", async (req, res, next) => {
    try {
      const parsed = quoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid quote request" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      res.json(buildQuote(resolved, paymentMethod));
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — co-living lease quote (full payment-schedule preview, Phase 2)
  // Creates nothing, charges nothing. Returns the schedule the guest will sign
  // (Phase 3) and pay (Phase 4), computed by the shared canonical generator.
  // =========================================================================
  app.post("/api/lease-quote", async (req, res, next) => {
    try {
      const parsed = leaseQuoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res
          .status(400)
          .json({ message: parsed.error.errors[0]?.message ?? "Invalid lease quote request" });
      }
      res.json(await buildLeaseQuote(parsed.data));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — co-living lease creation + e-signature (Phase 3). No payment here.
  // =========================================================================

  // Render the agreement for review WITHOUT persisting a lease (no room hold).
  // The sign page calls this on load; the real lease is only created on sign.
  app.post("/api/leases/preview", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { documentHtml } = await previewLease(parsed.data);
      res.json({ documentHtml });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Create the DRAFT (→ PENDING_SIGNATURE) lease + persisted schedule, and
  // return the agreement rendered for review.
  app.post("/api/leases", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { lease, documentHtml } = await createDraftLease(parsed.data);
      res.status(201).json({ leaseId: lease.id, status: lease.status, documentHtml });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Fetch a lease + its schedule + the review document (for the sign page).
  app.get("/api/leases/:id", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      const leaseRooms = await storage.getLeaseRooms(lease.id);
      const schedule = await storage.getScheduleByLease(lease.id);
      const guest = await storage.getGuest(lease.guestId);
      res.json({
        lease: {
          id: lease.id,
          status: lease.status,
          startDate: lease.startDate,
          endDate: lease.endDate,
          paymentCadence: lease.paymentCadence,
          weeklyRateSnapshot: lease.weeklyRateSnapshot,
          totalLeaseValue: lease.totalLeaseValue,
          prorationNote: lease.prorationNote,
          signedAt: lease.signedAt,
          signedName: lease.signedName,
          signedPdfUrl: lease.signedPdfUrl,
        },
        rooms: leaseRooms.map((lr) => ({ name: lr.roomNameSnapshot, roomNumber: lr.roomNumberSnapshot })),
        schedule: schedule.map((s) => ({
          seq: s.scheduleSeq,
          dueDate: s.dueDate,
          amount: s.amount,
          status: s.status,
        })),
        guest: guest ? { name: guest.name, email: guest.email } : null,
      });
    } catch (err) {
      next(err);
    }
  });

  // Sign the lease (typed name + affirmation). Captures timestamp + IP server-side.
  app.post("/api/leases/:id/sign", async (req, res, next) => {
    try {
      const parsed = signLeaseSchema.safeParse({ ...req.body, leaseId: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid signature" });
      }
      const fwd = req.headers["x-forwarded-for"];
      const ip =
        (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : undefined) ||
        req.socket.remoteAddress ||
        "unknown";
      const { lease, documentUrl } = await signLease({
        leaseId: parsed.data.leaseId,
        signedName: parsed.data.signedName,
        affirmed: parsed.data.affirmed,
        ip,
      });
      res.json({ leaseId: lease.id, status: lease.status, documentUrl });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Serve the signed agreement HTML (guest re-download, anytime). Falls back to
  // the review render if not yet signed.
  app.get("/api/leases/:id/document", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      if (!lease.signedDocumentHtml) {
        return res.status(409).json({ message: "Lease has not been signed yet" });
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(lease.signedDocumentHtml);
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // GUEST PORTAL (Phase 6) — token-authenticated self-serve. The token is the
  // credential; no session needed.
  // =========================================================================
  app.get("/api/portal/:token", async (req, res, next) => {
    try {
      res.json(await getPortalView(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Pay an open installment now (early pay, or settle a LATE/FAILED row) against
  // the saved card; also bills that installment's accrued late fees.
  app.post("/api/portal/:token/pay/:seq", async (req, res, next) => {
    try {
      const seq = parseInt(req.params.seq, 10);
      if (!Number.isFinite(seq)) return res.status(400).json({ message: "Invalid installment" });
      res.json(await payInstallmentNow(req.params.token, seq));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Submit a question / maintenance request (creates a thread root).
  app.post("/api/portal/:token/messages", async (req, res, next) => {
    try {
      const schema = z.object({
        category: z.enum(["QUESTION", "MAINTENANCE", "OTHER"]).optional(),
        subject: z.string().max(200).optional(),
        body: z.string().min(1, "Message can't be empty").max(5000),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const msg = await submitMessage(req.params.token, parsed.data);
      res.status(201).json({ threadId: msg.id, status: msg.status });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Fetch a thread (status check + history).
  app.get("/api/portal/:token/messages/:threadId", async (req, res, next) => {
    try {
      res.json(await getThread(req.params.token, req.params.threadId));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Reply to a thread.
  app.post("/api/portal/:token/messages/:threadId/reply", async (req, res, next) => {
    try {
      const schema = z.object({ body: z.string().min(1).max(5000) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const reply = await replyToThread(req.params.token, req.params.threadId, parsed.data.body);
      res.status(201).json({ id: reply.id });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Start the co-living first payment (Phase 4). Creates a Stripe Customer + a
  // PaymentIntent that saves the card; returns the client secret for Elements.
  // Booking becomes ACTIVE only after Stripe confirms success (webhook).
  app.post("/api/leases/:id/first-payment", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startFirstPayment(req.params.id);
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        portalToken: result.portalToken,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Start the co-living DEPOSIT payment (secures the room). Creates a Stripe
  // Customer + a PaymentIntent for the refundable deposit that saves the card;
  // returns the client secret for Elements. Paying it flips the room(s) to
  // OCCUPIED and then charges the first week off-session (webhook).
  app.post("/api/leases/:id/deposit", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startDepositPayment(req.params.id);
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        portalToken: result.portalToken,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Expose whether card payments are live (drives the client payment UI).
  app.get("/api/payments/config", (_req, res) => {
    res.json({
      stripeEnabled: isStripeConfigured() && stripePublishableConfigured(),
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY ?? null,
    });
  });

  // Admin: read/update the DEFAULTED threshold (days unpaid → lease DEFAULTED).
  // Admin-configurable per the spec — not a magic number.
  app.get("/api/admin/settings/default-threshold", requireAdmin, async (_req, res, next) => {
    try {
      const days = await storage.getSettingNumber("defaulted_threshold_days", 7);
      res.json({ defaultedThresholdDays: days });
    } catch (err) {
      next(err);
    }
  });

  app.put("/api/admin/settings/default-threshold", requireAdmin, async (req, res, next) => {
    try {
      const schema = z.object({ days: z.number().int().min(1).max(120) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "days must be an integer 1–120" });
      await storage.setSetting("defaulted_threshold_days", String(parsed.data.days));
      res.json({ defaultedThresholdDays: parsed.data.days });
    } catch (err) {
      next(err);
    }
  });

  // Admin: refund a lease's refundable security deposit (e.g. at move-out).
  app.post("/api/admin/leases/:id/refund-deposit", requireAdmin, async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled (Stripe key not set)." });
      }
      await refundDeposit(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // Admin: open escalations raised by this app (Phase 8 UO consumes/resolves).
  app.get("/api/admin/escalations", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "OPEN";
      res.json(await storage.getEscalations({ status }));
    } catch (err) {
      next(err);
    }
  });

  // Admin reconciliation report (same builder as the UO route).
  app.get("/api/admin/reconciliation-report", requireAdmin, reconciliationHandler);

  // =========================================================================
  // PUBLIC — create booking
  //   STRIPE  → create payment record(s) + Stripe Checkout, return checkoutUrl
  //   CASHAPP/ZELLE → pending booking + manual instructions
  // =========================================================================
  app.post("/api/bookings", async (req, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid booking" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod, guest } = parsed.data;

      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });

      // Co-living rooms are booked through the LEASE flow (deposit secures the
      // room → first week → schedule), not this one-time deposit checkout. This
      // endpoint now serves STR (whole-property) only. Reject co-living so there
      // is a single co-living money path and no divergent legacy deposit.
      if (resolved.model === "COLIVING") {
        return res.status(409).json({
          message: "Co-living rooms are booked through the lease flow. Start from the room page.",
        });
      }

      const quote = buildQuote(resolved, paymentMethod);
      const reference = generateReference();

      const guestRow = await storage.upsertGuestByEmail(guest);

      const booking = await storage.createBooking({
        propertyId: resolved.property.id,
        roomId: resolved.room?.id ?? null,
        guestId: guestRow.id,
        model: resolved.model,
        checkIn: resolved.checkIn,
        checkOut: resolved.checkOut,
        status: "PENDING_PAYMENT",
        paymentMethod,
        reference,
        quotedTotal: String(quote.dueNow.total),
      });

      const dueNow = quote.dueNow.total;
      const surcharge = quote.dueNow.surcharge;
      // STR-only path now (co-living rejected above), so this is a one-time stay charge.
      const paymentType = "ONE_TIME";

      const response: CreateBookingResponse = {
        reference,
        bookingId: booking.id,
        paymentMethod,
        quote,
      };

      if (paymentMethod === "STRIPE") {
        if (!isStripeConfigured()) {
          return res.status(503).json({
            message: "Card payments aren't enabled yet (Stripe test key not set). Use CashApp or Zelle.",
          });
        }
        // Deposit / one-time payment record (PENDING until webhook confirms).
        const payment = await storage.createPayment({
          bookingId: booking.id,
          type: paymentType,
          method: "STRIPE",
          amount: String(dueNow - surcharge),
          surcharge: String(surcharge),
          status: "PENDING",
          stripeRef: null,
          confirmedBy: null,
          paidAt: null,
        });

        // Full Stripe Metadata Contract on the STR (whole-property) charge.
        const chargeMetadata = buildStrChargeMetadata({
          entity: resolved.property.entity,
          property: resolved.property,
          paymentKind: "BOOKING_DEPOSIT",
          rateCadence: resolved.rateTier ?? null,
        });

        const session = await createCheckoutSession({
          amount: dueNow,
          description: `Stay — ${resolved.property.name}`,
          reference,
          guestEmail: guest.email,
          successUrl: appUrl(req, `/confirmation/${reference}`),
          cancelUrl: appUrl(req, `/property/${resolved.property.id}`),
          metadata: chargeMetadata,
        });
        await storage.updatePayment(payment.id, { stripeRef: session.id });
        response.checkoutUrl = session.url ?? undefined;
      } else {
        // CASHAPP / ZELLE — manual, no surcharge, pending until admin confirms.
        await storage.createPayment({
          bookingId: booking.id,
          type: paymentType,
          method: paymentMethod,
          amount: String(dueNow),
          surcharge: "0",
          status: "PENDING",
          stripeRef: null,
          confirmedBy: null,
          paidAt: null,
        });
        const handle =
          paymentMethod === "CASHAPP"
            ? process.env.CASHAPP_TAG ?? "$BeNiceProperties"
            : process.env.ZELLE_HANDLE ?? "pay@beniceproperties.com";
        response.manualInstructions = {
          method: paymentMethod,
          handle,
          amount: dueNow,
          memo: reference,
        };
      }

      res.status(201).json(response);
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });

  // =========================================================================
  // PUBLIC — guest booking lookup (reference + email)
  // =========================================================================
  app.get("/api/lookup", async (req, res, next) => {
    try {
      const schema = z.object({ reference: z.string().min(1), email: z.string().email() });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ message: "Provide reference and email" });

      const booking = await storage.getBookingByReference(parsed.data.reference);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      const guest = await storage.getGuest(booking.guestId);
      // Verify the email matches the booking's guest (lightweight auth).
      if (!guest || guest.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const property = await storage.getProperty(booking.propertyId);
      const payments = await storage.getPaymentsByBooking(booking.id);
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      res.json({
        booking,
        property: property ? { name: property.name, location: property.location } : null,
        room: room ? { name: room.name } : null,
        // Only payment status/amounts — no stripe refs to the public.
        payments: payments.map((p) => ({
          type: p.type,
          method: p.method,
          amount: p.amount,
          surcharge: p.surcharge,
          status: p.status,
          paidAt: p.paidAt,
        })),
      });
    } catch (err) {
      next(err);
    }
  });

  // =========================================================================
  // UO INTEGRATION (Phase 8) — service-token auth. BNP exposes; UO consumes.
  // Reads + constrained, idempotent write-backs. BNP owns its data.
  // =========================================================================
  const uoErr = (err: unknown, res: express.Response, next: express.NextFunction) => {
    if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
    next(err);
  };

  // --- Reads ---
  app.get("/api/uo/properties", requireServiceToken, async (_req, res, next) => {
    try { res.json(await uo.listPropertiesWithRooms()); } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/leases", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await uo.listLeases(status));
    } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/leases/:id", requireServiceToken, async (req, res, next) => {
    try { res.json(await uo.getLeaseDetail(req.params.id)); } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/payments", requireServiceToken, async (req, res, next) => {
    try {
      const leaseId = typeof req.query.leaseId === "string" ? req.query.leaseId : undefined;
      res.json(await uo.listPaymentsWithMetadata({ leaseId }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/messages", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await uo.listGuestMessageThreads(status));
    } catch (e) { uoErr(e, res, next); }
  });
  app.get("/api/uo/escalations", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await uo.listEscalations(status));
    } catch (e) { uoErr(e, res, next); }
  });

  // Reconciliation report (Phase 9): per-entity→property→room collected totals
  // for a date range (rent vs late, card vs manual), reconciled via metadata.
  // Handler (reconciliationHandler) is a module-level fn so both the UO and admin
  // routes can share it regardless of declaration order.
  app.get("/api/uo/reconciliation", requireServiceToken, reconciliationHandler);

  // --- Write-backs (constrained, idempotent) ---
  app.post("/api/uo/leases/:id/mark-paid", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ scheduleSeq: z.number().int(), note: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.markPaid({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/leases/:id/approve", requireServiceToken, async (req, res, next) => {
    try {
      const actor = typeof req.body?.actor === "string" ? req.body.actor : "uo";
      res.json(await uo.approveLease(req.params.id, actor));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/messages/:threadId/respond", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ body: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.respondToMessage({ threadId: req.params.threadId, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/escalations/:id/resolve", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: z.string().min(1), status: z.enum(["ACKNOWLEDGED", "RESOLVED"]).optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.resolveEscalation({ escalationId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/leases/:id/waive-late-fee", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ scheduleSeq: z.number().int(), reason: z.string().min(1), actor: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.waiveLateFees({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });

  // =========================================================================
  // ADMIN (auth-gated)
  // =========================================================================
  app.get("/api/admin/dashboard", requireAdmin, async (_req, res, next) => {
    try {
      const agg = await storage.getKpiAggregates();
      const bookings = await storage.getBookings();
      const pending = await storage.getPendingManualPayments();
      res.json({ aggregates: agg, recentBookings: bookings.slice(0, 20), pendingCount: pending.length });
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      res.json(await storage.getBookings(status ? { status } : undefined));
    } catch (err) {
      next(err);
    }
  });

  // Reconciliation queue: pending manual payments with booking + guest context.
  app.get("/api/admin/reconciliation", requireAdmin, async (_req, res, next) => {
    try {
      const pending = await storage.getPendingManualPayments();
      const enriched = await Promise.all(
        pending
          .filter((p) => p.method !== "STRIPE")
          .map(async (p) => {
            const booking = await storage.getBooking(p.bookingId);
            const guest = booking ? await storage.getGuest(booking.guestId) : null;
            return {
              payment: p,
              booking,
              guest: guest ? { name: guest.name, email: guest.email } : null,
            };
          }),
      );
      res.json(enriched);
    } catch (err) {
      next(err);
    }
  });

  // Mark a manual payment paid → confirm booking + record who/when.
  app.post("/api/admin/payments/:id/mark-paid", requireAdmin, async (req, res, next) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      if (payment.method === "STRIPE") {
        return res.status(400).json({ message: "Stripe payments are confirmed by webhook, not manually" });
      }
      const adminId = (req.user as { id: string }).id;
      const updated = await storage.updatePayment(payment.id, {
        status: "PAID",
        confirmedBy: adminId,
        paidAt: new Date(),
      });
      // Confirm the booking; activate co-living + occupy the room.
      const booking = await storage.getBooking(payment.bookingId);
      if (booking) {
        await storage.updateBooking(booking.id, {
          status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED",
        });
        if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
      }
      res.json({ payment: updated });
    } catch (err) {
      next(err);
    }
  });

  // Payments / subscriptions read view.
  app.get("/api/admin/payments", requireAdmin, async (_req, res, next) => {
    try {
      const bookings = await storage.getBookings();
      const rows = await Promise.all(
        bookings.map(async (b) => ({
          booking: b,
          payments: await storage.getPaymentsByBooking(b.id),
          subscription: await storage.getSubscriptionByBooking(b.id),
        })),
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // ---- Inventory management ----
  app.post("/api/admin/properties", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createProperty(parsed.data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/properties/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateProperty(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Property not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/properties", requireAdmin, async (_req, res, next) => {
    try {
      res.json(await storage.getProperties());
    } catch (err) {
      next(err);
    }
  });

  app.get("/api/admin/properties/:id/rooms", requireAdmin, async (req, res, next) => {
    try {
      res.json(await storage.getRoomsByProperty(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  app.post("/api/admin/rooms", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createRoom(parsed.data));
    } catch (err) {
      next(err);
    }
  });

  app.patch("/api/admin/rooms/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateRoom(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Room not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Manually trigger a KPI rollup + UO push (dry-run unless enabled).
  app.post("/api/admin/kpi/push", requireAdmin, async (_req, res, next) => {
    try {
      res.json({ snapshot: await buildAndPushSnapshot() });
    } catch (err) {
      next(err);
    }
  });
}

// ===========================================================================
// Stripe webhook handler — SOURCE OF TRUTH for payment state.
// ===========================================================================
// Extract the subscription id from an invoice across Stripe SDK shapes. v18
// moved it off `invoice.subscription`; it now lives under the invoice line
// items' parent (subscription_item_details) or the invoice parent details.
function subIdFromInvoice(invoice: import("stripe").Stripe.Invoice): string | undefined {
  const anyInv = invoice as unknown as {
    subscription?: string | { id: string };
    parent?: { subscription_details?: { subscription?: string | { id: string } } };
    lines?: { data?: Array<{ parent?: { subscription_item_details?: { subscription?: string } } }> };
  };
  const direct = anyInv.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;
  const parentSub = anyInv.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object") return parentSub.id;
  const lineSub = anyInv.lines?.data?.find((l) => l.parent?.subscription_item_details?.subscription)
    ?.parent?.subscription_item_details?.subscription;
  return lineSub;
}

async function handleStripeEvent(event: import("stripe").Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as import("stripe").Stripe.Checkout.Session;
      const reference = session.metadata?.reference || session.client_reference_id || undefined;
      if (!reference) break;
      const booking = await storage.getBookingByReference(reference);
      if (!booking) break;

      // Mark the one-time/deposit payment PAID (matched by session id stored as stripeRef).
      const payment = await storage.getPaymentByStripeRef(session.id);
      if (payment) {
        await storage.updatePayment(payment.id, { status: "PAID", paidAt: new Date() });
      }

      // Confirm booking; co-living becomes ACTIVE and the room is occupied.
      await storage.updateBooking(booking.id, {
        status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED",
      });
      if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });

      // If this checkout also created a subscription (co-living weekly), record it.
      if (session.mode === "subscription" && session.subscription) {
        const subId =
          typeof session.subscription === "string" ? session.subscription : session.subscription.id;
        const existing = await storage.getSubscriptionByStripeId(subId);
        if (!existing) {
          const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
          await storage.createSubscription({
            bookingId: booking.id,
            stripeSubscriptionId: subId,
            weeklyAmount: room ? room.weeklyRent : "0",
            status: "active",
            nextChargeAt: null,
          });
        }
      }
      log(`booking ${reference} confirmed via checkout.session.completed`, "stripe");
      break;
    }

    case "invoice.paid": {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (!sub) break;
      // Record the weekly rent payment.
      await storage.createPayment({
        bookingId: sub.bookingId,
        type: "WEEKLY",
        method: "STRIPE",
        amount: String((invoice.amount_paid ?? 0) / 100),
        surcharge: "0",
        status: "PAID",
        stripeRef: invoice.id ?? null,
        confirmedBy: null,
        paidAt: new Date(),
      });
      await storage.updateSubscription(sub.id, { status: "active" });
      log(`weekly invoice paid for subscription ${subId}`, "stripe");
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as import("stripe").Stripe.Invoice;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (sub) await storage.updateSubscription(sub.id, { status: "past_due" });
      log(`weekly invoice FAILED for subscription ${subId}`, "stripe");
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as import("stripe").Stripe.Subscription;
      const local = await storage.getSubscriptionByStripeId(sub.id);
      if (local) await storage.updateSubscription(local.id, { status: sub.status });
      break;
    }

    // --- Phase 4: co-living lease PaymentIntents (saved-card model) ---
    case "payment_intent.succeeded": {
      const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
      const kind = pi.metadata?.payment_kind;
      if (kind === "BOOKING_DEPOSIT" && pi.metadata?.lease_id) {
        // Co-living deposit succeeded → secure the room(s) + charge first week.
        // (STR bookings also use BOOKING_DEPOSIT but carry no lease_id; those are
        // settled by checkout.session.completed, not here.)
        await finalizeDepositPayment(pi.id);
      } else if (kind === "FIRST_PAYMENT") {
        // Source of truth for lease activation.
        await finalizeFirstPayment(pi.id);
      } else if (kind === "SCHEDULED_RENT") {
        // Settle the installment by (lease_id, schedule_seq) from metadata. The
        // sweep usually already marked it PAID; this is the authoritative confirm
        // and covers the requires_action → succeeded async case. Idempotent.
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          if (row && row.status !== "PAID") {
            await storage.updateScheduleRow(row.id, {
              status: "PAID",
              paidAt: new Date(),
              stripePaymentIntentId: pi.id,
            });
            // Bill any accrued late fees for this installment as a separate charge.
            const lease = await storage.getLease(leaseId);
            const property = lease ? await storage.getProperty(lease.propertyId) : null;
            if (lease && property) {
              const leaseRooms = await storage.getLeaseRooms(lease.id);
              try {
                await billAccruedLateFees({ lease, property, rooms: leaseRooms, scheduleSeq: seq });
              } catch (feeErr) {
                log(`webhook late-fee billing failed ${leaseId} seq ${seq}: ${(feeErr as Error).message}`, "stripe");
              }
            }
          }
        }
      }
      log(`payment_intent.succeeded (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }

    case "payment_intent.payment_failed": {
      const pi = event.data.object as import("stripe").Stripe.PaymentIntent;
      const kind = pi.metadata?.payment_kind;
      if (kind === "SCHEDULED_RENT") {
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          // Don't clobber a PAID row; mark a still-open one FAILED + run dunning.
          if (row && row.status !== "PAID" && row.status !== "WAIVED") {
            const failed = (await storage.updateScheduleRow(row.id, { status: "FAILED", stripePaymentIntentId: pi.id })) ?? row;
            const lease = await storage.getLease(leaseId);
            const guest = lease ? await storage.getGuest(lease.guestId) : null;
            if (lease && guest) {
              try {
                await handleChargeFailure({ lease, guest, scheduleRow: failed, reason: pi.last_payment_error?.message });
              } catch (dErr) {
                log(`webhook failure-path error ${leaseId} seq ${seq}: ${(dErr as Error).message}`, "stripe");
              }
            }
          }
        }
      }
      log(`payment_intent.payment_failed (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }

    default:
      break;
  }
}

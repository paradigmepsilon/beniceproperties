// server/lib/bookingModify.ts
// =============================================================================
// Admin edits to a live booking, driven from Unified Ops: move or shorten the
// dates, override the price, fix the guest's contact details.
//
// PRICING — one money rule for one stay. New dates are re-priced with the SAME
// functions the original checkout used (strBaseTotal for a whole property, the
// room cascade for a co-living room), then compared with what the guest has
// actually paid, net of refunds. All comparison happens on the PRE-SURCHARGE
// base: `payments.amount` is the base and `payments.surcharge` the card fee on
// top of it, so comparing a base price against amount+surcharge (as the guest
// extension flow does) would treat the card fee as prepaid rent.
//
//   delta = newBase - paidBase
//     > 0  the guest owes the difference. UO invoices it (Stripe hosted invoice)
//          and writes the payment back through recordExternalPayment.
//     < 0  we owe the guest. Refunded here, newest payment first, each refund
//          carrying the card fee that was charged on the part being returned.
//          A CashApp/Zelle payment cannot be refunded through Stripe, so that
//          share is recorded as a MANUAL refund owed and a human sends it.
//
// GUARDS, mirroring bookingGateDecline:
//   1. `expectedDelta` must equal the server's fresh quote to the cent. A stale
//      UO tab can never move a different number than the operator looked at.
//   2. Dates are written BEFORE money moves, and the Postgres exclusion
//      constraint (23P01) is the final word on availability.
//   3. Every refund is keyed `modify-refund:<modificationId>:<paymentId>`,
//      `charge_already_refunded` is success, and payment_refunds is UNIQUE on the
//      Stripe refund id.
//   4. A refund that fails does NOT roll the dates back — the edit was the
//      operator's decision. It raises a HIGH escalation instead, like a decline.
// =============================================================================

import { z } from "zod";
import { storage } from "../storage";
import { BookingError, strBaseTotal, strHasConflict } from "./booking";
import { refundPaymentIntent } from "./stripe";
import { notifyAdmin, notifyGuest } from "./notifications";
import { stayModifiedRefunded } from "./stayTemplates";
import { getCardSurchargeRate } from "./pricingSettings";
import {
  buildRoomBookingChargeMetadata,
  buildStrChargeMetadata,
  buildRefundMetadata,
  assertCompleteRefundMetadata,
  type StripeChargeMetadata,
} from "./paymentMetadata";
import { fmtMoney } from "./formatShared";
import { stayUrl } from "./publicUrl";
import { log } from "../server-log";
import { calculateBreakdown, type PaymentMethod } from "@shared/pricing";
import { cascadeStayPrice, RateError } from "@shared/rateSelection";
import { stayNights } from "@shared/bookingGate";
import type { Booking, Payment, PaymentRefund, Property, Room } from "@shared/schema";

/** Postgres exclusion_violation — the range-overlap constraint rejected the row. */
const PG_EXCLUSION_VIOLATION = "23P01";
const CHARGE_ALREADY_REFUNDED = "charge_already_refunded";
/** Half a cent — the same tolerance the decline and cancel flows use. */
const AMOUNT_TOLERANCE = 0.005;

/** Only a live or just-finished stay can be edited. CONFLICT has its own flow. */
export const MODIFIABLE_BOOKING_STATUSES = [
  "PENDING_APPROVAL",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
] as const;

const round2 = (v: number) => Math.round(v * 100) / 100;

// -----------------------------------------------------------------------------
// Pure money helpers (exported for tests)
// -----------------------------------------------------------------------------

export interface PaymentPosition {
  payment: Payment;
  /** amount + surcharge as charged. */
  charged: number;
  /** Refunded so far (payment_refunds rows; the whole charge if status is REFUNDED). */
  refunded: number;
  /** charged - refunded, never below 0. */
  remaining: number;
  /** The base (pre-surcharge) share of `remaining`. */
  remainingBase: number;
}

/**
 * Where the guest's money stands, payment by payment. Only PAID and REFUNDED
 * rows count — PENDING and FAILED never moved money.
 */
export function paymentPositions(payments: Payment[], refunds: PaymentRefund[]): PaymentPosition[] {
  return payments
    .filter((p) => p.status === "PAID" || p.status === "REFUNDED")
    .map((p) => {
      const amount = parseFloat(p.amount);
      const charged = round2(amount + parseFloat(p.surcharge ?? "0"));
      const ledger = refunds
        .filter((r) => r.paymentId === p.id)
        .reduce((sum, r) => sum + parseFloat(r.amount), 0);
      // A REFUNDED row with no ledger entry was refunded in full by an older flow.
      const refunded = p.status === "REFUNDED" ? Math.max(ledger, charged) : ledger;
      const remaining = round2(Math.max(0, charged - refunded));
      const remainingBase = charged > 0 ? round2((remaining * amount) / charged) : 0;
      return { payment: p, charged, refunded: round2(refunded), remaining, remainingBase };
    });
}

export interface RefundPlanLine {
  paymentId: string;
  stripePaymentIntentId: string;
  /** Dollars to refund, card fee share included. */
  amount: number;
  /** The base share of `amount`. */
  baseAmount: number;
  /** True when this refund returns everything left on the payment. */
  full: boolean;
}

export interface RefundPlan {
  card: RefundPlanLine[];
  /** Base owed back on CashApp/Zelle payments — a human sends it. */
  manual: number;
  /** Total leaving through Stripe. */
  cardTotal: number;
}

/**
 * Spread `baseToReturn` across the payments, newest first. Each card refund
 * carries the surcharge that was charged on the base it returns, so a guest
 * refunded $100 of stay also gets back the $3.50 card fee they paid on it.
 */
export function planRefund(positions: PaymentPosition[], baseToReturn: number): RefundPlan {
  let need = round2(baseToReturn);
  const card: RefundPlanLine[] = [];
  const newestFirst = [...positions].sort(
    (a, b) =>
      (b.payment.paidAt ? new Date(b.payment.paidAt).getTime() : 0) -
      (a.payment.paidAt ? new Date(a.payment.paidAt).getTime() : 0),
  );

  for (const pos of newestFirst) {
    if (need <= AMOUNT_TOLERANCE) break;
    const p = pos.payment;
    if (p.method !== "STRIPE" || !p.stripeRef || pos.remainingBase <= 0) continue;
    const base = Math.min(need, pos.remainingBase);
    const full = base >= pos.remainingBase - AMOUNT_TOLERANCE;
    // Returning the whole remainder refunds exactly what is left, so rounding can
    // never leave a stray cent on the charge.
    const amount = full ? pos.remaining : Math.min(pos.remaining, round2((base * pos.charged) / parseFloat(p.amount)));
    card.push({
      paymentId: p.id,
      stripePaymentIntentId: p.stripeRef,
      amount: round2(amount),
      baseAmount: round2(base),
      full,
    });
    need = round2(need - base);
  }

  return {
    card,
    manual: need > AMOUNT_TOLERANCE ? need : 0,
    cardTotal: round2(card.reduce((s, l) => s + l.amount, 0)),
  };
}

// -----------------------------------------------------------------------------
// Quote
// -----------------------------------------------------------------------------

export const modifyInputSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  /** Admin price override: the new stay total BEFORE the card fee. */
  overrideTotal: z.number().nonnegative().max(1_000_000).optional(),
  reason: z.string().trim().max(400).optional(),
});
export type ModifyInput = z.infer<typeof modifyInputSchema>;

export interface ModificationQuote {
  bookingId: string;
  reference: string;
  status: string;
  paymentMethod: string;
  current: { checkIn: string; checkOut: string; nights: number; quotedTotal: number };
  proposed: { checkIn: string; checkOut: string; nights: number; quotedTotal: number };
  /** The re-priced stay before the card fee (or the override). */
  newBase: number;
  /** What the cascade says the new dates cost, even when overridden. */
  pricedBase: number;
  overridden: boolean;
  /** Everything the guest has paid, net of refunds, before card fees. */
  paidBase: number;
  /** newBase - paidBase. */
  delta: number;
  surchargeRate: number;
  /** When delta < 0: how it would be returned. */
  refundPlan: RefundPlan | null;
  /** Manual refunds promised by earlier edits, already netted out of paidBase. */
  priorManualRefunds: number;
  available: boolean;
  datesChanged: boolean;
  warnings: string[];
  /** How many bookings + leases share this guest row — a contact edit touches all of them. */
  guestReferenceCount: number;
}

interface Loaded {
  booking: Booking;
  property: Property;
  room: Room | null;
}

async function loadModifiable(bookingId: string): Promise<Loaded> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);
  if (!(MODIFIABLE_BOOKING_STATUSES as readonly string[]).includes(booking.status)) {
    throw new BookingError(`A ${booking.status} booking cannot be edited here.`, 409);
  }
  if (!booking.checkOut) {
    throw new BookingError("An open-ended stay has no dates to edit — manage it as a lease.", 409);
  }
  const [property, room] = await Promise.all([
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
  ]);
  if (!property) throw new BookingError("Booking is missing its property", 409);
  if (booking.roomId && !room) throw new BookingError("Booking is missing its room", 409);
  return { booking, property, room: room ?? null };
}

/** Pre-surcharge price of a stay, by the same rules the original checkout used. */
export function priceStayBase(property: Property, room: Room | null, checkIn: string, checkOut: string): number {
  const n = stayNights(checkIn, checkOut);
  if (n < 1) throw new BookingError("Check-out must be after check-in", 400);
  try {
    if (room) {
      const priced = cascadeStayPrice({
        days: n,
        rates: {
          daily: room.dailyRate,
          weekly: room.weeklyRent,
          biweekly: room.biweeklyRate,
          monthly: room.monthlyRate,
        },
        topTier: "MONTHLY",
      });
      const b = calculateBreakdown({
        baseAmount: priced.total,
        cleaningFee: room.cleaningFee ? parseFloat(room.cleaningFee) : 0,
        paymentMethod: "ZELLE", // no surcharge: we want the base
      });
      return round2(b.subtotal + b.tax);
    }
    const str = strBaseTotal(property, n, checkIn);
    const b = calculateBreakdown({
      baseAmount: str.baseAmount,
      cleaningFee: property.cleaningFee ? parseFloat(property.cleaningFee) : 0,
      paymentMethod: "ZELLE",
    });
    return round2(b.subtotal + b.tax);
  } catch (err) {
    if (err instanceof RateError) throw new BookingError(err.message, 422);
    throw err;
  }
}

/** Manual refunds earlier edits promised — money we owe that no ledger row shows. */
function priorManual(mods: { after: Record<string, unknown> }[]): number {
  return round2(
    mods.reduce((s, m) => {
      const v = Number((m.after as { manualRefund?: unknown }).manualRefund ?? 0);
      return s + (Number.isFinite(v) ? v : 0);
    }, 0),
  );
}

async function buildQuote(loaded: Loaded, input: ModifyInput): Promise<{
  quote: ModificationQuote;
  positions: PaymentPosition[];
}> {
  const { booking, property, room } = loaded;
  const checkIn = input.checkIn ?? booking.checkIn;
  const checkOut = input.checkOut ?? booking.checkOut!;
  if (checkOut <= checkIn) throw new BookingError("Check-out must be after check-in", 400);

  const datesChanged = checkIn !== booking.checkIn || checkOut !== booking.checkOut;
  const overridden = input.overrideTotal !== undefined;
  if (overridden && (!input.reason || input.reason.length < 5)) {
    throw new BookingError("A price override needs a reason of at least 5 characters.", 400);
  }

  const [payments, refunds, mods, surchargeRate, guestReferenceCount] = await Promise.all([
    storage.getPaymentsByBooking(booking.id),
    storage.getRefundsByBooking(booking.id),
    storage.getBookingModificationsByBooking(booking.id),
    getCardSurchargeRate(),
    storage.countGuestReferences(booking.guestId),
  ]);

  const pricedBase = priceStayBase(property, room, checkIn, checkOut);
  const newBase = overridden ? round2(input.overrideTotal!) : pricedBase;

  const positions = paymentPositions(payments, refunds);
  const priorManualRefunds = priorManual(mods);
  const paidBase = round2(positions.reduce((s, p) => s + p.remainingBase, 0) - priorManualRefunds);
  const delta = round2(newBase - paidBase);

  const quotedFor = (base: number) =>
    calculateBreakdown({
      baseAmount: base,
      cleaningFee: 0,
      paymentMethod: booking.paymentMethod as PaymentMethod,
      surchargeRate,
    }).total;

  // Availability — only when the dates move. The booking never blocks itself.
  let available = true;
  if (datesChanged) {
    available = room
      ? await storage.isRoomAvailableForRange({
          roomId: room.id,
          startDate: checkIn,
          endDate: checkOut,
          endExclusive: true,
          excludeBookingId: booking.id,
        })
      : !(await strHasConflict(property.id, checkIn, checkOut, booking.id));
  }

  const nights = stayNights(checkIn, checkOut);
  const warnings: string[] = [];
  if (!available) warnings.push("Those dates overlap another booking, block or lease.");
  if (room && nights < 7) warnings.push("Co-living stays are normally at least 7 nights.");
  if (room && nights > 28) {
    warnings.push("Over 28 nights is normally a lease; this keeps it as one booking at cascade prices.");
  }
  if (checkIn !== booking.checkIn && booking.status === "ACTIVE") {
    warnings.push("The guest has already checked in — moving check-in rewrites the stay's history.");
  }
  if (priorManualRefunds > 0) {
    warnings.push(`${fmtMoney(priorManualRefunds)} of manual refunds from earlier edits is already owed.`);
  }

  const refundPlan = delta < 0 ? planRefund(positions, -delta) : null;
  if (refundPlan && refundPlan.manual > 0) {
    warnings.push(
      `${fmtMoney(refundPlan.manual)} was paid by CashApp/Zelle and must be returned by hand.`,
    );
  }

  return {
    positions,
    quote: {
      bookingId: booking.id,
      reference: booking.reference,
      status: booking.status,
      paymentMethod: booking.paymentMethod,
      current: {
        checkIn: booking.checkIn,
        checkOut: booking.checkOut!,
        nights: stayNights(booking.checkIn, booking.checkOut!),
        quotedTotal: parseFloat(booking.quotedTotal),
      },
      proposed: { checkIn, checkOut, nights, quotedTotal: quotedFor(newBase) },
      newBase,
      pricedBase,
      overridden,
      paidBase,
      delta,
      surchargeRate,
      refundPlan,
      priorManualRefunds,
      available,
      datesChanged,
      warnings,
      guestReferenceCount,
    },
  };
}

/** Price an edit. Writes nothing and moves no money. */
export async function quoteModification(bookingId: string, input: ModifyInput): Promise<ModificationQuote> {
  const loaded = await loadModifiable(bookingId);
  return (await buildQuote(loaded, input)).quote;
}

// -----------------------------------------------------------------------------
// Apply
// -----------------------------------------------------------------------------

export interface ModificationResult {
  modificationId: string;
  reference: string;
  delta: number;
  quote: ModificationQuote;
  refunded: { paymentId: string; stripeRefundId: string | null; amount: number }[];
  failed: { paymentId: string; stripePaymentIntentId: string; error: string }[];
  manualRefund: number;
  /** A refund was owed but the operator chose not to send it. */
  refundWithheld: number;
  guestNotified: boolean;
}

export async function applyModification(args: {
  bookingId: string;
  input: ModifyInput;
  /** The delta the operator confirmed. Must match the fresh quote to the cent. */
  expectedDelta: number;
  /** When delta < 0: refund now (true) or record the edit only (false). */
  refund: boolean;
  actor: string;
}): Promise<ModificationResult> {
  const loaded = await loadModifiable(args.bookingId);
  const { booking, property, room } = loaded;
  const { quote, positions } = await buildQuote(loaded, args.input);

  // --- Guard 1: the number the operator was looking at.
  if (Math.abs(quote.delta - args.expectedDelta) > AMOUNT_TOLERANCE) {
    throw new BookingError(
      `The balance has changed (expected ${fmtMoney(args.expectedDelta)}, now ${fmtMoney(quote.delta)}) — ` +
        `reload and try again.`,
      409,
    );
  }
  if (!quote.available) {
    throw new BookingError("Those dates are not available for this booking.", 409);
  }
  const newQuoted = quote.proposed.quotedTotal;
  if (!quote.datesChanged && Math.abs(newQuoted - quote.current.quotedTotal) <= AMOUNT_TOLERANCE && quote.delta === 0) {
    throw new BookingError("Nothing to change.", 400);
  }

  // --- Guard 2: dates first; the exclusion constraint is the real arbiter.
  try {
    await storage.updateBooking(booking.id, {
      checkIn: quote.proposed.checkIn,
      checkOut: quote.proposed.checkOut,
      quotedTotal: newQuoted.toFixed(2),
    });
  } catch (err) {
    if ((err as { code?: string }).code === PG_EXCLUSION_VIOLATION) {
      throw new BookingError("Those dates were just taken — nothing was changed.", 409);
    }
    throw err;
  }
  if (quote.datesChanged) {
    const gate = await storage.getBookingGate(booking.id);
    if (gate && !gate.originalCheckOut) {
      // Keep the term the stay was originally sold with, as extensions do.
      await storage.updateBookingGate(booking.id, { originalCheckOut: booking.checkOut });
    }
  }

  const plan = quote.delta < 0 && args.refund ? quote.refundPlan : null;
  const refundWithheld = quote.delta < 0 && !args.refund ? -quote.delta : 0;
  const manualRefund = plan?.manual ?? 0;
  const reason = args.input.reason?.replace(/\s+/g, " ").slice(0, 400) ?? null;

  const mod = await storage.createBookingModification({
    bookingId: booking.id,
    leaseId: null,
    kind: "BOOKING",
    before: {
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      quotedTotal: booking.quotedTotal,
    },
    after: {
      checkIn: quote.proposed.checkIn,
      checkOut: quote.proposed.checkOut,
      quotedTotal: newQuoted.toFixed(2),
      overridden: quote.overridden,
      pricedBase: quote.pricedBase,
      manualRefund,
      refundWithheld,
    },
    oldTotal: booking.quotedTotal,
    newTotal: newQuoted.toFixed(2),
    paidNet: quote.paidBase.toFixed(2),
    delta: quote.delta.toFixed(2),
    reason,
    refundIds: [],
    actor: args.actor,
  });

  const result: ModificationResult = {
    modificationId: mod.id,
    reference: booking.reference,
    delta: quote.delta,
    quote,
    refunded: [],
    failed: [],
    manualRefund,
    refundWithheld,
    guestNotified: false,
  };

  if (plan && plan.card.length > 0) {
    const baseMetadata: StripeChargeMetadata = room
      ? buildRoomBookingChargeMetadata({ entity: property.entity, property, room, paymentKind: "BOOKING_DEPOSIT" })
      : buildStrChargeMetadata({ entity: property.entity, property, paymentKind: "BOOKING_DEPOSIT" });

    for (const line of plan.card) {
      const pos = positions.find((p) => p.payment.id === line.paymentId)!;
      const metadata = {
        ...buildRefundMetadata({
          base: baseMetadata,
          kind: "ADMIN",
          paymentIntentId: line.stripePaymentIntentId,
          paymentId: line.paymentId,
          reference: booking.reference,
          actor: args.actor,
          reason: reason ?? `Stay changed ${booking.checkIn}–${booking.checkOut} → ${quote.proposed.checkIn}–${quote.proposed.checkOut}`,
        }),
        booking_modification_id: mod.id,
      };
      assertCompleteRefundMetadata(metadata);
      try {
        const refund = await refundPaymentIntent({
          paymentIntentId: line.stripePaymentIntentId,
          // --- Guard 3: one key per (edit, payment).
          idempotencyKey: `modify-refund:${mod.id}:${line.paymentId}`,
          amount: line.amount,
          metadata,
          reason: "requested_by_customer",
        });
        await storage.recordPaymentRefund({
          paymentId: line.paymentId,
          bookingId: booking.id,
          leaseId: null,
          stripeRefundId: refund.id,
          stripePaymentIntentId: line.stripePaymentIntentId,
          amount: line.amount.toFixed(2),
          kind: "ADMIN",
          reason,
          actor: args.actor,
        });
        if (line.full || pos.refunded + line.amount >= pos.charged - AMOUNT_TOLERANCE) {
          await storage.updatePayment(line.paymentId, { status: "REFUNDED" });
        }
        result.refunded.push({ paymentId: line.paymentId, stripeRefundId: refund.id, amount: line.amount });
        log(
          `booking ${booking.reference}: partial refund ${refund.id} ${fmtMoney(line.amount)} on ${line.stripePaymentIntentId} (mod ${mod.id}) by ${args.actor}`,
          "admin",
        );
      } catch (err) {
        if ((err as { code?: string }).code === CHARGE_ALREADY_REFUNDED) {
          await storage.updatePayment(line.paymentId, { status: "REFUNDED" });
          result.refunded.push({ paymentId: line.paymentId, stripeRefundId: null, amount: line.amount });
          continue;
        }
        result.failed.push({
          paymentId: line.paymentId,
          stripePaymentIntentId: line.stripePaymentIntentId,
          error: (err as Error).message,
        });
        log(
          `booking ${booking.reference}: MODIFY REFUND FAILED on ${line.stripePaymentIntentId}: ${(err as Error).message}`,
          "admin",
        );
      }
    }

    await storage.updateBookingModification(mod.id, {
      refundIds: result.refunded.map((r) => r.stripeRefundId).filter((x): x is string => !!x),
    });
  }

  const guest = await storage.getGuest(booking.guestId);

  // --- Guard 4: a failed refund pages a human; the dates stand.
  if (result.failed.length > 0) {
    const detail =
      `Booking ${booking.reference} was edited from UO (mod ${mod.id}) but ${result.failed.length} ` +
      `refund(s) FAILED: ` +
      result.failed.map((f) => `${f.stripePaymentIntentId} (${f.error})`).join("; ") +
      `. The new dates stand. Refund by hand in Stripe.`;
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "REFUND_FAILED",
      severity: "HIGH",
      detail,
    });
    await notifyAdmin({
      subject: `REFUND FAILED - ${booking.reference} edited but not refunded`,
      body: detail,
      telegramText: detail,
      context: { bookingId: booking.id, guestId: booking.guestId, kind: "REFUND_FAILED" },
    });
  }

  const cardRefunded = round2(result.refunded.reduce((s, r) => s + r.amount, 0));
  if (guest && (cardRefunded > 0 || manualRefund > 0)) {
    const tpl = stayModifiedRefunded({
      name: guest.name,
      property: property.name,
      reference: booking.reference,
      checkIn: quote.proposed.checkIn,
      checkOut: quote.proposed.checkOut,
      refundAmount: cardRefunded > 0 ? fmtMoney(cardRefunded) : null,
      manualAmount: manualRefund > 0 ? fmtMoney(manualRefund) : null,
      stayUrl: stayUrl(await storage.getBookingGate(booking.id)),
    });
    await notifyGuest({
      email: guest.email,
      phone: guest.phone,
      subject: tpl.subject,
      body: tpl.body,
      smsBody: tpl.smsBody,
      context: { bookingId: booking.id, guestId: guest.id, kind: "BOOKING_MODIFIED_REFUND", sentBy: args.actor },
    });
    result.guestNotified = true;
  }

  log(
    `booking ${booking.reference}: modified by ${args.actor} (mod ${mod.id}) ` +
      `${booking.checkIn}–${booking.checkOut} → ${quote.proposed.checkIn}–${quote.proposed.checkOut}, delta ${fmtMoney(quote.delta)}`,
    "admin",
  );
  return result;
}

/** UO records which of its invoices bills this edit's balance. */
export async function linkModificationInvoice(modificationId: string, uoInvoiceId: string) {
  const mod = await storage.getBookingModification(modificationId);
  if (!mod) throw new BookingError("Modification not found", 404);
  if (mod.uoInvoiceId && mod.uoInvoiceId !== uoInvoiceId) {
    throw new BookingError("This edit is already linked to a different invoice.", 409);
  }
  return storage.updateBookingModification(modificationId, { uoInvoiceId });
}

// -----------------------------------------------------------------------------
// Contact details
// -----------------------------------------------------------------------------

export const contactInputSchema = z
  .object({
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
    phone: z.string().trim().max(32).nullable().optional(),
  })
  .refine((v) => v.name !== undefined || v.email !== undefined || v.phone !== undefined, {
    message: "Nothing to update",
  });

/**
 * Update the guest row. It is shared by every booking and lease that guest has,
 * which is the point — the email we reach them on is one fact, not per-stay.
 * An email that already belongs to another guest is refused rather than merged:
 * upsertGuestByEmail keys on email, so two rows sharing one would split the
 * guest's history unpredictably.
 */
export async function updateGuestContact(args: {
  guestId: string;
  input: z.infer<typeof contactInputSchema>;
  actor: string;
}) {
  const guest = await storage.getGuest(args.guestId);
  if (!guest) throw new BookingError("Guest not found", 404);
  if (args.input.email && args.input.email !== guest.email.toLowerCase()) {
    const other = await storage.getGuestByEmail(args.input.email);
    if (other && other.id !== guest.id) {
      throw new BookingError("Another guest already uses that email address.", 409);
    }
  }
  const phone = args.input.phone === "" ? null : args.input.phone;
  const updated = await storage.updateGuest(guest.id, {
    ...(args.input.name !== undefined ? { name: args.input.name } : {}),
    ...(args.input.email !== undefined ? { email: args.input.email } : {}),
    ...(phone !== undefined ? { phone } : {}),
  });
  const references = await storage.countGuestReferences(guest.id);
  // Field names only — the values are contact details and never reach a log.
  log(
    `guest ${guest.id}: contact updated by ${args.actor} (${Object.keys(args.input).join(", ")}; ${references} booking/lease row(s))`,
    "admin",
  );
  return { guest: updated, references };
}

// -----------------------------------------------------------------------------
// Payments collected by UO
// -----------------------------------------------------------------------------

export const externalPaymentSchema = z.object({
  stripePaymentIntentId: z.string().regex(/^pi_[A-Za-z0-9_]+$/),
  /** Base dollars (pre card fee). */
  amount: z.number().positive().max(1_000_000),
  surcharge: z.number().nonnegative().max(1_000_000).default(0),
  modificationId: z.string().optional(),
  uoInvoiceId: z.string().optional(),
});

/**
 * Write a payment UO collected (a paid UO guest invoice) onto the booking, so
 * later quotes count it and it stays refundable here. Idempotent on the
 * PaymentIntent: the UO sweep and a manual refresh can both report the same one.
 */
export async function recordExternalPayment(args: {
  bookingId: string;
  input: z.infer<typeof externalPaymentSchema>;
  actor: string;
}): Promise<{ payment: Payment; created: boolean }> {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);

  const existing = await storage.getPaymentByStripeRef(args.input.stripePaymentIntentId);
  if (existing) {
    if (existing.bookingId !== booking.id) {
      throw new BookingError("That payment is already recorded on a different booking.", 409);
    }
    return { payment: existing, created: false };
  }
  const payment = await storage.createPayment({
    bookingId: booking.id,
    type: "ONE_TIME",
    method: "STRIPE",
    amount: args.input.amount.toFixed(2),
    surcharge: args.input.surcharge.toFixed(2),
    status: "PAID",
    stripeRef: args.input.stripePaymentIntentId,
    confirmedBy: args.actor,
    paidAt: new Date(),
  });
  if (args.input.modificationId && args.input.uoInvoiceId) {
    const mod = await storage.getBookingModification(args.input.modificationId);
    if (mod && !mod.uoInvoiceId) {
      await storage.updateBookingModification(mod.id, { uoInvoiceId: args.input.uoInvoiceId });
    }
  }
  log(
    `booking ${booking.reference}: UO-collected payment ${args.input.stripePaymentIntentId} ${fmtMoney(args.input.amount)} recorded by ${args.actor}`,
    "admin",
  );
  return { payment, created: true };
}

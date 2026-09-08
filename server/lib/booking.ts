// server/lib/booking.ts
// =============================================================================
// Booking domain logic: nightly subtotal, availability checks, reference codes,
// and quote construction. Quotes always run through the canonical
// calculateBreakdown() / calculateWeeklyCharge() from shared/pricing.ts so the
// number the guest sees equals the number charged.
// =============================================================================

import { customAlphabet } from "nanoid";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { calculateBreakdown, DEFAULT_CREDIT_CARD_RATE, formatSurchargePct, type PaymentMethod } from "@shared/pricing";
import {
  hasAnyWeekdayRate,
  cascadeStayPrice,
  averageWeekdayRate,
  weekdayStayTotal,
  RateError,
  type RateTier,
  type WeekdayRates,
} from "@shared/rateSelection";
import type { QuoteResponse } from "@shared/api-types";
import { storage } from "../storage";
import {
  COLIVING_MIN_DAYS,
  isDirectCoLivingStay,
  requiresLease,
  ROOM_UNBOOKABLE_STATUSES,
  NON_BLOCKING_BOOKING_STATUSES,
  type Property,
  type Room,
} from "@shared/schema";
import { overlapsRange } from "./ranges";

// Human-friendly booking reference, e.g. "BNP-7QK4-2F9X". Used in CashApp/Zelle
// memos and guest lookup. Avoids ambiguous chars (no 0/O/1/I).
const nanoref = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);
export function generateReference(): string {
  const raw = nanoref();
  return `BNP-${raw.slice(0, 4)}-${raw.slice(4)}`;
}

function nights(checkIn: string, checkOut: string): number {
  const n = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(0, n);
}

/**
 * STR base subtotal for `n` nights, using the day/week/month tier auto-selected
 * by stay length (see shared/rateSelection.ts). For back-compat, the legacy
 * `base_price` is passed as the DAILY rate so listings without the new columns
 * bill exactly as before (nightly × n). Returns the rounded subtotal + the tier.
 *
 * Per-weekday (2026-06-30): when the stay lands in the DAILY tier (<7 nights) AND
 * the property has any weekday price set, the total is the SUM of each night's
 * weekday price (fallback per night = dailyRate ?? basePrice, i.e. the same value
 * the cascade's DAILY tier). Whole weeks and months bill flat. A property with
 * no weekday prices is byte-identical to the previous behavior.
 *
 * Exported for unit testing (like buildQuote / generateReference below).
 */
export function strBaseTotal(
  property: Property,
  n: number,
  checkIn: string,
): { baseAmount: number; tier: RateTier; effectiveNightly: number } {
  // Owner rule 2026-09-08: ONE pricing rule everywhere. A stay bills as many
  // whole months as fit, then whole weeks, then leftover whole days — it is no
  // longer a single tier prorated per night. So a 40-night stay is 1 month +
  // 1 week + 5 days, not 40 x (monthly / 28).
  const weekdayRates: WeekdayRates = {
    monPrice: property.monPrice,
    tuePrice: property.tuePrice,
    wedPrice: property.wedPrice,
    thuPrice: property.thuPrice,
    friPrice: property.friPrice,
    satPrice: property.satPrice,
    sunPrice: property.sunPrice,
  };

  const priced = cascadeStayPrice({
    days: n,
    rates: {
      // base_price is the legacy nightly; treat it as the daily-tier rate so a
      // property with only base_price set keeps billing nightly × n. A property
      // that prices ONLY by weekday still has a priced daily tier — average the
      // set weekdays so the cascade can size the tail and fall back on it.
      daily: property.dailyRate ?? property.basePrice ?? averageWeekdayRate(weekdayRates),
      weekly: property.weeklyRate,
      biweekly: property.biweeklyRate,
      monthly: property.monthlyRate,
    },
    // Whole-property stays have no billing cadence, so they cascade from the
    // top: months, then weeks, then days (biweekly is skipped, exactly as the
    // MONTHLY cadence does on the lease side).
    topTier: "MONTHLY",
  });

  // Per-weekday prices apply ONLY to the leftover daily nights — the specific
  // calendar nights the cascade did not absorb into a whole month or week.
  const dailySeg = priced.segments.find((seg) => seg.tier === "DAILY");
  let baseAmount = priced.total;
  if (dailySeg && hasAnyWeekdayRate(weekdayRates)) {
    const weekdayAmount = weekdayStayTotal({
      // The daily tail starts this many nights after check-in.
      checkIn: format(addDays(parseISO(checkIn), dailySeg.startDay), "yyyy-MM-dd"),
      nights: dailySeg.units,
      weekdayRates,
      fallbackNightly: dailySeg.unitRate,
    });
    baseAmount = Math.round((priced.total - dailySeg.amount + weekdayAmount) * 100) / 100;
  }

  // The largest tier the stay actually used, for display + Stripe metadata.
  const top = priced.segments[0].tier;
  return {
    baseAmount,
    tier: top === "BIWEEKLY" ? "WEEKLY" : top,
    // Nightly prices vary across a cascaded stay, so there is no single nightly
    // rate. This is a DISPLAY average only — baseAmount is authoritative and is
    // the value that flows to the charge.
    effectiveNightly: Math.round((baseAmount / n) * 100) / 100,
  };
}

export class BookingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/**
 * Does a whole-property STR have any conflicting booking in [checkIn, checkOut)?
 * Open-ended co-living bookings are excluded (they belong to rooms). Exported so
 * the date-aware property grid (GET /api/properties?checkIn=&checkOut=) can mark
 * a whole-property STR unavailable for a searched range — same overlap rule the
 * booking flow enforces at checkout.
 */
export async function strHasConflict(
  propertyId: string,
  checkIn: string,
  checkOut: string,
  excludeBookingId?: string,
): Promise<boolean> {
  // Every source below stores/receives a half-open range (checkout day is free
  // to check in) — one overlap check for all three, via the shared helper.
  const requestedRange = { start: checkIn, end: checkOut, endExclusive: true };
  const hits = (blocks: { startDate: string; endDate: string }[]) =>
    blocks.some((b) => overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true }));

  // (1) BNP direct bookings for this whole-property listing.
  const existing = await storage.getBookings();
  // CONFLICT rows are paid-but-unresolved and block nothing (same rule as
  // storage.getColivingBookingsForRoom); `excludeBookingId` lets the admin
  // confirm action re-check the gate without the booking blocking itself.
  const directBlocks = existing
    .filter(
      (b) =>
        b.propertyId === propertyId &&
        b.model === "STR" &&
        !(NON_BLOCKING_BOOKING_STATUSES as readonly string[]).includes(b.status) &&
        b.id !== excludeBookingId &&
        b.checkOut,
    )
    .map((b) => ({ startDate: b.checkIn, endDate: b.checkOut as string }));
  if (hits(directBlocks)) return true;

  // (2) External iCal blocks synced from the listing's Airbnb calendar
  //     (room_id IS NULL). Airbnb DTEND is exclusive, so the same half-open
  //     overlap is correct.
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  if (hits(blocks)) return true;

  // (3) Manual admin blocks (off-platform booking, maintenance, owner use) for
  //     this property. Stored half-open, like external blocks.
  const manualBlocks = await storage.getManualBlocksForProperty(propertyId);
  return hits(manualBlocks);
}

export interface ResolvedBooking {
  model: "STR" | "COLIVING";
  property: Property;
  room?: Room;
  checkIn: string;
  checkOut: string | null;
  baseAmount: number; // STR: stay total at the chosen tier. COLIVING: stay total (weeks + daily remainder).
  cleaningFee: number;
  nights?: number;
  /** STR only: the rate tier the stay length landed in. */
  rateTier?: RateTier;
  /** STR only: per-night price the stay billed at (tierRate / tierDays). */
  effectiveNightly?: number;
  /** COLIVING short stay only: whole weeks + daily-remainder breakdown for the quote line. */
  shortStay?: { weeks: number; remainderDays: number; weeklyRate: number; dailyRate: number };
}

/**
 * Resolve + validate a booking request into the numbers a quote/booking needs.
 * Throws BookingError on invalid input, missing inventory, unavailability.
 */
export async function resolveBooking(input: {
  propertyId: string;
  roomId?: string;
  checkIn?: string;
  checkOut?: string;
}): Promise<ResolvedBooking> {
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new BookingError("Property not found", 404);
  if (!property.active) throw new BookingError("Property is not available", 409);

  // ---- Co-living (by-the-room) ----
  // A short co-living stay (7–28 nights) is a lease-LESS direct booking priced
  // as whole weeks + a daily remainder, paid in full upfront. Stays over 28
  // nights require a lease (routed to the lease flow); under 7 nights aren't
  // offered. The lease-vs-booking gate is the shared requiresLease/
  // isDirectCoLivingStay in @shared/schema — one source of truth with the client.
  if (property.type === "COLIVING") {
    if (!input.roomId) throw new BookingError("Select a room to reserve");
    const room = await storage.getRoom(input.roomId);
    if (!room || room.propertyId !== property.id) {
      throw new BookingError("Room not found", 404);
    }
    if ((ROOM_UNBOOKABLE_STATUSES as readonly string[]).includes(room.status)) {
      throw new BookingError("That room is no longer available", 409);
    }
    if (!input.checkIn || !input.checkOut) {
      throw new BookingError("Select move-in and move-out dates");
    }
    const n = nights(input.checkIn, input.checkOut);
    if (n < 1) throw new BookingError("Move-out must be after move-in");
    if (n < COLIVING_MIN_DAYS) {
      throw new BookingError(`Co-living stays have a ${COLIVING_MIN_DAYS}-night minimum`);
    }
    if (requiresLease(n)) {
      // Over a month → this is a lease, not a direct booking. Route the guest back.
      throw new BookingError(
        "Stays over 28 nights are booked as a lease — start from the room page to choose a payment schedule.",
        409,
      );
    }
    // n is now guaranteed 7–28 (isDirectCoLivingStay). Room must be free for the range.
    const free = await storage.isRoomAvailableForRange({
      roomId: room.id,
      startDate: input.checkIn,
      endDate: input.checkOut,
      endExclusive: true,
    });
    if (!free) throw new BookingError("Those dates are not available for this room", 409);

    // Same cascade as leases and STR (owner rule 2026-09-08). At exactly 28
    // nights this now bills one MONTH at the monthly rate rather than 4 weeks,
    // which is why it goes through cascadeStayPrice rather than shortStayPrice.
    let priced;
    try {
      priced = cascadeStayPrice({
        days: n,
        rates: {
          daily: room.dailyRate,
          weekly: room.weeklyRent,
          biweekly: room.biweeklyRate,
          monthly: room.monthlyRate,
        },
        topTier: "MONTHLY",
      });
    } catch (err) {
      if (err instanceof RateError) throw new BookingError(err.message, 422);
      throw err;
    }
    const weekSeg = priced.segments.find((seg) => seg.tier === "WEEKLY");
    const daySeg = priced.segments.find((seg) => seg.tier === "DAILY");
    return {
      model: "COLIVING",
      property,
      room,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      baseAmount: priced.total,
      // Per-room cleaning fee, folded into the upfront charge like STR. 0 if unset.
      cleaningFee: room.cleaningFee ? parseFloat(room.cleaningFee) : 0,
      nights: n,
      shortStay: {
        weeks: weekSeg?.units ?? 0,
        remainderDays: daySeg?.units ?? 0,
        weeklyRate: weekSeg?.unitRate ?? parseFloat(room.weeklyRent),
        dailyRate: daySeg?.unitRate ?? parseFloat(room.weeklyRent) / 7,
      },
    };
  }

  // ---- Whole-property (STR) ----
  if (!input.checkIn || !input.checkOut) {
    throw new BookingError("Select check-in and check-out dates");
  }
  const n = nights(input.checkIn, input.checkOut);
  if (n < 1) throw new BookingError("Check-out must be after check-in");
  if (await strHasConflict(property.id, input.checkIn, input.checkOut)) {
    throw new BookingError("Those dates are not available", 409);
  }
  const str = strBaseTotal(property, n, input.checkIn);
  return {
    model: "STR",
    property,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    baseAmount: str.baseAmount,
    cleaningFee: property.cleaningFee ? parseFloat(property.cleaningFee) : 0,
    nights: n,
    rateTier: str.tier,
    effectiveNightly: str.effectiveNightly,
  };
}

/** Build a method-aware quote from a resolved booking. */
export function buildQuote(
  resolved: ResolvedBooking,
  paymentMethod: PaymentMethod,
  surchargeRate: number = DEFAULT_CREDIT_CARD_RATE,
): QuoteResponse {
  if (resolved.model === "STR") {
    const b = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod,
      surchargeRate,
    });
    const tierLabel =
      resolved.rateTier === "MONTHLY" ? " @ monthly rate" : resolved.rateTier === "WEEKLY" ? " @ weekly rate" : "";
    const lines = [
      {
        label: `Stay (${resolved.nights} night${resolved.nights === 1 ? "" : "s"}${tierLabel})`,
        amount: resolved.baseAmount,
      },
    ];
    if (resolved.cleaningFee > 0) lines.push({ label: "Cleaning fee", amount: resolved.cleaningFee });
    if (b.tax > 0) lines.push({ label: "Tax", amount: b.tax });
    if (b.surcharge > 0) lines.push({ label: `Card processing (${formatSurchargePct(surchargeRate)})`, amount: b.surcharge });
    return {
      model: "STR",
      nights: resolved.nights,
      dueNow: { lines, subtotal: b.subtotal, tax: b.tax, surcharge: b.surcharge, total: b.total },
    };
  }

  // Co-living SHORT STAY (7–28 nights): a lease-less reservation paid in full
  // upfront — whole weeks at the weekly rent + a daily remainder. No deposit and
  // no recurring rent (that's the lease path, for stays over a month).
  const b = calculateBreakdown({
    baseAmount: resolved.baseAmount,
    cleaningFee: resolved.cleaningFee,
    paymentMethod,
    surchargeRate,
  });
  const ss = resolved.shortStay;
  const lines: QuoteResponse["dueNow"]["lines"] = [];
  if (ss) {
    if (ss.weeks > 0) {
      lines.push({
        label: `${ss.weeks} week${ss.weeks === 1 ? "" : "s"} @ ${money(ss.weeklyRate)}/wk`,
        amount: Math.round(ss.weeks * ss.weeklyRate * 100) / 100,
      });
    }
    if (ss.remainderDays > 0) {
      lines.push({
        label: `${ss.remainderDays} day${ss.remainderDays === 1 ? "" : "s"} @ ${money(ss.dailyRate)}/day`,
        amount: Math.round(ss.remainderDays * ss.dailyRate * 100) / 100,
      });
    }
  } else {
    // Defensive fallback (should not happen for a resolved short stay).
    lines.push({ label: `Stay (${resolved.nights} nights)`, amount: resolved.baseAmount });
  }
  if (resolved.cleaningFee > 0) lines.push({ label: "Cleaning fee", amount: resolved.cleaningFee });
  if (b.surcharge > 0) lines.push({ label: `Card processing (${formatSurchargePct(surchargeRate)})`, amount: b.surcharge });
  return {
    model: "COLIVING",
    nights: resolved.nights,
    dueNow: { lines, subtotal: b.subtotal, tax: b.tax, surcharge: b.surcharge, total: b.total },
  };
}

/** Format a number as a plain dollar amount for quote line labels, e.g. "$210". */
function money(n: number): string {
  return `$${(Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

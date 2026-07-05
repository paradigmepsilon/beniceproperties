// server/lib/booking.ts
// =============================================================================
// Booking domain logic: nightly subtotal, availability checks, reference codes,
// and quote construction. Quotes always run through the canonical
// calculateBreakdown() / calculateWeeklyCharge() from shared/pricing.ts so the
// number the guest sees equals the number charged.
// =============================================================================

import { customAlphabet } from "nanoid";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { calculateBreakdown, type PaymentMethod } from "@shared/pricing";
import {
  chooseRate,
  hasAnyWeekdayRate,
  shortStayPrice,
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
  type Property,
  type Room,
} from "@shared/schema";

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
 * chooseRate used for DAILY). WEEKLY/MONTHLY tiers are untouched. A property with
 * no weekday prices is byte-identical to the previous behavior.
 *
 * Exported for unit testing (like buildQuote / generateReference below).
 */
export function strBaseTotal(
  property: Property,
  n: number,
  checkIn: string,
): { baseAmount: number; tier: RateTier; effectiveNightly: number } {
  const chosen = chooseRate({
    nights: n,
    // base_price is the legacy nightly; treat it as the daily-tier rate so a
    // property with only base_price set keeps billing nightly × n.
    daily: property.dailyRate ?? property.basePrice,
    weekly: property.weeklyRate,
    monthly: property.monthlyRate,
  });

  if (chosen.tier === "DAILY") {
    const weekdayRates: WeekdayRates = {
      monPrice: property.monPrice,
      tuePrice: property.tuePrice,
      wedPrice: property.wedPrice,
      thuPrice: property.thuPrice,
      friPrice: property.friPrice,
      satPrice: property.satPrice,
      sunPrice: property.sunPrice,
    };
    if (hasAnyWeekdayRate(weekdayRates)) {
      const baseAmount = weekdayStayTotal({
        checkIn,
        nights: n,
        weekdayRates,
        // chosen.effectiveNightly for DAILY == dailyRate ?? basePrice (tierDays 1).
        fallbackNightly: chosen.effectiveNightly,
      });
      return {
        baseAmount,
        tier: "DAILY",
        // Nightly prices vary across the stay, so there is no single nightly rate.
        // effectiveNightly is a DISPLAY average only — baseAmount is authoritative
        // and is the value that flows to the charge. (Verified: nothing downstream
        // uses effectiveNightly for STR money math.)
        effectiveNightly: Math.round((baseAmount / n) * 100) / 100,
      };
    }
  }

  return {
    baseAmount: Math.round(chosen.effectiveNightly * n * 100) / 100,
    tier: chosen.tier,
    effectiveNightly: chosen.effectiveNightly,
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
): Promise<boolean> {
  const inMs = parseISO(checkIn).getTime();
  const outMs = parseISO(checkOut).getTime();
  // Overlap if start < otherEnd && otherStart < end (half-open — checkout day
  // is free to check in).
  const overlaps = (bIn: string, bOut: string) =>
    inMs < parseISO(bOut).getTime() && parseISO(bIn).getTime() < outMs;

  // (1) BNP direct bookings for this whole-property listing.
  const existing = await storage.getBookings();
  const directHit = existing.some((b) => {
    if (b.propertyId !== propertyId || b.model !== "STR") return false;
    if (b.status === "CANCELLED") return false;
    if (!b.checkOut) return false;
    return overlaps(b.checkIn, b.checkOut);
  });
  if (directHit) return true;

  // (2) External iCal blocks synced from the listing's Airbnb calendar
  //     (room_id IS NULL). Airbnb DTEND is exclusive, so the same half-open
  //     overlap is correct.
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  return blocks.some((b) => overlaps(b.startDate, b.endDate));
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
    if (room.status !== "AVAILABLE") {
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
    });
    if (!free) throw new BookingError("Those dates are not available for this room", 409);

    let priced;
    try {
      priced = shortStayPrice({
        nights: n,
        weeklyRent: room.weeklyRent,
        dailyRate: room.dailyRate,
      });
    } catch (err) {
      if (err instanceof RateError) throw new BookingError(err.message, 422);
      throw err;
    }
    return {
      model: "COLIVING",
      property,
      room,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      baseAmount: priced.baseAmount,
      // Per-room cleaning fee, folded into the upfront charge like STR. 0 if unset.
      cleaningFee: room.cleaningFee ? parseFloat(room.cleaningFee) : 0,
      nights: n,
      shortStay: {
        weeks: priced.weeks,
        remainderDays: priced.remainderDays,
        weeklyRate: priced.weeklyRate,
        dailyRate: priced.dailyRate,
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
): QuoteResponse {
  if (resolved.model === "STR") {
    const b = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod,
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
    if (b.surcharge > 0) lines.push({ label: "Card processing (3.5%)", amount: b.surcharge });
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
  if (b.surcharge > 0) lines.push({ label: "Card processing (3.5%)", amount: b.surcharge });
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

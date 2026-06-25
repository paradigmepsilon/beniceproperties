// server/lib/booking.ts
// =============================================================================
// Booking domain logic: nightly subtotal, availability checks, reference codes,
// and quote construction. Quotes always run through the canonical
// calculateBreakdown() / calculateWeeklyCharge() from shared/pricing.ts so the
// number the guest sees equals the number charged.
// =============================================================================

import { customAlphabet } from "nanoid";
import { differenceInCalendarDays, parseISO } from "date-fns";
import {
  calculateBreakdown,
  calculateWeeklyCharge,
  type PaymentMethod,
} from "@shared/pricing";
import type { QuoteResponse } from "@shared/api-types";
import { storage } from "../storage";
import type { Property, Room } from "@shared/schema";

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

/** STR nightly subtotal: nights × property base price. */
function strBaseTotal(property: Property, n: number): number {
  const nightly = property.basePrice ? parseFloat(property.basePrice) : 0;
  return nightly * n;
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
 * Open-ended co-living bookings are excluded (they belong to rooms).
 */
async function strHasConflict(
  propertyId: string,
  checkIn: string,
  checkOut: string,
): Promise<boolean> {
  const existing = await storage.getBookings();
  const inMs = parseISO(checkIn).getTime();
  const outMs = parseISO(checkOut).getTime();
  return existing.some((b) => {
    if (b.propertyId !== propertyId || b.model !== "STR") return false;
    if (b.status === "CANCELLED") return false;
    if (!b.checkOut) return false;
    const bIn = parseISO(b.checkIn).getTime();
    const bOut = parseISO(b.checkOut).getTime();
    // Overlap if start < otherEnd && otherStart < end.
    return inMs < bOut && bIn < outMs;
  });
}

export interface ResolvedBooking {
  model: "STR" | "COLIVING";
  property: Property;
  room?: Room;
  checkIn: string;
  checkOut: string | null;
  baseAmount: number; // STR: nightly total. COLIVING: deposit.
  cleaningFee: number;
  nights?: number;
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
  if (property.type === "COLIVING") {
    if (!input.roomId) throw new BookingError("Select a room to reserve");
    const room = await storage.getRoom(input.roomId);
    if (!room || room.propertyId !== property.id) {
      throw new BookingError("Room not found", 404);
    }
    if (room.status !== "AVAILABLE") {
      throw new BookingError("That room is no longer available", 409);
    }
    return {
      model: "COLIVING",
      property,
      room,
      checkIn: input.checkIn ?? new Date().toISOString().slice(0, 10),
      checkOut: null, // open-ended
      baseAmount: parseFloat(room.depositAmount),
      cleaningFee: 0,
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
  return {
    model: "STR",
    property,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    baseAmount: strBaseTotal(property, n),
    cleaningFee: property.cleaningFee ? parseFloat(property.cleaningFee) : 0,
    nights: n,
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
    const lines = [
      { label: `Stay (${resolved.nights} night${resolved.nights === 1 ? "" : "s"})`, amount: resolved.baseAmount },
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

  // Co-living: deposit now + recurring weekly rent.
  const deposit = calculateBreakdown({ baseAmount: resolved.baseAmount, paymentMethod });
  const weeklyRent = parseFloat(resolved.room!.weeklyRent);
  const weekly = calculateWeeklyCharge(weeklyRent, paymentMethod);
  const depositLines = [{ label: "Move-in deposit", amount: resolved.baseAmount }];
  if (deposit.surcharge > 0) depositLines.push({ label: "Card processing (3.5%)", amount: deposit.surcharge });
  return {
    model: "COLIVING",
    dueNow: {
      lines: depositLines,
      subtotal: deposit.subtotal,
      tax: deposit.tax,
      surcharge: deposit.surcharge,
      total: deposit.total,
    },
    recurring: {
      label: "Weekly rent (billed weekly after move-in)",
      weeklyRent,
      surcharge: weekly.surcharge,
      weeklyTotal: weekly.total,
    },
  };
}

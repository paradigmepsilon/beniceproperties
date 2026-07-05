// server/lib/lease.ts
// =============================================================================
// Co-living lease domain logic: validate a room selection + term, then build the
// full payment-schedule preview via the shared canonical generator
// (shared/leaseSchedule.ts). The preview the guest sees here is the schedule that
// will be persisted with the lease (Phase 3) and charged (Phase 4) — one source.
//
// This module creates NOTHING and charges NOTHING. Phase 2 stops at "ready to
// pay." It throws LeaseError (carrying an HTTP status) on invalid input.
// =============================================================================

import {
  generateTierSchedule,
  inclusiveDays,
  ScheduleError,
  type PaymentCadence,
} from "@shared/leaseSchedule";
import { chooseRate, RateError } from "@shared/rateSelection";
import type { LeaseQuoteResponse, LeaseScheduleLine } from "@shared/api-types";
import { MAX_LEASE_DAYS, allowedCadencesForTerm } from "@shared/schema";
import { storage } from "../storage";
import type { Room } from "@shared/schema";

const CADENCE_PERIOD_DAYS: Record<PaymentCadence, number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 28,
};

/** Sum a per-room rate column across rooms; null if no room has it set. */
function sumRate(rooms: Room[], pick: (r: Room) => string | null): number | null {
  let total = 0;
  let any = false;
  for (const r of rooms) {
    const v = pick(r);
    const n = v == null ? NaN : parseFloat(v);
    if (Number.isFinite(n) && n > 0) {
      total += n;
      any = true;
    }
  }
  return any ? Math.round(total * 100) / 100 : null;
}

export class LeaseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface LeaseQuoteInput {
  propertyId: string;
  roomIds: string[];
  startDate: string;
  endDate: string;
  /**
   * Guest-selected billing cadence. Must be one of allowedCadencesForTerm(term).
   * Optional here: if omitted we default to the first (shortest) allowed cadence,
   * so a preview always renders. The rate TIER (amount per period) is independent
   * of this — cadence only controls how often the guest is billed.
   */
  cadence?: PaymentCadence;
}

/**
 * Validate the selection and build the full schedule preview. Checks:
 *  - property exists, is active, and is COLIVING,
 *  - every roomId belongs to that property and is AVAILABLE,
 *  - no room is blocked by an external (Airbnb/OTA) reservation for the range,
 *  - the term is ≤ 90 days,
 *  - the schedule generates cleanly.
 */
export async function buildLeaseQuote(input: LeaseQuoteInput): Promise<LeaseQuoteResponse> {
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);
  if (!property.active) throw new LeaseError("Property is not available", 409);
  if (property.type !== "COLIVING") {
    throw new LeaseError("Leases are for co-living properties; use the nightly flow for this stay", 400);
  }

  // De-dupe room ids while preserving order.
  const roomIds = Array.from(new Set(input.roomIds));
  if (roomIds.length === 0) throw new LeaseError("Select at least one room");

  const rooms: Room[] = [];
  for (const id of roomIds) {
    const room = await storage.getRoom(id);
    if (!room || room.propertyId !== property.id) {
      throw new LeaseError("One of the selected rooms was not found in this property", 404);
    }
    if (room.status !== "AVAILABLE") {
      throw new LeaseError(`Room ${room.name} is no longer available`, 409);
    }
    // External (Airbnb/OTA) block guard — EXTERNAL BLOCKS ONLY, never lease
    // overlaps. A room synced-blocked on Airbnb for these dates must not be
    // quotable/bookable, or the guest can price+proceed on top of an OTA
    // reservation → double-booking. We deliberately do NOT check lease overlaps
    // here (that stays at createLease() time) so a stale DRAFT or the guest's
    // own in-progress lease never false-blocks the quote. Overlap math matches
    // isRoomAvailableForRange's room-external rule: the stored DTEND is
    // checkout-morning-exclusive, so a selection abutting b.endDate is free.
    const blocks = await storage.getExternalBlocksForRoom(room.id);
    const conflict = blocks.some(
      (b) => input.startDate < b.endDate && b.startDate <= input.endDate,
    );
    if (conflict) {
      throw new LeaseError(
        `${room.name} is booked for those dates on Airbnb. Pick different dates.`,
        409,
      );
    }
    rooms.push(room);
  }

  // Term ceiling (also enforced in the generator, but give a clean message here).
  const termDays = inclusiveDays(input.startDate, input.endDate);
  if (termDays > MAX_LEASE_DAYS) {
    throw new LeaseError(`Lease term cannot exceed ${MAX_LEASE_DAYS} days`, 422);
  }

  // NOTE: the ONLY availability guard in this pricing path is the external-block
  // (Airbnb/OTA) check above — a synced OTA reservation must block the quote to
  // prevent double-booking. We intentionally do NOT check *lease* overlaps here:
  // this function only PRICES a stay, and a stale DRAFT/pending lease (or the
  // guest's own in-progress one) must never false-block the preview. The lease
  // overlap guard runs at commit time in storage.createLease(), where a room is
  // actually taken.

  // Combined per-tier rates across rooms (supports rooms with different rents).
  // weekly falls back from room.weekly_rent (always set); daily/monthly are the
  // new optional tiers.
  const weeklyRateTotal = sumRate(rooms, (r) => r.weeklyRent) ?? 0;
  const dailyTotal = sumRate(rooms, (r) => r.dailyRate);
  const monthlyTotal = sumRate(rooms, (r) => r.monthlyRate);
  // Refundable security deposit that secures the room(s). Sum across rooms.
  const depositTotal = sumRate(rooms, (r) => r.depositAmount) ?? 0;
  // One-time cleaning fee (non-refundable). Sum across rooms. Charged at move-in
  // as its own PaymentIntent — NOT part of the recurring installment schedule.
  const cleaningFeeTotal = sumRate(rooms, (r) => r.cleaningFee) ?? 0;

  // The rate TIER sets the price per night (>=28 monthly, >=7 weekly, else daily),
  // falling back to a shorter tier if the chosen one isn't priced. Independent of
  // the billing cadence below.
  let chosen;
  try {
    chosen = chooseRate({
      nights: termDays,
      daily: dailyTotal,
      weekly: weeklyRateTotal,
      monthly: monthlyTotal,
    });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    throw err;
  }

  // Billing cadence is the GUEST's choice, gated by term length. Validate the
  // submitted cadence; default to the shortest allowed one when none is sent
  // (so a preview always renders). This is separate from the rate tier above.
  const allowed = allowedCadencesForTerm(termDays);
  const cadence: PaymentCadence =
    input.cadence && allowed.includes(input.cadence) ? input.cadence : allowed[0];
  if (input.cadence && !allowed.includes(input.cadence)) {
    throw new LeaseError(
      `A ${input.cadence.toLowerCase()} schedule isn't available for a ${termDays}-day term`,
      422,
    );
  }
  let generated;
  try {
    generated = generateTierSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence,
      effectiveNightly: chosen.effectiveNightly,
      periodDays: CADENCE_PERIOD_DAYS[cadence],
    });
  } catch (err) {
    if (err instanceof ScheduleError) throw new LeaseError(err.message, 422);
    throw err;
  }

  const schedule: LeaseScheduleLine[] = generated.installments.map((i) => ({
    seq: i.seq,
    dueDate: i.dueDate,
    amount: i.amount,
    prorated: i.prorated,
    daysCovered: i.daysCovered,
    dueOnBooking: i.seq === 1,
  }));

  return {
    propertyId: property.id,
    propertyName: property.name,
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      roomNumber: r.roomNumber ?? null,
      weeklyRent: parseFloat(r.weeklyRent),
    })),
    startDate: input.startDate,
    endDate: input.endDate,
    cadence,
    allowedCadences: allowed,
    weeklyRateTotal,
    depositTotal,
    cleaningFeeTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0,
  };
}

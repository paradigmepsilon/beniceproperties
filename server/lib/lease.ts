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
  generateCascadeSchedule,
  inclusiveDays,
  ScheduleError,
  type PaymentCadence,
} from "@shared/leaseSchedule";
import { combineLeaseRates, cascadeStayPrice, RateError } from "@shared/rateSelection";
import type { LeaseQuoteResponse, LeaseScheduleLine } from "@shared/api-types";
import { CADENCE_DAYS, MAX_LEASE_DAYS, ROOM_UNBOOKABLE_STATUSES, allowedCadencesForTerm } from "@shared/schema";
import { storage } from "../storage";
import { overlapsRange } from "./ranges";
import type { Room } from "@shared/schema";

const roundMoney = (v: number) => Math.round(v * 100) / 100;

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
   * THIS PICKS THE RATE (owner rule 2026-09-08): weekly/biweekly bill at
   * weekly_rent, monthly bills at monthly_rate (or 4 x weekly_rent when unset).
   * Optional here: if omitted we default to the first (shortest) allowed cadence,
   * so a preview always renders.
   */
  cadence?: PaymentCadence;
}

/**
 * Validate the selection and build the full schedule preview. Checks:
 *  - property exists, is active, and is COLIVING,
 *  - every roomId belongs to that property and is not MAINTENANCE/INACTIVE
 *    (ROOM_UNBOOKABLE_STATUSES) — OCCUPIED does not block a future range,
 *  - no room is blocked by an external (Airbnb/OTA) reservation or a manual
 *    admin block for the range,
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
    if ((ROOM_UNBOOKABLE_STATUSES as readonly string[]).includes(room.status)) {
      throw new LeaseError(`Room ${room.name} is no longer available`, 409);
    }
    // External (Airbnb/OTA) + manual admin block guard — these sources ONLY,
    // never lease overlaps. A room synced-blocked on Airbnb, or manually
    // blocked (off-platform booking / maintenance / owner use), for these
    // dates must not be quotable/bookable, or the guest can price+proceed on
    // top of it → double-booking. We deliberately do NOT check lease overlaps
    // here (that stays at createLease() time) so a stale DRAFT or the guest's
    // own in-progress lease never false-blocks the quote. Both sources store a
    // half-open range (endDate is checkout-morning-exclusive), matching
    // isRoomAvailableForRange; the lease request's own endDate is INCLUSIVE, so
    // it is passed to overlapsRange as `endExclusive: false`.
    const requestedRange = { start: input.startDate, end: input.endDate, endExclusive: false };
    const blocks = await storage.getExternalBlocksForRoom(room.id);
    const externalConflict = blocks.some((b) =>
      overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true }),
    );
    if (externalConflict) {
      throw new LeaseError(
        `${room.name} is booked for those dates on Airbnb. Pick different dates.`,
        409,
      );
    }
    const manualBlocks = await storage.getManualBlocksForRoom(room.id);
    const manualConflict = manualBlocks.some((b) =>
      overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true }),
    );
    if (manualConflict) {
      throw new LeaseError(`${room.name} isn't available for those dates. Pick different dates.`, 409);
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

  // The rooms' combined weekly LIST rate. Surfaced on the quote as a room
  // attribute — it is NOT necessarily what the guest is billed (see cadence
  // below). rooms.daily_rate is never consulted on the lease path.
  const weeklyRateTotal = sumRate(rooms, (r) => r.weeklyRent) ?? 0;
  // Refundable security deposit that secures the room(s). Sum across rooms.
  const depositTotal = sumRate(rooms, (r) => r.depositAmount) ?? 0;
  // One-time cleaning fee (non-refundable). Sum across rooms. Charged at move-in
  // as its own PaymentIntent — NOT part of the recurring installment schedule.
  const cleaningFeeTotal = sumRate(rooms, (r) => r.cleaningFee) ?? 0;

  // Billing cadence is the GUEST's choice, gated by term length — and it is what
  // SETS THE RATE (owner rule 2026-09-08), so resolve it BEFORE pricing. Reject
  // an out-of-range cadence before defaulting, so an invalid request is never
  // silently quoted at the default instead.
  const allowed = allowedCadencesForTerm(termDays);
  if (input.cadence && !allowed.includes(input.cadence)) {
    throw new LeaseError(
      `A ${input.cadence.toLowerCase()} schedule isn't available for a ${termDays}-day term`,
      422,
    );
  }
  const cadence: PaymentCadence = input.cadence ?? allowed[0];

  // Cadence -> rate. Each room's missing tier is derived from its OWN weekly rent
  // before summing, so an unpriced room is never rented for free.
  let rates;
  let generated;
  let priced;
  try {
    rates = combineLeaseRates(
      rooms.map((r) => ({
        weeklyRent: r.weeklyRent,
        dailyRate: r.dailyRate,
        biweeklyRate: r.biweeklyRate,
        monthlyRate: r.monthlyRate,
      })),
    );
    // The stay bills as whole periods of the chosen cadence, then steps DOWN a
    // tier for the remainder (owner rule 2026-09-08). No fractional days.
    generated = generateCascadeSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence,
      rates,
    });
    priced = cascadeStayPrice({
      days: generated.totalDays,
      rates,
      topTier: cadence,
    });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    if (err instanceof ScheduleError) throw new LeaseError(err.message, 422);
    throw err;
  }
  const head = priced.segments.find((seg) => seg.tier === cadence);
  const rate = {
    periodRate: roundMoney(head?.unitRate ?? generated.installments[0]?.amount ?? 0),
    periodDays: head?.unitDays ?? CADENCE_DAYS[cadence],
  };

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
    installmentAmount: rate.periodRate,
    periodDays: rate.periodDays,
    depositTotal,
    cleaningFeeTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0,
  };
}

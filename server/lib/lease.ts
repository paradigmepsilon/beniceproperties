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
  generateSchedule,
  inclusiveDays,
  ScheduleError,
  type PaymentCadence,
} from "@shared/leaseSchedule";
import type { LeaseQuoteResponse, LeaseScheduleLine } from "@shared/api-types";
import { MAX_LEASE_DAYS } from "@shared/schema";
import { storage } from "../storage";
import type { Room } from "@shared/schema";

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
  cadence: PaymentCadence;
}

/**
 * Validate the selection and build the full schedule preview. Checks:
 *  - property exists, is active, and is COLIVING,
 *  - every roomId belongs to that property and is AVAILABLE,
 *  - the term is ≤ 90 days and each room is free for that range (overlap guard),
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
    rooms.push(room);
  }

  // Term ceiling (also enforced in the generator, but give a clean message here).
  const termDays = inclusiveDays(input.startDate, input.endDate);
  if (termDays > MAX_LEASE_DAYS) {
    throw new LeaseError(`Lease term cannot exceed ${MAX_LEASE_DAYS} days`, 422);
  }

  // Availability overlap guard per room.
  for (const room of rooms) {
    const free = await storage.isRoomAvailableForRange({
      roomId: room.id,
      startDate: input.startDate,
      endDate: input.endDate,
    });
    if (!free) {
      throw new LeaseError(`Room ${room.name} is already booked for an overlapping range`, 409);
    }
  }

  // Combined weekly rate across rooms. The generator multiplies a single weekly
  // rate by roomCount, so we pass the summed rate with roomCount = 1 to support
  // rooms with DIFFERENT weekly rents correctly.
  const weeklyRateTotal =
    Math.round(rooms.reduce((sum, r) => sum + parseFloat(r.weeklyRent), 0) * 100) / 100;

  let generated;
  try {
    generated = generateSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence: input.cadence,
      weeklyRate: weeklyRateTotal,
      roomCount: 1, // weeklyRateTotal already sums all rooms
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
    cadence: input.cadence,
    weeklyRateTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0,
  };
}

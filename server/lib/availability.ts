// server/lib/availability.ts
// =============================================================================
// Public availability for the guest calendar. Merges a listing's BUSY ranges
// from BNP-owned data (direct STR bookings / room-blocking leases) with the
// external iCal blocks synced from its Airbnb calendar into one normalized list
// the client uses to disable dates. See GET /api/properties/:id/availability and
// GET /api/rooms/:id/availability.
//
// WIRE CONTRACT (AvailabilityResponse.busy): every range's `end` is the FIRST
// FREE day (half-open), mirroring iCal DTEND. STR bookings and external blocks
// are already half-open. Co-living lease `endDate` is INCLUSIVE (a lease
// occupies its end date), so it is normalized to exclusive (+1 day) here — that
// asymmetry is resolved on the server so the client sees one uniform format.
// =============================================================================

import { addDays, format, parseISO } from "date-fns";
import { storage } from "../storage";
import type { AvailabilityResponse, BusyRange } from "@shared/api-types";

function todayIso(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Inclusive end date → exclusive (first-free) end date. */
function exclusiveEnd(inclusiveEnd: string): string {
  return format(addDays(parseISO(inclusiveEnd), 1), "yyyy-MM-dd");
}

function sortByStart(ranges: BusyRange[]): BusyRange[] {
  return [...ranges].sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
}

/**
 * STR whole-property availability: non-cancelled direct bookings (half-open)
 * ∪ external iCal blocks (room_id IS NULL). Only ranges ending today or later.
 */
export async function buildStrAvailability(propertyId: string): Promise<AvailabilityResponse> {
  const today = todayIso();

  const bookings = await storage.getStrBookingsForProperty(propertyId);
  const directRanges: BusyRange[] = bookings
    .filter((b) => b.checkOut && b.checkOut >= today) // future/current only; open-ended dropped
    .map((b) => ({ start: b.checkIn, end: b.checkOut as string, source: "direct" as const }));

  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  const externalRanges: BusyRange[] = blocks
    .filter((b) => b.endDate >= today)
    .map((b) => ({ start: b.startDate, end: b.endDate, source: "external" as const }));

  return { busy: sortByStart([...directRanges, ...externalRanges]), minDate: today };
}

/**
 * Co-living room availability: room-blocking leases (inclusive end → normalized
 * to exclusive) ∪ non-cancelled direct co-living bookings (half-open) ∪ external
 * iCal blocks for the room. Only ranges ending today or later.
 *
 * The three sources here MUST mirror storage.isRoomAvailableForRange (leases +
 * co-living direct bookings + external blocks): if the calendar omits a source
 * the quote path checks, a guest can pick a day the calendar shows free and then
 * get a 409 at quote time. The direct-booking source below closes that gap.
 */
export async function buildRoomAvailability(roomId: string): Promise<AvailabilityResponse> {
  const today = todayIso();

  const leases = await storage.getRoomBlockingLeasesForRoom(roomId);
  const leaseRanges: BusyRange[] = leases
    .filter((l) => l.endDate >= today)
    .map((l) => ({ start: l.startDate, end: exclusiveEnd(l.endDate), source: "direct" as const }));

  // Direct co-living bookings (short 7–28-night reservations). checkOut is already
  // half-open (first free day), like STR bookings. Non-cancelled only (matches
  // getColivingBookingsForRoom + isRoomAvailableForRange). Open-ended dropped.
  const bookings = await storage.getColivingBookingsForRoom(roomId);
  const bookingRanges: BusyRange[] = bookings
    .filter((b) => b.checkOut && b.checkOut >= today)
    .map((b) => ({ start: b.checkIn, end: b.checkOut as string, source: "direct" as const }));

  const blocks = await storage.getExternalBlocksForRoom(roomId);
  const externalRanges: BusyRange[] = blocks
    .filter((b) => b.endDate >= today)
    .map((b) => ({ start: b.startDate, end: b.endDate, source: "external" as const }));

  return { busy: sortByStart([...leaseRanges, ...bookingRanges, ...externalRanges]), minDate: today };
}

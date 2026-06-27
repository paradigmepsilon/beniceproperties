// server/lib/reconciliation.ts
// =============================================================================
// Reconciliation report (Phase 9) — answers "what did <property> / <room> collect
// this month", reconciled against Stripe via the metadata contract. Given a date
// range, produces per-entity → per-property → per-room collected totals, split
// rent vs. late fees and card vs. manual.
//
// Source of truth: this DB. PAID schedule rows (with paid_at in range) split by
// payment_method (CARD_ON_FILE vs MANUAL); PAID/BILLED late_fees in range. The
// metadata breakout (entity/property/room) comes from the same builder used on
// every PaymentIntent, so the report ties out to Stripe by metadata.
// =============================================================================

import { storage } from "../storage";

export interface ReconRoomTotals {
  roomId: string;
  roomName: string;
  roomNumber: string | null;
  rentCard: number;
  rentManual: number;
  lateFees: number;
  total: number;
}
export interface ReconPropertyTotals {
  propertyId: string;
  propertyName: string;
  rentCard: number;
  rentManual: number;
  lateFees: number;
  total: number;
  rooms: ReconRoomTotals[];
}
export interface ReconEntityTotals {
  entity: string;
  rentCard: number;
  rentManual: number;
  lateFees: number;
  total: number;
  properties: ReconPropertyTotals[];
}
export interface ReconReport {
  from: string;
  to: string;
  generatedAt: string;
  grand: { rentCard: number; rentManual: number; lateFees: number; total: number };
  entities: ReconEntityTotals[];
}

const round = (v: number) => Math.round(v * 100) / 100;
const inRange = (d: string | Date | null, from: string, to: string): boolean => {
  if (!d) return false;
  const day = (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
  return day >= from && day <= to;
};

/**
 * Build the reconciliation report for [from, to] (inclusive YYYY-MM-DD).
 * generatedAt is injected (callers stamp it) so the function stays deterministic.
 */
export async function buildReconciliationReport(
  from: string,
  to: string,
  generatedAt: string,
): Promise<ReconReport> {
  const leases = await storage.getLeases();

  // entity -> property -> room accumulators.
  const entities = new Map<string, ReconEntityTotals>();

  function entityBucket(entity: string): ReconEntityTotals {
    let e = entities.get(entity);
    if (!e) {
      e = { entity, rentCard: 0, rentManual: 0, lateFees: 0, total: 0, properties: [] };
      entities.set(entity, e);
    }
    return e;
  }
  function propertyBucket(e: ReconEntityTotals, id: string, name: string): ReconPropertyTotals {
    let p = e.properties.find((x) => x.propertyId === id);
    if (!p) {
      p = { propertyId: id, propertyName: name, rentCard: 0, rentManual: 0, lateFees: 0, total: 0, rooms: [] };
      e.properties.push(p);
    }
    return p;
  }
  function roomBucket(p: ReconPropertyTotals, room: { id: string; name: string; number: string | null }): ReconRoomTotals {
    let r = p.rooms.find((x) => x.roomId === room.id);
    if (!r) {
      r = { roomId: room.id, roomName: room.name, roomNumber: room.number, rentCard: 0, rentManual: 0, lateFees: 0, total: 0 };
      p.rooms.push(r);
    }
    return r;
  }

  for (const lease of leases) {
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    const lateFees = await storage.getLateFeesByLease(lease.id);

    const e = entityBucket(property.entity);
    const p = propertyBucket(e, property.id, property.name);
    // For multi-room leases, attribute money to the FIRST room (the lease's
    // primary unit) for room-level rollup, while property/entity totals are exact.
    const primaryRoom = rooms[0]
      ? { id: rooms[0].roomId, name: rooms[0].roomNameSnapshot, number: rooms[0].roomNumberSnapshot }
      : { id: `${lease.id}:whole`, name: property.name, number: null };
    const r = roomBucket(p, primaryRoom);

    // Rent: PAID installments with paid_at in range, split by method.
    for (const row of schedule) {
      if (row.status !== "PAID") continue;
      if (!inRange(row.paidAt, from, to)) continue;
      const amt = round(parseFloat(row.amount));
      if (row.paymentMethod === "MANUAL") {
        r.rentManual += amt; p.rentManual += amt; e.rentManual += amt;
      } else {
        r.rentCard += amt; p.rentCard += amt; e.rentCard += amt;
      }
    }

    // Late fees: BILLED or PAID, attributed by accrual_date in range.
    for (const fee of lateFees) {
      if (fee.status !== "BILLED" && fee.status !== "PAID") continue;
      if (!inRange(fee.accrualDate, from, to)) continue;
      const amt = round(parseFloat(fee.amount));
      r.lateFees += amt; p.lateFees += amt; e.lateFees += amt;
    }
  }

  // Finalize totals + rounding.
  const grand = { rentCard: 0, rentManual: 0, lateFees: 0, total: 0 };
  const entityList = Array.from(entities.values());
  for (const e of entityList) {
    for (const p of e.properties) {
      for (const r of p.rooms) {
        r.rentCard = round(r.rentCard); r.rentManual = round(r.rentManual); r.lateFees = round(r.lateFees);
        r.total = round(r.rentCard + r.rentManual + r.lateFees);
      }
      p.rentCard = round(p.rentCard); p.rentManual = round(p.rentManual); p.lateFees = round(p.lateFees);
      p.total = round(p.rentCard + p.rentManual + p.lateFees);
    }
    e.rentCard = round(e.rentCard); e.rentManual = round(e.rentManual); e.lateFees = round(e.lateFees);
    e.total = round(e.rentCard + e.rentManual + e.lateFees);
    grand.rentCard += e.rentCard; grand.rentManual += e.rentManual; grand.lateFees += e.lateFees;
  }
  grand.rentCard = round(grand.rentCard);
  grand.rentManual = round(grand.rentManual);
  grand.lateFees = round(grand.lateFees);
  grand.total = round(grand.rentCard + grand.rentManual + grand.lateFees);

  return { from, to, generatedAt, grand, entities: entityList };
}

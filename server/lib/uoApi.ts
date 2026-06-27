// server/lib/uoApi.ts
// =============================================================================
// Unified Ops integration surface (Phase 8). BNP EXPOSES; UO CONSUMES. This
// module is the read views + the constrained, idempotent write-backs UO's BNP
// module issues. BNP remains the system of record — UO never writes BNP's DB
// directly; it calls these authenticated actions.
//
// Reads:  properties+rooms, leases (schedule/signature/payment status), payments
//         with the FULL metadata breakdown (entity/property/room/lease) that
//         powers per-property/per-room economics, guest messages, escalations.
// Writes: markPaid (settle a MANUAL installment → MANUAL_RECONCILE), approve,
//         respondToMessage (STAFF reply, surfaces in the portal), resolveEscalation,
//         waiveLateFee (WAIVED row + reason). All idempotent.
// =============================================================================

import { storage } from "../storage";
import { buildLeaseChargeMetadata, buildStrChargeMetadata } from "./paymentMetadata";
import { LeaseError } from "./lease";
import type { Lease, Property, LeaseRoom } from "@shared/schema";

// ---------------------------------------------------------------------------
// READS
// ---------------------------------------------------------------------------

export async function listPropertiesWithRooms() {
  const properties = await storage.getProperties();
  const out = [];
  for (const p of properties) {
    const rooms = p.type === "COLIVING" ? await storage.getRoomsByProperty(p.id) : [];
    out.push({
      id: p.id,
      name: p.name,
      entity: p.entity,
      type: p.type,
      location: p.location,
      active: p.active,
      rooms: rooms.map((r) => ({
        id: r.id,
        name: r.name,
        roomNumber: r.roomNumber,
        weeklyRent: r.weeklyRent,
        status: r.status,
      })),
    });
  }
  return out;
}

/** Lease view with schedule, signature status, and payment status. */
export async function getLeaseDetail(leaseId: string) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const [property, guest, rooms, schedule, lateFees] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getLeaseRooms(lease.id),
    storage.getScheduleByLease(lease.id),
    storage.getLateFeesByLease(lease.id),
  ]);
  return {
    id: lease.id,
    entity: property?.entity ?? null,
    propertyId: lease.propertyId,
    propertyName: property?.name ?? null,
    guest: guest ? { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone } : null,
    rooms: rooms.map((r) => ({ roomId: r.roomId, name: r.roomNameSnapshot, roomNumber: r.roomNumberSnapshot })),
    term: { start: lease.startDate, end: lease.endDate, cadence: lease.paymentCadence },
    totalLeaseValue: lease.totalLeaseValue,
    status: lease.status,
    signature: {
      signed: Boolean(lease.signedAt),
      signedName: lease.signedName,
      signedAt: lease.signedAt,
      signedPdfUrl: lease.signedPdfUrl,
    },
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: s.amount,
      status: s.status,
      paymentMethod: s.paymentMethod,
      paidAt: s.paidAt,
      stripePaymentIntentId: s.stripePaymentIntentId,
    })),
    lateFees: lateFees.map((f) => ({
      scheduleSeq: f.scheduleSeq,
      accrualDate: f.accrualDate,
      amount: f.amount,
      status: f.status,
    })),
  };
}

export async function listLeases(status?: string) {
  const leases = await storage.getLeases(status ? { status } : undefined);
  return Promise.all(leases.map((l) => getLeaseDetail(l.id)));
}

/**
 * Payments view with the FULL metadata breakdown per the Stripe Metadata
 * Contract — this is what powers UO's per-entity/property/room BNP economics.
 * Built from the DB (lease + rooms), so it reflects the same contract sent to
 * Stripe without a Stripe round-trip.
 */
export async function listPaymentsWithMetadata(opts?: { leaseId?: string }) {
  const leases = opts?.leaseId
    ? [await storage.getLease(opts.leaseId)].filter(Boolean)
    : await storage.getLeases();
  const out: Array<Record<string, unknown>> = [];

  for (const lease of leases as Lease[]) {
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    const lateFees = await storage.getLateFeesByLease(lease.id);

    for (const row of schedule) {
      out.push({
        kind: "RENT",
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        amount: row.amount,
        status: row.status,
        paymentMethod: row.paymentMethod,
        paidAt: row.paidAt,
        stripePaymentIntentId: row.stripePaymentIntentId,
        metadata: buildLeaseChargeMetadata({
          entity: property.entity,
          property,
          lease,
          rooms,
          paymentKind: row.scheduleSeq === 1 ? "FIRST_PAYMENT" : "SCHEDULED_RENT",
          scheduleSeq: row.scheduleSeq,
        }),
      });
    }
    for (const fee of lateFees) {
      out.push({
        kind: "LATE_FEE",
        leaseId: lease.id,
        scheduleSeq: fee.scheduleSeq,
        amount: fee.amount,
        status: fee.status,
        stripePaymentIntentId: fee.stripePaymentIntentId,
        metadata: buildLeaseChargeMetadata({
          entity: property.entity,
          property,
          lease,
          rooms,
          paymentKind: "LATE_FEE",
          scheduleSeq: fee.scheduleSeq,
        }),
      });
    }
  }
  return out;
}

export async function listGuestMessageThreads(status?: string) {
  // Across all leases: gather roots, optionally filtered by status.
  const leases = await storage.getLeases();
  const threads = [];
  for (const lease of leases) {
    const roots = await storage.getMessageThreadsByLease(lease.id);
    for (const r of roots) {
      if (status && r.status !== status) continue;
      threads.push({
        id: r.id,
        leaseId: r.leaseId,
        category: r.category,
        subject: r.subject,
        status: r.status,
        body: r.body,
        createdAt: r.createdAt,
      });
    }
  }
  return threads;
}

export async function listEscalations(status?: string) {
  return storage.getEscalations(status ? { status } : undefined);
}

// ---------------------------------------------------------------------------
// WRITE-BACKS (constrained, idempotent)
// ---------------------------------------------------------------------------

interface LeaseCtx {
  lease: Lease;
  property: Property;
  rooms: LeaseRoom[];
}
async function leaseCtx(leaseId: string): Promise<LeaseCtx> {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property missing", 500);
  const rooms = await storage.getLeaseRooms(lease.id);
  return { lease, property, rooms };
}

/**
 * Mark a MANUAL installment paid (Zelle/CashApp/cash settled outside Stripe).
 * Writes a MANUAL_RECONCILE record (metadata + manual_note). Idempotent: a row
 * already PAID is returned unchanged.
 */
export async function markPaid(args: {
  leaseId: string;
  scheduleSeq: number;
  note: string;
  actor: string;
}) {
  const { lease, property, rooms } = await leaseCtx(args.leaseId);
  const schedule = await storage.getScheduleByLease(lease.id);
  const row = schedule.find((s) => s.scheduleSeq === args.scheduleSeq);
  if (!row) throw new LeaseError("Installment not found", 404);
  if (row.status === "PAID") return { alreadyPaid: true, scheduleSeq: row.scheduleSeq };
  if (row.paymentMethod !== "MANUAL") {
    throw new LeaseError("Only MANUAL installments are settled via Mark Paid; card rows settle via Stripe", 400);
  }

  // MANUAL_RECONCILE metadata — recorded for reconciliation parity with Stripe.
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "MANUAL_RECONCILE",
    scheduleSeq: row.scheduleSeq,
  });
  const note = `[MANUAL_RECONCILE by ${args.actor}] ${args.note} :: ${JSON.stringify(metadata)}`;
  await storage.updateScheduleRow(row.id, {
    status: "PAID",
    paidAt: new Date(),
    manualNote: note,
  });
  // Resolve any OPEN overdue/failed escalation for this installment.
  const escalations = await storage.getEscalations({ status: "OPEN", leaseId: lease.id });
  for (const e of escalations) {
    if ((e.scheduleSeq ?? null) === row.scheduleSeq) {
      await storage.updateEscalation(e.id, { status: "RESOLVED", resolvedAt: new Date(), resolvedBy: args.actor });
    }
  }
  return { alreadyPaid: false, scheduleSeq: row.scheduleSeq };
}

/** Approve a DRAFT/PENDING_SIGNATURE lease (admin gate). Idempotent. */
export async function approveLease(leaseId: string, actor: string) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.status === "DRAFT") {
    await storage.updateLease(lease.id, { status: "PENDING_SIGNATURE" });
    return { status: "PENDING_SIGNATURE", actor };
  }
  // Already past draft → no-op (idempotent).
  return { status: lease.status, actor, noop: true };
}

/** Post a STAFF reply to a guest message thread; surfaces in the portal. */
export async function respondToMessage(args: { threadId: string; body: string; actor: string }) {
  const messages = await storage.getMessagesByThread(args.threadId);
  const root = messages.find((m) => m.id === args.threadId);
  if (!root) throw new LeaseError("Thread not found", 404);
  const reply = await storage.createMessage({
    leaseId: root.leaseId,
    guestId: root.guestId,
    threadId: args.threadId,
    authorRole: "STAFF",
    category: root.category as "QUESTION" | "MAINTENANCE" | "OTHER",
    body: args.body,
    status: "ANSWERED",
  });
  // Mark the thread ANSWERED on the root.
  await storage.updateMessage(root.id, { status: "ANSWERED" });
  return { id: reply.id, threadStatus: "ANSWERED" };
}

/** Resolve (or acknowledge) an escalation. Idempotent. */
export async function resolveEscalation(args: { escalationId: string; actor: string; status?: "ACKNOWLEDGED" | "RESOLVED" }) {
  const escalations = await storage.getEscalations();
  const esc = escalations.find((e) => e.id === args.escalationId);
  if (!esc) throw new LeaseError("Escalation not found", 404);
  const target = args.status ?? "RESOLVED";
  if (esc.status === target) return { status: target, noop: true };
  await storage.updateEscalation(esc.id, {
    status: target,
    resolvedAt: target === "RESOLVED" ? new Date() : esc.resolvedAt ?? null,
    resolvedBy: args.actor,
  });
  return { status: target };
}

/**
 * Waive late fees for an installment (admin override). Writes WAIVED on each
 * ACCRUED fee row with the reason. Idempotent (already-WAIVED rows skipped).
 */
export async function waiveLateFees(args: { leaseId: string; scheduleSeq: number; reason: string; actor: string }) {
  const fees = await storage.getLateFeesByLease(args.leaseId);
  const target = fees.filter((f) => f.scheduleSeq === args.scheduleSeq && f.status === "ACCRUED");
  for (const fee of target) {
    await storage.updateLateFee(fee.id, { status: "WAIVED" });
  }
  // Record the waive reason as a note on the schedule row (audit trail).
  const schedule = await storage.getScheduleByLease(args.leaseId);
  const row = schedule.find((s) => s.scheduleSeq === args.scheduleSeq);
  if (row) {
    const note = `${row.manualNote ? row.manualNote + " | " : ""}[LATE_FEE_WAIVED by ${args.actor}] ${args.reason}`;
    await storage.updateScheduleRow(row.id, { manualNote: note });
  }
  return { waivedCount: target.length };
}

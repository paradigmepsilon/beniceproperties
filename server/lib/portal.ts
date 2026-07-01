// server/lib/portal.ts
// =============================================================================
// Guest portal (Phase 6) — the "one-stop shop" read view + self-serve actions,
// authenticated by an unguessable per-lease portal token (no account needed,
// mirroring TRAD's tokenized links).
//
//   getPortalView(token)        → lease + rooms + full schedule (with paid/
//                                 upcoming/late status) + accrued late fees +
//                                 message threads + signed-lease URL.
//   payInstallmentNow(token,seq)→ charge an open installment immediately against
//                                 the saved card (early pay or pay a LATE/FAILED
//                                 row). Settles its accrued late fees too.
//   submitMessage / replyMessage/ thread helpers → guest_messages.
//
// All money uses the saved-card primitives + full metadata. Manual-pay leases
// (no saved card) can't self-charge here — they settle via UO "Mark Paid"
// (Phase 8); the view still shows everything.
// =============================================================================

import { storage } from "../storage";
import { chargeSavedCard } from "./stripe";
import { buildLeaseChargeMetadata } from "./paymentMetadata";
import { billAccruedLateFees } from "./dunning";
import { calculateBreakdown } from "@shared/pricing";
import { LeaseError } from "./lease";
import type { Lease } from "@shared/schema";

const OPEN_FOR_PAY = new Set(["SCHEDULED", "DUE", "LATE", "FAILED"]);

export async function resolvePortalLease(token: string): Promise<Lease> {
  if (!token || token.length < 16) throw new LeaseError("Invalid portal link", 404);
  const lease = await storage.getLeaseByPortalToken(token);
  if (!lease) throw new LeaseError("Portal link not found", 404);
  return lease;
}

export async function getPortalView(token: string) {
  const lease = await resolvePortalLease(token);
  const [property, guest, rooms, schedule, lateFees, threads, vehicle] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getLeaseRooms(lease.id),
    storage.getScheduleByLease(lease.id),
    storage.getLateFeesByLease(lease.id),
    storage.getMessageThreadsByLease(lease.id),
    storage.getVehicleByLease(lease.id),
  ]);

  const accruedLateFeeTotal =
    Math.round(
      lateFees.filter((f) => f.status === "ACCRUED").reduce((s, f) => s + parseFloat(f.amount), 0) * 100,
    ) / 100;

  return {
    lease: {
      id: lease.id,
      status: lease.status,
      startDate: lease.startDate,
      endDate: lease.endDate,
      paymentCadence: lease.paymentCadence,
      weeklyRateSnapshot: lease.weeklyRateSnapshot,
      totalLeaseValue: lease.totalLeaseValue,
      prorationNote: lease.prorationNote,
      signedAt: lease.signedAt,
      signedPdfUrl: lease.signedPdfUrl,
      hasSavedCard: Boolean(lease.stripeCustomerId && lease.stripePaymentMethodId),
    },
    // Identity verification (driver's license review) state. The image itself is
    // never exposed here — only whether one is on file and the review status.
    verification: {
      status: lease.verificationStatus, // NOT_SUBMITTED | PENDING_REVIEW | APPROVED | REJECTED
      hasLicense: Boolean(lease.licenseR2Key),
      uploadedAt: lease.licenseUploadedAt,
      rejectionReason: lease.verificationRejectionReason,
    },
    vehicle: vehicle
      ? {
          hasVehicle: vehicle.hasVehicle,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          color: vehicle.color,
          plate: vehicle.plate,
          plateState: vehicle.plateState,
          hasPhoto: Boolean(vehicle.photoR2Key),
        }
      : null,
    property: property ? { name: property.name, location: property.location } : null,
    guest: guest ? { name: guest.name, email: guest.email } : null,
    rooms: rooms.map((r) => ({ name: r.roomNameSnapshot, roomNumber: r.roomNumberSnapshot })),
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: s.amount,
      status: s.status,
      paidAt: s.paidAt,
      paymentMethod: s.paymentMethod,
    })),
    lateFees: {
      accruedTotal: accruedLateFeeTotal,
      rows: lateFees.map((f) => ({
        scheduleSeq: f.scheduleSeq,
        accrualDate: f.accrualDate,
        amount: f.amount,
        status: f.status,
      })),
    },
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt,
    })),
  };
}

/** Charge total for an installment = rent + card surcharge (consistent w/ quote). */
function chargeTotalFor(rent: number): number {
  return calculateBreakdown({ baseAmount: rent, paymentMethod: "STRIPE" }).total;
}

export async function payInstallmentNow(
  token: string,
  scheduleSeq: number,
): Promise<{ paid: boolean; amount: number; paymentIntentId?: string }> {
  const lease = await resolvePortalLease(token);
  if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) {
    throw new LeaseError("No saved card on this lease; pay via your arranged method", 409);
  }
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property missing", 500);
  const rooms = await storage.getLeaseRooms(lease.id);
  const schedule = await storage.getScheduleByLease(lease.id);
  const row = schedule.find((s) => s.scheduleSeq === scheduleSeq);
  if (!row) throw new LeaseError("Installment not found", 404);
  if (row.status === "PAID") throw new LeaseError("That installment is already paid", 409);
  if (row.status === "WAIVED") throw new LeaseError("That installment was waived", 409);
  if (!OPEN_FOR_PAY.has(row.status)) throw new LeaseError("That installment can't be paid now", 409);

  const amount = chargeTotalFor(parseFloat(row.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms,
    paymentKind: "SCHEDULED_RENT",
    scheduleSeq: row.scheduleSeq,
  });

  const pi = await chargeSavedCard({
    amount,
    customerId: lease.stripeCustomerId,
    paymentMethodId: lease.stripePaymentMethodId,
    metadata,
    // Same key as the scheduler so a portal pay + a sweep can't double-charge.
    idempotencyKey: `lease-rent-${lease.id}-seq-${row.scheduleSeq}`,
  });

  if (pi.status !== "succeeded") {
    throw new LeaseError("Payment did not complete; please try again", 402);
  }
  await storage.updateScheduleRow(row.id, {
    status: "PAID",
    paidAt: new Date(),
    stripePaymentIntentId: pi.id,
  });
  // Bill any accrued late fees for this installment as a separate charge.
  try {
    await billAccruedLateFees({ lease, property, rooms, scheduleSeq: row.scheduleSeq });
  } catch {
    /* late-fee billing failure is non-fatal to the rent payment */
  }
  return { paid: true, amount, paymentIntentId: pi.id };
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function submitMessage(
  token: string,
  input: { category?: "QUESTION" | "MAINTENANCE" | "OTHER"; subject?: string; body: string },
) {
  const lease = await resolvePortalLease(token);
  const root = await storage.createMessage({
    leaseId: lease.id,
    guestId: lease.guestId,
    threadId: "", // storage assigns a self-referential root id
    authorRole: "GUEST",
    category: input.category ?? "QUESTION",
    subject: input.subject ?? null,
    body: input.body,
    status: "OPEN",
  });
  return root;
}

export async function replyToThread(token: string, threadId: string, body: string) {
  const lease = await resolvePortalLease(token);
  const thread = await storage.getMessagesByThread(threadId);
  const root = thread.find((m) => m.id === threadId);
  if (!root || root.leaseId !== lease.id) throw new LeaseError("Thread not found", 404);
  const reply = await storage.createMessage({
    leaseId: lease.id,
    guestId: lease.guestId,
    threadId,
    authorRole: "GUEST",
    category: root.category as "QUESTION" | "MAINTENANCE" | "OTHER",
    body,
    status: "OPEN",
  });
  // A guest reply re-opens an answered thread.
  if (root.status === "ANSWERED") await storage.updateMessage(root.id, { status: "OPEN" });
  return reply;
}

export async function getThread(token: string, threadId: string) {
  const lease = await resolvePortalLease(token);
  const messages = await storage.getMessagesByThread(threadId);
  const root = messages.find((m) => m.id === threadId);
  if (!root || root.leaseId !== lease.id) throw new LeaseError("Thread not found", 404);
  return {
    thread: { id: root.id, subject: root.subject, category: root.category, status: root.status },
    messages: messages.map((m) => ({
      id: m.id,
      authorRole: m.authorRole,
      body: m.body,
      createdAt: m.createdAt,
    })),
  };
}

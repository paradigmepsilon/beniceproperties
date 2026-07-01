// server/lib/leaseFlow.ts
// =============================================================================
// Lease creation + in-app e-signature (Phase 3). Co-living only.
//
//   createDraftLease()  validates the selection (via buildLeaseQuote — the same
//                       shared schedule the guest previewed), upserts the guest,
//                       persists the lease + room links + payment_schedule, and
//                       moves the lease DRAFT → PENDING_SIGNATURE. Returns the
//                       lease and the review-render of the agreement.
//
//   signLease()         captures the typed legal name + affirmation + timestamp +
//                       IP, renders + stores the signed agreement, and moves the
//                       lease PENDING_SIGNATURE → PENDING_FIRST_PAYMENT. A lease
//                       cannot reach ACTIVE here — that requires the first payment
//                       to succeed (Phase 4). Re-signing an already-signed lease
//                       is a no-op that returns the existing signature.
//
// No payment is taken in this phase.
// =============================================================================

import { customAlphabet } from "nanoid";
import { buildLeaseQuote, LeaseError } from "./lease";
import {
  renderLeaseHtml,
  renderSignedLeaseHtml,
  type LeaseDocData,
} from "./leaseDocument";
import { storage } from "../storage";

// Unguessable guest-portal token (URL-safe, 32 chars). The guest's self-serve
// link is /portal/<token>.
const portalTokenGen = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  32,
);
import type { Lease } from "@shared/schema";
import type { PaymentCadence } from "@shared/leaseSchedule";

export interface CreateDraftLeaseInput {
  propertyId: string;
  roomIds: string[];
  startDate: string;
  endDate: string;
  cadence: PaymentCadence;
  guest: { name: string; email: string; phone?: string };
}

export interface CreateDraftLeaseResult {
  lease: Lease;
  /** The agreement rendered for review (pre-signature). */
  documentHtml: string;
}

/** Assemble the document data block from a lease quote + guest. */
function docDataFrom(
  leaseId: string,
  quote: Awaited<ReturnType<typeof buildLeaseQuote>>,
  guest: { name: string; email: string },
  location: string,
): LeaseDocData {
  return {
    leaseId,
    guestName: guest.name,
    guestEmail: guest.email,
    propertyName: quote.propertyName,
    propertyLocation: location,
    rooms: quote.rooms.map((r) => ({
      name: r.name,
      roomNumber: r.roomNumber,
      weeklyRent: r.weeklyRent,
    })),
    startDate: quote.startDate,
    endDate: quote.endDate,
    cadence: quote.cadence,
    weeklyRateTotal: quote.weeklyRateTotal,
    totalLeaseValue: quote.totalLeaseValue,
    prorationNote: quote.prorationNote,
    schedule: quote.schedule.map((s) => ({
      seq: s.seq,
      dueDate: s.dueDate,
      amount: s.amount,
      prorated: s.prorated,
    })),
  };
}

/**
 * Render the agreement for REVIEW without persisting anything. Used by the sign
 * page on load so merely viewing it never creates a lease (and never holds a
 * room). No DB write, no overlap guard — a lease row (and its hold) is only
 * created when the guest actually signs, via createDraftLease() + signLease().
 */
export async function previewLease(input: CreateDraftLeaseInput): Promise<{ documentHtml: string }> {
  const quote = await buildLeaseQuote({
    propertyId: input.propertyId,
    roomIds: input.roomIds,
    startDate: input.startDate,
    endDate: input.endDate,
    cadence: input.cadence,
  });
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);

  // Placeholder id — this document is not yet backed by a persisted lease.
  const documentHtml = renderLeaseHtml(
    docDataFrom("PREVIEW", quote, input.guest, property.location),
  );
  return { documentHtml };
}

export async function createDraftLease(input: CreateDraftLeaseInput): Promise<CreateDraftLeaseResult> {
  // Re-validate + recompute the schedule server-side (never trust the client).
  const quote = await buildLeaseQuote({
    propertyId: input.propertyId,
    roomIds: input.roomIds,
    startDate: input.startDate,
    endDate: input.endDate,
    cadence: input.cadence,
  });

  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);

  const guest = await storage.upsertGuestByEmail({
    name: input.guest.name,
    email: input.guest.email,
    phone: input.guest.phone ?? null,
  });

  const lease = await storage.createLeaseWithSchedule({
    lease: {
      propertyId: property.id,
      guestId: guest.id,
      startDate: quote.startDate,
      endDate: quote.endDate,
      paymentCadence: quote.cadence,
      weeklyRateSnapshot: String(quote.weeklyRateTotal),
      totalLeaseValue: String(quote.totalLeaseValue),
      prorationNote: quote.prorationNote,
      // Freeze the refundable deposit at booking so a later room re-price never
      // changes a signed lease. This is the amount that secures the room.
      depositAmountSnapshot: String(quote.depositTotal),
      depositStatus: "PENDING",
      status: "PENDING_SIGNATURE",
      portalToken: portalTokenGen(),
    },
    rooms: quote.rooms.map((r) => ({
      // leaseId is filled in by storage.createLeaseWithSchedule.
      leaseId: "",
      roomId: r.id,
      roomNumberSnapshot: r.roomNumber,
      roomNameSnapshot: r.name,
    })),
    schedule: quote.schedule.map((s) => ({
      leaseId: "",
      scheduleSeq: s.seq,
      dueDate: s.dueDate,
      amount: String(s.amount),
      status: "SCHEDULED",
      // Default to card-on-file; a guest who chooses manual flips this in Phase 4.
      paymentMethod: "CARD_ON_FILE",
    })),
  });

  const documentHtml = renderLeaseHtml(
    docDataFrom(lease.id, quote, input.guest, property.location),
  );

  return { lease, documentHtml };
}

export interface SignLeaseInput {
  leaseId: string;
  signedName: string;
  /** The affirmation checkbox must be true. */
  affirmed: boolean;
  /** Captured from the request (X-Forwarded-For / socket address). */
  ip: string;
  /** Signing timestamp; injectable for tests. Defaults to now at call time. */
  signedAt?: Date;
}

export interface SignLeaseResult {
  lease: Lease;
  documentUrl: string;
}

export async function signLease(input: SignLeaseInput): Promise<SignLeaseResult> {
  const lease = await storage.getLease(input.leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);

  // Idempotent: already signed → return the existing artifact, don't re-sign.
  if (lease.signedAt) {
    return { lease, documentUrl: lease.signedPdfUrl ?? `/api/leases/${lease.id}/document` };
  }

  if (lease.status !== "PENDING_SIGNATURE" && lease.status !== "DRAFT") {
    throw new LeaseError(`Lease cannot be signed from status ${lease.status}`, 409);
  }
  const name = input.signedName.trim();
  if (name.length < 2) throw new LeaseError("A full legal name is required to sign");
  if (!input.affirmed) throw new LeaseError("You must affirm the agreement to sign");

  // Rebuild the document from the lease's own persisted data + schedule so the
  // signed artifact reflects exactly what was agreed (not a re-quote that could
  // drift if inventory changed). Reconstruct a quote-shaped object from storage.
  const property = await storage.getProperty(lease.propertyId);
  const guest = await storage.getGuest(lease.guestId);
  const leaseRooms = await storage.getLeaseRooms(lease.id);
  const schedule = await storage.getScheduleByLease(lease.id);
  if (!property || !guest) throw new LeaseError("Lease data incomplete", 500);

  const docData: LeaseDocData = {
    leaseId: lease.id,
    guestName: guest.name,
    guestEmail: guest.email,
    propertyName: property.name,
    propertyLocation: property.location,
    rooms: leaseRooms.map((lr) => ({
      name: lr.roomNameSnapshot,
      roomNumber: lr.roomNumberSnapshot,
      weeklyRent: 0, // not shown per-room in the doc body; rate total is on the lease
    })),
    startDate: lease.startDate,
    endDate: lease.endDate,
    cadence: lease.paymentCadence as LeaseDocData["cadence"],
    weeklyRateTotal: parseFloat(lease.weeklyRateSnapshot),
    totalLeaseValue: parseFloat(lease.totalLeaseValue),
    prorationNote: lease.prorationNote ?? "",
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: parseFloat(s.amount),
      prorated: false,
    })),
  };

  const signedAt = input.signedAt ?? new Date();
  const signedDocumentHtml = renderSignedLeaseHtml(docData, {
    signedName: name,
    signedAt,
    signedIp: input.ip,
  });
  const documentUrl = `/api/leases/${lease.id}/document`;

  const updated = await storage.updateLease(lease.id, {
    signedName: name,
    signedAt,
    signedIp: input.ip,
    signedPdfUrl: documentUrl,
    signedDocumentHtml,
    // Signed, but NOT active — first payment (Phase 4) gates ACTIVE.
    status: "PENDING_FIRST_PAYMENT",
  });

  return { lease: updated ?? lease, documentUrl };
}

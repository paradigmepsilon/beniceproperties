// server/lib/stayApproval.ts
// =============================================================================
// The admin side of the gate: the approval queue, and the three decisions.
//
//   approveStay   → set the door code, confirm the name matches, go live, send
//                   the welcome letter.
//   requestStayFix → NON-TERMINAL. The guest resubmits, the dates stay held, and
//                   NO money moves. This is the "your photo is blurry" path.
//   (decline lives in bookingGateDecline.ts — it is the only one that spends.)
//
// APPROVAL IS GATED ON DATA, NOT ON IDENTITY. If the property has no access info
// configured, approve returns 409 rather than sending a welcome letter with a
// blank door code and no directions. The check is pure data — no property is
// named anywhere, so adding one needs no code change.
//
// THE DOOR CODE IS REQUIRED AND VALIDATED SERVER-SIDE. A client-only check is not
// a check. It is never written to a log line, a PostHog property, or an
// escalation detail — see shared/doorCode.ts.
// =============================================================================

import { storage } from "../storage";
import { LeaseError } from "./errorResponse";
import { normalizeDoorCode, doorCodeError } from "@shared/doorCode";
import { onStayApproved, onStayFixRequested, outstandingItems } from "./stayLifecycle";
import { resolveStayAccessInfo, missingAccessFields } from "./accessInfo";
import { stayStage } from "./stayPortal";
import { GATE_DOCS_DEADLINE_MS } from "./gateToken";
import { roomDisplayName } from "./formatShared";
import { stayNights } from "@shared/bookingGate";
import { log } from "../server-log";
import type { Booking, BookingGate, Guest, Property, Room } from "@shared/schema";

export interface PendingApprovalRow {
  bookingId: string;
  reference: string;
  propertyName: string;
  roomName: string | null;
  checkIn: string;
  checkOut: string | null;
  nights: number | null;
  total: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  signedName: string | null;
  /** Pre-computed so the operator sees the flag without doing the comparison. */
  nameMismatch: boolean;
  licenseUploadedAt: Date | null;
  agreementSignedAt: Date | null;
  docsDeadlineAt: Date | null;
  fixRequestCount: number;
  /** True when the property still needs access info before approval can proceed. */
  accessInfoMissing: string[];
}

/** Case- and whitespace-insensitive. Empty on either side is NOT a mismatch — we
 *  do not flag what we do not know. Same rule the lease queue already applies. */
export function isNameMismatch(a: string | null, b: string | null): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return false;
  return x !== y;
}

async function loadStay(bookingId: string): Promise<{
  booking: Booking;
  gate: BookingGate;
  guest: Guest;
  property: Property;
  room: Room | null;
}> {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);
  const gate = await storage.getBookingGate(bookingId);
  if (!gate) throw new LeaseError("This booking has no approval gate.", 409);
  const [guest, property, room] = await Promise.all([
    storage.getGuest(booking.guestId),
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
  ]);
  if (!guest || !property) throw new LeaseError("Booking is missing its guest or property", 409);
  return { booking, gate, guest, property, room: room ?? null };
}

/** Everything waiting on a human, newest deadline first. */
export async function listPendingApprovals(): Promise<PendingApprovalRow[]> {
  const stays = await storage.getBookingsWithGuest({ statuses: ["PENDING_APPROVAL"] });
  const rows: PendingApprovalRow[] = [];

  for (const stay of stays) {
    const gate = await storage.getBookingGate(stay.id);
    if (!gate) continue;
    // The queue is what a human must ACT on. A stay still waiting on the guest is
    // the sweep's business, not an operator's.
    if (outstandingItems(gate).length > 0) continue;

    const info = await resolveStayAccessInfo({ gate, property: stay.property, room: stay.room });
    rows.push({
      bookingId: stay.id,
      reference: stay.reference,
      propertyName: stay.property.name,
      roomName: roomDisplayName(stay.room),
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: stay.checkOut ? stayNights(stay.checkIn, stay.checkOut) : null,
      total: stay.quotedTotal,
      guestName: stay.guest.name,
      guestEmail: stay.guest.email,
      guestPhone: stay.guest.phone,
      signedName: gate.agreementSignedName,
      nameMismatch: isNameMismatch(gate.agreementSignedName, stay.guest.name),
      licenseUploadedAt: gate.licenseUploadedAt,
      agreementSignedAt: gate.agreementSignedAt,
      docsDeadlineAt: gate.docsDeadlineAt,
      fixRequestCount: gate.fixRequestCount,
      accessInfoMissing: missingAccessFields(info).filter((f) => f !== "doorCode"),
    });
  }
  // Soonest arrival first — that is the one that matters.
  return rows.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

/**
 * Approve: the stay goes live and the guest receives their arrival details.
 *
 * RE-ENTRANT BY DESIGN. The gate row is written BEFORE the booking status, so a
 * crash between the two leaves an approved gate on a PENDING_APPROVAL booking —
 * and a second click finishes the job rather than erroring. The welcome letter is
 * deduped through lifecycle_events, so it still sends exactly once.
 */
export async function approveStay(args: {
  bookingId: string;
  actor: string;
  doorCode: string;
  nameMatches: boolean;
}): Promise<{ reference: string; status: string }> {
  const stay = await loadStay(args.bookingId);

  // Validate BEFORE touching anything. The error text never echoes the code.
  const codeError = doorCodeError(args.doorCode);
  if (codeError) throw new LeaseError(codeError, 400);
  const doorCode = normalizeDoorCode(args.doorCode)!;

  if (args.nameMatches !== true) {
    throw new LeaseError(
      "Confirm the name on the licence matches the guest before approving.",
      400,
    );
  }

  // Already done: re-assert the welcome letter (deduped) and return.
  if (stay.gate.approvedAt && stay.booking.status === "ACTIVE") {
    await onStayApproved(stay);
    return { reference: stay.booking.reference, status: stay.booking.status };
  }

  if (outstandingItems(stay.gate).length > 0) {
    throw new LeaseError(
      "The guest has not submitted everything yet — nothing to approve.",
      409,
    );
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }

  // The data gate: never approve into a blank welcome letter.
  const info = await resolveStayAccessInfo({
    gate: { ...stay.gate, doorCode },
    property: stay.property,
    room: stay.room,
  });
  const missing = missingAccessFields(info);
  if (missing.length > 0) {
    throw new LeaseError(
      `Set up the arrival details for ${stay.property.name} first — missing ${missing.join(", ")}.`,
      409,
    );
  }

  const approvedAt = new Date();
  // Gate row first — see the re-entrancy note above.
  await storage.updateBookingGate(stay.booking.id, {
    doorCode,
    nameMatchesAck: true,
    approvedAt,
    approvedBy: args.actor,
    verificationStatus: "APPROVED",
    verificationReviewedAt: approvedAt,
    verificationReviewedBy: args.actor,
    verificationRejectionReason: null,
    fixRequestedReason: null,
  });

  const liveStatus = stay.booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED";
  await storage.updateBooking(stay.booking.id, { status: liveStatus });
  if (stay.booking.roomId) {
    await storage.updateRoom(stay.booking.roomId, { status: "OCCUPIED" });
  }

  // Close the "someone must look at this" escalation — the human just looked.
  const open = await storage.getEscalations({ bookingId: stay.booking.id, status: "OPEN" });
  for (const esc of open) {
    if (esc.kind === "GATE_AWAITING_APPROVAL") {
      await storage.updateEscalation(esc.id, { status: "RESOLVED", resolvedBy: args.actor });
    }
  }

  const fresh = await storage.getBookingGate(stay.booking.id);
  await onStayApproved({
    ...stay,
    booking: { ...stay.booking, status: liveStatus },
    gate: fresh ?? { ...stay.gate, doorCode, approvedAt },
  });

  // Deliberately logs the reference and the actor — never the code.
  log(`stay ${stay.booking.reference}: APPROVED by ${args.actor}`, "admin");
  return { reference: stay.booking.reference, status: liveStatus };
}

/**
 * Request a fix: NON-TERMINAL. The dates stay held, no money moves, and the
 * silence clock RESTARTS — a guest asked at hour 60 gets a fresh 72 hours, not 12.
 *
 * Which document was wrong decides what is cleared: bouncing the licence resets
 * its status so the guest can re-upload; bouncing the agreement clears the
 * signature so they can re-sign.
 */
export async function requestStayFix(args: {
  bookingId: string;
  actor: string;
  reason: string;
  what: "LICENSE" | "AGREEMENT" | "BOTH";
  now?: Date;
}): Promise<{ reference: string; fixRequestCount: number }> {
  const stay = await loadStay(args.bookingId);
  const reason = args.reason?.trim() ?? "";
  if (reason.length < 5) {
    throw new LeaseError("Tell the guest what to fix (at least 5 characters).", 400);
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  if (stay.gate.approvedAt) {
    throw new LeaseError("This stay is already approved.", 409);
  }

  const now = args.now ?? new Date();
  const fixRequestCount = stay.gate.fixRequestCount + 1;

  const clearLicense = args.what === "LICENSE" || args.what === "BOTH";
  const clearAgreement = args.what === "AGREEMENT" || args.what === "BOTH";

  await storage.updateBookingGate(stay.booking.id, {
    fixRequestedAt: now,
    fixRequestedBy: args.actor,
    fixRequestedReason: reason,
    fixRequestCount,
    // Restart the clock: "silence" means since WE last asked.
    docsDeadlineAt: new Date(now.getTime() + GATE_DOCS_DEADLINE_MS),
    ...(clearLicense
      ? {
          verificationStatus: "REJECTED",
          verificationRejectionReason: reason,
          verificationReviewedAt: now,
          verificationReviewedBy: args.actor,
        }
      : {}),
    ...(clearAgreement
      ? {
          agreementSignedAt: null,
          agreementSignedName: null,
          agreementSignedIp: null,
          agreementDocumentHtml: null,
          agreementDocumentUrl: null,
        }
      : {}),
  });

  const fresh = await storage.getBookingGate(stay.booking.id);
  await onStayFixRequested({ ...stay, gate: fresh ?? stay.gate }, reason);

  log(
    `stay ${stay.booking.reference}: fix requested (${args.what}) by ${args.actor} — round ${fixRequestCount}`,
    "admin",
  );
  return { reference: stay.booking.reference, fixRequestCount };
}

/** Re-exported so a route can render the same stage label the guest sees. */
export { stayStage };

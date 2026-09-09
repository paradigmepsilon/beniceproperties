// server/lib/stayPortal.ts
// =============================================================================
// The short-stay guest's own page and the actions on it: see what is
// outstanding, upload a licence, sign the agreement, read the arrival details.
//
// Token-authenticated exactly like the lease portal — the gate token IS the
// credential, there is no account. Deliberately a SEPARATE module and route from
// portal.ts: that view model is lease-shaped (cadence, installments, late fees,
// manual CashApp/Zelle), and overloading it would mean a token-type
// discriminator and a union view model inside the LIVE lease flow.
//
// WHAT THIS NEVER RETURNS: the door code, the wifi password, the building entry
// code, or an R2 object key — until the stay is APPROVED. Before approval there
// is nothing to show; after it, the arrival block is included because this page
// is one of the two sanctioned surfaces for it (the other is the welcome email).
// =============================================================================

import { randomUUID } from "node:crypto";
import { storage } from "../storage";
import { LeaseError } from "./errorResponse";
import { assertR2Configured, validateUpload, type UploadedFile } from "./uploadValidation";
import { uploadBuffer, deleteObject, getPresignedDownloadUrl } from "./storage-r2";
import { onStayDocsComplete } from "./stayLifecycle";
import { outstandingItems, guestDocsSubmitted } from "./stayLifecycle";
import {
  renderStayAgreementHtml,
  renderSignedStayAgreementHtml,
  type StayAgreementData,
} from "./stayAgreementDocument";
import { resolveStayAccessInfo, renderAccessInfoText } from "./accessInfo";
import { roomDisplayName } from "./formatShared";
import { houseRulesUrl } from "./publicUrl";
import { stayNights } from "@shared/bookingGate";
import { GATE_TOKEN_LENGTH } from "./gateToken";
import { log } from "../server-log";
import type { Booking, BookingGate, Guest, Property, Room } from "@shared/schema";

/** The gate stage a guest sees. Derived, never stored. */
export type StayStage = "AWAITING_DOCS" | "AWAITING_APPROVAL" | "FIX_REQUESTED" | "APPROVED";

export interface ResolvedStay {
  booking: Booking;
  gate: BookingGate;
  guest: Guest;
  property: Property;
  room: Room | null;
}

export function stayStage(gate: BookingGate): StayStage {
  if (gate.approvedAt) return "APPROVED";
  if (!guestDocsSubmitted(gate)) {
    return gate.fixRequestedAt || gate.verificationStatus === "REJECTED"
      ? "FIX_REQUESTED"
      : "AWAITING_DOCS";
  }
  return "AWAITING_APPROVAL";
}

/**
 * Resolve a stay from its token. The length floor mirrors resolvePortalLease:
 * a short string can never be a real token, so reject it before hitting the DB.
 */
export async function resolveStay(token: string): Promise<ResolvedStay> {
  if (!token || token.length < GATE_TOKEN_LENGTH) throw new LeaseError("Invalid stay link", 404);
  const found = await storage.getBookingByGateToken(token);
  if (!found) throw new LeaseError("Stay link not found", 404);
  const [guest, property, room] = await Promise.all([
    storage.getGuest(found.guestId),
    storage.getProperty(found.propertyId),
    found.roomId ? storage.getRoom(found.roomId) : Promise.resolve(undefined),
  ]);
  if (!guest || !property) throw new LeaseError("Stay is missing its guest or property", 409);
  const { gate, ...booking } = found;
  return { booking: booking as Booking, gate, guest, property, room: room ?? null };
}

/** Everything the /stay page renders. Access details ONLY once approved. */
export async function getStayView(token: string) {
  const stay = await resolveStay(token);
  const stage = stayStage(stay.gate);

  const access =
    stage === "APPROVED"
      ? renderAccessInfoText(
          await resolveStayAccessInfo({
            gate: stay.gate,
            property: stay.property,
            room: stay.room,
          }),
        )
      : null;

  return {
    reference: stay.booking.reference,
    stage,
    propertyName: stay.property.name,
    roomName: roomDisplayName(stay.room),
    checkIn: stay.booking.checkIn,
    checkOut: stay.booking.checkOut,
    nights: stay.booking.checkOut
      ? stayNights(stay.booking.checkIn, stay.booking.checkOut)
      : null,
    total: stay.booking.quotedTotal,
    guestName: stay.guest.name,
    outstanding: outstandingItems(stay.gate),
    licence: {
      status: stay.gate.verificationStatus,
      uploadedAt: stay.gate.licenseUploadedAt,
      // The guest sees WHY it was bounced; they never see the object key.
      rejectionReason: stay.gate.verificationRejectionReason,
    },
    agreement: {
      signed: Boolean(stay.gate.agreementSignedAt),
      signedAt: stay.gate.agreementSignedAt,
      signedName: stay.gate.agreementSignedName,
      documentUrl: stay.gate.agreementSignedAt ? `/api/stay/${token}/agreement` : null,
    },
    fixReason: stay.gate.fixRequestedReason,
    deadlineAt: stay.gate.docsDeadlineAt,
    houseRulesUrl: houseRulesUrl(),
    /** Rendered arrival block, or null until approved. */
    accessInfo: access,
  };
}

/** Agreement data assembled from PERSISTED rows — never re-quoted or re-priced. */
async function agreementData(stay: ResolvedStay): Promise<StayAgreementData> {
  const info = await resolveStayAccessInfo({
    gate: stay.gate,
    property: stay.property,
    room: stay.room,
  });
  return {
    guestName: stay.guest.name,
    propertyName: stay.property.name,
    propertyLocation: stay.property.address ?? "",
    roomLabel: roomDisplayName(stay.room) ?? "the whole property",
    checkIn: stay.booking.checkIn,
    checkOut: stay.booking.checkOut ?? stay.booking.checkIn,
    totalPaid: parseFloat(stay.booking.quotedTotal),
    houseRulesUrl: houseRulesUrl(),
    checkInFrom: info.checkInFrom ?? "",
    checkOutBy: info.checkOutBy ?? "",
  };
}

/** Render the agreement for review. No DB write; viewing commits the guest to nothing. */
export async function previewStayAgreement(token: string): Promise<string> {
  const stay = await resolveStay(token);
  return renderStayAgreementHtml(await agreementData(stay));
}

/** The frozen signed artifact. 409 before signature — there is nothing to serve. */
export async function getSignedStayAgreement(token: string): Promise<string> {
  const stay = await resolveStay(token);
  if (!stay.gate.agreementDocumentHtml) {
    throw new LeaseError("This agreement has not been signed yet.", 409);
  }
  return stay.gate.agreementDocumentHtml;
}

/**
 * Capture the typed e-signature. IDEMPOTENT: a second submission returns the
 * FIRST artifact rather than re-signing, so a double-tap cannot produce two
 * differently-timestamped agreements for one stay.
 */
export async function signStayAgreement(args: {
  token: string;
  signedName: string;
  affirmed: boolean;
  ip: string;
  now?: Date;
}): Promise<{ signedAt: Date; documentUrl: string }> {
  const stay = await resolveStay(args.token);

  if (stay.gate.agreementSignedAt) {
    return {
      signedAt: stay.gate.agreementSignedAt,
      documentUrl: `/api/stay/${args.token}/agreement`,
    };
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  if (!args.affirmed) {
    throw new LeaseError("You must confirm you agree to the terms before signing.", 400);
  }
  const name = args.signedName.trim();
  if (name.length < 2) throw new LeaseError("Enter your full legal name.", 400);

  const signedAt = args.now ?? new Date();
  const html = renderSignedStayAgreementHtml(await agreementData(stay), {
    signedName: name,
    signedAt,
    signedIp: args.ip,
  });
  const documentUrl = `/api/stay/${args.token}/agreement`;

  await storage.updateBookingGate(stay.booking.id, {
    agreementSignedName: name,
    agreementSignedAt: signedAt,
    agreementSignedIp: args.ip,
    agreementDocumentHtml: html,
    agreementDocumentUrl: documentUrl,
  });
  log(`stay ${stay.booking.reference}: agreement signed`, "stay");

  await maybeAnnounceComplete(stay.booking.id);
  return { signedAt, documentUrl };
}

/**
 * Store the guest's licence and put it in the review queue. Re-uploading replaces
 * the object (best-effort deleting the old one) and clears any prior rejection, so
 * a bounced guest can simply try again.
 */
export async function uploadStayLicense(
  token: string,
  file: UploadedFile | undefined,
): Promise<{ verificationStatus: string; uploadedAt: Date }> {
  assertR2Configured();
  const stay = await resolveStay(token);
  const ext = validateUpload(file);

  if (stay.gate.approvedAt) {
    throw new LeaseError("This stay is already approved; no further ID is needed.", 409);
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }

  // Namespaced apart from the lease licences so a retention rule can target one
  // without the other.
  const key = `bnp/licenses/booking/${stay.booking.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file!.buffer, file!.mimetype);

  const priorKey = stay.gate.licenseR2Key;
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch((err) =>
      log(`could not delete prior stay licence ${priorKey}: ${(err as Error).message}`, "stay"),
    );
  }

  const uploadedAt = new Date();
  await storage.updateBookingGate(stay.booking.id, {
    licenseR2Key: key,
    licenseUploadedAt: uploadedAt,
    verificationStatus: "PENDING_REVIEW",
    verificationRejectionReason: null,
    verificationReviewedAt: null,
    verificationReviewedBy: null,
  });
  log(`stay ${stay.booking.reference}: licence uploaded → PENDING_REVIEW`, "stay");

  await maybeAnnounceComplete(stay.booking.id);
  return { verificationStatus: "PENDING_REVIEW", uploadedAt };
}

/**
 * Fire the "everything is in" notifications once BOTH documents are present.
 *
 * Called from both submission paths and re-reads the gate row first, so it does
 * not matter which order the guest does them in — and onStayDocsComplete is
 * itself deduped, so calling it twice is harmless.
 */
async function maybeAnnounceComplete(bookingId: string): Promise<void> {
  const gate = await storage.getBookingGate(bookingId);
  if (!gate || !guestDocsSubmitted(gate)) return;
  const booking = await storage.getBooking(bookingId);
  if (!booking) return;
  const [guest, property, room] = await Promise.all([
    storage.getGuest(booking.guestId),
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(undefined),
  ]);
  if (!guest || !property) return;
  await onStayDocsComplete({ booking, gate, guest, property, room: room ?? null });
}

/** Short-lived presigned URL for an admin to view the licence. Never public. */
export async function getStayLicenseViewUrl(bookingId: string): Promise<string> {
  const gate = await storage.getBookingGate(bookingId);
  if (!gate?.licenseR2Key) throw new LeaseError("No licence has been uploaded.", 404);
  return getPresignedDownloadUrl(gate.licenseR2Key);
}

// server/lib/verification.ts
// =============================================================================
// Tenant identity verification (Phase 6.5) — the portal-side actions a tenant
// takes to get their signed, deposit-paid lease activated:
//
//   uploadLicense(token, file)      → store the driver's-license image in R2
//                                     (private), set the lease to PENDING_REVIEW,
//                                     and raise a LOW ops escalation so staff see
//                                     it. Admin approval (admin.ts side) is what
//                                     verifies the name and activates the lease.
//   saveVehicle(token, data)        → upsert the tenant's vehicle row (or record
//                                     "no vehicle").
//   uploadVehiclePhoto(token, file) → optional vehicle photo → R2 (private).
//
// Token-authenticated exactly like portal.ts — the per-lease portal token is the
// credential, no account needed. Reuses resolvePortalLease() from portal.ts.
//
// The license IMAGE never touches this database or the client after upload: it
// lives in R2 under a bnp/ key; only the opaque object key is persisted on the
// lease. Admins read it back through short-lived presigned URLs (admin routes).
// =============================================================================

import { randomUUID } from "node:crypto";
import { storage } from "../storage";
import { resolvePortalLease } from "./portal";
import { uploadBuffer, getPresignedDownloadUrl, deleteObject, isR2Configured } from "./storage-r2";
import { LeaseError } from "./lease";
import { activateVerifiedLease } from "./leasePayments";
import { notifyGuest } from "./notifications";
import { US_STATE_CODES, type Vehicle } from "@shared/schema";
import { log } from "../server-log";

/** Public base URL for guest-facing links (mirrors dunning/lifecycle helper). */
function publicBaseUrl(): string {
  return (
    process.env.PUBLIC_BASE_URL ||
    "https://www.beniceproperties.com"
  );
}

// Accepted upload types → file extension. Images plus PDF (licenses are often
// scanned to PDF). Mirrors UO's whitelist; the client filename is never trusted.
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB, same as UO

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

function assertR2(): void {
  if (!isR2Configured()) {
    throw new LeaseError("File uploads aren't enabled yet (storage not configured).", 503);
  }
}

/** Validate an uploaded file and return its extension, or throw a 400. */
function validateFile(file: UploadedFile | undefined): string {
  if (!file || !file.buffer?.length) throw new LeaseError("No file was uploaded.", 400);
  if (file.size > MAX_BYTES) throw new LeaseError("File too large (max 12 MB).", 400);
  const ext = EXT_BY_TYPE[file.mimetype];
  if (!ext) {
    throw new LeaseError("Unsupported file type — upload a JPG, PNG, WEBP, HEIC, or PDF.", 400);
  }
  return ext;
}

// ---------------------------------------------------------------------------
// Driver's license
// ---------------------------------------------------------------------------

export interface UploadLicenseResult {
  verificationStatus: string;
  licenseUploadedAt: Date;
}

/**
 * Store a tenant's driver's license and move the lease into PENDING_REVIEW.
 * Idempotent-ish: re-uploading replaces the key (best-effort deletes the old
 * object) and resets to PENDING_REVIEW, clearing any prior rejection reason so a
 * rejected tenant can re-submit. Raises a LOW ops escalation (deduped) so the new
 * submission surfaces in UO / the admin queue.
 */
export async function uploadLicense(
  token: string,
  file: UploadedFile | undefined,
): Promise<UploadLicenseResult> {
  assertR2();
  const lease = await resolvePortalLease(token);
  const ext = validateFile(file);

  // Only meaningful while the lease is awaiting verification. Allow re-upload in
  // PENDING_VERIFICATION (deposit paid, not yet approved) — that's the normal
  // path. Block once already ACTIVE/terminal so we don't reopen a live lease.
  if (lease.status === "ACTIVE") {
    throw new LeaseError("This lease is already active; no verification needed.", 409);
  }
  if (["COMPLETED", "TERMINATED", "DEFAULTED"].includes(lease.status)) {
    throw new LeaseError("This lease is closed.", 409);
  }

  const key = `bnp/licenses/${lease.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file!.buffer, file!.mimetype);

  // Best-effort cleanup of a superseded license image.
  const priorKey = lease.licenseR2Key;
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch((err) =>
      log(`could not delete prior license ${priorKey}: ${(err as Error).message}`, "verify"),
    );
  }

  const now = new Date();
  await storage.updateLease(lease.id, {
    licenseR2Key: key,
    licenseUploadedAt: now,
    verificationStatus: "PENDING_REVIEW",
    verificationRejectionReason: null,
    verificationReviewedAt: null,
    verificationReviewedBy: null,
  });

  // Surface to ops (deduped: one OPEN VERIFICATION_PENDING per lease at a time).
  await storage.raiseEscalationOnce({
    leaseId: lease.id,
    kind: "VERIFICATION_PENDING",
    severity: "LOW",
    detail: `Driver's license uploaded for review (guest ${lease.guestId}).`,
  });

  log(`license uploaded for lease ${lease.id} → PENDING_REVIEW`, "verify");
  return { verificationStatus: "PENDING_REVIEW", licenseUploadedAt: now };
}

// ---------------------------------------------------------------------------
// Vehicle
// ---------------------------------------------------------------------------

type UsStateCode = (typeof US_STATE_CODES)[number];

export interface VehicleInput {
  hasVehicle: boolean;
  make?: string | null;
  model?: string | null;
  year?: number | null;
  color?: string | null;
  plate?: string | null;
  plateState?: UsStateCode | null;
}

/**
 * Upsert the tenant's vehicle for their lease. If hasVehicle is false, the car
 * fields are cleared (the tenant declared no vehicle). Any existing vehicle photo
 * key is preserved (managed by uploadVehiclePhoto).
 */
export async function saveVehicle(token: string, input: VehicleInput): Promise<Vehicle> {
  const lease = await resolvePortalLease(token);

  if (input.plateState && !US_STATE_CODES.includes(input.plateState as (typeof US_STATE_CODES)[number])) {
    throw new LeaseError("Invalid plate state.", 400);
  }

  const data = input.hasVehicle
    ? {
        hasVehicle: true,
        make: input.make ?? null,
        model: input.model ?? null,
        year: input.year ?? null,
        color: input.color ?? null,
        plate: input.plate ?? null,
        plateState: input.plateState ?? null,
      }
    : {
        hasVehicle: false,
        make: null,
        model: null,
        year: null,
        color: null,
        plate: null,
        plateState: null,
      };

  const vehicle = await storage.upsertVehicleByLease(lease.id, data);
  log(`vehicle saved for lease ${lease.id} (hasVehicle=${input.hasVehicle})`, "verify");
  return vehicle;
}

/** Store an optional vehicle photo in R2 (private) and record its key. */
export async function uploadVehiclePhoto(
  token: string,
  file: UploadedFile | undefined,
): Promise<{ saved: boolean }> {
  assertR2();
  const lease = await resolvePortalLease(token);
  const ext = validateFile(file);

  const key = `bnp/vehicles/${lease.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file!.buffer, file!.mimetype);

  const existing = await storage.getVehicleByLease(lease.id);
  const priorKey = existing?.photoR2Key;
  // Ensure a vehicle row exists to attach the photo to (default hasVehicle=true).
  await storage.upsertVehicleByLease(lease.id, { photoR2Key: key });
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch((err) =>
      log(`could not delete prior vehicle photo ${priorKey}: ${(err as Error).message}`, "verify"),
    );
  }
  log(`vehicle photo saved for lease ${lease.id}`, "verify");
  return { saved: true };
}

// ===========================================================================
// Admin-side review (called from requireAdmin routes). Approval verifies the
// tenant's name against the license and ACTIVATES the lease; rejection notifies
// the tenant to re-upload and leaves the lease PENDING_VERIFICATION.
// ===========================================================================

/**
 * A short-lived presigned URL for an admin to view a lease's uploaded license.
 * Never returns a public URL — the object stays private. Throws if no license is
 * on file.
 */
export async function getLicenseViewUrl(leaseId: string): Promise<{ url: string; expiresInSec: number }> {
  assertR2();
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (!lease.licenseR2Key) throw new LeaseError("No license has been uploaded for this lease.", 404);
  const expiresInSec = 600;
  const url = await getPresignedDownloadUrl(lease.licenseR2Key, expiresInSec);
  return { url, expiresInSec };
}

/**
 * Approve a lease's identity verification (admin verified the name on the
 * license). Marks it APPROVED, records the reviewer, resolves the pending
 * escalation, then activates the lease (activateVerifiedLease → ACTIVE + welcome
 * + first-week rent). Idempotent: approving an already-approved/active lease just
 * re-asserts activation.
 */
export async function approveVerification(leaseId: string, actor: string): Promise<{ status: string }> {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.verificationStatus !== "APPROVED") {
    if (lease.verificationStatus !== "PENDING_REVIEW") {
      throw new LeaseError(
        `Nothing to approve — verification status is ${lease.verificationStatus} (expected PENDING_REVIEW).`,
        409,
      );
    }
    await storage.updateLease(lease.id, {
      verificationStatus: "APPROVED",
      verificationReviewedAt: new Date(),
      verificationReviewedBy: actor,
      verificationRejectionReason: null,
    });
  }

  // Resolve the open verification escalation (best-effort).
  try {
    const open = await storage.getEscalations({ status: "OPEN", leaseId: lease.id });
    for (const e of open.filter((x) => x.kind === "VERIFICATION_PENDING")) {
      await storage.updateEscalation(e.id, {
        status: "RESOLVED",
        resolvedAt: new Date(),
        resolvedBy: actor,
      });
    }
  } catch (err) {
    log(`could not resolve verification escalation for lease ${lease.id}: ${(err as Error).message}`, "verify");
  }

  // Activate (ACTIVE + welcome lifecycle + first-week rent). Idempotent.
  await activateVerifiedLease(lease.id);
  log(`lease ${lease.id} verification APPROVED by ${actor} → activated`, "verify");
  return { status: "APPROVED" };
}

/**
 * Reject a lease's identity verification. Records the reason + reviewer, leaves
 * the lease PENDING_VERIFICATION (room stays reserved by the paid deposit), and
 * notifies the tenant (email + SMS) with the reason + a portal link to re-upload.
 */
export async function rejectVerification(
  leaseId: string,
  reason: string,
  actor: string,
): Promise<{ status: string }> {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) throw new LeaseError("A rejection reason is required.", 400);

  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.status === "ACTIVE") {
    throw new LeaseError("This lease is already active and can't be rejected.", 409);
  }

  await storage.updateLease(lease.id, {
    verificationStatus: "REJECTED",
    verificationReviewedAt: new Date(),
    verificationReviewedBy: actor,
    verificationRejectionReason: trimmed,
  });

  // Notify the tenant to re-upload (non-fatal — dry-run logs if creds unset).
  try {
    const guest = await storage.getGuest(lease.guestId);
    if (guest) {
      const link = lease.portalToken
        ? `${publicBaseUrl()}/portal/${lease.portalToken}`
        : `${publicBaseUrl()}/lookup`;
      await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: "Action needed: re-upload your driver's license",
        body:
          `Hi ${guest.name || "there"}, we couldn't verify your driver's license for the reason below. ` +
          `Your room is still held. Please upload a new photo from your portal to finish activating your lease.\n\n` +
          `Reason: ${trimmed}\n\n` +
          `Your portal: ${link}`,
      });
    }
  } catch (err) {
    log(`could not notify guest of verification rejection for lease ${lease.id}: ${(err as Error).message}`, "verify");
  }

  log(`lease ${lease.id} verification REJECTED by ${actor}: ${trimmed}`, "verify");
  return { status: "REJECTED" };
}

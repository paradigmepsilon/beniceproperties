// server/lib/uploadValidation.ts
// =============================================================================
// Shape checks for a guest file upload — the accepted MIME whitelist, the size
// cap, and the R2-configured guard.
//
// Lifted verbatim out of verification.ts (which handles LEASE tenants) so the
// short-stay booking flow validates uploads against the SAME list. Two
// whitelists for "what counts as a driver's license" would eventually diverge,
// and the divergence would only show up as a guest unable to submit their ID.
//
// verification.ts now imports these; its exported signatures are unchanged and
// verification.test.ts passes without edits. That is the acceptance criterion
// for this extraction.
//
// The client's filename is NEVER trusted — the extension is derived from the
// sniffed MIME type and the storage key is server-generated.
// =============================================================================

// From errorResponse, not lease.ts — this module stays free of the storage layer
// so it can be imported (and tested) without a database.
import { LeaseError } from "./errorResponse";
import { isR2Configured } from "./storage-r2";

/**
 * Accepted upload types → file extension. Images plus PDF, because a license is
 * often scanned rather than photographed. Mirrors Unified Ops' whitelist.
 */
export const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** 12 MB, same as Unified Ops. A modern phone photo is comfortably under this. */
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

/**
 * 503 when object storage is not configured, rather than an opaque failure deep
 * in the S3 client. Without the R2 environment variables every upload route
 * degrades to this — which is why they are a go-live blocker.
 */
export function assertR2Configured(): void {
  if (!isR2Configured()) {
    throw new LeaseError("File uploads aren't enabled yet (storage not configured).", 503);
  }
}

/** Validate an uploaded file and return its file extension, or throw a 400. */
export function validateUpload(file: UploadedFile | undefined): string {
  if (!file || !file.buffer?.length) throw new LeaseError("No file was uploaded.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new LeaseError("File too large (max 12 MB).", 400);
  const ext = EXT_BY_TYPE[file.mimetype];
  if (!ext) {
    throw new LeaseError("Unsupported file type — upload a JPG, PNG, WEBP, HEIC, or PDF.", 400);
  }
  return ext;
}

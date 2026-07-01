// server/lib/storage-r2.ts
// =============================================================================
// Object storage on Cloudflare R2 (S3-compatible), used for sensitive tenant
// uploads — driver's licenses and vehicle photos. This is the SAME R2 bucket the
// Unified-Ops app uses; BNP namespaces all of its objects under a `bnp/` key
// prefix so they stay cleanly separated. R2 is object storage, NOT the UO
// Postgres — BNP's own Neon DB remains the system of record for all metadata
// (keys, statuses); we only ever store/read opaque objects here.
//
// Mirrors UO's src/lib/marketing/storage.ts (same @aws-sdk/client-s3 client), and
// follows the repo's env-gated idiom (isStripeConfigured / isEmailConfigured):
// with the four R2_* vars set it talks to R2 for real; without them isR2Configured()
// returns false so callers can degrade gracefully (dev/tests) instead of throwing
// at import time.
//
// Licenses are PRIVATE: we never build or hand out a public URL. Reads go through
// short-lived presigned GET URLs (getPresignedDownloadUrl) requested by an
// authenticated admin only.
//
// ENV (same values UO uses — drop them into this app's environment):
//   R2_ACCOUNT_ID          → Cloudflare account id (endpoint host)
//   R2_ACCESS_KEY_ID       → R2 API key id
//   R2_SECRET_ACCESS_KEY   → R2 API secret
//   R2_BUCKET_NAME         → bucket ("unified-ops")
//
// No secrets are ever logged.
// =============================================================================

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/** True only when every R2 credential is present. Callers gate on this. */
export function isR2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY &&
      process.env.R2_BUCKET_NAME,
  );
}

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

function requireR2Config(): R2Config {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    // Never interpolate the values — just name what's missing.
    throw new Error(
      "R2 is not configured (need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)",
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}

let _client: S3Client | null = null;

function client(): S3Client {
  if (_client) return _client;
  const { accountId, accessKeyId, secretAccessKey } = requireR2Config();
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return _client;
}

export interface UploadResult {
  key: string;
  size: number;
}

/**
 * Upload a buffer to R2 under `key`. Returns the key + byte size only — NO public
 * URL (these objects are private; read them via getPresignedDownloadUrl).
 */
export async function uploadBuffer(
  key: string,
  buffer: Buffer | Uint8Array,
  contentType: string,
): Promise<UploadResult> {
  const { bucket } = requireR2Config();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    }),
  );
  return { key, size: buffer.length };
}

/**
 * A short-lived presigned GET URL for a private object (default 10 min). Used by
 * the admin to view an uploaded license without ever making the object public.
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresInSec = 600,
): Promise<string> {
  const { bucket } = requireR2Config();
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSec,
  });
}

/** Delete an object (e.g. superseded license on re-upload). Best-effort. */
export async function deleteObject(key: string): Promise<void> {
  const { bucket } = requireR2Config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// server/lib/uploadValidation.test.ts
// The MIME whitelist and size cap that gate every guest document upload — a
// driver's license today, whatever else later. These were private to
// verification.ts and untested in isolation; they are now the single gate for
// both the lease and the short-stay flow, so they get their own coverage.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockR2 = vi.hoisted(() => ({ isR2Configured: vi.fn(() => true) }));
vi.mock("./storage-r2", () => mockR2);

import {
  validateUpload,
  assertR2Configured,
  EXT_BY_TYPE,
  MAX_UPLOAD_BYTES,
  type UploadedFile,
} from "./uploadValidation";

const file = (over: Partial<UploadedFile> = {}): UploadedFile => ({
  buffer: Buffer.from("fake-image-bytes"),
  mimetype: "image/jpeg",
  size: 1024,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockR2.isR2Configured.mockReturnValue(true);
});

describe("validateUpload — accepted types", () => {
  it("maps every whitelisted MIME type to its extension", () => {
    for (const [mimetype, ext] of Object.entries(EXT_BY_TYPE)) {
      expect(validateUpload(file({ mimetype })), mimetype).toBe(ext);
    }
  });

  it("accepts a PDF, because licenses are often scanned rather than photographed", () => {
    expect(validateUpload(file({ mimetype: "application/pdf" }))).toBe("pdf");
  });

  it("accepts HEIC/HEIF, which is what an iPhone produces by default", () => {
    expect(validateUpload(file({ mimetype: "image/heic" }))).toBe("heic");
    expect(validateUpload(file({ mimetype: "image/heif" }))).toBe("heif");
  });
});

describe("validateUpload — rejections", () => {
  it("400s an absent file", () => {
    expect(() => validateUpload(undefined)).toThrow(/no file was uploaded/i);
  });

  it("400s an empty buffer (a zero-byte upload is not a document)", () => {
    expect(() => validateUpload(file({ buffer: Buffer.alloc(0) }))).toThrow(/no file was uploaded/i);
  });

  it("400s an unsupported type and names the acceptable ones", () => {
    expect(() => validateUpload(file({ mimetype: "image/gif" }))).toThrow(/unsupported file type/i);
    expect(() => validateUpload(file({ mimetype: "text/html" }))).toThrow(/JPG, PNG, WEBP, HEIC, or PDF/);
  });

  // An executable or script disguised by filename must not pass. The client's
  // filename is never consulted — only the MIME type — so this is the whole guard.
  it("400s an executable regardless of what it claims to be", () => {
    expect(() => validateUpload(file({ mimetype: "application/x-msdownload" }))).toThrow(
      /unsupported file type/i,
    );
    expect(() => validateUpload(file({ mimetype: "application/octet-stream" }))).toThrow(
      /unsupported file type/i,
    );
  });

  it("enforces the size cap exactly at the boundary", () => {
    expect(validateUpload(file({ size: MAX_UPLOAD_BYTES }))).toBe("jpg");
    expect(() => validateUpload(file({ size: MAX_UPLOAD_BYTES + 1 }))).toThrow(/too large/i);
  });
});

describe("assertR2Configured", () => {
  it("passes when object storage is configured", () => {
    expect(() => assertR2Configured()).not.toThrow();
  });

  // Without the R2 environment variables every upload route degrades to a clean
  // 503 rather than an opaque S3 client error — which is exactly why those vars
  // are a go-live blocker for the approval gate.
  it("throws a 503 when storage is not configured", () => {
    mockR2.isR2Configured.mockReturnValue(false);
    expect(() => assertR2Configured()).toThrow(
      expect.objectContaining({ status: 503, message: expect.stringMatching(/aren't enabled yet/i) }),
    );
  });
});

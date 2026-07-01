// server/lib/verification.test.ts
// Phase 6.5 — tenant identity verification. Mocks storage, R2, the portal token
// resolver, the activation hook, and notifications so no network/DB is touched.
// Locks the safety invariants:
//   - license upload validates type/size, stores under a bnp/licenses key, and
//     moves the lease to PENDING_REVIEW (+ raises an ops escalation)
//   - approve → APPROVED + activateVerifiedLease() called; reject → REJECTED +
//     tenant notified, lease left PENDING_VERIFICATION (room stays secured)
//   - vehicle upsert clears car fields when the tenant declares no vehicle

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLease: vi.fn(),
  getLeases: vi.fn(),
  updateLease: vi.fn(),
  getGuest: vi.fn(),
  getProperty: vi.fn(),
  getLeaseRooms: vi.fn(),
  getVehicleByLease: vi.fn(),
  upsertVehicleByLease: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  getEscalations: vi.fn(),
  updateEscalation: vi.fn(),
}));
const mockR2 = vi.hoisted(() => ({
  uploadBuffer: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  deleteObject: vi.fn(),
  isR2Configured: vi.fn(),
}));
const mockPortal = vi.hoisted(() => ({ resolvePortalLease: vi.fn() }));
const mockLeasePayments = vi.hoisted(() => ({ activateVerifiedLease: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyGuest: vi.fn() }));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./storage-r2", () => mockR2);
vi.mock("./portal", () => mockPortal);
vi.mock("./leasePayments", () => mockLeasePayments);
vi.mock("./notifications", () => mockNotify);

import {
  uploadLicense,
  saveVehicle,
  uploadVehiclePhoto,
  getLicenseViewUrl,
  approveVerification,
  rejectVerification,
} from "./verification";
import { LeaseError } from "./lease";

function lease(overrides: Record<string, unknown> = {}) {
  return {
    id: "lease-1",
    guestId: "g1",
    propertyId: "prop-1",
    status: "PENDING_VERIFICATION",
    verificationStatus: "NOT_SUBMITTED",
    licenseR2Key: null,
    portalToken: "tok_abc",
    signedName: "Jane Q Tenant",
    startDate: "2026-08-01",
    ...overrides,
  };
}

const jpg = (): { buffer: Buffer; mimetype: string; size: number } => ({
  buffer: Buffer.from("fake-image-bytes"),
  mimetype: "image/jpeg",
  size: 16,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockR2.isR2Configured.mockReturnValue(true);
  mockR2.uploadBuffer.mockResolvedValue({ key: "k", size: 16 });
  mockStorage.updateLease.mockResolvedValue(undefined);
  mockStorage.raiseEscalationOnce.mockResolvedValue(null);
});

describe("uploadLicense", () => {
  beforeEach(() => {
    mockPortal.resolvePortalLease.mockResolvedValue(lease());
  });

  it("stores under a bnp/licenses key and moves the lease to PENDING_REVIEW", async () => {
    const res = await uploadLicense("tok_abc", jpg());

    expect(mockR2.uploadBuffer).toHaveBeenCalledTimes(1);
    const key = mockR2.uploadBuffer.mock.calls[0][0] as string;
    expect(key).toMatch(/^bnp\/licenses\/lease-1\/.*\.jpg$/);
    expect(mockStorage.updateLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ verificationStatus: "PENDING_REVIEW", verificationRejectionReason: null }),
    );
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ leaseId: "lease-1", kind: "VERIFICATION_PENDING" }),
    );
    expect(res.verificationStatus).toBe("PENDING_REVIEW");
  });

  it("rejects an unsupported file type", async () => {
    await expect(uploadLicense("tok_abc", { buffer: Buffer.from("x"), mimetype: "text/plain", size: 1 })).rejects.toThrow(
      /Unsupported file type/i,
    );
    expect(mockR2.uploadBuffer).not.toHaveBeenCalled();
  });

  it("rejects a file over the size limit", async () => {
    await expect(
      uploadLicense("tok_abc", { buffer: Buffer.from("x"), mimetype: "image/png", size: 13 * 1024 * 1024 }),
    ).rejects.toThrow(/too large/i);
    expect(mockR2.uploadBuffer).not.toHaveBeenCalled();
  });

  it("refuses when the lease is already ACTIVE", async () => {
    mockPortal.resolvePortalLease.mockResolvedValue(lease({ status: "ACTIVE" }));
    await expect(uploadLicense("tok_abc", jpg())).rejects.toThrow(/already active/i);
  });

  it("503s when R2 is not configured", async () => {
    mockR2.isR2Configured.mockReturnValue(false);
    await expect(uploadLicense("tok_abc", jpg())).rejects.toMatchObject({ status: 503 });
  });

  it("re-upload after rejection deletes the prior object and resets to PENDING_REVIEW", async () => {
    mockPortal.resolvePortalLease.mockResolvedValue(
      lease({ status: "PENDING_VERIFICATION", verificationStatus: "REJECTED", licenseR2Key: "bnp/licenses/lease-1/old.jpg" }),
    );
    mockR2.deleteObject.mockResolvedValue(undefined);
    await uploadLicense("tok_abc", jpg());
    expect(mockR2.deleteObject).toHaveBeenCalledWith("bnp/licenses/lease-1/old.jpg");
    expect(mockStorage.updateLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ verificationStatus: "PENDING_REVIEW", verificationRejectionReason: null }),
    );
  });
});

describe("approveVerification", () => {
  beforeEach(() => {
    mockStorage.getEscalations.mockResolvedValue([]);
    mockLeasePayments.activateVerifiedLease.mockResolvedValue(undefined);
  });

  it("marks APPROVED and activates the lease", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ verificationStatus: "PENDING_REVIEW" }));
    const res = await approveVerification("lease-1", "admin@bnp.com");

    expect(mockStorage.updateLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ verificationStatus: "APPROVED", verificationReviewedBy: "admin@bnp.com" }),
    );
    expect(mockLeasePayments.activateVerifiedLease).toHaveBeenCalledWith("lease-1");
    expect(res.status).toBe("APPROVED");
  });

  it("resolves an open verification escalation on approval", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ verificationStatus: "PENDING_REVIEW" }));
    mockStorage.getEscalations.mockResolvedValue([{ id: "esc-1", kind: "VERIFICATION_PENDING" }]);
    mockStorage.updateEscalation.mockResolvedValue(undefined);
    await approveVerification("lease-1", "admin@bnp.com");
    expect(mockStorage.updateEscalation).toHaveBeenCalledWith("esc-1", expect.objectContaining({ status: "RESOLVED" }));
  });

  it("refuses to approve a lease that is not PENDING_REVIEW", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ verificationStatus: "NOT_SUBMITTED" }));
    await expect(approveVerification("lease-1", "admin@bnp.com")).rejects.toThrow(/Nothing to approve/i);
    expect(mockLeasePayments.activateVerifiedLease).not.toHaveBeenCalled();
  });
});

describe("rejectVerification", () => {
  beforeEach(() => {
    mockStorage.getGuest.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com", phone: "+15551234567" });
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  });

  it("marks REJECTED, keeps the lease PENDING_VERIFICATION, and notifies the tenant", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ verificationStatus: "PENDING_REVIEW" }));
    const res = await rejectVerification("lease-1", "Photo is blurry", "admin@bnp.com");

    expect(mockStorage.updateLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ verificationStatus: "REJECTED", verificationRejectionReason: "Photo is blurry" }),
    );
    // Lease status itself is untouched (stays PENDING_VERIFICATION).
    expect(mockStorage.updateLease).not.toHaveBeenCalledWith("lease-1", expect.objectContaining({ status: expect.anything() }));
    expect(mockNotify.notifyGuest).toHaveBeenCalledWith(
      expect.objectContaining({ email: "jane@example.com", subject: expect.stringMatching(/re-upload/i) }),
    );
    expect(res.status).toBe("REJECTED");
  });

  it("requires a reason", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ verificationStatus: "PENDING_REVIEW" }));
    await expect(rejectVerification("lease-1", "   ", "admin@bnp.com")).rejects.toThrow(/reason is required/i);
  });

  it("refuses to reject an already-active lease", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ status: "ACTIVE", verificationStatus: "APPROVED" }));
    await expect(rejectVerification("lease-1", "too late", "admin@bnp.com")).rejects.toThrow(/already active/i);
  });
});

describe("getLicenseViewUrl", () => {
  it("returns a presigned URL for a lease with a license", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ licenseR2Key: "bnp/licenses/lease-1/x.jpg" }));
    mockR2.getPresignedDownloadUrl.mockResolvedValue("https://signed.example/x");
    const res = await getLicenseViewUrl("lease-1");
    expect(mockR2.getPresignedDownloadUrl).toHaveBeenCalledWith("bnp/licenses/lease-1/x.jpg", 600);
    expect(res.url).toBe("https://signed.example/x");
  });

  it("404s when no license is on file", async () => {
    mockStorage.getLease.mockResolvedValue(lease({ licenseR2Key: null }));
    await expect(getLicenseViewUrl("lease-1")).rejects.toMatchObject({ status: 404 });
  });
});

describe("saveVehicle / uploadVehiclePhoto", () => {
  beforeEach(() => {
    mockPortal.resolvePortalLease.mockResolvedValue(lease());
    mockStorage.upsertVehicleByLease.mockResolvedValue({ id: "v1", hasVehicle: true });
    mockStorage.getVehicleByLease.mockResolvedValue(undefined);
  });

  it("saves vehicle details when hasVehicle is true", async () => {
    await saveVehicle("tok_abc", {
      hasVehicle: true,
      make: "Toyota",
      model: "Camry",
      year: 2020,
      color: "Blue",
      plate: "ABC123",
      plateState: "GA",
    });
    expect(mockStorage.upsertVehicleByLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ hasVehicle: true, make: "Toyota", plateState: "GA" }),
    );
  });

  it("clears car fields when the tenant declares no vehicle", async () => {
    await saveVehicle("tok_abc", { hasVehicle: false });
    expect(mockStorage.upsertVehicleByLease).toHaveBeenCalledWith(
      "lease-1",
      expect.objectContaining({ hasVehicle: false, make: null, plate: null, plateState: null }),
    );
  });

  it("stores a vehicle photo under a bnp/vehicles key", async () => {
    await uploadVehiclePhoto("tok_abc", jpg());
    const key = mockR2.uploadBuffer.mock.calls[0][0] as string;
    expect(key).toMatch(/^bnp\/vehicles\/lease-1\/.*\.jpg$/);
    expect(mockStorage.upsertVehicleByLease).toHaveBeenCalledWith("lease-1", expect.objectContaining({ photoR2Key: key }));
  });
});

// client/src/lib/statusBadge.test.ts
// Pins the status → colour mapping shared by the guest portal and the admin
// Payments tree. The components themselves cannot be tested (vitest runs
// environment:"node", no jsdom), so this is the only guard on the mapping.

import { describe, it, expect } from "vitest";
import { statusVariant, statusClass } from "./statusBadge";

describe("statusVariant", () => {
  it("marks the money-and-attention statuses destructive", () => {
    for (const s of ["FAILED", "LATE", "DEFAULTED", "REJECTED"]) {
      expect(statusVariant(s)).toBe("destructive");
    }
  });

  it("leaves everything else neutral", () => {
    for (const s of ["PAID", "ACTIVE", "SCHEDULED", "DUE", "PENDING", "WAIVED", "ACCRUED"]) {
      expect(statusVariant(s)).toBe("secondary");
    }
  });
});

describe("statusClass", () => {
  it("tints the positive statuses green", () => {
    for (const s of ["PAID", "ACTIVE", "RESOLVED", "APPROVED"]) {
      expect(statusClass(s)).toContain("text-good");
    }
  });

  it("returns undefined for statuses with no tint", () => {
    expect(statusClass("DUE")).toBeUndefined();
    expect(statusClass("LATE")).toBeUndefined();
  });
});

describe("unknown statuses", () => {
  it("falls back quietly rather than throwing, so a new enum value is safe", () => {
    expect(() => statusVariant("SOME_FUTURE_STATUS")).not.toThrow();
    expect(statusVariant("SOME_FUTURE_STATUS")).toBe("secondary");
    expect(statusClass("SOME_FUTURE_STATUS")).toBeUndefined();
    expect(statusVariant("")).toBe("secondary");
  });
});

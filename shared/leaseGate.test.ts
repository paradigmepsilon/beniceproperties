// shared/leaseGate.test.ts
// Locks the co-living lease-vs-booking term gate (owner rule 2026-07-04):
//   < 7 nights → below minimum; 7–28 → direct booking; > 28 → lease.
// One source of truth in schema.ts, imported by client + server.

import { describe, it, expect } from "vitest";
import {
  requiresLease,
  isDirectCoLivingStay,
  COLIVING_MIN_DAYS,
  LEASE_REQUIRED_ABOVE_DAYS,
} from "./schema";

describe("requiresLease — lease required above 28 nights (over 1 month)", () => {
  it("28 nights or fewer do NOT require a lease", () => {
    expect(requiresLease(7)).toBe(false);
    expect(requiresLease(28)).toBe(false);
  });
  it("29 nights or more require a lease", () => {
    expect(requiresLease(29)).toBe(true);
    expect(requiresLease(90)).toBe(true);
  });
  it("uses the LEASE_REQUIRED_ABOVE_DAYS boundary (28)", () => {
    expect(LEASE_REQUIRED_ABOVE_DAYS).toBe(28);
  });
});

describe("isDirectCoLivingStay — 7 to 28 nights inclusive", () => {
  it("is true across the short-stay band", () => {
    expect(isDirectCoLivingStay(7)).toBe(true);
    expect(isDirectCoLivingStay(14)).toBe(true);
    expect(isDirectCoLivingStay(28)).toBe(true);
  });
  it("is false below the 7-night minimum", () => {
    expect(isDirectCoLivingStay(6)).toBe(false);
    expect(isDirectCoLivingStay(1)).toBe(false);
  });
  it("is false for lease-length stays", () => {
    expect(isDirectCoLivingStay(29)).toBe(false);
  });
  it("uses the COLIVING_MIN_DAYS lower bound (7)", () => {
    expect(COLIVING_MIN_DAYS).toBe(7);
  });
});

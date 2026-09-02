import { describe, it, expect } from "vitest";
import { validateBlockForm, type BlockFormInput } from "./blockForm";

const base: BlockFormInput = {
  propertyId: "prop-1",
  roomId: null,
  isColiving: false,
  startDate: "2026-09-10",
  endDate: "2026-09-15",
  kind: "MAINTENANCE",
};

describe("validateBlockForm", () => {
  it("accepts a valid whole-property (STR) block", () => {
    expect(validateBlockForm(base)).toEqual({ valid: true, error: null });
  });

  it("accepts a valid co-living block with a room chosen", () => {
    expect(validateBlockForm({ ...base, isColiving: true, roomId: "room-1" })).toEqual({
      valid: true,
      error: null,
    });
  });

  it("rejects a co-living block with no room chosen", () => {
    const result = validateBlockForm({ ...base, isColiving: true, roomId: null });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/room/i);
  });

  it("rejects a missing listing", () => {
    const result = validateBlockForm({ ...base, propertyId: "" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/listing/i);
  });

  it("rejects a missing start date", () => {
    const result = validateBlockForm({ ...base, startDate: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects a missing end date", () => {
    const result = validateBlockForm({ ...base, endDate: "" });
    expect(result.valid).toBe(false);
  });

  it("rejects an end date equal to the start date (exclusive end)", () => {
    const result = validateBlockForm({ ...base, endDate: base.startDate });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/after the start date/i);
  });

  it("rejects an end date before the start date", () => {
    const result = validateBlockForm({ ...base, startDate: "2026-09-15", endDate: "2026-09-10" });
    expect(result.valid).toBe(false);
  });

  it("rejects an invalid kind", () => {
    const result = validateBlockForm({ ...base, kind: "BOGUS" });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/block type/i);
  });

  it("accepts every real MANUAL_BLOCK_KINDS value", () => {
    for (const kind of ["OFF_PLATFORM_BOOKING", "MAINTENANCE", "OWNER_USE", "OTHER"]) {
      expect(validateBlockForm({ ...base, kind }).valid).toBe(true);
    }
  });
});

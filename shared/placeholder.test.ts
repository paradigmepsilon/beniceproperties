// shared/placeholder.test.ts
// The rule that keeps front-end-only listings out of the business's numbers:
// `active` decides whether the world sees a listing, `isPlaceholder` decides
// whether the business counts it. These two must never collapse into one.

import { describe, it, expect } from "vitest";
import {
  isPlaceholder,
  countsTowardBusiness,
  excludePlaceholders,
  listingIsInquiryOnly,
} from "./placeholder";

describe("isPlaceholder", () => {
  it("is true only when the flag is set", () => {
    expect(isPlaceholder({ isPlaceholder: true })).toBe(true);
    expect(isPlaceholder({ isPlaceholder: false })).toBe(false);
  });
  it("treats a missing or null flag as real inventory", () => {
    // Existing rows predate the column; they must not silently vanish from
    // occupancy or revenue because the value is absent.
    expect(isPlaceholder({})).toBe(false);
    expect(isPlaceholder({ isPlaceholder: null })).toBe(false);
    expect(isPlaceholder(undefined)).toBe(false);
    expect(isPlaceholder(null)).toBe(false);
  });
});

describe("countsTowardBusiness", () => {
  it("is the exact negation of isPlaceholder", () => {
    for (const p of [{ isPlaceholder: true }, { isPlaceholder: false }, {}, null, undefined]) {
      expect(countsTowardBusiness(p)).toBe(!isPlaceholder(p));
    }
  });
  it("does not look at `active` — the two flags are orthogonal", () => {
    // A hidden real property still counts; a visible placeholder still doesn't.
    expect(countsTowardBusiness({ isPlaceholder: false, active: false } as never)).toBe(true);
    expect(countsTowardBusiness({ isPlaceholder: true, active: true } as never)).toBe(false);
  });
});

describe("excludePlaceholders", () => {
  it("drops only the flagged rows and preserves order", () => {
    const rows = [
      { id: "a", isPlaceholder: false },
      { id: "b", isPlaceholder: true },
      { id: "c" },
      { id: "d", isPlaceholder: true },
    ];
    expect(excludePlaceholders(rows).map((r) => r.id)).toEqual(["a", "c"]);
  });
  it("returns an empty list when everything is a placeholder", () => {
    expect(excludePlaceholders([{ isPlaceholder: true }, { isPlaceholder: true }])).toEqual([]);
  });
});

describe("listingIsInquiryOnly", () => {
  it("is true for LTR, which is inquiry-only by design", () => {
    expect(listingIsInquiryOnly({ type: "LTR" })).toBe(true);
  });
  it("is true for a placeholder of any type", () => {
    expect(listingIsInquiryOnly({ type: "COLIVING", isPlaceholder: true })).toBe(true);
    expect(listingIsInquiryOnly({ type: "STR", isPlaceholder: true })).toBe(true);
  });
  it("is false for real bookable inventory", () => {
    expect(listingIsInquiryOnly({ type: "COLIVING", isPlaceholder: false })).toBe(false);
    expect(listingIsInquiryOnly({ type: "STR" })).toBe(false);
  });
});

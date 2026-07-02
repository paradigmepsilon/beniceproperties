import { describe, it, expect } from "vitest";
import { cityOf } from "./format";

describe("cityOf", () => {
  it("extracts the city from a full street address", () => {
    expect(cityOf("5870 Old Bill Cook Rd. Atlanta, GA 30349")).toBe("Atlanta");
  });

  it("passes through a bare city", () => {
    expect(cityOf("Atlanta")).toBe("Atlanta");
  });

  it("falls back to the trimmed input for a name-only location", () => {
    expect(cityOf("ANTIGUAN VILLAGE RETREAT")).toBe("ANTIGUAN VILLAGE RETREAT");
  });

  it("handles a multi-word city before the comma", () => {
    expect(cityOf("123 Main St. San Diego, CA 92101")).toBe("San Diego");
  });

  it("handles a city with a comma but no street part", () => {
    expect(cityOf("Atlanta, GA")).toBe("Atlanta");
  });

  it("is safe on empty input", () => {
    expect(cityOf("")).toBe("");
  });
});

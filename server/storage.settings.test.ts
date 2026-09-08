// server/storage.settings.test.ts
// Unit tests for parseSettingNumber: decimal-safe parsing for app_settings values.
import { describe, it, expect, vi } from "vitest";

// Mock db to prevent connection at module load
vi.mock("./db", () => ({ db: {} }));

import { parseSettingNumber } from "./storage";

describe("parseSettingNumber", () => {
  it('parses "0.035" as 0.035 (not 0)', () => {
    expect(parseSettingNumber("0.035", 999)).toBe(0.035);
  });

  it('parses "27.50" as 27.5', () => {
    expect(parseSettingNumber("27.50", 999)).toBe(27.5);
  });

  it('parses "7" as 7', () => {
    expect(parseSettingNumber("7", 999)).toBe(7);
  });

  it("returns fallback for empty string", () => {
    expect(parseSettingNumber("", 999)).toBe(999);
  });

  it("returns fallback for undefined", () => {
    expect(parseSettingNumber(undefined, 999)).toBe(999);
  });

  it("returns fallback for null", () => {
    expect(parseSettingNumber(null, 999)).toBe(999);
  });

  it("returns fallback for non-numeric string", () => {
    expect(parseSettingNumber("abc", 999)).toBe(999);
  });
});

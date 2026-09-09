// shared/doorCode.test.ts
// Every code in this file is SYNTHETIC. Real property access codes must never
// appear in a test fixture — that is the same rule that keeps them out of logs
// and Telegram.

import { describe, it, expect } from "vitest";
import {
  isValidDoorCode,
  doorCodeError,
  normalizeDoorCode,
  maskDoorCode,
  DOOR_CODE_MIN_LENGTH,
  DOOR_CODE_MAX_LENGTH,
} from "./doorCode";

describe("normalizeDoorCode", () => {
  it("trims, because a pasted code arrives with whitespace", () => {
    expect(normalizeDoorCode("  1357  ")).toBe("1357");
  });

  it("is null for absent or blank input", () => {
    expect(normalizeDoorCode(null)).toBeNull();
    expect(normalizeDoorCode(undefined)).toBeNull();
    expect(normalizeDoorCode("")).toBeNull();
    expect(normalizeDoorCode("   ")).toBeNull();
  });

  it("is null for a non-string, so a JSON body of the wrong shape cannot slip through", () => {
    expect(normalizeDoorCode(1357 as unknown as string)).toBeNull();
  });
});

describe("isValidDoorCode", () => {
  it("accepts ordinary keypad codes", () => {
    expect(isValidDoorCode("1357")).toBe(true);
    expect(isValidDoorCode("905txt")).toBe(true);
    expect(isValidDoorCode("13#57*")).toBe(true);
    expect(isValidDoorCode("13-57")).toBe(true);
  });

  it("accepts a code with surrounding whitespace (it is trimmed first)", () => {
    expect(isValidDoorCode(" 1357 ")).toBe(true);
  });

  it("rejects an empty or missing code — approval must not proceed without one", () => {
    expect(isValidDoorCode("")).toBe(false);
    expect(isValidDoorCode("   ")).toBe(false);
    expect(isValidDoorCode(null)).toBe(false);
    expect(isValidDoorCode(undefined)).toBe(false);
  });

  it("enforces both length bounds at the boundary", () => {
    expect(isValidDoorCode("1".repeat(DOOR_CODE_MIN_LENGTH - 1))).toBe(false);
    expect(isValidDoorCode("1".repeat(DOOR_CODE_MIN_LENGTH))).toBe(true);
    expect(isValidDoorCode("1".repeat(DOOR_CODE_MAX_LENGTH))).toBe(true);
    expect(isValidDoorCode("1".repeat(DOOR_CODE_MAX_LENGTH + 1))).toBe(false);
  });

  it("rejects the things an operator actually pastes by mistake", () => {
    expect(isValidDoorCode("code is 1357")).toBe(false); // spaces
    expect(isValidDoorCode("https://example.com/x")).toBe(false); // a URL
    expect(isValidDoorCode("../../etc/passwd")).toBe(false); // path characters
    expect(isValidDoorCode("13\n57")).toBe(false); // a newline
    expect(isValidDoorCode("1357;")).toBe(false); // punctuation
    expect(isValidDoorCode("135🔑")).toBe(false); // emoji
  });
});

describe("doorCodeError", () => {
  it("is null exactly when the code is valid", () => {
    expect(doorCodeError("1357")).toBeNull();
    expect(doorCodeError("bad")).not.toBeNull();
  });

  it("names the problem in operator language", () => {
    expect(doorCodeError("")).toMatch(/enter the door code/i);
    expect(doorCodeError("13")).toMatch(/at least/i);
    expect(doorCodeError("1".repeat(20))).toMatch(/at most/i);
    expect(doorCodeError("13 57")).toMatch(/only letters, numbers/i);
  });

  // The error text is returned over the API and may be logged. If it quoted the
  // rejected value, a near-miss typo of a real code would end up in the log —
  // which is exactly what this module exists to prevent.
  it("never echoes the rejected value", () => {
    const secretish = "1357-oops-toolong";
    expect(doorCodeError(secretish)).not.toContain(secretish);
    expect(doorCodeError("13 57")).not.toContain("13 57");
  });
});

describe("maskDoorCode", () => {
  it("reveals only the last character", () => {
    expect(maskDoorCode("1357")).toBe("•••7");
    expect(maskDoorCode("905txt")).toBe("•••••t");
  });

  it("says so plainly when no code is set", () => {
    expect(maskDoorCode(null)).toBe("(none)");
    expect(maskDoorCode("")).toBe("(none)");
  });

  it("is not reversible — the masked form never contains the original", () => {
    expect(maskDoorCode("1357")).not.toContain("135");
  });

  it("does not throw on a single character", () => {
    expect(maskDoorCode("7")).toBe("7");
  });
});

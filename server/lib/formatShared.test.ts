// server/lib/formatShared.test.ts
// These two helpers render money and room names onto signed agreements and
// guest emails, and they were previously duplicated (fmtMoney lived in both
// lifecycle.ts and leaseDocument.ts). Locking the exact output so the two
// call sites that used to disagree can never drift apart again.

import { describe, it, expect } from "vitest";
import { fmtMoney, roomDisplayName } from "./formatShared";
import type { Room } from "@shared/schema";

const room = (over: Partial<Room> = {}) =>
  ({ id: "r1", name: "Garden", roomNumber: "2", ...over }) as unknown as Room;

describe("fmtMoney", () => {
  it("renders USD with a thousands separator and exactly two decimals", () => {
    expect(fmtMoney(1234.5)).toBe("$1,234.50");
    expect(fmtMoney(0)).toBe("$0.00");
    expect(fmtMoney(25)).toBe("$25.00");
  });

  it("rounds to cents rather than truncating", () => {
    expect(fmtMoney(0.005)).toBe("$0.01");
    expect(fmtMoney(1234.567)).toBe("$1,234.57");
  });

  it("renders a negative as a real negative, not a bare number", () => {
    expect(fmtMoney(-40)).toBe("-$40.00");
  });

  // The decimal columns come out of Drizzle as strings. Anyone who forgets the
  // parseFloat gets "$NaN" on a guest's invoice, so pin that it is visible
  // rather than silently rendering "$0.00".
  it("makes a missing parseFloat obvious instead of quietly showing zero", () => {
    expect(fmtMoney(Number.NaN)).toBe("$NaN");
  });
});

describe("roomDisplayName", () => {
  it("combines number and name when both exist", () => {
    expect(roomDisplayName(room())).toBe("Room 2 — Garden");
  });

  it("falls back to the name alone when there is no room number", () => {
    expect(roomDisplayName(room({ roomNumber: null as unknown as string }))).toBe("Garden");
    expect(roomDisplayName(room({ roomNumber: "" }))).toBe("Garden");
  });

  it("is null for a whole-property stay, so callers can omit the room clause", () => {
    expect(roomDisplayName(null)).toBeNull();
    expect(roomDisplayName(undefined)).toBeNull();
  });
});

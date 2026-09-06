// server/lib/publicInventory.test.ts
// Which rooms the PUBLIC site may show at all. A room on an inactive property,
// or a room pulled off the market (HOLD/MAINTENANCE/INACTIVE), must 404 on its
// detail + availability endpoints rather than render a bookable-looking page.

import { describe, it, expect } from "vitest";
import { roomPubliclyVisible } from "./publicInventory";

const activeProp = { active: true };
const inactiveProp = { active: false };

describe("roomPubliclyVisible", () => {
  it("shows an AVAILABLE room on an active property", () => {
    expect(roomPubliclyVisible({ status: "AVAILABLE" }, activeProp)).toBe(true);
  });
  it("shows an OCCUPIED room (it can still be booked for a future free range)", () => {
    expect(roomPubliclyVisible({ status: "OCCUPIED" }, activeProp)).toBe(true);
  });
  it("hides HOLD / MAINTENANCE / INACTIVE rooms", () => {
    for (const status of ["HOLD", "MAINTENANCE", "INACTIVE"]) {
      expect(roomPubliclyVisible({ status }, activeProp)).toBe(false);
    }
  });
  it("hides every room of an inactive or missing property", () => {
    expect(roomPubliclyVisible({ status: "AVAILABLE" }, inactiveProp)).toBe(false);
    expect(roomPubliclyVisible({ status: "AVAILABLE" }, undefined)).toBe(false);
  });
});

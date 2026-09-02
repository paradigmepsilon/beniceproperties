// server/lib/manualBlocks.test.ts
// Manual-block property/room pairing. The finding this pins: a block with
// roomId=null on a COLIVING property is INERT — co-living availability is
// decided per room, so the operator thinks a room is held and it is still
// bookable. That must be a 400, not a silently useless row.

import { describe, it, expect } from "vitest";
import { validateManualBlockInput } from "./manualBlocks";

const STR = { id: "p-str", type: "STR" as const };
const COLIVING = { id: "p-col", type: "COLIVING" as const };
const ROOM = { id: "r1", propertyId: "p-col" };

describe("validateManualBlockInput", () => {
  it("rejects a property-level block on a co-living property (it would block nothing)", () => {
    const r = validateManualBlockInput({ property: COLIVING, room: undefined, roomId: null });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Co-living blocks must name a room");
  });

  it("rejects it for an undefined roomId too (the field simply omitted)", () => {
    expect(validateManualBlockInput({ property: COLIVING, room: undefined, roomId: undefined }).ok).toBe(
      false,
    );
  });

  it("allows a property-level block on an STR property (whole-listing block is the point)", () => {
    expect(validateManualBlockInput({ property: STR, room: undefined, roomId: null })).toEqual({
      ok: true,
      message: null,
    });
  });

  it("allows a room-level block when the room belongs to the property", () => {
    expect(validateManualBlockInput({ property: COLIVING, room: ROOM, roomId: "r1" }).ok).toBe(true);
  });

  it("rejects a room that belongs to a different property (it would block the wrong listing)", () => {
    const r = validateManualBlockInput({
      property: COLIVING,
      room: { id: "r9", propertyId: "some-other-property" },
      roomId: "r9",
    });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Room does not belong to that property");
  });

  it("rejects an unknown room id", () => {
    const r = validateManualBlockInput({ property: COLIVING, room: undefined, roomId: "ghost" });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Room not found");
  });

  it("rejects an unknown property", () => {
    const r = validateManualBlockInput({ property: undefined, room: undefined, roomId: null });
    expect(r.ok).toBe(false);
    expect(r.message).toBe("Property not found");
  });
});

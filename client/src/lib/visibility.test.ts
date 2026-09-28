// client/src/lib/visibility.test.ts
// Guest-facing inventory visibility. A room that is off the market never renders
// in the property's room list; during a dated search, rooms and listings that
// are not free for the searched range are dropped (not merely greyed out).

import { describe, it, expect } from "vitest";
import { visibleRooms, visibleProperties } from "./visibility";

const rooms = [
  { id: "a", status: "AVAILABLE", availableForDates: true },
  { id: "b", status: "OCCUPIED", availableForDates: false },
  { id: "c", status: "MAINTENANCE", availableForDates: true },
  { id: "d", status: "HOLD", availableForDates: true },
  { id: "e", status: "INACTIVE", availableForDates: true },
  { id: "f", status: "OCCUPIED", availableForDates: true },
];

describe("visibleRooms", () => {
  it("always hides HOLD / MAINTENANCE / INACTIVE rooms", () => {
    expect(visibleRooms(rooms, false).map((r) => r.id)).toEqual(["a", "b", "f"]);
  });
  it("during a dated search also hides rooms that are not free for the dates", () => {
    expect(visibleRooms(rooms, true).map((r) => r.id)).toEqual(["a", "f"]);
  });
});

describe("visibleProperties", () => {
  // inquiryOnly is set by the server projection (shared/publicProjection.ts):
  // true for LTR listings and for placeholders, both of which have no bookable
  // availability and so must survive a dated search. p5 is a placeholder
  // co-living house — same exemption, different reason.
  const props = [
    { id: "p1", type: "COLIVING", availableForDates: true, inquiryOnly: false },
    { id: "p2", type: "COLIVING", availableForDates: false, inquiryOnly: false },
    { id: "p3", type: "STR", availableForDates: false, inquiryOnly: false },
    { id: "p4", type: "LTR", availableForDates: false, inquiryOnly: true },
    { id: "p5", type: "COLIVING", availableForDates: false, inquiryOnly: true },
  ];
  it("keeps every listing when no dates are searched (next-opening cards stay visible)", () => {
    expect(visibleProperties(props, false).map((p) => p.id)).toEqual([
      "p1", "p2", "p3", "p4", "p5",
    ]);
  });
  it("drops listings unavailable for a dated search, inquiry-only ones excepted", () => {
    expect(visibleProperties(props, true).map((p) => p.id)).toEqual(["p1", "p4", "p5"]);
  });
});

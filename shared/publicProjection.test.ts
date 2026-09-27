// shared/publicProjection.test.ts
// What leaves the building. The public endpoints used to return the raw DB row,
// which shipped the tokenized Airbnb iCal URL and the internal prior_names tag
// list to anyone who called /api/properties. These tests are the regression
// fence: if a future change reintroduces a raw-row response, or adds a secret
// column to the public whitelist, they fail.

import { describe, it, expect } from "vitest";
import { toPublicProperty, toPublicRoom } from "./publicProjection";
import type { Property, Room } from "./schema";

const FULL_PROPERTY = {
  id: "p1",
  name: "Old Bill Cook",
  location: "Atlanta",
  type: "COLIVING",
  entity: "BNP",
  description: "A house",
  listingContent: null,
  photos: ["a.jpg"],
  amenities: ["Wifi"],
  basePrice: null,
  cleaningFee: "0",
  dailyRate: null,
  weeklyRate: null,
  biweeklyRate: null,
  monthlyRate: null,
  downPayment: null,
  monPrice: null,
  tuePrice: null,
  wedPrice: null,
  thuPrice: null,
  friPrice: null,
  satPrice: null,
  sunPrice: null,
  address: "1 Main St",
  priorNames: ["market-test-2026-09", "src:zillow:6187957"],
  airbnbListingRoomId: "12345",
  airbnbIcalUrl: "https://airbnb.com/calendar/ical/secret-token.ics",
  active: true,
  isPlaceholder: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as unknown as Property;

const FULL_ROOM = {
  id: "r1",
  propertyId: "p1",
  name: "Room 2 - Garden",
  roomNumber: "2",
  description: null,
  listingContent: null,
  photos: [],
  weeklyRent: "350",
  depositAmount: "500",
  cleaningFee: "0",
  dailyRate: null,
  biweeklyRate: null,
  monthlyRate: null,
  status: "AVAILABLE",
  address: null,
  priorNames: ["market-test-2026-09"],
  airbnbListingRoomId: "67890",
  airbnbIcalUrl: "https://airbnb.com/calendar/ical/room-token.ics",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
} as unknown as Room;

const WITHHELD = ["airbnbIcalUrl", "airbnbListingRoomId", "priorNames"];

describe("toPublicProperty", () => {
  it("withholds the tokenized iCal URL, the OTA mapping, and the internal tags", () => {
    const pub = toPublicProperty(FULL_PROPERTY) as Record<string, unknown>;
    for (const key of WITHHELD) expect(pub).not.toHaveProperty(key);
  });

  it("never tells the browser a listing is a placeholder", () => {
    const pub = toPublicProperty({ ...FULL_PROPERTY, isPlaceholder: true }) as Record<string, unknown>;
    expect(pub).not.toHaveProperty("isPlaceholder");
  });

  it("keeps everything the listing page actually renders", () => {
    const pub = toPublicProperty(FULL_PROPERTY);
    expect(pub.id).toBe("p1");
    expect(pub.name).toBe("Old Bill Cook");
    expect(pub.location).toBe("Atlanta");
    expect(pub.photos).toEqual(["a.jpg"]);
    expect(pub.address).toBe("1 Main St");
  });

  it("exposes placeholder-ness only as the neutral inquiryOnly flag", () => {
    expect(toPublicProperty({ ...FULL_PROPERTY, isPlaceholder: true }).inquiryOnly).toBe(true);
    expect(toPublicProperty({ ...FULL_PROPERTY, type: "LTR" }).inquiryOnly).toBe(true);
    expect(toPublicProperty(FULL_PROPERTY).inquiryOnly).toBe(false);
  });

  it("emits exactly the whitelisted keys — nothing rides along", () => {
    const keys = Object.keys(toPublicProperty(FULL_PROPERTY)).sort();
    expect(keys).toEqual(
      [
        "id", "name", "location", "type", "entity", "description", "listingContent",
        "photos", "amenities", "basePrice", "cleaningFee", "dailyRate", "weeklyRate",
        "biweeklyRate", "monthlyRate", "downPayment", "monPrice", "tuePrice", "wedPrice",
        "thuPrice", "friPrice", "satPrice", "sunPrice", "address", "active",
        "createdAt", "updatedAt", "inquiryOnly",
      ].sort(),
    );
  });
});

describe("toPublicRoom", () => {
  it("withholds the tokenized iCal URL, the OTA mapping, and the internal tags", () => {
    const pub = toPublicRoom(FULL_ROOM) as Record<string, unknown>;
    for (const key of WITHHELD) expect(pub).not.toHaveProperty(key);
  });

  it("keeps the fields the room card and booking panel price from", () => {
    const pub = toPublicRoom(FULL_ROOM);
    expect(pub.weeklyRent).toBe("350");
    expect(pub.depositAmount).toBe("500");
    expect(pub.status).toBe("AVAILABLE");
    expect(pub.propertyId).toBe("p1");
  });
});

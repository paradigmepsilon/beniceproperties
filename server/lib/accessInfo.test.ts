// server/lib/accessInfo.test.ts
// Every credential in this file is SYNTHETIC. The central property under test is
// that a real code reaches the guest's email and NOTHING else — not the audit
// log, not an admin alert, not a "missing fields" message.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getPropertyAccessInfo: vi.fn(),
  getRoomAccessInfo: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import {
  resolveStayAccessInfo,
  missingAccessFields,
  hasWelcomeInfo,
  renderAccessInfoText,
  renderAccessInfoRedacted,
  type StayAccessInfo,
} from "./accessInfo";
import type { BookingGate, Property, Room } from "@shared/schema";

const DOOR = "1357";
const WIFI_PW = "synthetic-pw-42";
const GATE_CODE = "9042";

const gate = (over: Partial<BookingGate> = {}) => ({ doorCode: DOOR, ...over }) as BookingGate;
const property = { id: "p1", name: "Old Bill Cook" } as Property;
const room = { id: "r1", name: "Garden", roomNumber: "2" } as Room;

const FULL_PROPERTY_INFO = {
  wifiSsid: "BNP-Guest",
  wifiPassword: WIFI_PW,
  buildingEntry: GATE_CODE,
  directions: "Off Highway 5, third driveway on the right.",
  parking: "Two spaces in the drive.",
  checkInFrom: "4:00 PM",
  checkOutBy: "11:00 AM",
};

const info = (over: Partial<StayAccessInfo> = {}): StayAccessInfo => ({
  doorCode: DOOR,
  wifiSsid: "BNP-Guest",
  wifiPassword: WIFI_PW,
  buildingEntry: GATE_CODE,
  directions: "Off Highway 5.",
  parking: null,
  roomFinding: "Upstairs, second door on the left.",
  checkInFrom: "4:00 PM",
  checkOutBy: "11:00 AM",
  notes: null,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getPropertyAccessInfo.mockResolvedValue(FULL_PROPERTY_INFO);
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs, second on the left." });
});

describe("resolveStayAccessInfo", () => {
  it("composes per-booking, per-property and per-room sources", async () => {
    const resolved = await resolveStayAccessInfo({ gate: gate(), property, room });
    expect(resolved.doorCode).toBe(DOOR); // booking
    expect(resolved.wifiSsid).toBe("BNP-Guest"); // property
    expect(resolved.roomFinding).toBe("Upstairs, second on the left."); // room
  });

  it("never queries room info for a whole-property stay", async () => {
    const resolved = await resolveStayAccessInfo({ gate: gate(), property, room: null });
    expect(mockStorage.getRoomAccessInfo).not.toHaveBeenCalled();
    expect(resolved.roomFinding).toBeNull();
  });

  it("is all-null when nothing has been configured, and never throws", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue(undefined);
    mockStorage.getRoomAccessInfo.mockResolvedValue(undefined);
    const resolved = await resolveStayAccessInfo({ gate: null, property, room });
    expect(resolved.doorCode).toBeNull();
    expect(resolved.wifiSsid).toBeNull();
    expect(resolved.directions).toBeNull();
  });

  // An operator who types a space into a field must not create a "configured"
  // property whose welcome letter then renders "Door code:  ".
  it("treats whitespace-only values as absent", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({ wifiSsid: "   ", directions: "\n\t" });
    const resolved = await resolveStayAccessInfo({ gate: gate({ doorCode: "  " }), property, room: null });
    expect(resolved.doorCode).toBeNull();
    expect(resolved.wifiSsid).toBeNull();
    expect(resolved.directions).toBeNull();
  });
});

describe("missingAccessFields — names fields, never values", () => {
  it("is empty when everything required is set", () => {
    expect(missingAccessFields(info())).toEqual([]);
    expect(hasWelcomeInfo(info())).toBe(true);
  });

  it("names each blank required field", () => {
    expect(missingAccessFields(info({ doorCode: null }))).toEqual(["doorCode"]);
    expect(missingAccessFields(info({ wifiSsid: null, directions: null }))).toEqual([
      "wifiSsid",
      "directions",
    ]);
  });

  it("does not require a wifi password — plenty of guest networks are open", () => {
    expect(missingAccessFields(info({ wifiPassword: null }))).toEqual([]);
  });

  // THE assertion that lets an escalation be raised safely: the output is field
  // names, so an admin alert built from it cannot leak a code that IS set.
  it("returns no credential VALUES, so an alert built from it leaks nothing", () => {
    const missing = missingAccessFields(info({ directions: null })).join(", ");
    expect(missing).toBe("directions");
    for (const secret of [DOOR, WIFI_PW, GATE_CODE]) {
      expect(missing).not.toContain(secret);
    }
  });

  describe("when no per-booking door code is required (STR pre-arrival)", () => {
    it("accepts a standing building entry code as the way in", () => {
      expect(
        missingAccessFields(info({ doorCode: null }), { requireDoorCode: false }),
      ).toEqual([]);
    });

    it("still insists SOME way in exists", () => {
      expect(
        missingAccessFields(info({ doorCode: null, buildingEntry: null }), {
          requireDoorCode: false,
        }),
      ).toEqual(["doorCode"]);
    });
  });
});

describe("renderAccessInfoText — the email body", () => {
  it("includes the real credentials the guest needs", () => {
    const text = renderAccessInfoText(info());
    expect(text).toContain(`Door code: ${DOOR}`);
    expect(text).toContain(WIFI_PW);
    expect(text).toContain(GATE_CODE);
    expect(text).toContain("Upstairs, second door on the left.");
  });

  it("omits absent fields entirely rather than printing empty labels", () => {
    const text = renderAccessInfoText(info({ parking: null, wifiPassword: null, notes: null }));
    expect(text).not.toContain("Parking:");
    expect(text).not.toContain("password");
    expect(text).toContain("Wi-Fi: BNP-Guest");
  });

  it("is empty, not malformed, when nothing is configured", () => {
    const blank: StayAccessInfo = {
      doorCode: null, wifiSsid: null, wifiPassword: null, buildingEntry: null,
      directions: null, parking: null, roomFinding: null, checkInFrom: null,
      checkOutBy: null, notes: null,
    };
    expect(renderAccessInfoText(blank)).toBe("");
  });
});

describe("renderAccessInfoRedacted — the audit copy", () => {
  // The owner's decision is that message_log may hold the real code, since access
  // codes are managed in UO anyway. This redacted form still exists because logs,
  // Telegram and SMS are a different exposure: Telegram is a third party and log
  // retention sits outside both systems.
  it("strips every credential value", () => {
    const redacted = renderAccessInfoRedacted(info());
    for (const secret of [DOOR, WIFI_PW, GATE_CODE]) {
      expect(redacted).not.toContain(secret);
    }
  });

  it("keeps the non-secret context, so the record is still useful", () => {
    const redacted = renderAccessInfoRedacted(info());
    expect(redacted).toContain("Wi-Fi: BNP-Guest");
    expect(redacted).toContain("Off Highway 5.");
    expect(redacted).toContain("Checkout by: 11:00 AM");
    expect(redacted).toContain("[redacted]");
  });

  it("does not invent a redaction marker for a field that was never set", () => {
    const redacted = renderAccessInfoRedacted(info({ buildingEntry: null, wifiPassword: null }));
    expect(redacted).not.toContain("Building/gate entry");
    expect(redacted).toContain("Wi-Fi: BNP-Guest");
    expect(redacted).not.toContain("password");
  });

  it("redacts exactly the three credential fields and nothing else", () => {
    const plain = renderAccessInfoText(info());
    const redacted = renderAccessInfoRedacted(info());
    expect(plain.split("\n")).toHaveLength(redacted.split("\n").length);
    expect((redacted.match(/\[redacted\]/g) ?? [])).toHaveLength(3);
  });
});

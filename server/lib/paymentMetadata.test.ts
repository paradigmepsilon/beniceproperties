// server/lib/paymentMetadata.test.ts
// Phase 4 — the Stripe Metadata Contract. A charge with incomplete metadata is a
// bug, so these tests lock the contract: every key present, correct product_type
// mapping, multi-room comma-join, null serialized as "null", and the guard.

import { describe, it, expect } from "vitest";
import {
  buildLeaseChargeMetadata,
  buildStrChargeMetadata,
  assertCompleteMetadata,
  productTypeFor,
  REQUIRED_METADATA_KEYS,
} from "./paymentMetadata";

const PROP = { id: "prop-1", name: "Old Bill Cook", type: "COLIVING" as const };
const STR_PROP = { id: "prop-2", name: "Antigua Villa", type: "STR" as const };

describe("productTypeFor", () => {
  it("maps DB types to the contract product_type", () => {
    expect(productTypeFor({ type: "COLIVING" })).toBe("COLIVING_ROOM");
    expect(productTypeFor({ type: "STR" })).toBe("STR_WHOLE");
  });
});

describe("buildLeaseChargeMetadata", () => {
  it("populates every contract key for a single-room lease", () => {
    const meta = buildLeaseChargeMetadata({
      entity: "BNP",
      property: PROP,
      lease: { id: "lease-1" },
      rooms: [{ roomId: "r1", roomNameSnapshot: "Room 2 - Garden", roomNumberSnapshot: "2" }],
      paymentKind: "FIRST_PAYMENT",
      scheduleSeq: 1,
    });
    expect(meta).toMatchObject({
      entity: "BNP",
      product_type: "COLIVING_ROOM",
      property_id: "prop-1",
      property_name: "Old Bill Cook",
      room_id: "r1",
      room_name: "Room 2 - Garden",
      room_number: "2",
      lease_id: "lease-1",
      payment_kind: "FIRST_PAYMENT",
      schedule_seq: "1",
    });
    // No key may be missing or empty.
    expect(() => assertCompleteMetadata(meta)).not.toThrow();
  });

  it("comma-joins room fields for a multi-room lease", () => {
    const meta = buildLeaseChargeMetadata({
      entity: "BNP",
      property: PROP,
      lease: { id: "lease-1" },
      rooms: [
        { roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: "1" },
        { roomId: "r2", roomNameSnapshot: "Room 2", roomNumberSnapshot: "2" },
      ],
      paymentKind: "SCHEDULED_RENT",
      scheduleSeq: 3,
    });
    expect(meta.room_id).toBe("r1,r2");
    expect(meta.room_name).toBe("Room 1,Room 2");
    expect(meta.room_number).toBe("1,2");
    expect(meta.schedule_seq).toBe("3");
  });

  it("serializes a null schedule_seq as the string 'null'", () => {
    const meta = buildLeaseChargeMetadata({
      entity: "BNP",
      property: PROP,
      lease: { id: "" }, // legacy deposit path: no lease row
      rooms: [{ roomId: "r1", roomNameSnapshot: "Room 1", roomNumberSnapshot: null }],
      paymentKind: "BOOKING_DEPOSIT",
      scheduleSeq: null,
    });
    expect(meta.schedule_seq).toBe("null");
    expect(meta.lease_id).toBe("null"); // empty string → "null", never missing
    // A single room with a null number joins to "" then serializes to "null",
    // so the key is always present and the completeness guard passes.
    expect(meta.room_number).toBe("null");
    expect(() => assertCompleteMetadata(meta)).not.toThrow();
  });
});

describe("buildStrChargeMetadata", () => {
  it("nulls room + lease + schedule for a whole-property charge", () => {
    const meta = buildStrChargeMetadata({
      entity: "TRAD",
      property: STR_PROP,
      paymentKind: "BOOKING_DEPOSIT",
    });
    expect(meta).toMatchObject({
      entity: "TRAD",
      product_type: "STR_WHOLE",
      property_id: "prop-2",
      room_id: "null",
      room_name: "null",
      room_number: "null",
      lease_id: "null",
      schedule_seq: "null",
      payment_kind: "BOOKING_DEPOSIT",
    });
    expect(() => assertCompleteMetadata(meta)).not.toThrow();
  });
});

describe("assertCompleteMetadata", () => {
  it("throws when a required key is missing", () => {
    const partial: Record<string, string> = { entity: "BNP", product_type: "STR_WHOLE" };
    expect(() => assertCompleteMetadata(partial)).toThrow(/incomplete/i);
  });

  it("throws when a required key is empty", () => {
    const meta: Record<string, string> = {};
    for (const k of REQUIRED_METADATA_KEYS) meta[k] = "x";
    meta.property_id = "";
    expect(() => assertCompleteMetadata(meta)).toThrow(/property_id/);
  });
});

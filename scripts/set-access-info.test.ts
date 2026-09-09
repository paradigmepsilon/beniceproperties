// scripts/set-access-info.test.ts
// The script runs against the live Neon database by an owner, never by a test.
// What IS pinned here: its validation mirrors the Zod schemas in shared/schema.ts
// (so it cannot write a shape the API would reject), its merge/clear semantics,
// and — the load-bearing one — that it can never print a wifi password or an
// entry code, even in a dry run.

import { readFileSync } from "node:fs";
import { describe, it, expect, vi } from "vitest";

// accessInfo imports the storage layer, which opens a DB at import time.
vi.mock("../server/storage", () => ({ storage: {} }));
import { propertyAccessInfoSchema, roomAccessInfoSchema, SENSITIVE_ACCESS_FIELDS } from "@shared/schema";
import { REQUIRED_WELCOME_FIELDS } from "../server/lib/accessInfo";
import {
  PROPERTY_FIELDS,
  ROOM_FIELDS,
  REQUIRED_PROPERTY_FIELDS,
  SENSITIVE_FIELDS,
  validateInfo,
  mergeInfo,
  missingRequired,
  describeKeys,
} from "./set-access-info.mjs";

describe("the allowlist mirrors shared/schema.ts", () => {
  it("accepts exactly the keys the API accepts", () => {
    const propKeys = Object.keys(PROPERTY_FIELDS).sort();
    const roomKeys = Object.keys(ROOM_FIELDS).sort();
    // A full-length value at every key must pass the real Zod schema…
    const maxProp = Object.fromEntries(propKeys.map((k) => [k, "x".repeat(PROPERTY_FIELDS[k as keyof typeof PROPERTY_FIELDS])]));
    const maxRoom = Object.fromEntries(roomKeys.map((k) => [k, "x".repeat(ROOM_FIELDS[k as keyof typeof ROOM_FIELDS])]));
    expect(propertyAccessInfoSchema.safeParse(maxProp).success).toBe(true);
    expect(roomAccessInfoSchema.safeParse(maxRoom).success).toBe(true);
    // …and one char over must fail it, proving the limits match.
    for (const k of propKeys) {
      const over = { ...maxProp, [k]: maxProp[k] + "x" };
      expect(propertyAccessInfoSchema.safeParse(over).success, k).toBe(false);
      expect(() => validateInfo(over, PROPERTY_FIELDS, "t"), k).toThrow(/max/);
    }
    // Strict on both sides: a key the script allows must be one Zod allows.
    expect(propertyAccessInfoSchema.safeParse({ ...maxProp, bogus: "x" }).success).toBe(false);
    expect(() => validateInfo({ bogus: "x" }, PROPERTY_FIELDS, "t")).toThrow(/unknown field/);
  });

  it("required + sensitive lists match the server's", () => {
    // Door code is per-booking; every OTHER required welcome field is a property field.
    expect([...REQUIRED_PROPERTY_FIELDS].sort()).toEqual(
      REQUIRED_WELCOME_FIELDS.filter((f) => f !== "doorCode").sort(),
    );
    expect([...SENSITIVE_FIELDS].sort()).toEqual([...SENSITIVE_ACCESS_FIELDS].sort());
  });
});

describe("validation and merge", () => {
  it("trims, rejects non-strings, keeps '' as an explicit clear", () => {
    expect(validateInfo({ wifiSsid: "  Net  ", notes: "" }, PROPERTY_FIELDS, "t")).toEqual({
      wifiSsid: "Net",
      notes: "",
    });
    expect(() => validateInfo({ wifiSsid: 5 }, PROPERTY_FIELDS, "t")).toThrow(/string/);
    expect(() => validateInfo([], PROPERTY_FIELDS, "t")).toThrow(/object/);
  });

  it("merges over the existing row and '' removes a key", () => {
    const existing = { wifiSsid: "Old", wifiPassword: "keep-me", parking: "street" };
    expect(mergeInfo(existing, { wifiSsid: "New", parking: "" })).toEqual({
      wifiSsid: "New",
      wifiPassword: "keep-me",
    });
    expect(mergeInfo(undefined, { directions: "x" })).toEqual({ directions: "x" });
  });

  it("reports missing required fields by NAME only", () => {
    expect(missingRequired({})).toEqual(["wifiSsid", "directions"]);
    expect(missingRequired({ wifiSsid: "Net", directions: "Turn left" })).toEqual([]);
    expect(missingRequired({ wifiSsid: "", directions: "x" })).toEqual(["wifiSsid"]);
  });
});

describe("no value of a sensitive field can be printed", () => {
  it("describeKeys names sensitive keys without their values", () => {
    const out = describeKeys({ wifiPassword: "hunter2", buildingEntry: "9042", wifiSsid: "Net" });
    expect(out).not.toContain("hunter2");
    expect(out).not.toContain("9042");
    expect(out).toContain("wifiPassword(set, hidden)");
    expect(out).toContain("buildingEntry(set, hidden)");
    expect(out).toContain("wifiSsid");
    expect(describeKeys({})).toBe("(none)");
  });

  it("every console.log in the script prints keys via describeKeys, never a value", () => {
    const src = readFileSync(new URL("./set-access-info.mjs", import.meta.url), "utf8");
    for (const m of src.matchAll(/console\.(log|error)\(([\s\S]{0,400}?)\);/g)) {
      expect(m[2], m[2].slice(0, 80)).not.toMatch(/\bwifiPassword\b|\bbuildingEntry\b|\.info\b|merged\b(?!\))/);
      expect(m[2]).not.toMatch(/JSON\.stringify/);
    }
  });
});

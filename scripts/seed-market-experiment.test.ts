// scripts/seed-market-experiment.test.ts
// The seed runs against the live Neon database by an owner, never by a test.
// What IS pinned here: the data file is valid under the script's own checks,
// every property/room in it passes the REAL Zod insert schemas from
// shared/schema.ts (so the script can never write a row the API would reject),
// the rate tiers follow the production convention, the owner tag is present on
// every row, every icon is one the listing story renders, and every photo the
// data references is spelled consistently.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { insertPropertySchema, insertRoomSchema } from "@shared/schema";
import {
  DEFAULT_FILE,
  KNOWN_ICONS,
  derivedTiers,
  validateData,
  referencedPhotoFiles,
  parseArgs,
  r2KeyFor,
} from "./seed-market-experiment.mjs";

const data = JSON.parse(readFileSync(DEFAULT_FILE, "utf8"));

describe("market_experiment_2026_09.json", () => {
  it("passes the script's validation with zero problems", () => {
    expect(validateData(data)).toEqual([]);
  });

  it("is six co-living properties with rooms, each tagged for the owner", () => {
    expect(data.properties).toHaveLength(6);
    for (const p of data.properties) {
      expect(p.rooms.length).toBeGreaterThan(0);
      expect(p.ownerTags).toContain(data.tag);
      expect(p.ownerTags.some((t: string) => t.startsWith("src:zillow:"))).toBe(true);
      expect(p.address).toMatch(/, (NC|SC|FL) \d{5}$/);
    }
  });

  it("every property row satisfies insertPropertySchema exactly as the script writes it", () => {
    for (const p of data.properties) {
      const row = {
        name: p.name,
        location: p.location,
        type: "COLIVING",
        entity: "BNP",
        description: p.description,
        listingContent: p.listingContent,
        photos: [],
        address: p.address,
        priorNames: p.ownerTags,
        basePrice: null,
        cleaningFee: "0",
        active: true,
      };
      const res = insertPropertySchema.safeParse(row);
      expect(res.success, `${p.name}: ${JSON.stringify(res.success ? null : res.error.issues)}`).toBe(true);
    }
  });

  it("every room row satisfies insertRoomSchema exactly as the script writes it", () => {
    for (const p of data.properties) {
      for (const r of p.rooms) {
        const row = {
          propertyId: "00000000-0000-0000-0000-000000000000",
          name: r.name,
          roomNumber: r.roomNumber,
          description: r.description,
          listingContent: r.listingContent,
          photos: [],
          weeklyRent: r.weeklyRent,
          depositAmount: r.depositAmount,
          cleaningFee: r.cleaningFee,
          dailyRate: r.dailyRate,
          monthlyRate: r.monthlyRate,
          priorNames: p.ownerTags,
          status: "AVAILABLE",
        };
        const res = insertRoomSchema.safeParse(row);
        expect(res.success, `${p.name} / ${r.name}: ${JSON.stringify(res.success ? null : res.error.issues)}`).toBe(true);
      }
    }
  });

  it("rate tiers follow production: monthly = weekly x 4, daily = round(weekly / 7), deposit $200, cleaning $0", () => {
    for (const p of data.properties) {
      for (const r of p.rooms) {
        const t = derivedTiers(r.weeklyRent);
        expect(Number(r.monthlyRate)).toBe(t.monthly);
        expect(Number(r.dailyRate)).toBe(t.daily);
        expect(r.depositAmount).toBe("200.00");
        expect(r.cleaningFee).toBe("0.00");
        // weekly is the model's monthly / 4 rounded to $5 — never more than $10/mo off the model
        expect(Math.abs(r.pricing.modelMonthly - Number(r.monthlyRate))).toBeLessThanOrEqual(10);
        expect(r.pricing.base + r.pricing.roomPremium + r.pricing.propertyPremium).toBe(r.pricing.modelMonthly);
      }
    }
  });

  it("uses only icons the listing story renders", () => {
    const icons = new Set<string>();
    for (const p of data.properties) {
      for (const e of p.listingContent?.essentials ?? []) if (e.icon) icons.add(e.icon);
      for (const r of p.rooms) for (const e of r.listingContent?.essentials ?? []) if (e.icon) icons.add(e.icon);
    }
    for (const i of icons) expect(KNOWN_ICONS).toContain(i);
  });

  it("references photo files with a consistent naming scheme", () => {
    const files = referencedPhotoFiles(data);
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(f).toMatch(/^[a-z]+-\d+\.jpg$/);
  });
});

describe("validateData catches the mistakes that matter", () => {
  const clone = () => JSON.parse(JSON.stringify(data));

  it("rejects a duplicate property name (idempotency key)", () => {
    const d = clone();
    d.properties[1].name = d.properties[0].name;
    expect(validateData(d).some((p: string) => p.includes("duplicate name"))).toBe(true);
  });

  it("rejects a room whose monthly tier drifts from weekly x 4", () => {
    const d = clone();
    d.properties[0].rooms[0].monthlyRate = "999.00";
    expect(validateData(d).some((p: string) => p.includes("weekly x 4"))).toBe(true);
  });

  it("rejects a property missing the owner tag", () => {
    const d = clone();
    d.properties[0].ownerTags = ["something-else"];
    expect(validateData(d).some((p: string) => p.includes("ownerTags"))).toBe(true);
  });

  it("rejects an unknown essentials icon", () => {
    const d = clone();
    d.properties[0].listingContent.essentials[0].icon = "hot-tub";
    expect(validateData(d).some((p: string) => p.includes("unknown"))).toBe(true);
  });
});

describe("CLI safety", () => {
  it("defaults to a dry run with no DB flags set", () => {
    const a = parseArgs([]);
    expect(a.apply).toBe(false);
    expect(a.list).toBe(false);
    expect(a.remove).toBe(false);
    expect(a.photos).toBe(false);
  });

  it("refuses --apply together with --remove", () => {
    expect(() => parseArgs(["--apply", "--remove"])).toThrow();
  });

  it("writes photo keys in the shape production already uses", () => {
    expect(r2KeyFor("properties", "thomas-1.jpg")).toMatch(/^bnp\/properties\/[0-9a-f-]{36}\.jpg$/);
    expect(r2KeyFor("rooms", "x.PNG")).toMatch(/^bnp\/rooms\/[0-9a-f-]{36}\.png$/);
  });
});

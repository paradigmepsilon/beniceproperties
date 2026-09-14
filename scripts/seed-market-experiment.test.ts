// scripts/seed-market-experiment.test.ts
// The seed runs against the live Neon database by an owner, never by a test.
// What IS pinned here: the data file is valid under the script's own checks,
// every property/room in it passes the REAL Zod insert schemas from
// shared/schema.ts (so the script can never write a row the API would reject),
// the rate tiers follow the production convention, the owner tag is present on
// every row, every icon is one the listing story renders, and every photo the
// data references is spelled consistently.

import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
  loadR2Env,
  r2PublicBase,
  todayEt,
  DEFAULT_CLOSE_UNTIL,
  CLOSE_NOTE,
} from "./seed-market-experiment.mjs";
import { MANUAL_BLOCK_KINDS, MANUAL_BLOCK_SOURCES, insertManualBlockSchema } from "@shared/schema";

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

  it("--close and --open are modes of their own and exclude each other", () => {
    expect(parseArgs(["--close"]).close).toBe(true);
    expect(parseArgs(["--close"]).until).toBe(DEFAULT_CLOSE_UNTIL);
    expect(parseArgs(["--close", "--until", "2027-06-01"]).until).toBe("2027-06-01");
    expect(parseArgs(["--open"]).open).toBe(true);
    expect(() => parseArgs(["--close", "--open"])).toThrow(/exclusive/);
    expect(() => parseArgs(["--close", "--apply"])).toThrow(/exclusive/);
  });

  it("--until must be a real date after today", () => {
    expect(() => parseArgs(["--close", "--until", "next-year"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseArgs(["--close", "--until", "2026-13-40"])).toThrow(/YYYY-MM-DD/);
    expect(() => parseArgs(["--close", "--until", "2020-01-01"])).toThrow(/after today/);
    expect(() => parseArgs(["--close", "--until", todayEt()])).toThrow(/after today/);
  });

  it("todayEt is a YYYY-MM-DD in America/New_York", () => {
    expect(todayEt()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    // 03:30 UTC on the 15th is still the 14th in New York.
    expect(todayEt(new Date("2026-09-15T03:30:00Z"))).toBe("2026-09-14");
    expect(todayEt(new Date("2026-09-15T12:00:00Z"))).toBe("2026-09-15");
  });

  it("the block --close writes is one the admin API would accept", () => {
    const row = {
      propertyId: "00000000-0000-0000-0000-000000000000",
      roomId: "00000000-0000-0000-0000-000000000001",
      startDate: todayEt(),
      endDate: DEFAULT_CLOSE_UNTIL,
      kind: "OTHER",
      note: CLOSE_NOTE,
      source: "ADMIN",
      createdBy: "market-test-2026-09",
    };
    expect(insertManualBlockSchema.safeParse(row).success).toBe(true);
    expect(MANUAL_BLOCK_KINDS).toContain("OTHER");
    expect(MANUAL_BLOCK_SOURCES).toContain("ADMIN");
    expect(DEFAULT_CLOSE_UNTIL > todayEt()).toBe(true);
  });

  it("writes photo keys in the shape production already uses", () => {
    expect(r2KeyFor("properties", "thomas-1.jpg")).toMatch(/^bnp\/properties\/[0-9a-f-]{36}\.jpg$/);
    expect(r2KeyFor("rooms", "x.PNG")).toMatch(/^bnp\/rooms\/[0-9a-f-]{36}\.png$/);
  });
});

describe("--r2-env reads ONLY the R2 keys from another env file", () => {
  const dir = mkdtempSync(join(tmpdir(), "bnp-r2env-"));
  const file = join(dir, "other.env");
  writeFileSync(
    file,
    [
      "# comment",
      "DATABASE_URL=postgres://someone-elses-db",
      'R2_ACCOUNT_ID="acct"',
      "R2_ACCESS_KEY_ID=key",
      "R2_SECRET_ACCESS_KEY='secret'",
      "R2_BUCKET_NAME=unified-ops",
      "R2_PUBLIC_URL_BASE=https://pub-example.r2.dev/",
      "STRIPE_SECRET_KEY=sk_test_nope",
      "",
    ].join("\n"),
  );

  it("loads the R2 keys, unquoted, and nothing else", () => {
    const env: Record<string, string> = {};
    const loaded = loadR2Env(file, env);
    expect(loaded.sort()).toEqual(["R2_ACCESS_KEY_ID", "R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_PUBLIC_URL_BASE", "R2_SECRET_ACCESS_KEY"]);
    expect(env.R2_ACCOUNT_ID).toBe("acct");
    expect(env.R2_SECRET_ACCESS_KEY).toBe("secret");
    expect(env.DATABASE_URL).toBeUndefined();
    expect(env.STRIPE_SECRET_KEY).toBeUndefined();
  });

  it("never overrides a value already in the environment", () => {
    const env: Record<string, string> = { R2_BUCKET_NAME: "already-set" };
    loadR2Env(file, env);
    expect(env.R2_BUCKET_NAME).toBe("already-set");
  });

  it("accepts UO's R2_PUBLIC_URL_BASE spelling and strips the trailing slash", () => {
    const env: Record<string, string> = {};
    loadR2Env(file, env);
    expect(r2PublicBase(env)).toBe("https://pub-example.r2.dev");
    expect(r2PublicBase({ R2_PUBLIC_BASE_URL: "https://x.example//" })).toBe("https://x.example");
    expect(r2PublicBase({})).toBe("");
  });

  it("fails loudly on a missing file", () => {
    expect(() => loadR2Env(join(dir, "nope.env"), {})).toThrow(/not found/);
  });
});

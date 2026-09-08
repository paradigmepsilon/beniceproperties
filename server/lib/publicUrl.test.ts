// server/lib/publicUrl.test.ts
// One origin for every guest-facing link. Guards the trailing-slash bug and the
// preview-links-to-production bug.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { publicBaseUrl, lookupUrl, portalUrl } from "./publicUrl";

const SAVED = { ...process.env };
beforeEach(() => {
  delete process.env.PUBLIC_BASE_URL;
  delete process.env.VERCEL_ENV;
  delete process.env.VERCEL_URL;
});
afterEach(() => {
  process.env = { ...SAVED };
});

describe("publicBaseUrl", () => {
  it("uses PUBLIC_BASE_URL when set", () => {
    process.env.PUBLIC_BASE_URL = "http://localhost:5060";
    expect(publicBaseUrl()).toBe("http://localhost:5060");
  });

  it("strips trailing slashes so links never double up", () => {
    process.env.PUBLIC_BASE_URL = "https://staging.example.com//";
    expect(portalUrl({ portalToken: "t".repeat(32) })).toBe(
      `https://staging.example.com/portal/${"t".repeat(32)}`,
    );
  });

  it("a Vercel PREVIEW deploy links to itself, not production", () => {
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_URL = "bnp-abc123.vercel.app";
    expect(publicBaseUrl()).toBe("https://bnp-abc123.vercel.app");
  });

  it("a production deploy ignores VERCEL_URL and uses the canonical host", () => {
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "bnp-abc123.vercel.app";
    expect(publicBaseUrl()).toBe("https://www.beniceproperties.com");
  });

  it("falls back to production when nothing is configured", () => {
    expect(publicBaseUrl()).toBe("https://www.beniceproperties.com");
    expect(lookupUrl()).toBe("https://www.beniceproperties.com/lookup");
  });
});

describe("portalUrl", () => {
  it("builds the portal link from the lease token", () => {
    const token = "a".repeat(32);
    expect(portalUrl({ portalToken: token })).toBe(
      `https://www.beniceproperties.com/portal/${token}`,
    );
  });

  it("falls back to /lookup rather than shipping a dead link", () => {
    expect(portalUrl({ portalToken: null })).toBe("https://www.beniceproperties.com/lookup");
  });
});

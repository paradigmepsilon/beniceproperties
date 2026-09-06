// server/lib/sessionSecret.test.ts
// The admin session cookie must never be signed with the dev fallback in
// production: a known secret lets anyone forge an admin session.

import { describe, it, expect } from "vitest";
import { resolveSessionSecret } from "./sessionSecret";

describe("resolveSessionSecret", () => {
  it("returns the configured secret", () => {
    expect(resolveSessionSecret({ SESSION_SECRET: "abc-123-long-enough-secret", NODE_ENV: "production" })).toBe("abc-123-long-enough-secret");
  });

  it("throws in production when SESSION_SECRET is unset (fail closed, never the dev fallback)", () => {
    expect(() => resolveSessionSecret({ NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
    expect(() => resolveSessionSecret({ SESSION_SECRET: "  ", NODE_ENV: "production" })).toThrow(/SESSION_SECRET/);
  });

  it("falls back to a clearly-marked dev secret outside production", () => {
    expect(resolveSessionSecret({ NODE_ENV: "development" })).toMatch(/dev-only/);
  });
});

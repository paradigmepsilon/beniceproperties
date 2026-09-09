// server/lib/cronAuth.test.ts
import { describe, it, expect } from "vitest";
import { cronAuthFailure } from "./cronAuth";

describe("cronAuthFailure", () => {
  it("fails CLOSED on Vercel when CRON_SECRET is unset", () => {
    expect(cronAuthFailure(undefined, { VERCEL: "1" })).toEqual({
      status: 503,
      message: "CRON_SECRET is not configured",
    });
    // An empty string is "unset" too — Vercel would send no header at all.
    expect(cronAuthFailure("Bearer ", { VERCEL: "1", CRON_SECRET: "" })?.status).toBe(503);
  });

  it("stays open locally when CRON_SECRET is unset", () => {
    expect(cronAuthFailure(undefined, {})).toBeNull();
  });

  it("rejects a missing, malformed, or wrong bearer", () => {
    const env = { CRON_SECRET: "s3cret" };
    expect(cronAuthFailure(undefined, env)?.status).toBe(401);
    expect(cronAuthFailure("s3cret", env)?.status).toBe(401);
    expect(cronAuthFailure("Bearer nope", env)?.status).toBe(401);
    expect(cronAuthFailure("Bearer s3cret-longer", env)?.status).toBe(401);
    expect(cronAuthFailure("Bearer s3cre", env)?.status).toBe(401);
  });

  it("accepts the exact bearer, on Vercel or not", () => {
    expect(cronAuthFailure("Bearer s3cret", { CRON_SECRET: "s3cret" })).toBeNull();
    expect(cronAuthFailure("Bearer s3cret", { CRON_SECRET: "s3cret", VERCEL: "1" })).toBeNull();
  });

  it("never echoes the secret in a failure message", () => {
    const env = { CRON_SECRET: "s3cret" };
    expect(cronAuthFailure("Bearer nope", env)?.message).not.toContain("s3cret");
  });
});

// server/lib/rateLimit.test.ts
// Fixed-window in-memory limiter used on the unauthenticated write routes
// (admin login, PaymentIntent creation, draft-lease creation). Pure clock-driven
// core so the window math is testable without Express.

import { describe, it, expect } from "vitest";
import { createRateLimiter, clientKey } from "./rateLimit";

describe("createRateLimiter", () => {
  it("allows up to `max` hits inside one window, then blocks", () => {
    const rl = createRateLimiter({ windowMs: 60_000, max: 3 });
    const t0 = 1_000_000;
    expect(rl.check("ip1", t0).allowed).toBe(true);
    expect(rl.check("ip1", t0 + 1).allowed).toBe(true);
    expect(rl.check("ip1", t0 + 2).allowed).toBe(true);
    const blocked = rl.check("ip1", t0 + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
    expect(blocked.retryAfterSec).toBeLessThanOrEqual(60);
  });

  it("keys are independent (one client cannot exhaust another's budget)", () => {
    const rl = createRateLimiter({ windowMs: 60_000, max: 1 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 1).allowed).toBe(false);
    expect(rl.check("b", 1).allowed).toBe(true);
  });

  it("resets once the window has elapsed", () => {
    const rl = createRateLimiter({ windowMs: 1_000, max: 1 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("a", 999).allowed).toBe(false);
    expect(rl.check("a", 1_000).allowed).toBe(true);
  });

  it("evicts expired keys so the map cannot grow without bound", () => {
    const rl = createRateLimiter({ windowMs: 1_000, max: 1 });
    for (let i = 0; i < 50; i++) rl.check(`k${i}`, 0);
    rl.check("fresh", 5_000);
    expect(rl.size()).toBe(1);
  });
});

describe("clientKey", () => {
  it("uses the first X-Forwarded-For hop (Vercel/proxy) and falls back to the socket address", () => {
    expect(clientKey({ headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.1" }, socket: { remoteAddress: "10.0.0.1" } })).toBe("203.0.113.9");
    expect(clientKey({ headers: {}, socket: { remoteAddress: "127.0.0.1" } })).toBe("127.0.0.1");
    expect(clientKey({ headers: {}, socket: {} })).toBe("unknown");
  });
});

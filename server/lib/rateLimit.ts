// server/lib/rateLimit.ts
// =============================================================================
// Fixed-window, in-memory rate limiter for the UNAUTHENTICATED write routes:
// admin login (credential stuffing), PaymentIntent creation (Stripe object
// spam against the shared live account), and draft-lease creation (each draft
// holds a room). No dependency, no store — on Vercel this is per-instance, so
// treat it as a brake, not a wall; the DB/Stripe idempotency guards remain the
// real safety. Keys are the client IP (first X-Forwarded-For hop behind the
// proxy, `trust proxy` is on). Expired keys are evicted opportunistically on
// each check so the map cannot grow without bound.
// =============================================================================

import type { Request, Response, NextFunction, RequestHandler } from "express";

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
}

export interface RateCheck {
  allowed: boolean;
  /** Seconds until the window resets (only meaningful when !allowed). */
  retryAfterSec: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

export function createRateLimiter(opts: RateLimiterOptions) {
  const buckets = new Map<string, Bucket>();

  function evict(now: number): void {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }

  return {
    check(key: string, now: number = Date.now()): RateCheck {
      evict(now);
      const b = buckets.get(key);
      if (!b) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      b.count += 1;
      if (b.count > opts.max) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
    size(): number {
      return buckets.size;
    },
  };
}

/** Client identity for limiting: first X-Forwarded-For hop, else the socket. */
export function clientKey(req: {
  headers: Record<string, string | string[] | undefined>;
  socket: { remoteAddress?: string };
}): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

/** Express middleware: 429 + Retry-After once a client exceeds `max` per window. */
export function rateLimit(opts: RateLimiterOptions & { message?: string }): RequestHandler {
  const limiter = createRateLimiter(opts);
  return (req: Request, res: Response, next: NextFunction) => {
    const result = limiter.check(clientKey(req));
    if (result.allowed) return next();
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ message: opts.message ?? "Too many requests — please try again shortly." });
  };
}

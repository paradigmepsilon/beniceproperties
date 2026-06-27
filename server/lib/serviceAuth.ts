// server/lib/serviceAuth.ts
// =============================================================================
// Service-to-service auth for the UO integration (Phase 8). This app EXPOSES an
// API that Unified Ops consumes; UO authenticates with a shared service token
// sent as `Authorization: Bearer <UO_BNP_API_TOKEN>`. Mirrors UO's existing
// `isInternalRelay` convention. The token lives in env — never committed, never
// logged.
//
// If the token is unset, the API is CLOSED (every request 503) rather than open —
// fail closed, not open. This is the same posture as the Stripe/webhook gating.
// =============================================================================

import type { Request, Response, NextFunction } from "express";

/** Constant-time-ish compare to avoid trivial timing leaks on the token. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function requireServiceToken(req: Request, res: Response, next: NextFunction): void {
  const expected = process.env.UO_BNP_API_TOKEN;
  if (!expected) {
    // Fail closed: no token configured → the integration surface is disabled.
    res.status(503).json({ message: "UO integration is not configured" });
    return;
  }
  const header = req.headers.authorization;
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

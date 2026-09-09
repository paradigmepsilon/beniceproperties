// server/lib/cronAuth.ts
// =============================================================================
// Bearer check for the Vercel Cron entry points (api/cron/sweep, api/cron/
// calendar). Vercel sends `Authorization: Bearer <CRON_SECRET>` on every
// scheduled call when the CRON_SECRET env var is set on the project.
//
// FAIL CLOSED ON VERCEL. The sweep is the endpoint that refunds money (the 72h
// auto-decline), so an unset secret must not leave it world-callable. On any
// Vercel deployment (Vercel injects VERCEL=1) a missing secret is a 503 — the
// cron simply does not run until the owner sets the variable. Local dev with
// no secret stays open so `curl localhost/api/cron/sweep` keeps working.
//
// Constant-time comparison so the header check cannot be timed.
// =============================================================================

import { timingSafeEqual } from "node:crypto";

export interface CronAuthFailure {
  status: 401 | 503;
  message: string;
}

/**
 * `null` when the request may proceed; otherwise the status + message to send.
 * `env` is injectable for tests; defaults to `process.env`.
 */
export function cronAuthFailure(
  authorization: string | undefined,
  env: { CRON_SECRET?: string; VERCEL?: string } = process.env,
): CronAuthFailure | null {
  const secret = env.CRON_SECRET;
  if (!secret) {
    if (env.VERCEL) {
      return { status: 503, message: "CRON_SECRET is not configured" };
    }
    return null;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization ?? "");
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  return ok ? null : { status: 401, message: "Unauthorized" };
}

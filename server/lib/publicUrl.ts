// server/lib/publicUrl.ts
// =============================================================================
// The ONE absolute origin every guest-facing link is built from. Previously
// duplicated verbatim in dunning.ts, lifecycle.ts, verification.ts and twice
// inline in routes.ts — five copies, all silently defaulting to production, so
// a preview or local deploy emailed real guests links to the live site.
// =============================================================================

import type { Lease } from "@shared/schema";

/**
 * Absolute origin for guest-facing links. PUBLIC_BASE_URL wins; a Vercel PREVIEW
 * deploy falls back to its own origin (scoped to `preview` deliberately — on
 * production VERCEL_URL is the per-deployment hostname, which the vercel.json
 * canonical redirect does not cover); otherwise production.
 */
export function publicBaseUrl(): string {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.beniceproperties.com";
}

/** The booking-lookup page, for guests with no lease portal. */
export function lookupUrl(): string {
  return `${publicBaseUrl()}/lookup`;
}

/**
 * The guest's self-serve portal — where they pay any open installment, switch to
 * CashApp/Zelle, and read their schedule. Falls back to /lookup when a lease has
 * no token, so a message never ships a dead link.
 */
export function portalUrl(lease: Pick<Lease, "portalToken">): string {
  return lease.portalToken ? `${publicBaseUrl()}/portal/${lease.portalToken}` : lookupUrl();
}

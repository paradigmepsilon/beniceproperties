// server/integrations/unifiedOps.ts
// =============================================================================
// Unified Ops (UO) rollup push — ISOLATED, STUBBED integration module.
//
// CONTRACT (Pattern B — no shared DB):
//   BNP pushes SANITIZED AGGREGATE rollups UP to Unified Ops. UO exposes the
//   receiving endpoint; BNP POSTs a snapshot. There is no shared database and
//   BNP never writes raw rows into UO.
//
// AUTH: matches UO's existing server-to-server pattern (see Unified-Ops
//   src/lib/api-middleware.ts `isInternalRelay`): a dedicated shared secret sent
//   as `Authorization: Bearer ${UO_SERVICE_TOKEN}`.
//
// STATUS: UO's /api/integration/* surface is documented but NOT YET BUILT
//   (Unified-Ops/docs/specs/Integration_Contract.md). So this module is gated:
//   with UO_PUSH_ENABLED unset/false it performs a DRY RUN — it logs the exact
//   sanitized payload and asserts no forbidden fields are present, but does not
//   make a network call. Flip UO_PUSH_ENABLED=true once UO ships the endpoint.
//
// WHAT MAY CROSS: booking counts, occupancy %, revenue totals, rooms-occupied,
//   upcoming check-ins — AGGREGATES ONLY.
// WHAT MUST NEVER CROSS: cardholder data, full guest PII, raw payment rows,
//   Stripe customer/subscription IDs, guest names/emails/phones.
// =============================================================================

import { log } from "../server-log";

/** The sanitized snapshot shape BNP is allowed to send UO. AGGREGATES ONLY. */
export interface UnifiedOpsSnapshot {
  businessCode: "BNP";
  snapshotDate: string; // YYYY-MM-DD
  bookingCount: number;
  occupancyPct: number;
  revenueTotal: number;
  roomsOccupied: number;
  upcomingCheckIns: number;
}

// Keys that must NEVER appear in a payload bound for UO. Guardrail belt-and-
// suspenders: even if a caller passes a bad object, we refuse to send it.
const FORBIDDEN_KEYS = [
  "name",
  "email",
  "phone",
  "guest",
  "guestId",
  "card",
  "stripeRef",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "paymentIntentId",
];

function assertSanitized(payload: Record<string, unknown>): void {
  const bad = Object.keys(payload).filter((k) =>
    FORBIDDEN_KEYS.some((f) => k.toLowerCase().includes(f.toLowerCase())),
  );
  if (bad.length > 0) {
    throw new Error(
      `[unifiedOps] refusing to push — payload contains forbidden field(s): ${bad.join(", ")}`,
    );
  }
}

/**
 * Push a sanitized snapshot to Unified Ops. Dry-run by default.
 * Returns true if the push (or dry-run) succeeded.
 */
export async function pushSnapshot(snapshot: UnifiedOpsSnapshot): Promise<boolean> {
  assertSanitized(snapshot as unknown as Record<string, unknown>);

  const enabled = process.env.UO_PUSH_ENABLED === "true";
  const endpoint = process.env.UO_ENDPOINT;
  const token = process.env.UO_SERVICE_TOKEN;

  if (!enabled || !endpoint || !token) {
    log(
      `[dry-run] would POST snapshot ${JSON.stringify(snapshot)} (set UO_PUSH_ENABLED=true + UO_ENDPOINT + UO_SERVICE_TOKEN to send)`,
      "unifiedOps",
    );
    return true;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(snapshot),
    });
    if (!res.ok) {
      log(`push failed: ${res.status} ${await res.text()}`, "unifiedOps");
      return false;
    }
    log(`pushed snapshot for ${snapshot.snapshotDate}`, "unifiedOps");
    return true;
  } catch (err) {
    log(`push error: ${(err as Error).message}`, "unifiedOps");
    return false;
  }
}

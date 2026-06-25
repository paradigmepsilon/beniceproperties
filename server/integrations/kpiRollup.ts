// server/integrations/kpiRollup.ts
// =============================================================================
// Build a sanitized KPI snapshot from local aggregates, cache it locally, and
// push it to Unified Ops (dry-run until UO_PUSH_ENABLED=true). AGGREGATES ONLY.
// Called by the scheduler (daily) and exposed for an admin "push now" action.
// =============================================================================

import { storage } from "../storage";
import { pushSnapshot, type UnifiedOpsSnapshot } from "./unifiedOps";
import { log } from "../server-log";

export async function buildAndPushSnapshot(): Promise<UnifiedOpsSnapshot> {
  const agg = await storage.getKpiAggregates();
  const snapshotDate = new Date().toISOString().slice(0, 10);

  // Cache locally before pushing (kpi_snapshots table).
  const cached = await storage.createSnapshot({
    snapshotDate,
    bookingCount: agg.bookingCount,
    occupancyPct: String(agg.occupancyPct),
    revenueTotal: String(agg.revenueTotal),
    roomsOccupied: agg.roomsOccupied,
    upcomingCheckIns: agg.upcomingCheckIns,
    pushedToUo: false,
    pushedAt: null,
  });

  const snapshot: UnifiedOpsSnapshot = {
    businessCode: "BNP",
    snapshotDate,
    bookingCount: agg.bookingCount,
    occupancyPct: agg.occupancyPct,
    revenueTotal: agg.revenueTotal,
    roomsOccupied: agg.roomsOccupied,
    upcomingCheckIns: agg.upcomingCheckIns,
  };

  const ok = await pushSnapshot(snapshot);
  if (ok) {
    await storage.markSnapshotPushed(cached.id, new Date());
    log(`KPI snapshot ${snapshotDate} cached + pushed (dry-run unless enabled)`, "kpiRollup");
  }
  return snapshot;
}

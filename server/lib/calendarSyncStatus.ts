// server/lib/calendarSyncStatus.ts
// Pure status computation combining BOTH calendar-sync directions for one
// listing into a single admin-facing signal. No I/O — callers (routes.ts)
// gather the three inputs from storage/settings and pass them in.
//
// INBOUND (Airbnb -> BNP): is airbnb_ical_url set, and did this listing's entry
// (if any) in the last hourly sync's ical_last_sync_result.listings succeed?
// OUTBOUND (BNP -> Airbnb): export_last_fetched_at, freshness-windowed. Airbnb
// gives no fetch confirmation/webhook, so a recent fetch of the export feed is
// the only proxy for "Airbnb is actively pulling this." Airbnb describes its
// own calendar-sync poll cadence as roughly every few hours up to about once a
// day — not exact or guaranteed — so the window below is deliberately generous
// (26h: a full day plus a buffer for polling jitter) to avoid false "stale"
// flags. This is NOT the same as icalSync.ts's STALE_AFTER_MS (3h) — that
// threshold covers a job BNP itself runs hourly; this covers a job Airbnb
// controls the cadence of.
// =============================================================================

export const EXPORT_FETCH_STALE_AFTER_HOURS = 26;
const EXPORT_FETCH_STALE_AFTER_MS = EXPORT_FETCH_STALE_AFTER_HOURS * 60 * 60 * 1000;

export type InboundStatus = "not_connected" | "pending" | "ok" | "error";
export type OutboundStatus = "not_connected" | "ok" | "stale";
export type OverallStatus = "full" | "partial" | "none";

/** Matches one entry of ical_last_sync_result.listings[] (icalSync.ts ListingSyncResult, trimmed). */
export interface SyncResultEntry {
  key: string;
  label: string;
  ok: boolean;
  error?: string;
}

export interface CalendarSyncStatus {
  inboundStatus: InboundStatus;
  inboundError?: string;
  outboundStatus: OutboundStatus;
  overall: OverallStatus;
}

export function computeCalendarSyncStatus(params: {
  hasImportUrl: boolean;
  /** This listing's entry from ical_last_sync_result.listings, keyed by "property:<id>" | "room:<id>". */
  syncResultEntry: SyncResultEntry | undefined;
  exportLastFetchedAt: Date | string | null;
  now?: Date;
}): CalendarSyncStatus {
  const now = params.now ?? new Date();

  let inboundStatus: InboundStatus;
  let inboundError: string | undefined;
  if (!params.hasImportUrl) {
    inboundStatus = "not_connected";
  } else if (!params.syncResultEntry) {
    inboundStatus = "pending";
  } else if (params.syncResultEntry.ok) {
    inboundStatus = "ok";
  } else {
    inboundStatus = "error";
    inboundError = params.syncResultEntry.error;
  }

  let outboundStatus: OutboundStatus;
  if (!params.exportLastFetchedAt) {
    outboundStatus = "not_connected";
  } else {
    const fetchedMs = new Date(params.exportLastFetchedAt).getTime();
    outboundStatus =
      Number.isFinite(fetchedMs) && now.getTime() - fetchedMs <= EXPORT_FETCH_STALE_AFTER_MS ? "ok" : "stale";
  }

  const overall: OverallStatus =
    inboundStatus === "ok" && outboundStatus === "ok"
      ? "full"
      : inboundStatus === "not_connected" && outboundStatus === "not_connected"
        ? "none"
        : "partial";

  return { inboundStatus, inboundError, outboundStatus, overall };
}

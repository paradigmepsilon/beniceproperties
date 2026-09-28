// server/lib/calendarSyncStatus.test.ts
// Pure status computation: the inbound x outbound matrix, the "overall"
// collapse rule (full only when both sides ok, none only when both sides
// never connected, everything else partial), the outbound staleness boundary,
// and that inboundError only ever surfaces on inboundStatus "error".

import { describe, it, expect } from "vitest";
import { computeCalendarSyncStatus, EXPORT_FETCH_STALE_AFTER_HOURS, type SyncResultEntry } from "./calendarSyncStatus";

const NOW = new Date("2026-09-28T12:00:00Z");
const okEntry: SyncResultEntry = { key: "property:p1", label: "The Retreat", ok: true };
const errorEntry: SyncResultEntry = { key: "property:p1", label: "The Retreat", ok: false, error: "Feed fetch failed: HTTP 403" };

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

describe("computeCalendarSyncStatus — inbound status", () => {
  it("is not_connected when no import URL is set, regardless of a stray sync result", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: okEntry, exportLastFetchedAt: null, now: NOW });
    expect(status.inboundStatus).toBe("not_connected");
  });

  it("is pending when a URL is set but this listing hasn't appeared in a sync result yet", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: true, syncResultEntry: undefined, exportLastFetchedAt: null, now: NOW });
    expect(status.inboundStatus).toBe("pending");
  });

  it("is ok when the last sync result for this listing succeeded", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: true, syncResultEntry: okEntry, exportLastFetchedAt: null, now: NOW });
    expect(status.inboundStatus).toBe("ok");
    expect(status.inboundError).toBeUndefined();
  });

  it("is error and carries the message when the last sync result for this listing failed", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: true, syncResultEntry: errorEntry, exportLastFetchedAt: null, now: NOW });
    expect(status.inboundStatus).toBe("error");
    expect(status.inboundError).toBe("Feed fetch failed: HTTP 403");
  });

  it("never carries inboundError on any status other than error", () => {
    for (const entry of [undefined, okEntry]) {
      const status = computeCalendarSyncStatus({ hasImportUrl: !!entry || true, syncResultEntry: entry, exportLastFetchedAt: null, now: NOW });
      expect(status.inboundError).toBeUndefined();
    }
  });
});

describe("computeCalendarSyncStatus — outbound status", () => {
  it("is not_connected when the export feed has never been fetched", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: undefined, exportLastFetchedAt: null, now: NOW });
    expect(status.outboundStatus).toBe("not_connected");
  });

  it("is ok well within the freshness window", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: undefined, exportLastFetchedAt: hoursAgo(1), now: NOW });
    expect(status.outboundStatus).toBe("ok");
  });

  it("is ok exactly at the freshness boundary", () => {
    const status = computeCalendarSyncStatus({
      hasImportUrl: false,
      syncResultEntry: undefined,
      exportLastFetchedAt: hoursAgo(EXPORT_FETCH_STALE_AFTER_HOURS),
      now: NOW,
    });
    expect(status.outboundStatus).toBe("ok");
  });

  it("is stale one millisecond past the freshness boundary", () => {
    const justPast = new Date(NOW.getTime() - EXPORT_FETCH_STALE_AFTER_HOURS * 60 * 60 * 1000 - 1);
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: undefined, exportLastFetchedAt: justPast, now: NOW });
    expect(status.outboundStatus).toBe("stale");
  });

  it("is stale for an old fetch, e.g. 5 days ago", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: undefined, exportLastFetchedAt: hoursAgo(24 * 5), now: NOW });
    expect(status.outboundStatus).toBe("stale");
  });

  it("accepts an ISO string, not just a Date", () => {
    const status = computeCalendarSyncStatus({
      hasImportUrl: false,
      syncResultEntry: undefined,
      exportLastFetchedAt: hoursAgo(1).toISOString(),
      now: NOW,
    });
    expect(status.outboundStatus).toBe("ok");
  });
});

describe("computeCalendarSyncStatus — overall", () => {
  it("is none only when both sides have never connected", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: false, syncResultEntry: undefined, exportLastFetchedAt: null, now: NOW });
    expect(status.overall).toBe("none");
  });

  it("full only when both sides are ok", () => {
    const status = computeCalendarSyncStatus({ hasImportUrl: true, syncResultEntry: okEntry, exportLastFetchedAt: hoursAgo(1), now: NOW });
    expect(status.overall).toBe("full");
  });

  it.each([
    ["inbound not_connected, outbound ok", false, undefined, hoursAgo(1)],
    ["inbound pending, outbound not_connected", true, undefined, null],
    ["inbound error, outbound ok", true, errorEntry, hoursAgo(1)],
    ["inbound ok, outbound not_connected", true, okEntry, null],
    ["inbound ok, outbound stale", true, okEntry, hoursAgo(24 * 5)],
  ] as const)("%s -> partial", (_label, hasImportUrl, syncResultEntry, exportLastFetchedAt) => {
    const status = computeCalendarSyncStatus({ hasImportUrl, syncResultEntry, exportLastFetchedAt, now: NOW });
    expect(status.overall).toBe("partial");
  });
});

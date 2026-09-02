// client/src/pages/admin/calendar-sync-panel.tsx
// Task 8 — calendar sync panel, rendered in the Inventory tab (above
// BlocksPanel is fine either order; dashboard.tsx decides). Shows the last
// Airbnb iCal sync status, a manual "Sync Airbnb now" trigger, and the
// guest_auto_notifications toggle.
//
//   GET  /api/admin/calendar/status  -> { lastSyncAt, lastResult | null }
//     lastResult.listings rows carry NO per-listing counts (only
//     {key,label,ok,error}) — that's what's persisted. Counts are rendered
//     only from a fresh POST /api/admin/calendar/refresh response, held in
//     local state for this session.
//   POST /api/admin/calendar/refresh -> full SyncResult (with per-listing counts)
//   GET/PUT /api/admin/settings/guest-auto-notifications -> { enabled }

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { dateTime } from "@/lib/format";

interface PersistedListingStatus {
  key: string;
  label: string;
  ok: boolean;
  error?: string;
}

interface PersistedSyncResult {
  at: string;
  totalListings: number;
  ok: number;
  failed: number;
  created: number;
  updated: number;
  removed: number;
  listings: PersistedListingStatus[];
}

interface CalendarStatus {
  lastSyncAt: string | null;
  lastResult: PersistedSyncResult | null;
}

interface FreshListingResult {
  key: string;
  label: string;
  kind: "property" | "room";
  ok: boolean;
  parsed: number;
  created: number;
  updated: number;
  removed: number;
  error?: string;
}

interface FreshSyncResult {
  totalListings: number;
  ok: number;
  failed: number;
  created: number;
  updated: number;
  removed: number;
  listings: FreshListingResult[];
}

export default function CalendarSyncPanel() {
  const { toast } = useToast();
  const [lastRefresh, setLastRefresh] = useState<FreshSyncResult | null>(null);

  const status = useQuery<CalendarStatus>({
    queryKey: ["/api/admin/calendar/status"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/calendar/status")).json(),
  });

  const refresh = useMutation({
    mutationFn: async (): Promise<FreshSyncResult> => (await apiRequest("POST", "/api/admin/calendar/refresh")).json(),
    onSuccess: (result) => {
      setLastRefresh(result);
      toast({
        title: "Sync complete",
        description: `${result.ok}/${result.totalListings} listings ok · +${result.created} / ~${result.updated} / -${result.removed}`,
        variant: result.failed > 0 ? "destructive" : undefined,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/status"] });
    },
    onError: (e: Error) => toast({ title: "Sync failed", description: e.message, variant: "destructive" }),
  });

  const autoNotify = useQuery<{ enabled: boolean }>({
    queryKey: ["/api/admin/settings/guest-auto-notifications"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/settings/guest-auto-notifications")).json(),
  });

  const setAutoNotify = useMutation({
    mutationFn: async (enabled: boolean): Promise<{ enabled: boolean }> =>
      (await apiRequest("PUT", "/api/admin/settings/guest-auto-notifications", { enabled })).json(),
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/admin/settings/guest-auto-notifications"], data);
      toast({ title: data.enabled ? "Guest auto-notifications on" : "Guest auto-notifications off" });
    },
    onError: (e: Error) => toast({ title: "Could not update", description: e.message, variant: "destructive" }),
  });

  const lastResult = status.data?.lastResult;

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">Calendar sync (Airbnb)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-muted-foreground">
              Last sync: {status.data?.lastSyncAt ? dateTime(status.data.lastSyncAt) : "Never"}
            </div>
            {lastResult && (
              <div className="mt-1 flex items-center gap-2">
                <Badge variant={lastResult.failed > 0 ? "destructive" : "default"} data-testid="badge-calendar-status">
                  {lastResult.ok}/{lastResult.totalListings} ok
                </Badge>
                {lastResult.failed > 0 && <span className="text-xs text-destructive">{lastResult.failed} failed</span>}
              </div>
            )}
          </div>
          <Button disabled={refresh.isPending} onClick={() => refresh.mutate()} data-testid="button-sync-calendar">
            {refresh.isPending ? "Syncing…" : "Sync Airbnb now"}
          </Button>
        </div>

        {lastResult && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Listings (as of last sync)</p>
            {lastResult.listings.map((l) => (
              <div key={l.key} className="flex items-center justify-between rounded border px-2 py-1 text-xs" data-testid={`calendar-listing-${l.key}`}>
                <span>{l.label}</span>
                <span className="flex items-center gap-2">
                  {l.error && <span className="text-destructive">{l.error}</span>}
                  <Badge variant={l.ok ? "default" : "destructive"}>{l.ok ? "OK" : "Failed"}</Badge>
                </span>
              </div>
            ))}
          </div>
        )}

        {lastRefresh && (
          <div className="space-y-1 rounded-md border bg-muted/30 p-3">
            <p className="text-xs font-medium text-muted-foreground">Just synced — per-listing detail</p>
            {lastRefresh.listings.map((l) => (
              <div
                key={l.key}
                className="flex flex-wrap items-center justify-between gap-2 text-xs"
                data-testid={`calendar-fresh-listing-${l.key}`}
              >
                <span>
                  {l.label} ({l.kind})
                </span>
                <span className="text-muted-foreground">
                  parsed {l.parsed} · +{l.created} / ~{l.updated} / -{l.removed}
                  {l.error ? ` · ${l.error}` : ""}
                </span>
                <Badge variant={l.ok ? "default" : "destructive"}>{l.ok ? "OK" : "Failed"}</Badge>
              </div>
            ))}
          </div>
        )}

        <div className="border-t pt-3">
          <label className="flex items-start gap-2 text-sm">
            <Checkbox
              className="mt-0.5"
              checked={autoNotify.data?.enabled ?? true}
              disabled={autoNotify.isLoading || setAutoNotify.isPending}
              onCheckedChange={(v) => setAutoNotify.mutate(v === true)}
              data-testid="checkbox-guest-auto-notifications"
            />
            <span>
              <span className="font-medium">Auto-notify guests</span>
              <br />
              <span className="text-xs text-muted-foreground">
                When off, new bookings do not email/SMS the guest automatically; admin alerts still fire.
              </span>
            </span>
          </label>
        </div>
      </CardContent>
    </Card>
  );
}

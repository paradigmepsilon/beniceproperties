// client/src/pages/admin/calendar-sync-panel.tsx
// Task 8 — calendar sync panel, rendered in the Inventory tab (above
// BlocksPanel is fine either order; dashboard.tsx decides). Shows the last
// Airbnb iCal sync status, a manual "Sync Airbnb now" trigger, and the
// guest_auto_notifications toggle, and the per-listing Airbnb links:
//   - OUT: the secret .ics URL to paste into Airbnb's "Import calendar" so a
//     direct booking blocks Airbnb too (regenerate rotates it).
//   - IN: the Airbnb calendar link to paste here so Airbnb bookings block direct
//     booking (masked; replace-only, saved via the property/room PATCH).
//   GET  /api/admin/calendar/listings -> ListingLinks[]
//   POST /api/admin/calendar/export-urls/:kind/:id/regenerate -> { exportUrl }
//   PATCH /api/admin/properties/:id | /rooms/:id { airbnbIcalUrl }
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
import { Input } from "@/components/ui/input";
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

interface ListingLinks {
  kind: "property" | "room";
  propertyId: string;
  roomId: string | null;
  label: string;
  exportUrl: string;
  hasImportUrl: boolean;
  importUrlHint: string | null;
}

/** apiRequest throws `${status}: ${body}`; surface the server's `message` when the body is JSON. */
function apiErrorText(e: Error): string {
  const body = e.message.replace(/^\d+:\s*/, "");
  try {
    const parsed = JSON.parse(body);
    if (parsed && typeof parsed.message === "string") return parsed.message;
  } catch {
    /* not JSON */
  }
  return body;
}

function ListingLinksRow({ listing, onImportSaved }: { listing: ListingLinks; onImportSaved: () => void }) {
  const { toast } = useToast();
  const [draft, setDraft] = useState("");
  const key = listing.roomId ? `room-${listing.roomId}` : `property-${listing.propertyId}`;
  const patchUrl = listing.roomId
    ? `/api/admin/rooms/${listing.roomId}`
    : `/api/admin/properties/${listing.propertyId}`;

  const saveImport = useMutation({
    mutationFn: async (airbnbIcalUrl: string | null) => (await apiRequest("PATCH", patchUrl, { airbnbIcalUrl })).json(),
    onSuccess: (_data, airbnbIcalUrl) => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/listings"] });
      toast({ title: airbnbIcalUrl ? "Airbnb link saved" : "Airbnb link removed" });
      // Sync right away so a bad link fails visibly now, not at the next hourly run.
      if (airbnbIcalUrl) onImportSaved();
    },
    onError: (e: Error) => toast({ title: "Could not save link", description: apiErrorText(e), variant: "destructive" }),
  });

  const regenerate = useMutation({
    mutationFn: async (): Promise<{ exportUrl: string }> =>
      (await apiRequest("POST", `/api/admin/calendar/export-urls/${listing.kind}/${listing.roomId ?? listing.propertyId}/regenerate`)).json(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/calendar/listings"] });
      toast({ title: "New export link created", description: "Paste it into Airbnb; the old link no longer works." });
    },
    onError: (e: Error) => toast({ title: "Could not regenerate", description: apiErrorText(e), variant: "destructive" }),
  });

  async function copyExport() {
    try {
      await navigator.clipboard.writeText(listing.exportUrl);
      toast({ title: "Export link copied" });
    } catch {
      toast({ title: "Copy failed", description: "Select the link and copy it manually.", variant: "destructive" });
    }
  }

  return (
    <div className="space-y-2 rounded border p-3" data-testid={`calendar-links-${key}`}>
      <div className="font-medium">{listing.label}</div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Send to Airbnb (paste into Airbnb: Calendar, Import calendar)</p>
        <div className="flex gap-2">
          <Input readOnly value={listing.exportUrl} onFocus={(e) => e.currentTarget.select()} className="text-xs" data-testid={`input-export-url-${key}`} />
          <Button type="button" variant="outline" onClick={copyExport} data-testid={`button-copy-export-${key}`}>
            Copy
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={regenerate.isPending}
            onClick={() => {
              if (window.confirm(`Create a new export link for ${listing.label}? The link currently in Airbnb will stop working until you paste the new one.`)) {
                regenerate.mutate();
              }
            }}
            data-testid={`button-regenerate-export-${key}`}
          >
            Regenerate
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Receive from Airbnb (paste the link from Airbnb: Calendar, Export calendar) ·{" "}
          {listing.hasImportUrl ? (
            <span data-testid={`text-import-status-${key}`}>connected (ends …{listing.importUrlHint})</span>
          ) : (
            <span data-testid={`text-import-status-${key}`}>not connected</span>
          )}
        </p>
        <div className="flex gap-2">
          <Input
            type="password"
            autoComplete="off"
            placeholder={listing.hasImportUrl ? "Paste a new link to replace" : "https://www.airbnb.com/calendar/ical/..."}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="text-xs"
            data-testid={`input-import-url-${key}`}
          />
          <Button
            type="button"
            disabled={!draft.trim() || saveImport.isPending}
            onClick={() => saveImport.mutate(draft.trim())}
            data-testid={`button-save-import-${key}`}
          >
            Save
          </Button>
          {listing.hasImportUrl && (
            <Button
              type="button"
              variant="outline"
              disabled={saveImport.isPending}
              onClick={() => {
                if (window.confirm(`Remove the Airbnb link for ${listing.label}? Airbnb bookings will stop blocking direct booking.`)) {
                  saveImport.mutate(null);
                }
              }}
              data-testid={`button-clear-import-${key}`}
            >
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
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

  const listingLinks = useQuery<ListingLinks[]>({
    queryKey: ["/api/admin/calendar/listings"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/calendar/listings")).json(),
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

        <div className="space-y-2 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Airbnb links (per listing)</p>
          <p className="text-xs text-muted-foreground">
            Paste each export link into that listing on Airbnb so direct bookings block Airbnb. Paste each Airbnb link
            below so Airbnb bookings block direct booking. Do both for every listing or one side can still double-book.
          </p>
          {listingLinks.isLoading && <p className="text-xs text-muted-foreground">Loading…</p>}
          {listingLinks.error && <p className="text-xs text-destructive">Could not load listings.</p>}
          {listingLinks.data?.length === 0 && <p className="text-xs text-muted-foreground">No STR properties or co-living rooms yet.</p>}
          {listingLinks.data?.map((l) => (
            <ListingLinksRow
              key={l.roomId ?? l.propertyId}
              listing={l}
              onImportSaved={() => refresh.mutate()}
            />
          ))}
        </div>

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

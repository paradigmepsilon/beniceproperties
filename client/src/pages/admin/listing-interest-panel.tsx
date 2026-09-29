// client/src/pages/admin/listing-interest-panel.tsx
// Demand captured by PLACEHOLDER listings, rendered in the Inventory tab right
// beside the Placeholder/Real toggles that create it — you flag a listing as a
// placeholder here, so you read what it earned here.
//
// A placeholder can never be booked (server/lib/booking.ts and
// server/lib/lease.ts refuse it with 409), so these rows are the entire output
// of the experiment. Without this panel the leads sit in a table nobody opens.
//
//   GET /api/admin/listing-interest?limit= -> rows + propertyName/roomName
//
// Read-only on purpose: the rows are append-only (a person may ask twice) and
// there is no status to manage yet. Follow-up happens off-platform, like the
// LTR and partner inquiry lists.

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fullDate } from "@/lib/format";

interface ListingInterestRow {
  id: string;
  propertyId: string | null;
  roomId: string | null;
  propertyName: string | null;
  roomName: string | null;
  name: string;
  email: string;
  phone: string | null;
  moveIn: string | null;
  message: string | null;
  createdAt: string;
}

export default function ListingInterestPanel() {
  const interest = useQuery<ListingInterestRow[]>({
    queryKey: ["/api/admin/listing-interest"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/listing-interest")).json(),
  });

  const rows = interest.data ?? [];

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-base">
          Placeholder interest
          {rows.length > 0 && (
            <Badge variant="secondary" className="ml-2" data-testid="badge-interest-count">
              {rows.length}
            </Badge>
          )}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          People who asked about a listing that isn&apos;t bookable. This is the demand signal
          placeholder listings exist to collect — follow up off-platform.
        </p>
      </CardHeader>
      <CardContent>
        {interest.isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : interest.isError ? (
          <p className="py-4 text-sm text-destructive" data-testid="text-interest-error">
            Couldn&apos;t load interest requests.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground" data-testid="text-interest-empty">
            No interest captured yet.
          </p>
        ) : (
          <div className="divide-y text-sm">
            {rows.map((r) => (
              <div key={r.id} className="py-3" data-testid={`row-interest-${r.id}`}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted-foreground">{fullDate(r.createdAt)}</span>
                </div>
                <div className="mt-0.5 text-muted-foreground">
                  <a href={`mailto:${r.email}`} className="underline underline-offset-2">
                    {r.email}
                  </a>
                  {r.phone && <> · {r.phone}</>}
                </div>
                <div className="mt-1">
                  {r.roomName ?? "Whole listing"}
                  {r.propertyName && (
                    <span className="text-muted-foreground"> · {r.propertyName}</span>
                  )}
                  {r.moveIn && (
                    <span className="text-muted-foreground"> · wants {r.moveIn}</span>
                  )}
                </div>
                {r.message && <p className="mt-1.5 text-muted-foreground">{r.message}</p>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// client/src/pages/admin/reservations-panel.tsx
// The admin reservations list, on the Overview tab.
//
// Replaces a card that showed only `reference · model · paymentMethod · status`
// for the 20 newest raw rows — no property, no guest, no dates, and no way to
// open one. This pages server-side, filters by status and property, searches
// reference/guest, sorts, and opens a full detail modal on click.
//
//   GET /api/admin/bookings?page=&pageSize=&status=&propertyId=&q=&sort=&dir=
//        -> { rows, total, page, pageSize }
//   GET /api/admin/bookings/:id -> full detail
//
// This is the app's first paginated list, so it deliberately stays plain: two
// Buttons for the pager rather than a new dependency.

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BOOKING_STATUSES } from "@shared/schema";
import type { Booking, Guest, Payment, Property, Subscription } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { money, fullDate, dateTime, roomLabel } from "@/lib/format";
import { amountMatches, refundEligibility } from "@/lib/adminRefund";
import {
  reservationsQueryString,
  withFilter,
  pageCount,
  DEFAULT_RESERVATION_FILTERS,
  RESERVATIONS_PAGE_SIZE,
  ANY,
  type ReservationFilters,
  type ReservationSort,
} from "@/lib/reservationsQuery";

// ---------------------------------------------------------------------------
// Wire types
// ---------------------------------------------------------------------------

type ReservationRow = Booking & {
  guest: Guest | null;
  property: Property | null;
  room: { id: string; name: string; roomNumber: string | null } | null;
};

interface ReservationsPage {
  rows: ReservationRow[];
  total: number;
  page: number;
  pageSize: number;
}

interface ReservationDetail {
  booking: Booking;
  guest: Guest | null;
  property: { id: string; name: string; location: string; entity: string } | null;
  room: { id: string; name: string; roomNumber: string | null } | null;
  payments: Payment[];
  subscription: Subscription | null;
  gate: { verificationStatus: string | null; approvedAt: string | null; doorCode: string | null } | null;
}

const SORT_LABEL: Record<ReservationSort, string> = {
  created: "Newest",
  checkIn: "Check-in",
  total: "Total",
};

function statusVariant(status: string) {
  if (status === "CONFLICT") return "destructive" as const;
  // ACTIVE = happening right now, CONFIRMED = paid and upcoming. Everything
  // else (COMPLETED, CANCELLED, EXPIRED, PENDING_*) is muted: it needs no
  // attention, or it needs attention somewhere other than this list.
  if (status === "CONFIRMED" || status === "ACTIVE") return "default" as const;
  return "secondary" as const;
}

/** "Aug 14, 2026 → Aug 20, 2026", or "→ open-ended" for an open co-living stay. */
function stayDates(checkIn: string, checkOut: string | null): string {
  return `${fullDate(checkIn)} → ${checkOut ? fullDate(checkOut) : "open-ended"}`;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export default function ReservationsPanel({ properties }: { properties: Property[] }) {
  const [filters, setFilters] = useState<ReservationFilters>(DEFAULT_RESERVATION_FILTERS);
  const [searchBox, setSearchBox] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // Debounce the search box so typing a reference doesn't fire a request per
  // keystroke. 300ms is below the threshold where typing feels laggy.
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === searchBox ? f : withFilter(f, { q: searchBox })));
    }, 300);
    return () => clearTimeout(t);
  }, [searchBox]);

  const qs = reservationsQueryString(filters);
  const page = useQuery<ReservationsPage>({
    // Every filter is in the key: two different filter sets must not share a
    // cache entry. The default fetcher can't build a query string, so this
    // query brings its own (same pattern as listing-interest-panel).
    queryKey: ["/api/admin/bookings", qs],
    queryFn: async () => (await apiRequest("GET", `/api/admin/bookings${qs}`)).json(),
  });

  const total = page.data?.total ?? 0;
  const pages = pageCount(total, RESERVATIONS_PAGE_SIZE);
  const rows = page.data?.rows ?? [];
  const set = (patch: Partial<ReservationFilters>) => setFilters((f) => withFilter(f, patch));

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">Reservations</CardTitle>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="res-search" className="text-xs font-semibold">
              Search
            </Label>
            <Input
              id="res-search"
              value={searchBox}
              onChange={(e) => setSearchBox(e.target.value)}
              placeholder="Reference, guest name or email"
              className="mt-1"
              data-testid="input-reservations-search"
            />
          </div>
          <div>
            <Label className="text-xs font-semibold">Status</Label>
            <Select value={filters.status} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger className="mt-1" data-testid="select-reservations-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All statuses</SelectItem>
                {BOOKING_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Property</Label>
            <Select value={filters.propertyId} onValueChange={(v) => set({ propertyId: v })}>
              <SelectTrigger className="mt-1" data-testid="select-reservations-property">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>All properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-semibold">Sort</Label>
            <div className="mt-1 flex gap-2">
              <Select value={filters.sort} onValueChange={(v) => set({ sort: v as ReservationSort })}>
                <SelectTrigger data-testid="select-reservations-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SORT_LABEL) as ReservationSort[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {SORT_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() => set({ dir: filters.dir === "desc" ? "asc" : "desc" })}
                title={filters.dir === "desc" ? "Descending" : "Ascending"}
                data-testid="button-reservations-dir"
              >
                {filters.dir === "desc" ? "↓" : "↑"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {page.isLoading ? (
          <p className="py-4 text-sm text-muted-foreground">Loading…</p>
        ) : page.isError ? (
          <p className="py-4 text-sm text-destructive" data-testid="text-reservations-error">
            Couldn&apos;t load reservations.
          </p>
        ) : rows.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground" data-testid="text-reservations-empty">
            No reservations match these filters.
          </p>
        ) : (
          <div className="divide-y text-sm">
            {rows.map((b) => (
              <div key={b.id} className="py-2" data-testid={`row-reservation-${b.id}`}>
                {/* Only the header is the button. ConflictBookingActions below
                    renders its own buttons, and a button inside a button is
                    invalid markup that makes the inner ones unclickable. */}
                <button
                  type="button"
                  className="w-full rounded-md px-1 py-1 text-left hover:bg-muted/60"
                  onClick={() => setOpenId(b.id)}
                  data-testid={`button-reservation-${b.id}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">
                      {b.property?.name ?? "Unknown property"}
                      {b.room ? ` · ${roomLabel(b.room)}` : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{money(b.quotedTotal)}</span>
                      <Badge variant={statusVariant(b.status)} data-testid={`badge-status-${b.id}`}>
                        {b.status}
                      </Badge>
                    </span>
                  </div>
                  <div className="mt-0.5 text-muted-foreground">
                    {b.guest?.name ?? "Unknown guest"} · {stayDates(b.checkIn, b.checkOut)}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-muted-foreground">
                    {b.reference} · {b.model} · {b.paymentMethod}
                  </div>
                </button>
                {b.status === "CONFLICT" && (
                  <div className="mt-2">
                    <ConflictBookingActions booking={b} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between gap-3 border-t pt-3 text-sm">
          <span className="text-muted-foreground" data-testid="text-reservations-count">
            Page {filters.page + 1} of {pages} · {total} total
          </span>
          <span className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={filters.page <= 0 || page.isFetching}
              onClick={() => set({ page: filters.page - 1 })}
              data-testid="button-reservations-prev"
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={filters.page + 1 >= pages || page.isFetching}
              onClick={() => set({ page: filters.page + 1 })}
              data-testid="button-reservations-next"
            >
              Next
            </Button>
          </span>
        </div>
      </CardContent>

      <ReservationDetailDialog id={openId} onClose={() => setOpenId(null)} />
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Detail modal
// ---------------------------------------------------------------------------

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function ReservationDetailDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const detail = useQuery<ReservationDetail>({
    queryKey: ["/api/admin/bookings", id],
    queryFn: async () => (await apiRequest("GET", `/api/admin/bookings/${id}`)).json(),
    enabled: !!id,
  });
  const d = detail.data;

  return (
    <Dialog open={!!id} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-reservation">
        <DialogHeader>
          <DialogTitle>
            {d
              ? `${d.property?.name ?? "Reservation"}${d.room ? ` · ${roomLabel(d.room)}` : ""}`
              : "Reservation"}
          </DialogTitle>
        </DialogHeader>

        {detail.isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : detail.isError || !d ? (
          <p className="text-sm text-destructive">Couldn&apos;t load this reservation.</p>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Reference">
                <span className="font-mono">{d.booking.reference}</span>
              </Field>
              <Field label="Status">
                <Badge variant={statusVariant(d.booking.status)}>{d.booking.status}</Badge>
              </Field>
              <Field label="Stay">{stayDates(d.booking.checkIn, d.booking.checkOut)}</Field>
              <Field label="Quoted total">{money(d.booking.quotedTotal)}</Field>
              <Field label="Model">
                {d.booking.model} · {d.booking.paymentMethod}
              </Field>
              <Field label="Booked">{dateTime(d.booking.createdAt as unknown as string)}</Field>
            </div>

            <div className="border-t pt-3">
              <Field label="Guest">
                {d.guest ? (
                  <>
                    {d.guest.name}
                    <div className="text-muted-foreground">
                      <a href={`mailto:${d.guest.email}`} className="underline underline-offset-2">
                        {d.guest.email}
                      </a>
                      {d.guest.phone && <> · {d.guest.phone}</>}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">No guest record</span>
                )}
              </Field>
            </div>

            {d.property && (
              <div className="border-t pt-3">
                <Field label="Property">
                  {d.property.name}
                  <span className="text-muted-foreground"> · {d.property.location}</span>
                  {d.room && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {roomLabel(d.room)}
                    </span>
                  )}
                </Field>
              </div>
            )}

            <div className="border-t pt-3">
              <div className="text-xs font-semibold text-muted-foreground">
                Payments ({d.payments.length})
              </div>
              {d.payments.length === 0 ? (
                <p className="mt-1 text-muted-foreground">No payments recorded.</p>
              ) : (
                <div className="mt-1 divide-y">
                  {d.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5">
                      <span>
                        {p.type} · {p.method}
                        {Number(p.surcharge) > 0 && (
                          <span className="text-muted-foreground"> (+{money(p.surcharge)} fee)</span>
                        )}
                      </span>
                      <span className="flex items-center gap-2">
                        <span>{money(p.amount)}</span>
                        <Badge variant={p.status === "PAID" ? "default" : "secondary"}>{p.status}</Badge>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {d.gate && (
              <div className="border-t pt-3">
                <Field label="Approval gate">
                  ID check: {d.gate.verificationStatus ?? "—"}
                  {d.gate.approvedAt ? ` · approved ${dateTime(d.gate.approvedAt)}` : " · not approved"}
                </Field>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} data-testid="button-reservation-close">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Conflict actions — moved here from dashboard.tsx with the list they belong to.
//
// A CONFLICT booking was paid but its dates were taken by the time payment
// confirmed. The admin either confirms it (re-checks availability, 409s if
// still taken) or cancels — plain cancel always available, "Cancel + refund"
// only for a Stripe booking with a PAID Stripe payment to refund. Refund is
// real money: the dialog shows the exact PAID-Stripe total and requires the
// admin to type it back before the button enables (see @/lib/adminRefund).
// ---------------------------------------------------------------------------

function ConflictBookingActions({ booking }: { booking: Booking }) {
  const { toast } = useToast();
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [typedAmount, setTypedAmount] = useState("");

  // Payments come from the booking's own detail rather than the dashboard-wide
  // /api/admin/payments query, so a CONFLICT row is self-contained.
  const detail = useQuery<ReservationDetail>({
    queryKey: ["/api/admin/bookings", booking.id],
    queryFn: async () => (await apiRequest("GET", `/api/admin/bookings/${booking.id}`)).json(),
  });
  const eligibility = refundEligibility(booking, detail.data?.payments ?? []);

  // Prefix-matches every page/filter combination of the list query.
  const refreshLists = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/bookings"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/payments"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/payments/by-property"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/reconciliation"] });
  };

  const confirm = useMutation({
    mutationFn: async () => apiRequest("POST", `/api/admin/bookings/${booking.id}/confirm`),
    onSuccess: () => {
      toast({ title: "Booking confirmed" });
      refreshLists();
    },
    onError: (e: Error) => toast({ title: "Could not confirm", description: e.message, variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async (refund: boolean) => {
      const res = await apiRequest("POST", `/api/admin/bookings/${booking.id}/cancel`, { refund });
      return res.json() as Promise<{
        ok: boolean;
        reference: string;
        alreadyCancelled: boolean;
        refunded: boolean;
        refundIds: string[];
      }>;
    },
    onSuccess: (result) => {
      toast({
        title: result.refunded ? "Cancelled and refunded" : "Booking cancelled",
        description: result.refunded
          ? `Refund${result.refundIds.length > 1 ? "s" : ""} issued: ${result.refundIds.join(", ")}`
          : undefined,
      });
      setRefundDialogOpen(false);
      setTypedAmount("");
      refreshLists();
    },
    onError: (e: Error) => toast({ title: "Could not cancel", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        size="sm"
        disabled={confirm.isPending}
        onClick={() => confirm.mutate()}
        data-testid={`button-confirm-${booking.id}`}
      >
        Confirm
      </Button>
      <Button
        size="sm"
        variant="destructive"
        disabled={cancel.isPending}
        onClick={() => {
          if (window.confirm(`Cancel booking ${booking.reference}? This cannot be undone.`)) {
            cancel.mutate(false);
          }
        }}
        data-testid={`button-cancel-${booking.id}`}
      >
        Cancel
      </Button>
      {eligibility.eligible && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => setRefundDialogOpen(true)}
          data-testid={`button-cancel-refund-${booking.id}`}
        >
          Cancel + refund
        </Button>
      )}

      <Dialog open={refundDialogOpen} onOpenChange={setRefundDialogOpen}>
        <DialogContent data-testid={`dialog-refund-${booking.id}`}>
          <DialogHeader>
            <DialogTitle>Refund {money(eligibility.amount)} to the guest?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cancels booking {booking.reference} and refunds the paid Stripe total. This cannot be
            undone. Type the exact amount below to confirm.
          </p>
          <Input
            value={typedAmount}
            onChange={(e) => setTypedAmount(e.target.value)}
            placeholder={eligibility.amount.toFixed(2)}
            data-testid={`input-refund-amount-${booking.id}`}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={!amountMatches(typedAmount, eligibility.amount) || cancel.isPending}
              onClick={() => cancel.mutate(true)}
              data-testid={`button-confirm-refund-${booking.id}`}
            >
              Refund &amp; cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

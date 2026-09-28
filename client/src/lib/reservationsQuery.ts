// client/src/lib/reservationsQuery.ts
// Filter state -> query string for the admin reservations list.
//
// Pulled out of the panel because it is the one part of a paginated list that
// is worth testing on its own: an off-by-one page, a filter silently dropped,
// or a stale page index after a filter change all look like "the data is
// wrong" rather than "the URL was wrong".
//
// It also feeds the TanStack query KEY. The default fetcher builds its URL with
// queryKey.join("/") (client/src/lib/queryClient.ts), which can't express a
// query string, so the panel supplies its own queryFn — and the key has to
// carry every filter or two different filters would share one cache entry.

export const RESERVATIONS_PAGE_SIZE = 10;

/** Sentinel for "no filter". shadcn Select can't hold an empty string value. */
export const ANY = "ALL";

export const RESERVATION_SORTS = ["created", "checkIn", "total"] as const;
export type ReservationSort = (typeof RESERVATION_SORTS)[number];

export interface ReservationFilters {
  page: number;
  /** A BOOKING_STATUSES value, or ANY. */
  status: string;
  /** A property id, or ANY. */
  propertyId: string;
  /** Free text: reference, guest name, or guest email. */
  q: string;
  sort: ReservationSort;
  dir: "asc" | "desc";
}

export const DEFAULT_RESERVATION_FILTERS: ReservationFilters = {
  page: 0,
  status: ANY,
  propertyId: ANY,
  q: "",
  sort: "created",
  dir: "desc",
};

/**
 * Serialize filters for GET /api/admin/bookings. Only the parameters that
 * actually narrow anything are sent, so the common case stays a short URL and
 * the server's "omitted means all" branches do the work.
 */
export function reservationsQueryString(f: ReservationFilters): string {
  const params = new URLSearchParams();
  params.set("page", String(Math.max(0, Math.trunc(f.page) || 0)));
  params.set("pageSize", String(RESERVATIONS_PAGE_SIZE));
  if (f.status && f.status !== ANY) params.set("status", f.status);
  if (f.propertyId && f.propertyId !== ANY) params.set("propertyId", f.propertyId);
  const q = f.q.trim();
  if (q) params.set("q", q);
  params.set("sort", f.sort);
  params.set("dir", f.dir);
  return `?${params.toString()}`;
}

/**
 * Apply a filter change. Anything that changes WHICH rows match must send the
 * reader back to page 0 — otherwise narrowing a 9-page list while on page 7
 * shows an empty card, which reads as "no bookings" rather than "no page 7".
 */
export function withFilter(
  current: ReservationFilters,
  patch: Partial<ReservationFilters>,
): ReservationFilters {
  const next = { ...current, ...patch };
  const narrowingChanged =
    patch.status !== undefined ||
    patch.propertyId !== undefined ||
    patch.q !== undefined ||
    patch.sort !== undefined ||
    patch.dir !== undefined;
  if (narrowingChanged && patch.page === undefined) next.page = 0;
  return next;
}

/** Total pages for a result count; always at least 1 so the pager reads "1 of 1" when empty. */
export function pageCount(total: number, pageSize: number = RESERVATIONS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

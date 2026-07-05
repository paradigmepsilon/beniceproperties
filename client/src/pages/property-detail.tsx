// client/src/pages/property-detail.tsx
// STR: hero image + sticky booking card (dates → checkout).
// COLIVING: hero + photo-forward room cards → room detail.

import { useState } from "react";
import { Link, useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft } from "lucide-react";
import type { Property, RoomWithAvailability } from "@shared/schema";
import type { QuoteResponse } from "@shared/api-types";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingImage } from "@/components/listing-image";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingStory } from "@/components/listing-story";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { NeighborhoodBlock } from "@/components/neighborhood-block";
import { DateRangePicker } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";
import { cityOf, fromNightly, money } from "@/lib/format";
import { usePropertyAvailability } from "@/hooks/use-availability";
import { busyToDisabledMatchers, rangeHitsBusy, datesBookable } from "@/lib/availability";

interface DetailResponse {
  property: Property;
  rooms: RoomWithAvailability[];
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const today = new Date().toISOString().slice(0, 10);
  // Seed dates from the home hero search (?checkIn=&checkOut=) when they're
  // still sensible; otherwise start empty like a direct visit.
  const [checkIn, setCheckIn] = useState(() => {
    const v = new URLSearchParams(searchStr).get("checkIn") ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(v) && v >= today ? v : "";
  });
  const [checkOut, setCheckOut] = useState(() => {
    const params = new URLSearchParams(searchStr);
    const inV = params.get("checkIn") ?? "";
    const outV = params.get("checkOut") ?? "";
    return /^\d{4}-\d{2}-\d{2}$/.test(outV) && outV > (inV >= today ? inV : today) ? outV : "";
  });

  // A complete, forward date selection. When set, the detail request asks for
  // per-room availability for [checkIn, checkOut) so a room booked (Airbnb or
  // lease) for those dates greys out even though its manual status is AVAILABLE.
  const datedSearch = !!checkIn && !!checkOut && checkOut > checkIn;
  const { data, isLoading } = useQuery<DetailResponse>({
    queryKey: ["/api/properties", id!, { checkIn: datedSearch ? checkIn : "", checkOut: datedSearch ? checkOut : "" }],
    queryFn: async () => {
      const qs = datedSearch ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      const res = await fetch(`/api/properties/${id}${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
    // Keep the previously-loaded property mounted while a date-driven refetch
    // runs. Without this, changing dates changes the queryKey → isLoading flips
    // true → the full-page loading Shell below unmounts the tree → the browser
    // resets scroll to the top. Retaining prior data means isLoading is only
    // true on the very first visit (correct — that load should be at the top).
    placeholderData: (prev) => prev,
  });
  // Busy ranges (direct bookings ∪ Airbnb iCal blocks) so booked dates disable in
  // the calendar. Empty for co-living (endpoint returns no busy set); the picker
  // only renders for STR anyway. `availLoading` gates the CTA: until the busy set
  // has actually loaded we must treat every range as not-yet-known and keep
  // "Continue" disabled, or a booked range would look bookable on first paint
  // (busy defaults to [] before the query resolves).
  const { data: avail, isLoading: availLoading } = usePropertyAvailability(id);

  // Live stay total for the selected range, from the SAME /api/quote the
  // checkout page uses — so the number shown here is exactly the checkout
  // subtotal. We display dueNow.subtotal (base + cleaning − discount), which
  // excludes tax & the card surcharge; those are surfaced at checkout. STR is a
  // whole-property quote, so no roomId (matches how checkout quotes STR).
  const quoteBody = { propertyId: id, checkIn, checkOut, paymentMethod: "STRIPE" as const };
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuery<QuoteResponse>({
    queryKey: ["/api/quote", JSON.stringify(quoteBody)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/quote", quoteBody);
      return res.json();
    },
    enabled: datedSearch,
  });

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (!data) return <Shell><p>Property not found.</p></Shell>;

  const { property, rooms } = data;
  // Carry a picked range into the room/lease flow so the selection persists.
  const datesQuery = datedSearch
    ? `?${new URLSearchParams({ checkIn, checkOut }).toString()}`
    : "";
  const busy = avail?.busy ?? [];
  const disabledDays = busyToDisabledMatchers(busy, {
    minDate: avail?.minDate ?? today,
    halfOpen: true, // STR: checkout day is free to check in
  });
  // Valid = availability is known AND a real forward range that doesn't straddle
  // a booked block. Until `avail` has loaded the busy set is unknown (defaults to
  // []), so we must NOT treat any range as bookable — otherwise a booked range
  // looks valid on first paint and "Continue" wrongly enables. The calendar also
  // prevents picking disabled days; this rejects a range spanning them. Server
  // re-validates on POST regardless.
  const availReady = !availLoading && !!avail;
  const datesValid = datesBookable(availReady, checkIn, checkOut, busy, true);
  const spansBooked =
    availReady &&
    !!checkIn &&
    !!checkOut &&
    checkOut > checkIn &&
    rangeHitsBusy(checkIn, checkOut, busy, true);

  function continueToCheckout() {
    const params = new URLSearchParams({ propertyId: property.id, checkIn, checkOut });
    navigate(`/checkout?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link href="/" className="bnp-pill mb-5 gap-1.5 border-primary bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground">
          <ArrowLeft className="h-4 w-4" /> All stays
        </Link>

        {/* Hero — STR gets a full gallery; co-living house shows a single image
            (you book a room, not the house, so the house just needs one photo). */}
        {property.type === "STR" ? (
          <ListingGallery
            id={property.id}
            photos={property.photos}
            alt={property.name}
            location={property.location}
            kind="STR"
            rounded="rounded-3xl"
          />
        ) : (
          <div className="relative aspect-[3/2] w-full overflow-hidden rounded-3xl">
            <ListingImage
              id={property.id}
              photos={property.photos}
              alt={property.name}
              location={property.location}
              kind="COLIVING"
              rounded="rounded-3xl"
            />
          </div>
        )}

        {/* STR reserves a right column for the sticky booking card; co-living has
            no sidebar, so details — and the room-card row — get the full width. */}
        <div className={`mt-6 grid gap-10 ${property.type === "STR" ? "lg:grid-cols-[1fr_360px]" : ""}`}>
          {/* Left: details */}
          <div>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                property.type === "STR"
                  ? "bg-accent text-accent-foreground"
                  : "bg-segment-room-tint text-segment-room"
              }`}
            >
              <span
                aria-hidden
                className={`h-2 w-2 rounded-full ${property.type === "STR" ? "bg-segment-whole" : "bg-segment-room"}`}
              />
              {property.type === "STR" ? "Whole property" : "By the room"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{property.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {property.location}
            </p>
            {/* Editorial listing story when structured content exists; falls
                back to plain prose. Coral accent for whole-property. */}
            <ListingStory
              content={property.listingContent}
              description={property.description}
              segment={property.type === "STR" ? "whole" : "room"}
              className="mt-6"
            />

            {/* What's included — most meaningful for co-living rooms (utilities,
                cleaning, etc. bundled into the weekly rate). */}
            {property.type === "COLIVING" && <InclusionsGrid variant="compact" className="mt-8" />}

            {/* Neighborhood storytelling, matched to the property's city. Renders
                nothing when the city has no entry. */}
            <NeighborhoodBlock city={cityOf(property.location)} className="mt-8" />

            {property.type === "COLIVING" && (
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold">Available rooms</h2>
                {/* One inline row on desktop (equal-width cards, any room count); stacked on mobile. */}
                <div className="mt-4 grid gap-5 md:grid-flow-col md:auto-cols-fr">
                  {rooms.map((room) => {
                    // Blocked for the SELECTED dates (Airbnb/lease) though its
                    // manual status may be AVAILABLE — only meaningful when a
                    // range is chosen (server returns availableForDates:true with
                    // no dates). A card is unavailable if its status isn't
                    // AVAILABLE OR it's blocked for the picked dates.
                    const roomBlocked = datedSearch && room.availableForDates === false;
                    const unavailable = room.status !== "AVAILABLE" || roomBlocked;
                    return (
                    <div key={room.id} className={`bnp-card bnp-card-interactive relative overflow-hidden ${roomBlocked ? "is-booked" : ""}`} data-testid={`card-room-${room.id}`}>
                      <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-[5px] bg-segment-room" />
                      <Link href={`/room/${room.id}${datesQuery}`} aria-label={`View ${room.name} details`} className="relative block aspect-[3/2] w-full" data-testid={`link-room-image-${room.id}`}>
                        <ListingImage id={room.id} photos={room.photos} alt={room.name} kind="ROOM" rounded="rounded-none" />
                      </Link>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 font-display font-semibold">{room.name}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${!unavailable ? "bg-good-bg text-good" : "bg-secondary text-muted-foreground"}`}>
                            {roomBlocked
                              ? "Unavailable for your dates"
                              : room.status === "AVAILABLE"
                                ? "Available"
                                : room.status === "HOLD"
                                  ? "On hold"
                                  : "Occupied"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">
                          <span className="font-semibold">{money(room.weeklyRent)}</span>
                          <span className="text-muted-foreground"> / week · {money(room.depositAmount)} deposit</span>
                        </p>
                        {!unavailable ? (
                          <Link href={`/room/${room.id}${datesQuery}`}>
                            <Button className="mt-3 min-h-11 w-full" data-testid={`button-room-${room.id}`}>
                              Reserve this room
                            </Button>
                          </Link>
                        ) : (
                          <Button className="mt-3 w-full" variant="secondary" disabled>
                            {roomBlocked ? "Unavailable for these dates" : "Not available"}
                          </Button>
                        )}
                      </div>
                    </div>
                    );
                  })}
                  {rooms.length === 0 && <p className="text-muted-foreground">No rooms listed yet.</p>}
                </div>
              </section>
            )}
          </div>

          {/* Right: sticky booking card (STR only) */}
          {property.type === "STR" && (
            <aside>
              <div className="bnp-card sticky top-24 p-6">
                {(() => {
                  // Lowest effective nightly across the configured tiers — the
                  // "from" price. Longer stays auto-apply weekly/monthly at checkout.
                  const nightly = fromNightly(property);
                  return (
                    <div>
                      <div className="flex items-baseline gap-1">
                        {nightly?.multiTier && <span className="text-muted-foreground">from</span>}
                        <span className="font-display text-2xl font-semibold">
                          {nightly ? money(String(nightly.from)) : "—"}
                        </span>
                        <span className="text-muted-foreground">/ night</span>
                      </div>
                      {nightly?.multiTier && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Weekly &amp; monthly rates apply automatically for longer stays.
                        </p>
                      )}
                    </div>
                  );
                })()}
                <div className="mt-4">
                  <DateRangePicker
                    checkIn={checkIn}
                    checkOut={checkOut}
                    onChange={({ checkIn: ci, checkOut: co }) => {
                      setCheckIn(ci);
                      setCheckOut(co);
                    }}
                    disabled={disabledDays}
                    data-testid="input-date-range"
                  />
                </div>
                {/* Stay total for the selected range — the checkout subtotal
                    (before tax & card fees, which are shown at checkout). Only
                    shown once a real, bookable range is picked. */}
                {datesValid && (
                  <div className="mt-4 border-t border-border pt-4">
                    {quoteError ? (
                      <p className="text-sm text-destructive" data-testid="text-quote-error">
                        {quoteErrorMessage(quoteError)}
                      </p>
                    ) : quoteLoading || !quote ? (
                      <p className="text-sm text-muted-foreground">Calculating your total…</p>
                    ) : (
                      <>
                        <div className="flex items-baseline justify-between">
                          <span className="text-sm font-medium">Stay total</span>
                          <span className="font-display text-2xl font-semibold" data-testid="text-stay-total">
                            {money(String(quote.dueNow.subtotal))}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Taxes &amp; card fees shown at checkout.
                        </p>
                      </>
                    )}
                  </div>
                )}
                <Button className="mt-4 w-full" size="lg" disabled={!datesValid} onClick={continueToCheckout} data-testid="button-continue-checkout">
                  Continue to checkout
                </Button>
                {spansBooked ? (
                  <p className="mt-2 text-xs text-destructive">
                    Those dates include already-booked nights. Pick an open range.
                  </p>
                ) : !availReady && (checkIn || checkOut) ? (
                  <p className="mt-2 text-xs text-muted-foreground">Checking availability…</p>
                ) : (
                  availReady &&
                  !datesValid &&
                  (checkIn || checkOut) && (
                    <p className="mt-2 text-xs text-destructive">Check-out must be after check-in.</p>
                  )
                )}
                <p className="mt-3 text-center text-xs text-muted-foreground">You won't be charged yet.</p>
              </div>
            </aside>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// apiRequest throws `${status}: ${body}` on a non-2xx; surface the server's
// `message` (e.g. "Those dates are not available") instead of an endless spinner.
function quoteErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = /^\d+:\s*(\{.*\})$/.exec(raw);
  if (m) {
    try {
      return JSON.parse(m[1]).message ?? "Those dates aren't available. Try another range.";
    } catch {
      /* fall through */
    }
  }
  return "Those dates aren't available. Try another range.";
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}

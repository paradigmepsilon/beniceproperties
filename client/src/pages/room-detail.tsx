// client/src/pages/room-detail.tsx
// Co-living room: hero image + sticky reserve card. The guest picks their term
// HERE (Move-in / Move-out, 7-night minimum, already-booked days greyed) and
// sees the stay total before continuing — short stays (7–28 nights) pay in full
// at /checkout; longer stays are set up as a lease (full schedule on /lease).

import { useState } from "react";
import { useParams, useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { ArrowLeft } from "lucide-react";
import type { Property, Room } from "@shared/schema";
import { COLIVING_MIN_DAYS, requiresLease, isDirectCoLivingStay } from "@shared/schema";
import type { QuoteResponse, LeaseQuoteResponse } from "@shared/api-types";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingStory } from "@/components/listing-story";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { NeighborhoodBlock } from "@/components/neighborhood-block";
import { DateRangePicker } from "@/components/date-range-picker";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cityOf, money } from "@/lib/format";
import { useRoomAvailability } from "@/hooks/use-availability";
import { busyToDisabledMatchers, rangeHitsBusy, datesBookable } from "@/lib/availability";

interface RoomResponse {
  room: Room;
  property: Property | undefined;
}

// apiRequest throws `${status}: ${body}` on a non-2xx; the body is usually JSON
// with a `message`. Pull that human message out so a failed quote shows why (e.g.
// "Those dates are not available for this room") instead of hanging on a spinner.
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

export default function RoomDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const searchStr = useSearch();
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading } = useQuery<RoomResponse>({ queryKey: ["/api/rooms", id!] });
  // Busy ranges (room-blocking leases ∪ Airbnb iCal blocks). `availLoading` gates
  // the CTA: until the busy set has loaded we must treat every range as
  // not-yet-known and keep the button disabled, or a booked range would look
  // bookable on first paint (busy defaults to [] before the query resolves).
  const { data: avail, isLoading: availLoading } = useRoomAvailability(id);

  // Derive room/property up front so the hooks below (which must run on EVERY
  // render, before the loading guard) have something to read. They're undefined
  // until the query resolves; the quote queries stay gated on `!!room`.
  const room = data?.room;
  const property = data?.property;

  // Seed the term from a range carried in from the property page / hero search
  // (?checkIn=&checkOut=) when it's a valid forward, not-past range; otherwise
  // leave both dates unset so the guest picks any available future range.
  const sp = new URLSearchParams(searchStr);
  const seededIn = sp.get("checkIn") ?? "";
  const seededOut = sp.get("checkOut") ?? "";
  const seedValid =
    /^\d{4}-\d{2}-\d{2}$/.test(seededIn) &&
    /^\d{4}-\d{2}-\d{2}$/.test(seededOut) &&
    seededIn >= today &&
    seededOut > seededIn;
  const [startDate, setStartDate] = useState(seedValid ? seededIn : "");
  const [endDate, setEndDate] = useState(seedValid ? seededOut : "");

  // Co-living disables the lease's end date too (a lease occupies it), so every
  // availability call here is inclusive: halfOpen=false.
  const busy = avail?.busy ?? [];
  const disabledDays = busyToDisabledMatchers(busy, {
    minDate: avail?.minDate ?? today,
    halfOpen: false,
  });
  // Availability must be LOADED before any range is treated as bookable — until
  // then the busy set is unknown (defaults to []) and a booked range would look
  // free on first paint. datesBookable hard-returns false while !availReady.
  const availReady = !availLoading && !!avail;
  const datesValid = datesBookable(availReady, startDate, endDate, busy, false);
  const spansBooked =
    availReady &&
    !!startDate &&
    !!endDate &&
    endDate >= startDate &&
    rangeHitsBusy(startDate, endDate, busy, false);

  // Term length (NIGHTS) decides the path — mirrors the server's shared gate and
  // the lease-booking page: <7 below minimum, 7–28 short direct booking, >28 lease.
  const termNights =
    startDate && endDate && endDate >= startDate
      ? differenceInCalendarDays(parseISO(endDate), parseISO(startDate))
      : 0;
  const isLeaseTerm = requiresLease(termNights); // > 28 nights
  const isShortStay = isDirectCoLivingStay(termNights); // 7–28 nights
  const isBelowMin = termNights > 0 && termNights < COLIVING_MIN_DAYS;

  // Lease-length total (> 28 nights). Same /api/lease-quote the /lease page uses,
  // so the previewed total lease value matches what's persisted + charged. Only
  // totalLeaseValue + depositTotal are read here; the full schedule lives on /lease.
  const leaseBody = { propertyId: room?.propertyId ?? "", roomIds: room ? [room.id] : [], startDate, endDate };
  const { data: leaseQuote, isLoading: leaseLoading, error: leaseError } = useQuery<LeaseQuoteResponse>({
    queryKey: ["/api/lease-quote", JSON.stringify(leaseBody)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/lease-quote", leaseBody);
      return res.json();
    },
    enabled: !!room && datesValid && isLeaseTerm,
  });

  // Short-stay total (7–28 nights). Same /api/quote the checkout page uses, at
  // STRIPE, so the shown subtotal is exactly the checkout subtotal.
  const shortBody = {
    propertyId: room?.propertyId ?? "",
    roomId: room?.id ?? "",
    checkIn: startDate,
    checkOut: endDate,
    paymentMethod: "STRIPE" as const,
  };
  const { data: shortQuote, isLoading: shortLoading, error: shortError } = useQuery<QuoteResponse>({
    queryKey: ["/api/quote", JSON.stringify(shortBody)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/quote", shortBody);
      return res.json();
    },
    enabled: !!room && datesValid && isShortStay,
  });

  if (isLoading || !room) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12 text-muted-foreground">
          {isLoading ? "Loading…" : "Room not found."}
        </main>
        <SiteFooter />
      </div>
    );
  }

  function proceedToCheckout() {
    // Short co-living stay (7–28 nights) → the same direct-booking checkout STR
    // uses. Full stay total paid upfront; /checkout collects identity + method.
    const qs = new URLSearchParams({ propertyId: room!.propertyId, roomId: room!.id, checkIn: startDate, checkOut: endDate });
    navigate(`/checkout?${qs.toString()}`);
  }
  function proceedToLease() {
    // Lease-length stay (> 28 nights) → the lease flow (cadence + full schedule +
    // signature). Carry the picked term so /lease seeds from it.
    const qs = new URLSearchParams({ propertyId: room!.propertyId, roomId: room!.id, checkIn: startDate, checkOut: endDate });
    navigate(`/lease?${qs.toString()}`);
  }

  // The reserve CTA can only fire once the relevant total has loaded (mirrors
  // lease-booking's canProceed) so a click never runs ahead of a known price.
  const notAvailable = room.status !== "AVAILABLE";
  const quoteReady = isShortStay ? !!shortQuote : isLeaseTerm ? !!leaseQuote : false;
  const ctaDisabled = notAvailable || !datesValid || isBelowMin || !quoteReady;
  const ctaLabel = notAvailable
    ? "Not available"
    : !datesValid
      ? "Select your dates"
      : isBelowMin
        ? `Minimum ${COLIVING_MIN_DAYS} nights`
        : isShortStay
          ? "Continue to checkout"
          : "Review & sign lease";

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {property && (
          <Link href={`/property/${property.id}`} className="bnp-pill mb-5 gap-1.5 border-primary bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> {property.name}
          </Link>
        )}

        <ListingGallery id={room.id} photos={room.photos} alt={room.name} kind="ROOM" rounded="rounded-3xl" />

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-segment-room-tint px-3 py-1 text-xs font-semibold text-segment-room">
              <span aria-hidden className="h-2 w-2 rounded-full bg-segment-room" />
              By the room
            </span>
            <p className="mt-3 text-sm text-muted-foreground">{property?.name}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{room.name}</h1>
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-bold ${room.status === "AVAILABLE" ? "bg-good-bg text-good" : "bg-secondary text-muted-foreground"}`}>
              {room.status === "AVAILABLE" ? "Available" : room.status === "HOLD" ? "On hold" : "Occupied"}
            </span>
            {/* Editorial listing story (hook, essentials, getting-around, who-for)
                when structured content exists; falls back to plain prose. */}
            <ListingStory
              content={room.listingContent}
              description={room.description}
              segment="room"
              className="mt-6"
            />

            {/* What's included in the weekly rate, then the neighborhood. */}
            <InclusionsGrid variant="compact" className="mt-8" />
            {property && <NeighborhoodBlock city={cityOf(property.location)} className="mt-8" />}
          </div>

          <aside>
            <div className="bnp-card sticky top-24 overflow-hidden p-6">
              <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-segment-room" />
              <h2 className="font-display text-lg font-semibold">Reserve this room</h2>

              {/* Pick the term here. The picker greys already-booked days (same
                  busy set the read-only calendar used to show) and enforces the
                  7-night co-living minimum. */}
              <div className="mt-4">
                <DateRangePicker
                  checkIn={startDate}
                  checkOut={endDate}
                  onChange={({ checkIn, checkOut }) => {
                    setStartDate(checkIn);
                    setEndDate(checkOut);
                  }}
                  disabled={disabledDays}
                  minNights={COLIVING_MIN_DAYS}
                  startLabel="Move-in"
                  endLabel="Move-out"
                  data-testid="input-room-dates"
                />
                {spansBooked ? (
                  <p className="mt-2 text-xs text-destructive">
                    Those dates include nights this room is already booked. Pick an open range.
                  </p>
                ) : !availReady && (startDate || endDate) ? (
                  <p className="mt-2 text-xs text-muted-foreground">Checking availability…</p>
                ) : isBelowMin ? (
                  <p className="mt-2 text-xs text-destructive" data-testid="text-below-min">
                    Co-living stays have a {COLIVING_MIN_DAYS}-night minimum. Extend your dates.
                  </p>
                ) : isShortStay ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Short stay ({termNights} nights) — pay in full at checkout.
                  </p>
                ) : isLeaseTerm ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Stays over a month are set up as a lease you sign on the next step.
                  </p>
                ) : null}
              </div>

              {/* Weekly rate is the persistent price anchor. The move-in deposit
                  applies only to lease-length stays (> 28 nights / a month or more) —
                  short-stay guests don't pay one — so its line is shown only once the
                  picked term qualifies as a lease. */}
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Weekly rent</span>
                  <span className="font-medium">{money(room.weeklyRent)} / wk</span>
                </div>
                {isLeaseTerm && (
                  <>
                    <Separator />
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground">Move-in deposit (now)</span>
                      <span className="font-medium">{money(room.depositAmount)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground" data-testid="text-deposit-note">
                      Refundable deposit held for incidentals, returned to you upon checkout.
                    </p>
                  </>
                )}
              </div>

              {/* Stay total once a real, bookable range is picked. Short stays show
                  the checkout subtotal (matches the STR page); lease-length stays
                  show the total lease value with the deposit due now called out. */}
              {datesValid && isShortStay && (
                <div className="mt-4 border-t border-border pt-4">
                  {shortError ? (
                    <p className="text-sm text-destructive" data-testid="text-quote-error">
                      {quoteErrorMessage(shortError)}
                    </p>
                  ) : shortLoading || !shortQuote ? (
                    <p className="text-sm text-muted-foreground">Calculating your total…</p>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">Stay total</span>
                        <span className="font-display text-2xl font-semibold" data-testid="text-stay-total">
                          {money(String(shortQuote.dueNow.subtotal))}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Taxes &amp; card fees shown at checkout.
                      </p>
                    </>
                  )}
                </div>
              )}
              {datesValid && isLeaseTerm && (
                <div className="mt-4 border-t border-border pt-4">
                  {leaseError ? (
                    <p className="text-sm text-destructive" data-testid="text-lease-error">
                      {quoteErrorMessage(leaseError)}
                    </p>
                  ) : leaseLoading || !leaseQuote ? (
                    <p className="text-sm text-muted-foreground">Calculating your total…</p>
                  ) : (
                    <>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-medium">Total lease value</span>
                        <span className="font-display text-2xl font-semibold" data-testid="text-lease-total">
                          {money(String(leaseQuote.totalLeaseValue))}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Due now: {money(String(leaseQuote.depositTotal))} deposit
                        {leaseQuote.cleaningFeeTotal > 0
                          ? ` + ${money(String(leaseQuote.cleaningFeeTotal))} cleaning fee`
                          : ""}
                        . Full payment schedule on the next step.
                      </p>
                    </>
                  )}
                </div>
              )}

              <Button className="mt-5 w-full" size="lg" disabled={ctaDisabled} onClick={isShortStay ? proceedToCheckout : proceedToLease} data-testid="button-reserve-room">
                {ctaLabel}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {isShortStay ? "You won't be charged yet." : "Weekly billing starts after move-in."}
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

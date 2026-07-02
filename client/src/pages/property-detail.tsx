// client/src/pages/property-detail.tsx
// STR: hero image + sticky booking card (dates → checkout).
// COLIVING: hero + photo-forward room cards → room detail.

import { useState } from "react";
import { Link, useParams, useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft } from "lucide-react";
import type { Property, Room } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingImage } from "@/components/listing-image";
import { ListingGallery } from "@/components/listing-gallery";
import { RichText } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { fromNightly, money } from "@/lib/format";

interface DetailResponse {
  property: Property;
  rooms: Room[];
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<DetailResponse>({ queryKey: ["/api/properties", id!] });
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

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading…</p></Shell>;
  if (!data) return <Shell><p>Property not found.</p></Shell>;

  const { property, rooms } = data;
  const datesValid = checkIn && checkOut && checkOut > checkIn;

  function continueToCheckout() {
    const params = new URLSearchParams({ propertyId: property.id, checkIn, checkOut });
    navigate(`/checkout?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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
            {/* BT-21: full long-form description with paragraph breaks preserved
                (renders nothing when empty). */}
            <RichText text={property.description} className="mt-6 max-w-2xl" />

            {property.type === "COLIVING" && (
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold">Available rooms</h2>
                {/* One inline row on desktop (equal-width cards, any room count); stacked on mobile. */}
                <div className="mt-4 grid gap-5 md:grid-flow-col md:auto-cols-fr">
                  {rooms.map((room) => (
                    <div key={room.id} className="bnp-card bnp-card-interactive relative overflow-hidden" data-testid={`card-room-${room.id}`}>
                      <span aria-hidden className="absolute inset-y-0 left-0 z-10 w-[5px] bg-segment-room" />
                      <Link href={`/room/${room.id}`} aria-label={`View ${room.name} details`} className="relative block aspect-[3/2] w-full" data-testid={`link-room-image-${room.id}`}>
                        <ListingImage id={room.id} photos={room.photos} alt={room.name} kind="ROOM" rounded="rounded-none" />
                      </Link>
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="min-w-0 font-display font-semibold">{room.name}</h3>
                          <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${room.status === "AVAILABLE" ? "bg-good-bg text-good" : "bg-secondary text-muted-foreground"}`}>
                            {room.status === "AVAILABLE" ? "Available" : room.status === "HOLD" ? "On hold" : "Occupied"}
                          </span>
                        </div>
                        <p className="mt-2 text-sm">
                          <span className="font-semibold">{money(room.weeklyRent)}</span>
                          <span className="text-muted-foreground"> / week · {money(room.depositAmount)} deposit</span>
                        </p>
                        {room.status === "AVAILABLE" ? (
                          <Link href={`/room/${room.id}`}>
                            <Button className="mt-3 w-full" size="sm" data-testid={`button-room-${room.id}`}>
                              Reserve this room
                            </Button>
                          </Link>
                        ) : (
                          <Button className="mt-3 w-full" size="sm" variant="secondary" disabled>
                            Not available
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
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
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="checkIn" className="text-xs">Check-in</Label>
                    <Input id="checkIn" type="date" min={today} value={checkIn} onChange={(e) => setCheckIn(e.target.value)} data-testid="input-checkin" />
                  </div>
                  <div>
                    <Label htmlFor="checkOut" className="text-xs">Check-out</Label>
                    <Input id="checkOut" type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} data-testid="input-checkout" />
                  </div>
                </div>
                <Button className="mt-4 w-full" size="lg" disabled={!datesValid} onClick={continueToCheckout} data-testid="button-continue-checkout">
                  Continue to checkout
                </Button>
                {!datesValid && (checkIn || checkOut) && (
                  <p className="mt-2 text-xs text-destructive">Check-out must be after check-in.</p>
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

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}

// client/src/pages/property-detail.tsx
// STR: hero image + sticky booking card (dates → checkout).
// COLIVING: hero + photo-forward room cards → room detail.

import { useState } from "react";
import { Link, useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ArrowLeft } from "lucide-react";
import type { Property, Room } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";

interface DetailResponse {
  property: Property;
  rooms: Room[];
}

export default function PropertyDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<DetailResponse>({ queryKey: ["/api/properties", id!] });
  const today = new Date().toISOString().slice(0, 10);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

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

        {/* Hero */}
        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-3xl">
          <ListingImage
            id={property.id}
            photos={property.photos}
            alt={property.name}
            location={property.location}
            kind={property.type as "STR" | "COLIVING"}
            rounded="rounded-3xl"
          />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          {/* Left: details */}
          <div>
            <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-semibold text-accent-foreground">
              {property.type === "STR" ? "Whole property" : "By the room"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">{property.name}</h1>
            <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
              <MapPin className="h-4 w-4" /> {property.location}
            </p>
            <p className="mt-6 max-w-2xl leading-relaxed text-foreground/90">{property.description}</p>

            {property.type === "COLIVING" && (
              <section className="mt-10">
                <h2 className="font-display text-xl font-semibold">Available rooms</h2>
                <div className="mt-4 grid gap-5 sm:grid-cols-2">
                  {rooms.map((room) => (
                    <div key={room.id} className="bnp-card bnp-card-interactive overflow-hidden" data-testid={`card-room-${room.id}`}>
                      <div className="relative aspect-[3/2] w-full">
                        <ListingImage id={room.id} photos={room.photos} alt={room.name} kind="ROOM" rounded="rounded-none" />
                      </div>
                      <div className="p-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold">{room.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${room.status === "AVAILABLE" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
                            {room.status}
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
                  const cand = [
                    property.dailyRate ?? property.basePrice,
                    property.weeklyRate ? String(parseFloat(property.weeklyRate) / 7) : null,
                    property.monthlyRate ? String(parseFloat(property.monthlyRate) / 28) : null,
                  ]
                    .map((v) => (v ? parseFloat(v) : NaN))
                    .filter((n) => Number.isFinite(n) && n > 0);
                  const from = cand.length ? Math.min(...cand) : null;
                  const multiTier = cand.length > 1;
                  return (
                    <div>
                      <div className="flex items-baseline gap-1">
                        {multiTier && <span className="text-muted-foreground">from</span>}
                        <span className="font-display text-2xl font-semibold">
                          {from != null ? money(String(from)) : "—"}
                        </span>
                        <span className="text-muted-foreground">/ night</span>
                      </div>
                      {multiTier && (
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

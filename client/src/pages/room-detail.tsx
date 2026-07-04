// client/src/pages/room-detail.tsx
// Co-living room: hero image + sticky reserve card (deposit now, weekly after).

import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Property, Room } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingGallery } from "@/components/listing-gallery";
import { ListingStory } from "@/components/listing-story";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Separator } from "@/components/ui/separator";
import { money } from "@/lib/format";
import { useRoomAvailability } from "@/hooks/use-availability";
import { busyToDisabledMatchers } from "@/lib/availability";

interface RoomResponse {
  room: Room;
  property: Property | undefined;
}

export default function RoomDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<RoomResponse>({ queryKey: ["/api/rooms", id!] });
  // Busy ranges (room-blocking leases ∪ Airbnb iCal blocks) so the guest can see
  // when this room is taken before starting the lease flow. Read-only here.
  const { data: avail } = useRoomAvailability(id);

  if (isLoading || !data?.room) {
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

  const { room, property } = data;
  function reserve() {
    // Co-living rooms go through the lease flow (term + cadence + full payment
    // schedule preview), not the one-time STR checkout.
    const params = new URLSearchParams({ propertyId: room.propertyId, roomId: room.id });
    navigate(`/lease?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {property && (
          <Link href={`/property/${property.id}`} className="mb-5 inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
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
          </div>

          <aside>
            <div className="bnp-card sticky top-24 overflow-hidden p-6">
              <span aria-hidden className="absolute inset-y-0 left-0 w-[5px] bg-segment-room" />
              <h2 className="font-display text-lg font-semibold">Reserve this room</h2>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Move-in deposit (now)</span>
                  <span className="font-display text-xl font-semibold">{money(room.depositAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Weekly rent (after move-in)</span>
                  <span className="font-medium">{money(room.weeklyRent)} / wk</span>
                </div>
              </div>
              <Button className="mt-5 w-full" size="lg" disabled={room.status !== "AVAILABLE"} onClick={reserve} data-testid="button-reserve-room">
                {room.status === "AVAILABLE" ? "Reserve & pay deposit" : "Not available"}
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">Weekly billing starts after move-in.</p>
            </div>

            {/* Read-only availability — greys out dates this room is taken
                (existing leases + this room's Airbnb calendar) so the guest sees
                openings before starting the lease. Shown only when something is
                booked; the lease page enforces the dates. */}
            {(avail?.busy?.length ?? 0) > 0 && (
              <div className="bnp-card mt-5 p-4" data-testid="room-availability">
                <h3 className="px-1 font-display text-sm font-semibold">Availability</h3>
                <p className="px-1 text-xs text-muted-foreground">Greyed dates are already booked.</p>
                <Calendar
                  mode="single"
                  numberOfMonths={1}
                  disabled={busyToDisabledMatchers(avail!.busy, {
                    minDate: avail!.minDate,
                    halfOpen: false, // a lease occupies its end date
                  })}
                  className="mt-1"
                />
              </div>
            )}
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

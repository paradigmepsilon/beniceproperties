// client/src/pages/room-detail.tsx
// Co-living room: hero image + sticky reserve card (deposit now, weekly after).

import { useParams, useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { Property, Room } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingImage } from "@/components/listing-image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { money } from "@/lib/format";

interface RoomResponse {
  room: Room;
  property: Property | undefined;
}

export default function RoomDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { data, isLoading } = useQuery<RoomResponse>({ queryKey: ["/api/rooms", id!] });

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
    const params = new URLSearchParams({ propertyId: room.propertyId, roomId: room.id });
    navigate(`/checkout?${params.toString()}`);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        {property && (
          <Link href={`/property/${property.id}`} className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> {property.name}
          </Link>
        )}

        <div className="relative aspect-[16/7] w-full overflow-hidden rounded-3xl">
          <ListingImage id={room.id} photos={room.photos} alt={room.name} kind="ROOM" rounded="rounded-3xl" />
        </div>

        <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="text-sm text-muted-foreground">{property?.name}</p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{room.name}</h1>
            <span className={`mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold ${room.status === "AVAILABLE" ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"}`}>
              {room.status}
            </span>
            {room.description && <p className="mt-6 max-w-2xl leading-relaxed text-foreground/90">{room.description}</p>}
          </div>

          <aside>
            <div className="bnp-card sticky top-24 p-6">
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
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

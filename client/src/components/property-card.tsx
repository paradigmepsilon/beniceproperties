// client/src/components/property-card.tsx
// Listing card for the home grid. Template anatomy: left segment accent bar,
// segment pill (dot + label), availability status pill, photo with hover zoom,
// serif name, city, price, rating. Fully-booked cards are demoted (.is-booked)
// and show "Next opening · <date>" when the server knows one.

import { Link } from "wouter";
import { MapPin, Star } from "lucide-react";
import type { PropertyListItem } from "@shared/schema";
import { ListingImage } from "@/components/listing-image";
import { cityOf, fromNightly, money, shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

// Placeholder until real review data exists — shipped verbatim from the design
// template by owner decision. Edit here.
const RATING_PLACEHOLDER = "4.9";

/** Bookable right now? COLIVING: any AVAILABLE room. STR: no stay covers today. */
export function isBookedNow(p: PropertyListItem): boolean {
  return p.type === "COLIVING" ? !p.fromWeeklyRent : p.nextOpening != null;
}

interface Props {
  property: PropertyListItem;
  /** Hero-search dates; carried into the detail link so booking can prefill. */
  checkIn?: string;
  checkOut?: string;
}

export function PropertyCard({ property: p, checkIn, checkOut }: Props) {
  const isRoom = p.type === "COLIVING";
  const booked = isBookedNow(p);
  const nightly = p.type === "STR" ? fromNightly(p) : null;

  const datesQuery =
    checkIn && checkOut && checkOut > checkIn
      ? `?${new URLSearchParams({ checkIn, checkOut }).toString()}`
      : "";

  return (
    <Link href={`/property/${p.id}${datesQuery}`}>
      <article
        className={cn(
          "group bnp-card bnp-card-interactive relative flex h-full cursor-pointer flex-col overflow-hidden",
          booked && "is-booked",
        )}
        data-testid={`card-property-${p.id}`}
      >
        {/* Segment accent bar — whole-property coral vs by-the-room teal. */}
        <span
          aria-hidden
          className={cn(
            "absolute inset-y-0 left-0 z-10 w-[5px]",
            isRoom ? "bg-segment-room" : "bg-segment-whole",
          )}
        />

        <div className="relative aspect-[4/3] w-full overflow-hidden">
          <ListingImage
            id={p.id}
            photos={p.photos}
            alt={p.name}
            location={p.location}
            kind={p.type as "STR" | "COLIVING"}
            rounded="rounded-none"
            className="h-full w-full transition-transform duration-300 group-hover:scale-[1.05]"
          />
          <span className="absolute left-3.5 top-3.5 flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur">
            <span
              aria-hidden
              className={cn(
                "h-2 w-2 rounded-full",
                isRoom ? "bg-segment-room" : "bg-segment-whole",
              )}
            />
            {isRoom ? "By the room" : "Whole property"}
          </span>
          <span
            className={cn(
              "absolute right-3.5 top-3.5 rounded-full px-2.5 py-1 text-xs font-bold",
              booked ? "bg-secondary text-muted-foreground" : "bg-good-bg text-good",
            )}
          >
            {booked ? "Fully booked" : "Available"}
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-1 p-4">
          <h3 className="font-display text-lg font-semibold leading-snug">{p.name}</h3>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> {cityOf(p.location)}
          </p>
          {booked && p.nextOpening && (
            <p className="text-xs font-semibold text-primary">
              Next opening · {shortDate(p.nextOpening)}
            </p>
          )}
          <div className="mt-auto flex items-center justify-between pt-3">
            <p className="text-sm">
              {p.type === "STR" ? (
                nightly ? (
                  <>
                    {nightly.multiTier && <span className="text-muted-foreground">from </span>}
                    <span className="font-display text-lg font-semibold">
                      {money(String(nightly.from))}
                    </span>
                    <span className="text-muted-foreground"> / night</span>
                  </>
                ) : (
                  <span className="font-medium">Available</span>
                )
              ) : p.fromWeeklyRent ? (
                <>
                  <span className="text-muted-foreground">from </span>
                  <span className="font-display text-lg font-semibold">
                    {money(p.fromWeeklyRent)}
                  </span>
                  <span className="text-muted-foreground"> / week</span>
                </>
              ) : (
                <span className="font-medium">Fully booked</span>
              )}
            </p>
            <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
              <Star className="h-3.5 w-3.5 fill-[#E0A100] text-[#E0A100]" /> {RATING_PLACEHOLDER}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

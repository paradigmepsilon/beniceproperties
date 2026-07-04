// client/src/components/property-card.tsx
// Listing card for the home grid. Template anatomy: left segment accent bar,
// segment pill (dot + label), availability status pill, photo with hover zoom,
// serif name, city, price, rating. Fully-booked cards are demoted (.is-booked)
// and show "Next opening · <date>" when the server knows one.

import { Link } from "wouter";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { MapPin, Star } from "lucide-react";
import { COLIVING_MIN_DAYS, type PropertyListItem } from "@shared/schema";
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

/** Is a complete date search active (both dates set, forward range)? */
export function isDatedSearch(checkIn?: string, checkOut?: string): boolean {
  return Boolean(checkIn && checkOut && checkOut > checkIn);
}

/**
 * Should the card read as unavailable? During a date search, availability is
 * governed by the searched range (`availableForDates`); with no dates, by the
 * date-blind "booked now" status. Used by both the card and the home-grid sort
 * so they agree on which cards are demoted.
 */
export function cardUnavailable(p: PropertyListItem, checkIn?: string, checkOut?: string): boolean {
  return isDatedSearch(checkIn, checkOut) ? !p.availableForDates : isBookedNow(p);
}

interface Props {
  property: PropertyListItem;
  /** Hero-search dates; carried into the detail link so booking can prefill. */
  checkIn?: string;
  checkOut?: string;
}

export function PropertyCard({ property: p, checkIn, checkOut }: Props) {
  const isRoom = p.type === "COLIVING";
  const dated = isDatedSearch(checkIn, checkOut);
  // During a date search the searched range decides availability; otherwise the
  // date-blind "booked now" status. `dateBlocked` = specifically unavailable for
  // the searched dates (drives the "Unavailable for your dates" badge/copy).
  const booked = cardUnavailable(p, checkIn, checkOut);
  const dateBlocked = dated && !p.availableForDates;
  // A co-living card blocked specifically because the searched range is under the
  // 7-night minimum (not a date conflict). Drives a reason-specific message so the
  // guest knows to extend their stay, not that the room is taken.
  const belowColivingMin =
    isRoom &&
    dated &&
    differenceInCalendarDays(parseISO(checkOut!), parseISO(checkIn!)) < COLIVING_MIN_DAYS;
  const nightly = p.type === "STR" ? fromNightly(p) : null;

  const datesQuery = dated
    ? `?${new URLSearchParams({ checkIn: checkIn!, checkOut: checkOut! }).toString()}`
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
            {belowColivingMin
              ? "7-night minimum"
              : dateBlocked
                ? "Unavailable for your dates"
                : booked
                  ? "Fully booked"
                  : "Available"}
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
              {belowColivingMin ? (
                // Blocked because the searched stay is under the co-living minimum
                // — tell the guest the rule, not that the room is taken.
                <span className="font-medium text-muted-foreground">
                  Co-living properties have a 7-day minimum stay requirement
                </span>
              ) : dateBlocked ? (
                // Specifically blocked for the searched range — say so instead of
                // a price. (The card is greyed via .is-booked; keep it visible.)
                <span className="font-medium text-muted-foreground">Not available for these dates</span>
              ) : p.type === "STR" ? (
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

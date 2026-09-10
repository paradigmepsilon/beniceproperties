// client/src/components/listings-section.tsx
// Shared listings grid used by the home (co-living), /str, and /ltr pages. Owns
// the /api/properties fetch, city filtering, availability sort, optional date
// search bar, and the PropertyCard grid — so the three section pages differ only
// in which property type they show and their surrounding page chrome.
//
// `type` narrows the grid to one product ("COLIVING" | "STR" | "LTR"). When
// `enableDateSearch` is set, a SearchBar rides on the hero and dates flow into
// the grid (re-priced/re-filtered by /api/properties) and onto card links so the
// booking flow prefills. LTR has no availability, so it renders without a search
// bar and dates never apply. `searchPlacement` puts whichever bar is enabled
// above the heading (default) or below the grid.

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import type { PropertyListItem } from "@shared/schema";
import { PropertyCard, cardUnavailable } from "@/components/property-card";
import { visibleProperties } from "@/lib/visibility";
import { SearchBar } from "@/components/search-bar";
import { ColivingSearchBar } from "@/components/coliving-search-bar";
import { cityOf } from "@/lib/format";
import { cn } from "@/lib/utils";

type ProductType = "COLIVING" | "STR" | "LTR";

interface Props {
  /** Which product this section lists. */
  type: ProductType;
  /** Section heading, e.g. "Available rooms". */
  heading: string;
  /** One-line subhead under the heading. */
  subhead?: string;
  /** Show the Where + dates search bar (STR only — LTR/co-living can opt out). */
  enableDateSearch?: boolean;
  /**
   * Show the co-living rooms search bar (Where + Move-in + Weekly budget). For
   * the co-living home. Where + budget filter the grid; move-in is prefill only
   * (no live co-living availability backend). Mutually exclusive with
   * enableDateSearch — a section lists one product, so it needs one bar.
   */
  enableColivingSearch?: boolean;
  /**
   * Where the search band sits relative to the heading + grid. "top" (default)
   * is the classic search-then-browse order; "bottom" leads with the inventory
   * and puts the refine controls under it. "external" renders nothing inline —
   * use with `portalTargetId` to place the bar elsewhere on the page while this
   * section still owns its data/filter state. Applies to whichever bar is enabled.
   */
  searchPlacement?: "top" | "bottom" | "external";
  /**
   * DOM id of an element (rendered elsewhere on the page) to portal the search
   * band into. Only used when `searchPlacement` is "external".
   */
  portalTargetId?: string;
  /** DOM id for #hash scroll targets (e.g. "stays"). */
  id?: string;
  className?: string;
}

export function ListingsSection({
  type,
  heading,
  subhead,
  enableDateSearch = false,
  enableColivingSearch = false,
  searchPlacement = "top",
  portalTargetId,
  id,
  className,
}: Props) {
  const [portalEl, setPortalEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (searchPlacement === "external" && portalTargetId) {
      setPortalEl(document.getElementById(portalTargetId));
    }
  }, [searchPlacement, portalTargetId]);

  const [city, setCity] = useState<string>("ALL");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  // Co-living search state. moveIn is prefill/display only (see prop docs).
  const [moveIn, setMoveIn] = useState("");
  const [budget, setBudget] = useState("ALL");

  // Only send dates to the grid when BOTH are set and form a forward range.
  const datedSearch = enableDateSearch && Boolean(checkIn && checkOut && checkOut > checkIn);
  const { data, isLoading, error } = useQuery<PropertyListItem[]>({
    queryKey: ["/api/properties", { checkIn: datedSearch ? checkIn : "", checkOut: datedSearch ? checkOut : "" }],
    queryFn: async () => {
      const qs = datedSearch ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      const res = await fetch(`/api/properties${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  // Narrow to this section's product type first, then derive its cities.
  const ofType = useMemo(() => (data ?? []).filter((p) => p.type === type), [data, type]);
  const cities = useMemo(() => {
    const set = new Set(ofType.map((p) => cityOf(p.location)));
    return Array.from(set).sort();
  }, [ofType]);

  // Budget caps for the co-living search — rounded-up $100 tiers spanning the
  // actual "from" weekly rents in this section, so every option matches ≥1 room.
  const budgets = useMemo(() => {
    if (!enableColivingSearch) return [];
    const rents = ofType
      .map((p) => Number(p.fromWeeklyRent))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (rents.length === 0) return [];
    const max = Math.ceil(Math.max(...rents) / 100) * 100;
    const tiers: number[] = [];
    for (let cap = 200; cap <= max; cap += 100) tiers.push(cap);
    return tiers;
  }, [ofType, enableColivingSearch]);

  const filtered = useMemo(() => {
    const cap = budget === "ALL" ? Infinity : Number(budget);
    // During a dated search a guest only sees listings free for those dates
    // (client/src/lib/visibility.ts); undated browsing keeps "Next opening" cards.
    const matches = visibleProperties(ofType, datedSearch).filter((p) => {
      if (city !== "ALL" && cityOf(p.location) !== city) return false;
      // Budget filter (co-living only): drop rooms whose "from" weekly rent
      // exceeds the cap. Properties with no rent shown are kept (nothing to compare).
      if (enableColivingSearch && Number.isFinite(cap)) {
        const rent = Number(p.fromWeeklyRent);
        if (Number.isFinite(rent) && rent > cap) return false;
      }
      return true;
    });
    // Available inventory first; unavailable cards demoted to the tail (stable).
    const unavail = (p: PropertyListItem) => Number(cardUnavailable(p, checkIn, checkOut));
    return [...matches].sort((a, b) => unavail(a) - unavail(b));
  }, [ofType, city, budget, enableColivingSearch, checkIn, checkOut, datedSearch]);

  function scrollToStays() {
    if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }

  // Full-bleed band: breaks out of the page's max-w container so the bar spans
  // the full viewport width, with a hairline band behind it. Rendered above the
  // heading or below the grid depending on `searchPlacement`.
  const searchBand = (enableDateSearch || enableColivingSearch) && (
    <div
      className={cn(
        "relative left-1/2 right-1/2 -mx-[50vw] w-screen border-y bg-card py-6",
        searchPlacement === "bottom" && "mt-14",
        searchPlacement === "top" && "mb-8",
      )}
    >
      <div className="mx-auto w-full max-w-6xl px-6">
        {enableDateSearch ? (
          <SearchBar
            cities={cities}
            value={{ city, checkIn, checkOut }}
            onChange={(v) => {
              setCity(v.city);
              setCheckIn(v.checkIn);
              setCheckOut(v.checkOut);
            }}
            onSearch={scrollToStays}
          />
        ) : (
          <ColivingSearchBar
            cities={cities}
            budgets={budgets}
            value={{ city, moveIn, budget }}
            onChange={(v) => {
              setCity(v.city);
              setMoveIn(v.moveIn);
              setBudget(v.budget);
            }}
            onSearch={scrollToStays}
          />
        )}
      </div>
    </div>
  );

  return (
    <section id={id} className={cn("scroll-mt-24", className)}>
      {searchPlacement === "external" && portalEl && searchBand && createPortal(searchBand, portalEl)}
      {searchPlacement === "top" && searchBand}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
          {subhead && <p className="mt-1.5 text-sm text-muted-foreground">{subhead}</p>}
        </div>
        {city !== "ALL" && (
          <button
            onClick={() => setCity("ALL")}
            className="bnp-pill inline-flex items-center gap-1.5 bg-card text-sm hover:border-primary hover:text-primary"
            data-testid="button-view-all"
          >
            View all
          </button>
        )}
      </div>

      {/* City filter chips (only when there's more than one city). */}
      {cities.length > 1 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setCity("ALL")}
            className={cn("bnp-chip", city === "ALL" && "bnp-chip-active")}
            data-testid="filter-location-ALL"
          >
            All locations
          </button>
          {cities.map((c) => (
            <button
              key={c}
              onClick={() => setCity(city === c ? "ALL" : c)}
              className={cn("bnp-chip", city === c && "bnp-chip-active")}
              data-testid={`filter-location-${c}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8">
        {isLoading && <GridSkeleton />}
        {error && <p className="text-destructive">Could not load inventory.</p>}
        {data && filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground" data-testid="text-no-listings">
            {datedSearch
              ? "Nothing is available for those dates. Try different dates."
              : "Nothing listed here yet. Check back soon."}
          </p>
        )}
        {data && datedSearch && filtered.length > 0 && filtered.length < ofType.length && (
          <p className="mb-4 text-sm text-muted-foreground" data-testid="text-listings-hidden">
            Showing only what is available for your dates.
          </p>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <PropertyCard key={p.id} property={p} checkIn={checkIn} checkOut={checkOut} />
          ))}
        </div>
      </div>

      {searchPlacement === "bottom" && searchBand}
    </section>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bnp-card animate-pulse overflow-hidden">
          <div className="aspect-[4/3] w-full bg-secondary" />
          <div className="p-4">
            <div className="h-4 w-2/3 rounded bg-secondary" />
            <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

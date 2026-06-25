// client/src/pages/home.tsx
// Modern booking-site home: hero + sticky filter bar + photo-forward card grid.

import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star } from "lucide-react";
import type { Property } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { ListingImage } from "@/components/listing-image";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type TypeFilter = "ALL" | "STR" | "COLIVING";

export default function Home() {
  const { data, isLoading, error } = useQuery<Property[]>({ queryKey: ["/api/properties"] });
  const [location, setLocation] = useState<string>("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");

  const locations = useMemo(() => {
    const set = new Set((data ?? []).map((p) => p.location));
    return ["ALL", ...Array.from(set).sort()];
  }, [data]);

  const filtered = (data ?? []).filter(
    (p) => (location === "ALL" || p.location === location) && (type === "ALL" || p.type === type),
  );

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-accent/40">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-primary">
            Atlanta &amp; Antigua
          </p>
          <h1 className="max-w-2xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Find a place to stay that feels like yours.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-muted-foreground">
            Whole-home getaways and by-the-room co-living — book in minutes, pay your way.
          </p>
        </div>
      </section>

      {/* Sticky filter bar */}
      <div className="sticky top-[65px] z-30 border-b bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-3 px-6 py-3">
          <FilterGroup label="Where">
            {locations.map((loc) => (
              <button
                key={loc}
                onClick={() => setLocation(loc)}
                className={cn(
                  "bnp-pill",
                  location === loc
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-secondary",
                )}
                data-testid={`filter-location-${loc}`}
              >
                {loc === "ALL" ? "All locations" : loc}
              </button>
            ))}
          </FilterGroup>
          <FilterGroup label="Type">
            {(["ALL", "STR", "COLIVING"] as TypeFilter[]).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  "bnp-pill",
                  type === t ? "border-primary bg-primary text-primary-foreground" : "hover:bg-secondary",
                )}
                data-testid={`filter-type-${t}`}
              >
                {t === "ALL" ? "All" : t === "STR" ? "Whole property" : "By the room"}
              </button>
            ))}
          </FilterGroup>
        </div>
      </div>

      {/* Grid */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {isLoading && <GridSkeleton />}
        {error && <p className="text-destructive">Could not load inventory.</p>}
        {data && filtered.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">No properties match these filters.</p>
        )}

        <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <Link key={p.id} href={`/property/${p.id}`}>
              <article className="group cursor-pointer" data-testid={`card-property-${p.id}`}>
                <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl">
                  <ListingImage
                    id={p.id}
                    photos={p.photos}
                    alt={p.name}
                    location={p.location}
                    kind={p.type as "STR" | "COLIVING"}
                    className="h-full w-full transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                  <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
                    {p.type === "STR" ? "Whole property" : "By the room"}
                  </span>
                </div>
                <div className="mt-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-base font-semibold leading-snug">{p.name}</h3>
                    <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                      <Star className="h-3.5 w-3.5 fill-primary text-primary" /> New
                    </span>
                  </div>
                  <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {p.location}
                  </p>
                  <p className="mt-1.5 text-sm">
                    {p.type === "STR" && p.basePrice ? (
                      <>
                        <span className="font-semibold">{money(p.basePrice)}</span>
                        <span className="text-muted-foreground"> / night</span>
                      </>
                    ) : (
                      <span className="font-medium text-foreground">Rooms available</span>
                    )}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/3] w-full rounded-2xl bg-secondary" />
          <div className="mt-3 h-4 w-2/3 rounded bg-secondary" />
          <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
        </div>
      ))}
    </div>
  );
}

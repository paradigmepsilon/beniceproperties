// client/src/components/neighborhood-block.tsx
// Neighborhood storytelling for a detail page, matched to the property's city
// via neighborhoodFor(cityOf(property.location)). Renders NOTHING when the city
// has no entry, so a listing in an un-written city simply omits the block.
// Mirrors the listing-story.tsx section rhythm (uppercase label, tinted chips).

import { MapPin } from "lucide-react";
import { neighborhoodFor } from "@/lib/content";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";

export function NeighborhoodBlock({ city, className }: { city: string; className?: string }) {
  const n = neighborhoodFor(city);
  if (!n) return null;

  return (
    <section className={cn(className)} data-testid="neighborhood-block">
      <h2 className="text-xs font-bold uppercase tracking-widest text-accent-foreground">
        The neighborhood
      </h2>
      <p className="mt-3 font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-[1.75rem]">
        {n.headline}
      </p>
      <RichText text={n.prose} className="mt-4" />

      {n.knownFor.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2">
          {n.knownFor.map((tag) => (
            <li
              key={tag}
              className="rounded-full border border-border bg-secondary px-3 py-1 text-xs font-medium text-foreground/80"
            >
              {tag}
            </li>
          ))}
        </ul>
      )}

      {n.mapsUrl && (
        <a
          href={n.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bnp-pill mt-5 gap-1.5 border-primary bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
          data-testid="link-neighborhood-map"
        >
          <MapPin className="h-4 w-4" /> View on the map
        </a>
      )}
    </section>
  );
}

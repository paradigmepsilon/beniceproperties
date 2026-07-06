// client/src/components/inclusions-grid.tsx
// "Everything's included" — renders the shared INCLUSIONS list. Two variants:
//   - "full"    : a titled section for the home / community / about pages
//                 (icon + label + note, richer cards).
//   - "compact" : a tight essentials-style grid for the detail pages, matching
//                 the "The essentials" markup in listing-story.tsx.
// Renders nothing if the list is empty, so it's always safe to drop in.

import { INCLUSIONS } from "@/content/inclusions";
import { cn } from "@/lib/utils";

export function InclusionsGrid({
  variant = "full",
  image,
  className,
}: {
  variant?: "full" | "compact";
  /**
   * Optional warm banner image (a path under client/public) shown above the
   * heading in the "full" variant only. The "compact" detail-page variant stays
   * image-free so it reads as a tight essentials list.
   */
  image?: string;
  className?: string;
}) {
  if (INCLUSIONS.length === 0) return null;

  if (variant === "compact") {
    // Mirrors listing-story.tsx "The essentials" section so it feels native on
    // the detail pages. Coral accent (the brand/whole-property color).
    return (
      <section className={cn(className)} data-testid="inclusions-compact">
        <h2 className="text-xs font-bold uppercase tracking-widest text-accent-foreground">
          What's included
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {INCLUSIONS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
            >
              <Icon className="h-[1.05rem] w-[1.05rem] shrink-0 text-primary" aria-hidden />
              <span className="min-w-0 font-medium leading-tight">{label}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  // Full variant: a titled band with richer cards (label + note).
  return (
    <section className={cn(className)} data-testid="inclusions-full">
      {image && (
        <div className="mb-9 overflow-hidden rounded-3xl">
          <img
            src={image}
            alt="Housemates relaxing and cooking together in a bright, fully furnished Be Nice co-living home"
            className="aspect-[16/9] w-full object-cover sm:aspect-[21/9]"
            loading="lazy"
          />
        </div>
      )}
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Everything's included
      </h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        One simple rate covers it all. No surprise bills, no add-ons at checkout.
      </p>
      <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INCLUSIONS.map(({ icon: Icon, label, note, image }) => (
          <li key={label} className="group relative overflow-hidden bnp-card p-5">
            {/* Rollover image + dark scrim: a photo of this inclusion fades and
                zooms in on hover. Sits at z-0 (above the card's opaque bg-card),
                with the card content lifted to z-10 above it so text stays
                readable over the scrim. */}
            <img
              src={image}
              alt=""
              aria-hidden
              loading="lazy"
              className="pointer-events-none absolute inset-0 z-0 h-full w-full scale-105 object-cover opacity-0 transition-all duration-500 ease-out group-hover:scale-100 group-hover:opacity-100"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-0 bg-foreground/70 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <div className="relative z-10 grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary transition-colors duration-300 group-hover:bg-white/15 group-hover:text-white">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <h3 className="relative z-10 mt-3.5 font-display text-base font-semibold transition-colors duration-300 group-hover:text-white">
              {label}
            </h3>
            <p className="relative z-10 mt-1 text-sm leading-snug text-muted-foreground transition-colors duration-300 group-hover:text-white/85">
              {note}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

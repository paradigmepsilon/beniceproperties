// client/src/components/testimonials.tsx
// Resident quotes. Optionally filtered to a city (for the detail pages) and/or
// capped. Renders nothing when there are no matching quotes, so it's safe to
// drop onto a property page whose city has none.
//
// Two layouts:
//   - "grid"   (default): responsive 3-col grid. Used on detail/community pages.
//   - "scroll": a single horizontal scroll rail of fixed-width cards. Used on the
//               home page to show many reviews without eating vertical space.
//               Auto-scrolls as a seamless marquee (see AutoScrollRow) — the item
//               list is duplicated once so wrapping back is invisible. Pauses on
//               hover/touch/focus, and honors prefers-reduced-motion.

import { useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { selectTestimonials } from "@/lib/content";
import type { Testimonial } from "@/content/testimonials";
import { cn } from "@/lib/utils";

export function Testimonials({
  city,
  limit,
  layout = "grid",
  heading = "What our guests say",
  subhead,
  className,
}: {
  city?: string;
  limit?: number;
  layout?: "grid" | "scroll";
  heading?: string;
  subhead?: string;
  className?: string;
}) {
  const items = selectTestimonials({ city, limit });
  if (items.length === 0) return null;

  const scroll = layout === "scroll";

  return (
    <section className={cn(className)} data-testid="testimonials">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      {subhead && <p className="mt-1.5 text-sm text-muted-foreground">{subhead}</p>}
      {scroll ? (
        <AutoScrollRow items={items} />
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((t) => (
            <Card key={t.id} t={t} fixedWidth={false} />
          ))}
        </div>
      )}
    </section>
  );
}

// A horizontal marquee that scrolls itself. The item list is rendered twice so
// the rail can wrap from the end of the first copy back to the start seamlessly.
// Manual scroll still works; auto-advance pauses while the user interacts (hover,
// touch, focus within) and stays off entirely under prefers-reduced-motion.
function AutoScrollRow({ items }: { items: Testimonial[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;

    // Read reduced-motion inside the loop (not once at mount) so it responds to
    // preference changes — and so timing of the initial match never leaves the
    // rail permanently frozen.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const SPEED = 0.4; // px per frame (~24px/s at 60fps) — a slow, calm drift.
    let raf = 0;

    const tick = () => {
      if (!pausedRef.current && !reduceMotion.matches) {
        // Wrap once we've scrolled past the first copy of the list. scrollWidth
        // covers both copies, so half of it is one full set.
        const half = rail.scrollWidth / 2;
        if (half > 0 && rail.scrollLeft >= half) {
          rail.scrollLeft -= half;
        }
        rail.scrollLeft += SPEED;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [items.length]);

  const pause = () => (pausedRef.current = true);
  const resume = () => (pausedRef.current = false);

  return (
    <div
      ref={railRef}
      className="-mx-6 mt-8 flex gap-6 overflow-x-auto px-6 pb-4 [scrollbar-width:thin]"
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={resume}
      onTouchStart={pause}
      onTouchEnd={resume}
      data-testid="testimonials-rail"
    >
      {/* Rendered twice for the seamless wrap. The duplicate is aria-hidden so
          screen readers announce each quote only once. */}
      {items.map((t) => (
        <Card key={t.id} t={t} />
      ))}
      {items.map((t) => (
        <Card key={`dup-${t.id}`} t={t} ariaHidden />
      ))}
    </div>
  );
}

function Card({
  t,
  ariaHidden = false,
  fixedWidth = true,
}: {
  t: Testimonial;
  ariaHidden?: boolean;
  fixedWidth?: boolean;
}) {
  return (
    <figure
      className={cn(
        "bnp-card flex flex-col p-6",
        fixedWidth && "w-[85%] shrink-0 sm:w-[22rem]",
      )}
      aria-hidden={ariaHidden || undefined}
      data-testid={`testimonial-${t.id}`}
    >
      {typeof t.rating === "number" && (
        <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
          {Array.from({ length: t.rating }).map((_, i) => (
            <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden />
          ))}
        </div>
      )}
      <blockquote className="mt-3 flex-1 leading-relaxed text-foreground/90">“{t.quote}”</blockquote>
      <figcaption className="mt-4 border-t border-border pt-3">
        <span className="block text-sm font-semibold">{t.name}</span>
        <span className="block text-xs text-muted-foreground">{t.area}</span>
      </figcaption>
    </figure>
  );
}

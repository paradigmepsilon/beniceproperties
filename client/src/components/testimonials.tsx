// client/src/components/testimonials.tsx
// Resident quotes. Optionally filtered to a city (for the detail pages) and/or
// capped. Renders nothing when there are no matching quotes, so it's safe to
// drop onto a property page whose city has none.

import { Star } from "lucide-react";
import { selectTestimonials } from "@/lib/content";
import { cn } from "@/lib/utils";

export function Testimonials({
  city,
  limit,
  heading = "What our guests say",
  subhead,
  className,
}: {
  city?: string;
  limit?: number;
  heading?: string;
  subhead?: string;
  className?: string;
}) {
  const items = selectTestimonials({ city, limit });
  if (items.length === 0) return null;

  return (
    <section className={cn(className)} data-testid="testimonials">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      {subhead && <p className="mt-1.5 text-sm text-muted-foreground">{subhead}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => (
          <figure key={t.id} className="bnp-card flex flex-col p-6" data-testid={`testimonial-${t.id}`}>
            {typeof t.rating === "number" && (
              <div className="flex gap-0.5" aria-label={`${t.rating} out of 5 stars`}>
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-primary text-primary" aria-hidden />
                ))}
              </div>
            )}
            <blockquote className="mt-3 flex-1 leading-relaxed text-foreground/90">
              “{t.quote}”
            </blockquote>
            <figcaption className="mt-4 border-t border-border pt-3">
              <span className="block text-sm font-semibold">{t.name}</span>
              <span className="block text-xs text-muted-foreground">{t.area}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

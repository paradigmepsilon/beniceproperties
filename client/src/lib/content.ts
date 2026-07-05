// client/src/lib/content.ts
// Pure selection helpers over the static content in client/src/content/*. Kept
// here (not inside the components) so the selection logic is unit-testable under
// vitest's node environment, exactly like format.ts / availability.ts. Components
// stay presentational and call these.

import { TESTIMONIALS, type Testimonial } from "@/content/testimonials";
import { NEIGHBORHOODS, type Neighborhood } from "@/content/neighborhoods";
import { JOURNAL_POSTS, type JournalPost } from "@/content/journal";

// Testimonials, optionally narrowed to a city and/or capped to a count. City
// match is case-insensitive against the testimonial's `city` (which mirrors the
// site's cityOf() value). Passing no city returns all; an unknown city returns
// an empty array (callers render nothing).
export function selectTestimonials(opts: { city?: string; limit?: number } = {}): Testimonial[] {
  const { city, limit } = opts;
  let list = TESTIMONIALS;
  if (city) {
    const key = city.trim().toLowerCase();
    list = list.filter((t) => t.city.trim().toLowerCase() === key);
  }
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

// The neighborhood entry for a city, or undefined if none is authored. Callers
// pass cityOf(property.location) so this stays consistent with how the rest of
// the site derives a city from the free-text location field. Case-insensitive.
export function neighborhoodFor(city: string): Neighborhood | undefined {
  const key = (city ?? "").trim().toLowerCase();
  if (!key) return undefined;
  return NEIGHBORHOODS.find((n) => n.city.trim().toLowerCase() === key);
}

// A journal post by slug, or undefined for an unknown slug (the article page
// renders the not-found treatment in that case).
export function postBySlug(slug: string): JournalPost | undefined {
  const key = (slug ?? "").trim();
  if (!key) return undefined;
  return JOURNAL_POSTS.find((p) => p.slug === key);
}

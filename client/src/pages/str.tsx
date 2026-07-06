// client/src/pages/str.tsx  (/str)
// Dedicated Short-Term Rental page. Whole-property getaways with online booking.
// Coral accent (the STR segment color). Shares the site's spine — same paper,
// Fraunces/Inter, card anatomy — differentiated only by the coral hero gradient
// and eyebrow. Keeps the date search: STR is the product where dates matter.

import { CalendarCheck, Home, Sparkles } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { ListingsSection } from "@/components/listings-section";
import { Testimonials } from "@/components/testimonials";

// STR coral accent — tints the shared hero image (and is the no-image fallback).
const STR_GRADIENT = "linear-gradient(135deg, #e87a5f, #9a3524)";

const HIGHLIGHTS = [
  { icon: Home, title: "The whole place", sub: "No shared walls — the entire property is yours." },
  { icon: CalendarCheck, title: "Book by the night", sub: "Live calendars, instant confirmation, no back-and-forth." },
  { icon: Sparkles, title: "Styled to remember", sub: "Themed, design-forward homes built for the occasion." },
];

export default function Str() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Shared hero — fixed STR art at the common height, coral accent. */}
      <PageHero
        eyebrow="Short-term rentals"
        title="Have the whole place to yourselves."
        subtitle="Whole-home getaways for a weekend away, a family trip, or a night worth remembering. Pick your dates and book direct — no platform markup."
        accent={STR_GRADIENT}
        image="/heroes/str.jpg"
      />

      {/* Highlights strip */}
      <section className="border-y bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold">{title}</strong>
                <span className="text-sm text-muted-foreground">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <main className="flex-1">
        <ListingsSection
          type="STR"
          id="stays"
          heading="Available getaways"
          subhead="Whole-home stays across Atlanta and Antigua. Search your dates for live pricing."
          enableDateSearch
          className="mx-auto w-full max-w-6xl px-6 py-14"
        />
      </main>

      <section className="border-t bg-card">
        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          heading="Guests who booked direct"
          limit={3}
        />
      </section>

      <SiteFooter />
    </div>
  );
}

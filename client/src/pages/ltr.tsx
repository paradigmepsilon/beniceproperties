// client/src/pages/ltr.tsx  (/ltr)
// Dedicated Long-Term Rental page. Inquiry-only homes — no online booking. Amber
// accent (the LTR segment color). Shares the site's spine, differentiated by the
// amber hero gradient and eyebrow. No date search (LTR has no live availability);
// each listing links to its detail page, where the booking widget is replaced by
// a contact form. A general inquiry form sits at the foot for open questions.

import { KeyRound, CalendarClock, MessageSquare } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { ListingsSection } from "@/components/listings-section";
import { LtrInquiryForm } from "@/components/ltr-inquiry-form";

// LTR amber accent — tints the shared hero image (and is the no-image fallback).
const LTR_GRADIENT = "linear-gradient(135deg, #cf9b52, #8a5a1f)";

const HIGHLIGHTS = [
  { icon: CalendarClock, title: "Built for the long haul", sub: "Full homes for a season, a year, or longer." },
  { icon: MessageSquare, title: "Handled personally", sub: "No online checkout — we talk terms with you directly." },
  { icon: KeyRound, title: "Move-in ready", sub: "Furnished, maintained, and managed by the people who own them." },
];

export default function Ltr() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Shared hero — fixed LTR art at the common height, amber accent. */}
      <PageHero
        eyebrow="Long-term rentals"
        title="A home to settle into for the long run."
        subtitle="Full furnished homes for extended stays. These are handled personally, not booked online — tell us what you're looking for and we'll take it from there."
        accent={LTR_GRADIENT}
        image="/heroes/ltr.jpg"
      />

      {/* Highlights strip */}
      <section className="border-y bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-8 sm:grid-cols-3">
          {HIGHLIGHTS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-start gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-segment-ltr-tint text-segment-ltr">
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
          type="LTR"
          heading="Homes available for long-term"
          subhead="Tap a home to see the details and send an inquiry. We'll follow up with terms and availability."
          className="mx-auto w-full max-w-6xl px-6 py-14"
        />

        {/* General inquiry — for someone who wants a long-term home but doesn't see
            the right one listed. No propertyId, so it captures an open lead. */}
        <section className="border-t bg-card">
          <div className="mx-auto w-full max-w-2xl px-6 py-14">
            <LtrInquiryForm />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

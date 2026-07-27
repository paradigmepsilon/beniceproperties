// client/src/pages/home.tsx
// Co-living-focused home: hero → trust band → co-living search + listings grid
// → what's-included → testimonials → reassurance band → FAQ.
// Co-living is the whole page, so the grid shows COLIVING only; the two doors are
// the wayfinding to the other products (short-term getaways, long-term homes).

import { useEffect } from "react";
import { CalendarCheck, Handshake, Star } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero, HeroCta } from "@/components/page-hero";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { ListingsSection } from "@/components/listings-section";
import { Testimonials } from "@/components/testimonials";
import { FaqSection } from "@/components/faq-section";
import { COLIVING_FAQS } from "@/content/faqs";
import { useSeo, ORGANIZATION_JSON_LD, buildFaqJsonLd, SITE_URL } from "@/lib/seo";

// Co-living teal accent — the home's lead product. Tints the shared hero image
// (and is the no-image fallback), matching /community and the co-living identity.
const COLIVING_GRADIENT = "linear-gradient(135deg, #2C6E8F, #1C4A61)";

// -----------------------------------------------------------------------------
// Placeholder marketing copy — shipped verbatim from the design template by
// owner decision (2026-07-02). Edit freely; nothing below is computed.
// -----------------------------------------------------------------------------
const TRUST_ITEMS = [
  { icon: Star, title: "4.9 average", sub: "Across 200+ stays" },
  { icon: CalendarCheck, title: "Free cancellation", sub: "On most bookings" },
  { icon: Handshake, title: "Book direct", sub: "You skip the platform markup" },
];

const STEPS = [
  {
    n: "01 · Find",
    title: "Tour a room",
    sub: "Real photos and the live weekly rate. What you see is a room you can actually move into.",
  },
  {
    n: "02 · Book",
    title: "Reserve your room",
    sub: "Pick your move-in and term, see every payment up front, and settle in without the platform fees.",
  },
  {
    n: "03 · Belong",
    title: "Settle in",
    sub: "A furnished room in a well-run home, with a direct line to the people who run it, not a call center.",
  },
];

export default function Home() {
  useSeo({
    title: "Furnished Co-living Rooms & Rentals in Atlanta",
    description:
      "Private furnished co-living rooms, whole-home short-term rentals, and long-term homes in Atlanta and Antigua. Book direct with the people who run the place.",
    path: "/",
    appendSiteName: false,
    jsonLd: [ORGANIZATION_JSON_LD, buildFaqJsonLd(COLIVING_FAQS, `${SITE_URL}/`)],
  });

  // Honor a #hash once the page mounts (the SPA renders after the native anchor
  // pass, so a fresh /#stays link needs a nudge).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Shared hero — image slideshow at the common height, teal (co-living) accent. */}
      <PageHero
        eyebrow="Co-living in Atlanta and beyond"
        title="A furnished room that already feels like home."
        subtitle="Private, furnished rooms in beautifully run co-living homes across Atlanta. Book direct, skip the platform fees."
        cta={<HeroCta href="/#stays">See available rooms</HeroCta>}
        accent={COLIVING_GRADIENT}
      />

      {/* Trust band — a thin credibility strip riding directly under the hero,
          before the search bar and listings. */}
      <section className="border-b bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 px-6 py-6 sm:grid-cols-3">
          {TRUST_ITEMS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-segment-room-tint text-segment-room">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <strong className="block text-sm font-bold">{title}</strong>
                <span className="text-xs text-muted-foreground">{sub}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Co-living listings (the home's lead product) sit high on the page, right
          after the trust band and above the first editorial image. Rooms lead;
          the search band rides underneath them as the refine step. The section
          owns id="stays" so "Search rooms" scrolls back up to the results. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-14">
        <ListingsSection
          type="COLIVING"
          id="stays"
          heading="Available rooms"
          subhead="Private rooms open right now across Atlanta and Antigua."
          enableColivingSearch
          searchPlacement="bottom"
        />
      </main>

      {/* What's included — the biggest co-living objection (hidden costs),
          answered right after the trust band and before the listings. Leads with
          a warm candid of housemates so the section opens on people, not a grid. */}
      <InclusionsGrid
        image="/editorial/everything-included.jpg"
        className="mx-auto w-full max-w-6xl px-6 py-14"
      />

      {/* Social proof — real guests, before the closing reassurance band. */}
      <section className="border-t bg-card">
        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          heading="Guests who booked direct"
          subhead="A few words from people who've stayed with us across Atlanta and Antigua."
          layout="scroll"
          limit={10}
        />
      </section>

      {/* Reassurance band — now image-backed (a warm, well-run shared space) with
          the teal (co-living) accent as a multiply tint + scrim so the white text
          stays legible. Same layering as PageHero. Copy unchanged. */}
      <section
        id="how"
        className="relative isolate scroll-mt-24 overflow-hidden py-16 text-white"
        style={{ background: "#2c6e8f" }}
      >
        {/* Backmost photo. Described rather than aria-hidden — it's a real Be
            Nice home, so it earns an image-search entry. The scrim and tint
            layers below it are the decorative ones. */}
        <img
          src="/editorial/coliving-home-band.jpg"
          alt="Housemates sharing a bright, well-kept common area in a Be Nice co-living home"
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover"
        />
        {/* Legibility scrim + teal accent wash. */}
        <div
          className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/45 to-black/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-70 mix-blend-multiply"
          style={{ background: "#1C4A61" }}
          aria-hidden
        />
        <div className="mx-auto w-full max-w-6xl px-6 [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
          <h2 className="max-w-[20ch] font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            A room in a home, not a room in a listing.
          </h2>
          <p className="mt-3 max-w-[52ch] text-white">
            You're not gambling on some stranger's spare room. We own or manage every Be
            Nice home ourselves, so every room meets the same standard. Someone real
            is always a message away.
          </p>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                // bg-black/30 rather than bg-white/10: the white-tinted card
                // lightened the band to a measured #417d9a, where the step label
                // (white/70) computed 3.09:1 and the body (white/85) 3.79:1.
                // Darkening the card ground puts solid white back over AA
                // regardless of which slideshow photo is behind it.
                className="rounded-2xl border border-white/15 bg-black/30 p-6 backdrop-blur-sm"
              >
                <div className="font-display text-sm font-bold text-white">{s.n}</div>
                <h3 className="mt-2.5 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/95">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Co-living FAQ — visible accordion + FAQPage schema (see useSeo above).
          Placed last before the footer: answers the remaining objections and
          feeds AI answer engines. */}
      <section className="border-t">
        <FaqSection
          faqs={COLIVING_FAQS}
          heading="Common questions"
          subhead="The things people ask before they book a room with us."
          className="mx-auto w-full max-w-3xl px-6 py-14"
        />
      </section>

      <SiteFooter />
    </div>
  );
}

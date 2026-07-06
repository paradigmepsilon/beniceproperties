// client/src/pages/home.tsx
// Co-living-focused home: hero (search + two doors to /str and /ltr) → trust band
// → what's-included → co-living listings grid → testimonials → reassurance band.
// Co-living is the whole page, so the grid shows COLIVING only; the two doors are
// the wayfinding to the other products (short-term getaways, long-term homes).

import { useEffect } from "react";
import { CalendarCheck, Handshake, Star } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { ListingsSection } from "@/components/listings-section";
import { Testimonials } from "@/components/testimonials";

// Co-living teal accent — the home's lead product. Tints the shared hero image
// (and is the no-image fallback), matching /community and the co-living identity.
const COLIVING_GRADIENT = "linear-gradient(135deg, #3E92BC, #1C4A61)";

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
    sub: "A furnished room in a well-run home, with a direct line to the people who run it — not a call center.",
  },
];

export default function Home() {
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
        eyebrow="Atlanta · The Southeast US · and growing"
        title="A room that already feels like home."
        subtitle="Private, furnished rooms in beautifully run co-living homes. Book direct in a few minutes, and skip the platform fees."
        accent={COLIVING_GRADIENT}
      />

      {/* Trust band */}
      <section className="border-y bg-card">
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

      {/* What's included — the biggest co-living objection (hidden costs),
          answered right after the trust band and before the listings. Leads with
          a warm candid of housemates so the section opens on people, not a grid. */}
      <InclusionsGrid
        image="/editorial/everything-included.jpg"
        className="mx-auto w-full max-w-6xl px-6 py-14"
      />

      {/* Co-living listings (the home's lead product). The section owns id="stays"
          so the search bar's "Search rooms" button can scroll to it. */}
      <main className="mx-auto w-full max-w-6xl flex-1 border-t px-6 py-14">
        <ListingsSection
          type="COLIVING"
          id="stays"
          heading="Available rooms"
          subhead="Private rooms open right now across Atlanta and Antigua."
          enableColivingSearch
        />
      </main>

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
        {/* Backmost photo. */}
        <img
          src="/editorial/coliving-home-band.jpg"
          alt=""
          aria-hidden
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
          <p className="mt-3 max-w-[52ch] text-white/90">
            You're not gambling on some stranger's spare room. We own or manage every Be
            Nice home ourselves, so every room meets the same standard — and someone real
            is always a message away.
          </p>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div
                key={s.n}
                className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm"
              >
                <div className="font-display text-sm font-bold text-white/70">{s.n}</div>
                <h3 className="mt-2.5 font-display text-lg font-semibold text-white">{s.title}</h3>
                <p className="mt-1.5 text-sm text-white/85">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

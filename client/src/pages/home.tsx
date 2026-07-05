// client/src/pages/home.tsx
// Template-driven home: hero (search + two doors) → trust band → filterable
// listings grid → "how it works" brand band. Filters are client-side over
// /api/properties; doors, chips, and the search bar all share one filter state,
// seedable from query params (/?type=COLIVING&city=Atlanta#stays).

import { useEffect, useMemo, useState } from "react";
import { useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, CalendarCheck, Handshake, ShieldCheck, Star } from "lucide-react";
import type { PropertyListItem } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PropertyCard, cardUnavailable } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
import { HeroSlideshow } from "@/components/hero-slideshow";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";
import { cityOf } from "@/lib/format";
import { cn } from "@/lib/utils";

type TypeFilter = "ALL" | "STR" | "COLIVING";

// -----------------------------------------------------------------------------
// Placeholder marketing copy — shipped verbatim from the design template by
// owner decision (2026-07-02). Edit freely; nothing below is computed.
// -----------------------------------------------------------------------------
const TRUST_ITEMS = [
  { icon: ShieldCheck, title: "Verified & insured", sub: "Every stay, every host" },
  { icon: Star, title: "4.9 average", sub: "Across 200+ stays" },
  { icon: CalendarCheck, title: "Free cancellation", sub: "On most bookings" },
  { icon: Handshake, title: "Book direct", sub: "You skip the platform markup" },
];

const STEPS = [
  {
    n: "01 · Find",
    title: "Search real availability",
    sub: "The calendars are live, so you won't run into double-bookings. If you see it, you can book it right now.",
  },
  {
    n: "02 · Book",
    title: "Reserve in minutes",
    sub: "You see the price up front. Pay nightly for a whole-home stay, or monthly for a room.",
  },
  {
    n: "03 · Stay",
    title: "Settle in",
    sub: "You get a direct line to the real host who runs the property, not a call center.",
  },
];

function scrollToStays() {
  document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const searchStr = useSearch();
  const [city, setCity] = useState<string>("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  // Only send dates to the grid when BOTH are set and form a forward range — a
  // complete search. Partial dates keep the default (date-blind) listing. The
  // query key includes the range so a date search re-fetches a date-aware list;
  // clearing the dates falls back to the cached default response.
  const datedSearch = Boolean(checkIn && checkOut && checkOut > checkIn);
  const { data, isLoading, error } = useQuery<PropertyListItem[]>({
    queryKey: ["/api/properties", { checkIn: datedSearch ? checkIn : "", checkOut: datedSearch ? checkOut : "" }],
    queryFn: async () => {
      const qs = datedSearch ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";
      const res = await fetch(`/api/properties${qs}`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.json();
    },
  });

  // Honor deep links from the footer/doors: /?type=COLIVING&city=Atlanta#stays
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const qType = params.get("type");
    const qCity = params.get("city");
    if (qType === "STR" || qType === "COLIVING") setType(qType);
    if (qCity) setCity(qCity);
  }, [searchStr]);

  // The SPA renders after the browser's native anchor pass, so honor a #hash
  // once the grid has data (layout is stable by then).
  useEffect(() => {
    if (!data) return;
    const hash = window.location.hash.slice(1);
    if (hash) document.getElementById(hash)?.scrollIntoView();
  }, [data]);

  // Filter by city, not the raw (often full-address) location string.
  const cities = useMemo(() => {
    const set = new Set((data ?? []).map((p) => cityOf(p.location)));
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    const matches = (data ?? []).filter(
      (p) => (city === "ALL" || cityOf(p.location) === city) && (type === "ALL" || p.type === type),
    );
    // Available inventory first; unavailable cards demoted to the tail (stable).
    // During a date search this demotes cards unavailable for the searched range;
    // otherwise it demotes date-blind "booked now" cards.
    const unavail = (p: PropertyListItem) => Number(cardUnavailable(p, checkIn, checkOut));
    return [...matches].sort((a, b) => unavail(a) - unavail(b));
  }, [data, city, type, checkIn, checkOut]);

  function pickDoor(t: TypeFilter) {
    setType(t);
    scrollToStays();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero: rotating image slideshow (BT-22, from Unified Ops) behind the
          eyebrow + serif headline + search + two product doors, which stay as
          the overlay on top. With zero hero images the slideshow renders nothing
          and the gradient below is the background (graceful fallback). */}
      <header className="relative overflow-hidden">
        {/* Backmost: rotating hero images (renders nothing if none configured). */}
        <HeroSlideshow />
        {/* Scrim: a translucent dark overlay that keeps the light headline
            legible over ANY hero photo (bright or busy) while still letting the
            image show through, and reads as an intentional dark hero band when
            there are no images. A low base wash lifts overall contrast; the
            bottom-anchored gradient adds depth right where the text sits. */}
        <div className="pointer-events-none absolute inset-0 bg-black/25" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/40 to-black/15"
          aria-hidden
        />
        {/* A whisper of brand accent, low enough not to fight legibility. */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/25 to-transparent mix-blend-multiply" aria-hidden />
        <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-12 pt-14 sm:pt-20 [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
          <p className="text-sm font-bold uppercase tracking-widest text-white/90">
            Atlanta · Antigua · and growing
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-6xl">
            A place to stay that already feels like yours.
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg text-white/85 sm:text-xl">
            Whole-home getaways and by-the-room co-living. Book direct in a few minutes, and skip
            the platform fees.
          </p>

          <div className="mt-8">
            <SearchBar
              cities={cities}
              value={{ city, checkIn, checkOut }}
              onChange={(v) => {
                setCity(v.city);
                setCheckIn(v.checkIn);
                setCheckOut(v.checkOut);
              }}
              onSearch={scrollToStays}
            />
          </div>

          {/* Two doors: whole-property vs by-the-room. */}
          <div className="mt-7 grid max-w-3xl gap-5 sm:grid-cols-2">
            <Door
              tag="Whole property"
              title="Book a getaway"
              sub="Have the whole place to yourself for a weekend away or a family trip."
              gradient="linear-gradient(135deg, #e87a5f, #9a3524)"
              onClick={() => pickDoor("STR")}
              testId="door-str"
            />
            <Door
              tag="By the room"
              title="Find a room"
              sub="A private furnished room in a shared home. Co-living made for working professionals."
              gradient="linear-gradient(135deg, #3E92BC, #1C4A61)"
              onClick={() => pickDoor("COLIVING")}
              testId="door-coliving"
            />
          </div>
        </div>
      </header>

      {/* Trust band */}
      <section className="border-y bg-card">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 px-6 py-6 lg:grid-cols-4">
          {TRUST_ITEMS.map(({ icon: Icon, title, sub }) => (
            <div key={title} className="flex items-center gap-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent text-primary">
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
          answered right after the trust band and before the listings. */}
      <InclusionsGrid className="mx-auto w-full max-w-6xl px-6 py-14" />

      {/* Listings */}
      <main id="stays" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-24 border-t px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Available stays
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              What's open right now across Atlanta and Antigua.
            </p>
          </div>
          <button
            onClick={() => {
              setCity("ALL");
              setType("ALL");
            }}
            className="bnp-pill inline-flex items-center gap-1.5 bg-card text-sm hover:border-primary hover:text-primary"
            data-testid="button-view-all"
          >
            View all listings <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Filter chips: type (with segment dots) + city. */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Chip
            active={type === "ALL" && city === "ALL"}
            onClick={() => {
              setType("ALL");
              setCity("ALL");
            }}
            testId="filter-type-ALL"
          >
            All stays
          </Chip>
          <Chip active={type === "STR"} onClick={() => setType("STR")} testId="filter-type-STR">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-segment-whole" aria-hidden />
            Whole property
          </Chip>
          <Chip
            active={type === "COLIVING"}
            onClick={() => setType("COLIVING")}
            testId="filter-type-COLIVING"
          >
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-segment-room" aria-hidden />
            By the room
          </Chip>
          {cities.map((c) => (
            <Chip
              key={c}
              active={city === c}
              onClick={() => setCity(city === c ? "ALL" : c)}
              testId={`filter-location-${c}`}
            >
              {c}
            </Chip>
          ))}
        </div>

        <div className="mt-8">
          {isLoading && <GridSkeleton />}
          {error && <p className="text-destructive">Could not load inventory.</p>}
          {data && filtered.length === 0 && (
            <p className="py-12 text-center text-muted-foreground">
              No properties match these filters.
            </p>
          )}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <PropertyCard key={p.id} property={p} checkIn={checkIn} checkOut={checkOut} />
            ))}
          </div>
        </div>
      </main>

      {/* Social proof — real guests, before the closing reassurance band. */}
      <section className="border-t bg-card">
        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          heading="Guests who booked direct"
          subhead="A few words from people who've stayed with us across Atlanta and Antigua."
          limit={3}
        />
      </section>

      {/* Reassurance band */}
      <section id="how" className="scroll-mt-24 bg-primary py-16 text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="max-w-[20ch] font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Booking direct should feel safe.
          </h2>
          <p className="mt-3 max-w-[52ch] text-primary-foreground/85">
            You're not gambling on some stranger's listing. We own or manage every Be Nice property
            ourselves, so you get the same standard whether you're staying a weekend or a season.
          </p>
          <div className="mt-9 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl border border-white/15 bg-white/10 p-6">
                <div className="font-display text-sm font-bold text-white/70">{s.n}</div>
                <h3 className="mt-2.5 font-display text-lg font-semibold text-primary-foreground">
                  {s.title}
                </h3>
                <p className="mt-1.5 text-sm text-primary-foreground/80">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Door({
  tag,
  title,
  sub,
  gradient,
  onClick,
  testId,
}: {
  tag: string;
  title: string;
  sub: string;
  gradient: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex min-h-[180px] cursor-pointer flex-col justify-end overflow-hidden rounded-2xl p-6 text-left text-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
      style={{ background: gradient }}
      data-testid={testId}
    >
      <span className="absolute right-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-white/20 text-lg transition-transform group-hover:translate-x-0.5">
        →
      </span>
      <span className="text-xs font-bold uppercase tracking-wider text-white/90">{tag}</span>
      <span className="mt-1.5 font-display text-2xl font-semibold">{title}</span>
      <span className="mt-1 text-sm leading-snug text-white/90">{sub}</span>
    </button>
  );
}

function Chip({
  active,
  onClick,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("bnp-chip", active && "bnp-chip-active")}
      data-testid={testId}
    >
      {children}
    </button>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bnp-card animate-pulse overflow-hidden">
          <div className="aspect-[4/3] w-full bg-secondary" />
          <div className="p-4">
            <div className="h-4 w-2/3 rounded bg-secondary" />
            <div className="mt-2 h-3 w-1/3 rounded bg-secondary" />
          </div>
        </div>
      ))}
    </div>
  );
}

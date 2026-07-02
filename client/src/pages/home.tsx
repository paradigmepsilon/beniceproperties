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
import { PropertyCard, isBookedNow } from "@/components/property-card";
import { SearchBar } from "@/components/search-bar";
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
  { icon: Handshake, title: "Book direct", sub: "No platform markup" },
];

const STEPS = [
  {
    n: "01 · Find",
    title: "Search real availability",
    sub: "Live calendars, no double-bookings. What you see is bookable right now.",
  },
  {
    n: "02 · Book",
    title: "Reserve in minutes",
    sub: "Clear pricing up front. Pay your way — nightly for stays, monthly for rooms.",
  },
  {
    n: "03 · Stay",
    title: "Settle in",
    sub: "Direct line to a real host who manages the property. No call-center runaround.",
  },
];

function scrollToStays() {
  document.getElementById("stays")?.scrollIntoView({ behavior: "smooth" });
}

export default function Home() {
  const { data, isLoading, error } = useQuery<PropertyListItem[]>({ queryKey: ["/api/properties"] });
  const searchStr = useSearch();
  const [city, setCity] = useState<string>("ALL");
  const [type, setType] = useState<TypeFilter>("ALL");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

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
    // Available inventory first; booked cards demoted to the tail (stable).
    return [...matches].sort((a, b) => Number(isBookedNow(a)) - Number(isBookedNow(b)));
  }, [data, city, type]);

  function pickDoor(t: TypeFilter) {
    setType(t);
    scrollToStays();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Hero: eyebrow + serif headline + search + the two product doors. */}
      <header className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/60 to-transparent" aria-hidden />
        <div className="relative mx-auto w-full max-w-6xl px-6 pb-12 pt-14 sm:pt-20">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Atlanta · Antigua · and growing
          </p>
          <h1 className="mt-4 max-w-[16ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            A place to stay that already feels like yours.
          </h1>
          <p className="mt-4 max-w-[46ch] text-lg text-muted-foreground sm:text-xl">
            Whole-home getaways and by-the-room co-living, booked direct in minutes — no platform
            fees, no surprises.
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
              sub="Have the whole place to yourself — vacations, weekends, family trips."
              gradient="linear-gradient(135deg, #e87a5f, #9a3524)"
              onClick={() => pickDoor("STR")}
              testId="door-str"
            />
            <Door
              tag="By the room"
              title="Find a room"
              sub="Private furnished rooms in shared homes — co-living for professionals."
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

      {/* Listings */}
      <main id="stays" className="mx-auto w-full max-w-6xl flex-1 scroll-mt-24 px-6 py-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Available stays
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Real-time availability across Atlanta and Antigua.
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

      {/* Reassurance band */}
      <section id="how" className="scroll-mt-24 bg-primary py-16 text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6">
          <h2 className="max-w-[20ch] font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Booking direct should feel safe, not risky.
          </h2>
          <p className="mt-3 max-w-[52ch] text-primary-foreground/85">
            You're not gambling on a stranger's listing. Every Be Nice property is owned or managed
            by us — same standard, whether you're here for a weekend or a season.
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

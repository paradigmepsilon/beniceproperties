// client/src/pages/about.tsx  (/about)
// The brand story: mission + founding story from company.ts, then what's
// included, social proof, and a follow strip. Constants-driven; self-guarding
// sections.

import { Link } from "wouter";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";
import { FollowStrip } from "@/components/follow-strip";
import { RichText } from "@/components/rich-text";
import { FounderCard } from "@/components/founder-card";
import { COMPANY } from "@/content/company";
import { FOUNDERS, FOUNDER_PROMISE } from "@/content/founders";
import { useSeo, ABOUT_JSON_LD } from "@/lib/seo";

export default function About() {
  useSeo({
    title: "About",
    description:
      "The people and story behind Be Nice Properties. We own and manage every home ourselves, from co-living rooms to whole-home getaways in Atlanta and Antigua.",
    path: "/about",
    jsonLd: ABOUT_JSON_LD,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* <section>, not <header>: SiteHeader is the page's banner landmark.
          Kicker and body were white/80 and white/85 on coral — 2.99:1 and
          4.00:1. Solid white and white/95 clear AA against the new token. */}
      <section aria-label="About us" className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-white">About us</p>
          <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {COMPANY.missionHeadline}
          </h1>
          <p className="mt-4 max-w-[56ch] text-white/95">{COMPANY.missionBody}</p>
        </div>
      </section>

      <main className="flex-1">
        {/* Founding story */}
        <section className="mx-auto w-full max-w-3xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Our story
          </h2>
          <RichText text={COMPANY.foundingStory} className="mt-5 text-base" />
        </section>

        {/* The owners, by name and face. This is the page an anxious relocator
            opens to decide whether this operation is real, and it previously
            told a three-paragraph story with no one in it. */}
        <section className="border-y bg-card">
          <div className="mx-auto w-full max-w-4xl px-6 py-14">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              The people behind it
            </h2>
            <p className="mt-3 max-w-[60ch] text-muted-foreground">{FOUNDER_PROMISE}</p>
            <div className="mt-10 grid gap-10 sm:grid-cols-2">
              {FOUNDERS.map((f) => (
                <FounderCard key={f.name} founder={f} />
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-card">
          <InclusionsGrid className="mx-auto w-full max-w-6xl px-6 py-14" />
        </section>

        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          heading="Guests, in their words"
        />

        <FollowStrip className="mx-auto w-full max-w-6xl px-6 pb-14" />

        {/* A way back to inventory. /about previously ended on two social icons,
            so a visitor who finished reading and was convinced had nowhere to go. */}
        <section className="border-t bg-card">
          <div className="mx-auto w-full max-w-6xl px-6 py-12 text-center">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              Come see a room.
            </h2>
            <Link
              href="/#stays"
              className="mt-5 inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground transition-colors hover:bg-[#b23a28]"
            >
              See available rooms
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

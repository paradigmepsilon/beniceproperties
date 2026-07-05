// client/src/pages/about.tsx  (/about)
// The brand story: mission + founding story from company.ts, then what's
// included, social proof, and a follow strip. Constants-driven; self-guarding
// sections.

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";
import { FollowStrip } from "@/components/follow-strip";
import { RichText } from "@/components/rich-text";
import { COMPANY } from "@/content/company";

export default function About() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <header className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-white/80">About us</p>
          <h1 className="mt-3 max-w-[22ch] font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            {COMPANY.missionHeadline}
          </h1>
          <p className="mt-4 max-w-[56ch] text-primary-foreground/85">{COMPANY.missionBody}</p>
        </div>
      </header>

      <main className="flex-1">
        {/* Founding story */}
        <section className="mx-auto w-full max-w-3xl px-6 py-14">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Our story
          </h2>
          <RichText text={COMPANY.foundingStory} className="mt-5 text-base" />
        </section>

        <section className="border-y bg-card">
          <InclusionsGrid className="mx-auto w-full max-w-6xl px-6 py-14" />
        </section>

        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          heading="Guests, in their words"
        />

        <FollowStrip className="mx-auto w-full max-w-6xl px-6 pb-14" />
      </main>

      <SiteFooter />
    </div>
  );
}

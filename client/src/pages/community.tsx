// client/src/pages/community.tsx  (/community)
// The livingQ "Thrive Together" analog: who runs the homes, how community works,
// what's included, and what guests say. Reworked into a warm EDITORIAL flow —
// alternating text/image rows and an image strip that speak to community —
// rather than a stack of bordered card bands. All content is constants-driven;
// each section self-guards (renders nothing when empty).

import { CalendarHeart, MessagesSquare, KeyRound } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";
import { EditorialRow } from "@/components/editorial-row";
import { FaqSection } from "@/components/faq-section";
import { COLIVING_FAQS } from "@/content/faqs";
import { cn } from "@/lib/utils";
import { useSeo, buildFaqJsonLd, SITE_URL } from "@/lib/seo";

// Co-living teal accent — matches the home/co-living identity (this is the
// co-living community). Tints the shared hero image / is the no-image fallback.
const COLIVING_GRADIENT = "linear-gradient(135deg, #3E92BC, #1C4A61)";

const HOW = [
  {
    icon: KeyRound,
    title: "Move-in ready homes",
    sub: "Fully furnished, professionally kept, and set up before you arrive. Just bring your bags.",
  },
  {
    icon: MessagesSquare,
    title: "A real host, a direct line",
    sub: "Text the person who actually runs your home. Questions get answered by a human, not a queue.",
  },
  {
    icon: CalendarHeart,
    title: "Good people, good homes",
    sub: "Co-living with other working professionals in calm, well-run houses that feel like home.",
  },
];

// The community image strip — photos that carry the feeling, with a short caption
// each. Files live in client/public/editorial (served at /editorial/...).
const STRIP = [
  {
    src: "/editorial/community-1.jpg",
    caption: "Dinners that happen because someone said \"I'm cooking, come eat.\"",
  },
  {
    src: "/editorial/community-2.jpg",
    caption: "Common rooms made for the long conversation, not just passing through.",
  },
];

export default function Community() {
  useSeo({
    title: "Our Co-living Community in Atlanta",
    description:
      "We run homes, not listings. Meet the hosts behind Be Nice Properties, see how our co-living community works, and read what guests say.",
    path: "/community",
    jsonLd: buildFaqJsonLd(COLIVING_FAQS, `${SITE_URL}/community`),
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Shared hero — fixed community art at the common height, teal accent. */}
      <PageHero
        eyebrow="Our co-living community"
        title="More than a place to stay."
        subtitle="We run homes, not listings. That means real hosts, well-kept houses, and a standard we stand behind whether you're here for a weekend or a season."
        accent={COLIVING_GRADIENT}
        image="/heroes/community.jpg"
      />

      <main className="flex-1">
        {/* Intro — an editorial row that opens on the promise + a warm human image. */}
        <EditorialRow
          image="/editorial/community-intro.jpg"
          imageAlt="A host welcoming a new housemate at the front door"
          eyebrow="Why we do it this way"
          heading="A home has a keeper. A listing just has a lockbox."
        >
          <p>
            Most rentals hand you a code and disappear. We do the opposite. Every Be Nice
            home is owned or managed by someone who actually lives it. They know the
            quirks of the house, the best coffee down the street, and your name.
          </p>
          <p>
            That's the whole idea of community here: not a slogan, but a person you can
            text, and housemates who make a house feel like somewhere you belong.
          </p>
        </EditorialRow>

        {/* How it works — restyled from a hard card band into a lighter editorial
            block: a lead-in line, then three quiet columns with hairline dividers. */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-14">
            <div className="max-w-[46ch]">
              <p className="text-sm font-bold uppercase tracking-widest text-primary">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Simple on purpose.
              </h2>
            </div>
            <div className="mt-10 grid gap-x-10 gap-y-8 sm:grid-cols-3 sm:divide-x sm:divide-border">
              {HOW.map(({ icon: Icon, title, sub }, i) => (
                <div key={title} className={cn(i > 0 && "sm:pl-10")}>
                  <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Everything's included — community page uses its own banner (a warm
            co-living common-space scene); the home page keeps the original. */}
        <section className="border-t bg-card">
          <InclusionsGrid
            image="/editorial/everything-included-community.jpg"
            className="mx-auto w-full max-w-6xl px-6 py-14"
          />
        </section>

        {/* Community image strip — juxtaposition that speaks to community. */}
        <section className="border-t">
          <div className="mx-auto w-full max-w-6xl px-6 py-14">
            <div className="max-w-[52ch]">
              <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                What “community” actually looks like.
              </h2>
              <p className="mt-2 text-muted-foreground">
                Not organized fun. Just the ordinary, good stuff that happens when a house
                is run well and the people in it actually like being there.
              </p>
            </div>
            <div className="mt-9 grid gap-6 sm:grid-cols-2">
              {STRIP.map((s) => (
                <figure key={s.src} className="group overflow-hidden rounded-3xl">
                  <div className="overflow-hidden rounded-3xl">
                    <img
                      src={s.src}
                      alt={s.caption}
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <figcaption className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {s.caption}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-card">
          <Testimonials
            className="mx-auto w-full max-w-6xl px-6 py-14"
            subhead="Real words from people who've stayed with us."
            layout="scroll"
          />
        </section>

        {/* Co-living FAQ — visible accordion + FAQPage schema (see useSeo above). */}
        <section className="border-t">
          <FaqSection
            faqs={COLIVING_FAQS}
            heading="Common questions"
            subhead="What people ask before joining one of our homes."
            className="mx-auto w-full max-w-3xl px-6 py-14"
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

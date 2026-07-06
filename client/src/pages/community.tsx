// client/src/pages/community.tsx  (/community)
// The livingQ "Thrive Together" analog: who runs the homes, how community works,
// what's included, and what guests say. Reworked into a warm EDITORIAL flow —
// alternating text/image rows and an image strip that speak to community —
// rather than a stack of bordered card bands. All content is constants-driven;
// each section self-guards (renders nothing when empty).

import { CalendarHeart, MessagesSquare, KeyRound } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { HostsSection } from "@/components/hosts-section";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";
import { cn } from "@/lib/utils";

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
    caption: "Dinners that happen because someone said “I’m cooking, come eat.”",
  },
  {
    src: "/editorial/community-2.jpg",
    caption: "Common rooms made for the long conversation, not just passing through.",
  },
];

export default function Community() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Shared hero — fixed community art at the common height, teal accent. */}
      <PageHero
        eyebrow="Community"
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
            home is owned or managed by someone who actually lives this — who knows the
            quirks of the house, the best coffee down the street, and your name.
          </p>
          <p>
            That's the whole idea of community here: not a slogan, but a person you can
            text, and housemates who make a house feel like somewhere you belong.
          </p>
        </EditorialRow>

        {/* Meet your hosts — the people behind the homes. */}
        <HostsSection className="mx-auto w-full max-w-6xl px-6 py-14" />

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

        {/* Everything's included — leads with the candid couch image (#4). */}
        <section className="border-t bg-card">
          <InclusionsGrid
            image="/editorial/everything-included.jpg"
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
          />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

// -----------------------------------------------------------------------------
// EditorialRow — a warm, alternating text/image band. Image sits right on desktop
// (imageRight, default) or left; stacks image-first on mobile so the page always
// opens visually. Local to this page; extract to a shared component only if a
// second page needs the same rhythm.
// -----------------------------------------------------------------------------
function EditorialRow({
  image,
  imageAlt,
  eyebrow,
  heading,
  imageRight = true,
  children,
}: {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  heading: string;
  imageRight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-6xl px-6 py-14">
      <div className="grid items-center gap-8 sm:gap-12 lg:grid-cols-2">
        {/* Image — order flips on desktop per imageRight; always first on mobile. */}
        <div className={cn("overflow-hidden rounded-3xl", imageRight ? "lg:order-2" : "lg:order-1")}>
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className="aspect-[4/3] w-full object-cover"
          />
        </div>
        <div className={cn(imageRight ? "lg:order-1" : "lg:order-2")}>
          {eyebrow && (
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{eyebrow}</p>
          )}
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {heading}
          </h2>
          <div className="mt-4 space-y-4 leading-relaxed text-foreground/90">{children}</div>
        </div>
      </div>
    </section>
  );
}

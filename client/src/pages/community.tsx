// client/src/pages/community.tsx  (/community)
// The livingQ "Thrive Together" analog: who runs the homes, how community works,
// what's included, and what guests say. All content is constants-driven; each
// section self-guards (renders nothing when empty).

import { CalendarHeart, MessagesSquare, KeyRound } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { HostsSection } from "@/components/hosts-section";
import { InclusionsGrid } from "@/components/inclusions-grid";
import { Testimonials } from "@/components/testimonials";

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

export default function Community() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      {/* Intro band */}
      <header className="bg-primary py-16 text-primary-foreground">
        <div className="mx-auto w-full max-w-6xl px-6">
          <p className="text-sm font-bold uppercase tracking-widest text-white/80">Community</p>
          <h1 className="mt-3 max-w-[20ch] font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl">
            More than a place to stay.
          </h1>
          <p className="mt-4 max-w-[52ch] text-primary-foreground/85">
            We run homes, not listings. That means real hosts, well-kept houses, and a standard we
            stand behind whether you're here for a weekend or a season.
          </p>
        </div>
      </header>

      <main className="flex-1">
        <HostsSection className="mx-auto w-full max-w-6xl px-6 py-14" />

        {/* How community works */}
        <section className="border-y bg-card">
          <div className="mx-auto w-full max-w-6xl px-6 py-14">
            <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              How it works
            </h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {HOW.map(({ icon: Icon, title, sub }) => (
                <div key={title} className="bnp-card p-6">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-primary">
                    <Icon className="h-5 w-5" aria-hidden />
                  </div>
                  <h3 className="mt-3.5 font-display text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <InclusionsGrid className="mx-auto w-full max-w-6xl px-6 py-14" />

        <Testimonials
          className="mx-auto w-full max-w-6xl px-6 py-14"
          subhead="Real words from people who've stayed with us."
        />
      </main>

      <SiteFooter />
    </div>
  );
}

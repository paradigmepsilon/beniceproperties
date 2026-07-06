// client/src/pages/coming-soon.tsx
// Branded placeholder shown when an optional page (LTR, Journal) is toggled OFF
// from Unified-Ops while its content is still being built out. Keeps the URL
// graceful (a direct visitor or an old link lands somewhere on-brand) instead of
// 404-ing. The nav/footer links to the page are hidden separately, so this is
// only reached by someone who knows the URL. Re-enabling the flag restores the
// real page with no code change.

import { Link } from "wouter";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { PageHero } from "@/components/page-hero";
import { useSeo } from "@/lib/seo";

interface Props {
  /** Small uppercase eyebrow, e.g. "Long-term rentals". */
  eyebrow: string;
  /** Headline for the page while it's under construction. */
  title: string;
  /** Supporting line under the headline. */
  subtitle: string;
  /** Per-page accent CSS gradient (the section's segment color). */
  accent: string;
  /** Page path for SEO canonical (e.g. "/ltr"). */
  path: string;
  /** SEO title/description while the page is hidden. */
  seoTitle: string;
  seoDescription: string;
}

export function ComingSoon({ eyebrow, title, subtitle, accent, path, seoTitle, seoDescription }: Props) {
  useSeo({ title: seoTitle, description: seoDescription, path });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} accent={accent} />

      <main className="flex-1">
        <section className="mx-auto w-full max-w-2xl px-6 py-20 text-center">
          <p className="text-lg text-muted-foreground">
            We&apos;re putting this section together right now. Check back soon, or reach out and
            we&apos;ll help you directly in the meantime.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/"
              className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-accent-foreground"
            >
              Back home
            </Link>
            <Link
              href="/lookup"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              My booking
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

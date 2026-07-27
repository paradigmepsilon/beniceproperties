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
  /**
   * Optional lead-capture form. When the placeholder's copy invites the visitor
   * to get in touch, it must actually give them somewhere to type: the LTR
   * placeholder previously said "tell us what you're looking for" and offered
   * only two navigation links, so a visitor who arrived with real intent had no
   * way to act on it and left. Pages with nothing to capture (Journal) omit it.
   */
  capture?: React.ReactNode;
}

export function ComingSoon({ eyebrow, title, subtitle, accent, path, seoTitle, seoDescription, capture }: Props) {
  useSeo({ title: seoTitle, description: seoDescription, path });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <PageHero eyebrow={eyebrow} title={title} subtitle={subtitle} accent={accent} />

      <main className="flex-1">
        {capture ? (
          <section className="mx-auto w-full max-w-2xl px-6 py-16">
            <p className="text-center text-lg text-muted-foreground">
              We&apos;re putting this section together right now. Tell us what you need and
              we&apos;ll follow up directly.
            </p>
            <div className="mt-10">{capture}</div>
          </section>
        ) : (
          <section className="mx-auto w-full max-w-2xl px-6 py-20 text-center">
            <p className="text-lg text-muted-foreground">
              We&apos;re putting this section together right now. Check back soon.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/"
                className="inline-flex min-h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-[#b23a28]"
              >
                Back home
              </Link>
              <Link
                href="/lookup"
                className="inline-flex min-h-11 items-center rounded-full border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
              >
                My booking
              </Link>
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}

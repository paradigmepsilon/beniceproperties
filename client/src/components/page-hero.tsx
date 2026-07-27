// client/src/components/page-hero.tsx
// Shared hero band used by the four top-level pages (co-living home, /str, /ltr,
// /community) so they all get the SAME image slideshow background at the SAME
// height. The <HeroSlideshow /> pulls the global hero images (GET /api/hero-images)
// and cross-fades them; when there are none it renders nothing and the per-page
// accent gradient below shows through as a graceful fallback.
//
// Per-page identity is carried by `accent` (a CSS gradient string): it tints the
// image so co-living/STR/LTR/community each read in their segment color, and it's
// the full background when no images exist. Height is fixed here (min-h) so every
// hero is identical regardless of content length.

import { HeroSlideshow } from "@/components/hero-slideshow";

interface Props {
  /** Small uppercase label above the headline. */
  eyebrow: string;
  /** The hero headline (serif display). */
  title: string;
  /** Supporting line under the headline. */
  subtitle: string;
  /** Per-page accent CSS gradient — tints the image and is the no-image fallback. */
  accent: string;
  /**
   * Optional per-page hero image (a path under client/public, e.g.
   * "/heroes/community.jpg"). When set, it becomes the fixed background and the
   * shared DB-backed slideshow is skipped — so /str, /ltr, and /community each
   * own their own art. The home leaves this unset and keeps the slideshow.
   */
  image?: string;
  /**
   * Alt text for `image`. Required whenever `image` is set — the hero is the
   * largest, most descriptive photo on the page, so leaving it undescribed
   * costs both screen-reader users and image search. Ignored when the
   * slideshow renders instead (it carries its own per-slide alt from the DB).
   */
  imageAlt?: string;
  /**
   * The hero's single primary call to action. Every hero on the site shipped as
   * eyebrow + headline + subtitle and nothing else, so the highest-attention
   * band on the page asked the visitor to do nothing — on a site whose whole job
   * is converting platform traffic into direct bookings. One CTA per hero; use
   * the same label for the same intent everywhere.
   */
  cta?: React.ReactNode;
  /** Extra hero content (e.g. a search bar) rendered under the CTA. */
  children?: React.ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, accent, image, imageAlt, cta, children }: Props) {
  return (
    // <section>, not <header>: SiteHeader is the page's banner landmark, and a
    // second <header> at page level produced two banner roles on every page.
    <section
      aria-label={title}
      className="relative flex min-h-[380px] items-center overflow-hidden text-white sm:min-h-[440px]"
      style={{ background: accent }}
    >
      {/* Backmost background: a fixed per-page image when provided, otherwise the
          rotating DB slideshow (which itself renders nothing if none configured,
          leaving the accent gradient as the fallback). */}
      {image ? (
        <img
          src={image}
          alt={imageAlt ?? ""}
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <HeroSlideshow />
      )}
      {/* Scrim: keeps light text legible over any photo. */}
      <div className="pointer-events-none absolute inset-0 bg-black/40" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/35 to-black/10"
        aria-hidden
      />
      {/* Per-page accent wash so each section reads in its own color even over a
          shared photo set. Multiply keeps it from washing the image out. */}
      <div
        className="pointer-events-none absolute inset-0 opacity-55 mix-blend-multiply"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 py-16 [text-shadow:0_1px_16px_rgba(0,0,0,0.35)]">
        <p className="text-sm font-bold uppercase tracking-widest text-white">{eyebrow}</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-white">{subtitle}</p>
        {cta && <div className="mt-7 flex flex-wrap gap-3">{cta}</div>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}

/**
 * The hero's primary action. A plain anchor (not wouter's Link) so hash targets
 * like `/#stays` actually scroll, and so it works identically across pages.
 * White label on --primary is 4.85:1; the button also carries its own shadow so
 * it stays legible wherever the slideshow lands.
 */
export function HeroCta({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="inline-flex min-h-12 items-center rounded-full bg-primary px-7 text-base font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-[#b23a28] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
    >
      {children}
    </a>
  );
}

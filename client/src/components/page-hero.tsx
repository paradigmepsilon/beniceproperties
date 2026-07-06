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
  /** Extra hero content (e.g. a search bar) rendered under the subtitle. */
  children?: React.ReactNode;
}

export function PageHero({ eyebrow, title, subtitle, accent, image, children }: Props) {
  return (
    <header
      className="relative flex min-h-[380px] items-center overflow-hidden text-white sm:min-h-[440px]"
      style={{ background: accent }}
    >
      {/* Backmost background: a fixed per-page image when provided, otherwise the
          rotating DB slideshow (which itself renders nothing if none configured,
          leaving the accent gradient as the fallback). */}
      {image ? (
        <img
          src={image}
          alt=""
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <HeroSlideshow />
      )}
      {/* Scrim: keeps light text legible over any photo. */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" aria-hidden />
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
        <p className="text-sm font-bold uppercase tracking-widest text-white/90">{eyebrow}</p>
        <h1 className="mt-3 max-w-[18ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-[52ch] text-lg text-white/90">{subtitle}</p>
        {children && <div className="mt-8">{children}</div>}
      </div>
    </header>
  );
}

// client/src/components/editorial-row.tsx
// A warm, alternating text/image band. Image sits right on desktop (imageRight,
// default) or left; always stacks image-first on mobile so the page opens
// visually. Extracted from community.tsx once the /partner page needed the same
// rhythm — shared so the two stay visually in sync.
//
// `accentClassName` colors the eyebrow so each page can key it to its own segment
// accent (community = coral default; /partner = emerald). Everything else is
// identical across consumers.

import { cn } from "@/lib/utils";

export function EditorialRow({
  image,
  imageAlt,
  eyebrow,
  heading,
  imageRight = true,
  accentClassName = "text-primary",
  sectionClassName = "px-6 py-14",
  badge,
  badgeClassName = "text-foreground/[0.06]",
  children,
}: {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  heading: string;
  imageRight?: boolean;
  /** Tailwind text-color class for the eyebrow. Defaults to brand coral. */
  accentClassName?: string;
  /** Padding/spacing utilities for the outer section. Override to tighten or
   *  loosen the band (default matches community's original rhythm). */
  sectionClassName?: string;
  /** Optional large ghosted numeral (e.g. "01") set behind the text column as a
   *  decorative background. Omit for no watermark (community's default). */
  badge?: string;
  /** Color/opacity class for the ghosted numeral. Defaults to a faint neutral. */
  badgeClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("mx-auto w-full max-w-6xl", sectionClassName)}>
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
        <div className={cn("relative", imageRight ? "lg:order-1" : "lg:order-2")}>
          {/* Decorative oversized numeral behind the copy. Faint, non-interactive,
              hidden from assistive tech; sits behind via -z-10. */}
          {badge && (
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute -left-2 -top-10 -z-10 select-none font-display text-[8rem] font-bold leading-none sm:-top-16 sm:text-[11rem]",
                badgeClassName,
              )}
            >
              {badge}
            </span>
          )}
          {eyebrow && (
            <p className={cn("text-sm font-bold uppercase tracking-widest", accentClassName)}>
              {eyebrow}
            </p>
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

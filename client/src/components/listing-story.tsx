// client/src/components/listing-story.tsx
// Editorial presentation for a listing's detail page. Turns a listing's
// structured `listingContent` (hook, essentials, getting-around, who-for) plus
// its narrative `description` into a scannable, intentional layout instead of a
// wall of prose. Every section is optional and renders only when present, so a
// half-filled listing still looks deliberate. When there's no structured
// content at all, the caller falls back to <RichText>.

import {
  Wifi,
  BedDouble,
  Bath,
  ShowerHead,
  UtensilsCrossed,
  WashingMachine,
  Sparkles,
  Coffee,
  Trees,
  Car,
  TrainFront,
  KeyRound,
  Home,
  Plane,
  MapPin,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { ListingContent } from "@shared/schema";
import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";

type Segment = "whole" | "room" | "ltr";

// Named icons an admin can attach to an essential. Unknown/omitted names fall
// back to a neutral dot, so a typo never breaks the render.
const ICONS: Record<string, LucideIcon> = {
  wifi: Wifi,
  bed: BedDouble,
  bath: Bath,
  "private-bath": ShowerHead,
  kitchen: UtensilsCrossed,
  laundry: WashingMachine,
  housekeeping: Sparkles,
  coffee: Coffee,
  yard: Trees,
  parking: Car,
  car: Car,
  transit: TrainFront,
  key: KeyRound,
  furnished: Home,
  plane: Plane,
  location: MapPin,
};

function hasStory(c: ListingContent | null | undefined): c is ListingContent {
  if (!c) return false;
  return Boolean(
    c.hook ||
      (c.essentials && c.essentials.length) ||
      (c.gettingAround && c.gettingAround.length) ||
      c.whoFor,
  );
}

export function ListingStory({
  content,
  description,
  segment,
  className,
}: {
  content: ListingContent | null | undefined;
  description: string | null | undefined;
  segment: Segment;
  className?: string;
}) {
  // No structured content → plain prose, unchanged behavior.
  if (!hasStory(content)) {
    return <RichText text={description} className={cn("max-w-2xl", className)} />;
  }

  // Segment accent: coral for whole-property, teal for by-the-room, amber for
  // long-term. Uses the existing design tokens so this can never drift from the
  // rest of the site.
  const accent =
    segment === "whole"
      ? { text: "text-segment-whole", bg: "bg-segment-whole", tintText: "text-accent-foreground", tintBg: "bg-accent" }
      : segment === "ltr"
        ? { text: "text-segment-ltr", bg: "bg-segment-ltr", tintText: "text-segment-ltr", tintBg: "bg-segment-ltr-tint" }
        : { text: "text-segment-room", bg: "bg-segment-room", tintText: "text-segment-room", tintBg: "bg-segment-room-tint" };

  return (
    <div className={cn("max-w-2xl", className)}>
      {content.hook && (
        <div>
          <span aria-hidden className={cn("block h-0.5 w-10 rounded-full", accent.bg)} />
          <p className="mt-4 font-display text-2xl font-medium leading-snug tracking-tight text-foreground sm:text-[1.75rem]">
            {content.hook}
          </p>
        </div>
      )}

      <RichText text={description} className={cn(content.hook && "mt-6")} />

      {content.essentials && content.essentials.length > 0 && (
        <section className="mt-8">
          <h2 className={cn("text-xs font-bold uppercase tracking-widest", accent.tintText)}>
            The essentials
          </h2>
          <ul className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {content.essentials.map((item, i) => {
              const Icon = (item.icon && ICONS[item.icon]) || null;
              return (
                <li
                  key={i}
                  className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-sm"
                >
                  {Icon ? (
                    <Icon className={cn("h-[1.05rem] w-[1.05rem] shrink-0", accent.text)} aria-hidden />
                  ) : (
                    <span aria-hidden className={cn("h-2 w-2 shrink-0 rounded-full", accent.bg)} />
                  )}
                  <span className="min-w-0 font-medium leading-tight">{item.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {content.gettingAround && content.gettingAround.length > 0 && (
        <section className="mt-8">
          <h2 className={cn("text-xs font-bold uppercase tracking-widest", accent.tintText)}>
            Getting around
          </h2>
          <div className={cn("mt-3 overflow-hidden rounded-2xl", accent.tintBg)}>
            <ul className="divide-y divide-black/5">
              {content.gettingAround.map((g, i) => (
                <li key={i} className="flex items-baseline justify-between gap-4 px-4 py-3">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <MapPin className={cn("h-4 w-4 shrink-0", accent.text)} aria-hidden />
                    {g.place}
                  </span>
                  <span className="font-display text-base font-semibold tabular-nums text-foreground">
                    {g.time}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {content.whoFor && (
        <section className="mt-8 flex items-start gap-3">
          <span className={cn("mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full", accent.tintBg)}>
            <Users className={cn("h-[1.05rem] w-[1.05rem]", accent.text)} aria-hidden />
          </span>
          <div>
            <h2 className={cn("text-xs font-bold uppercase tracking-widest", accent.tintText)}>
              Who it's for
            </h2>
            <p className="mt-1 leading-relaxed text-foreground/90">{content.whoFor}</p>
          </div>
        </section>
      )}
    </div>
  );
}

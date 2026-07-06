// client/src/components/listing-image.tsx
// Photo-forward image slot. Renders the first real photo if present; otherwise a
// tasteful, DETERMINISTIC branded gradient placeholder (same id → same gradient)
// with a context icon. Swap in real photos via admin/seed and these vanish.

import { Palmtree, Home, BedDouble, Building2, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

// A small set of warm, on-brand gradient pairs. Chosen for hospitality warmth.
const GRADIENTS = [
  ["#f8b89c", "#e0533d"], // coral
  ["#f5d6a8", "#e0a13d"], // amber
  ["#a8d8d6", "#3d9e9b"], // teal
  ["#c9b8e8", "#7d5bd1"], // violet
  ["#f6b3c2", "#d14d79"], // rose
  ["#b8d8a8", "#5b9e3d"], // sage
];

function hashIndex(seed: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % mod;
}

interface Props {
  id: string;
  photos?: string[] | null;
  alt: string;
  location?: string | null;
  kind?: "STR" | "COLIVING" | "ROOM" | "LTR";
  className?: string;
  rounded?: string;
}

export function ListingImage({ id, photos, alt, location, kind, className, rounded = "rounded-2xl" }: Props) {
  const realPhoto = photos && photos.length > 0 ? photos[0] : null;

  if (realPhoto) {
    return (
      <img
        src={realPhoto}
        alt={alt}
        className={cn("h-full w-full object-cover", rounded, className)}
        loading="lazy"
      />
    );
  }

  const [from, to] = GRADIENTS[hashIndex(id, GRADIENTS.length)];
  const Icon =
    kind === "ROOM"
      ? BedDouble
      : kind === "COLIVING"
        ? Building2
        : kind === "LTR"
          ? KeyRound
          : location?.toLowerCase().includes("antigua")
            ? Palmtree
            : Home;

  // Placeholder fills its parent so the wrapper's aspect-ratio governs height.
  // (Unlike <img>, a bare div has no intrinsic size, so we pin it to the box.)
  return (
    <div
      className={cn(
        "absolute inset-0 flex h-full w-full items-center justify-center overflow-hidden",
        rounded,
        className,
      )}
      style={{ background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)` }}
      aria-label={alt}
      role="img"
    >
      <Icon className="h-12 w-12 text-white/70" strokeWidth={1.5} />
      <span className="absolute bottom-3 right-4 text-[10px] font-medium uppercase tracking-wider text-white/60">
        photo coming soon
      </span>
    </div>
  );
}

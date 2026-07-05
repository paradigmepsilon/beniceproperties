// client/src/components/hero-slideshow.tsx
// Homepage hero background SLIDESHOW (BT-22). Cycles the active hero images
// managed in Unified Ops (GET /api/hero-images, in display order) as a
// cross-fading background BEHIND the hero content (headline + search + doors),
// which stays as the overlay on top.
//
// - No layout shift: images are absolutely positioned inside a parent that owns
//   the height; each is object-cover. The component renders nothing structural
//   of its own beyond the absolute layer.
// - Performance: the first image is eager + high priority; the rest lazy-load.
//   A single interval cross-fades. Honors prefers-reduced-motion (no auto-cycle).
// - Graceful fallback: if there are zero active images, renders nothing and the
//   hero keeps its existing gradient background (AC#5).

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface HeroImageDto {
  id: string;
  url: string;
  alt: string;
}

const ROTATE_MS = 6000;

export function HeroSlideshow() {
  const { data } = useQuery<HeroImageDto[]>({ queryKey: ["/api/hero-images"] });
  const images = data ?? [];
  const [index, setIndex] = useState(0);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  }, []);

  // Auto-advance only when there is more than one image and motion is allowed.
  useEffect(() => {
    if (images.length <= 1 || reducedMotion.current) return;
    const t = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [images.length]);

  // Keep the index valid if the set shrinks between loads.
  useEffect(() => {
    if (index >= images.length && images.length > 0) setIndex(0);
  }, [images.length, index]);

  // AC#5: no active images → render nothing; the hero keeps its gradient.
  if (images.length === 0) return null;

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {images.map((img, i) => (
        <img
          key={img.id}
          src={img.url}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          // React 18.3 passes `fetchPriority` through unlowercased and warns; the
          // DOM attribute is lowercase `fetchpriority`. Spread it as a raw attr to
          // emit the correct attribute without the dev-only warning or a TS error.
          {...{ fetchpriority: i === 0 ? "high" : "low" }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </div>
  );
}

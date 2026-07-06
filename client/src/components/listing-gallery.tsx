// client/src/components/listing-gallery.tsx
// Photo-forward gallery for detail surfaces (STR property, co-living room).
// Hero image + clickable thumbnail strip; clicking the hero opens a fullscreen
// lightbox you can arrow/swipe through. Degrades gracefully:
//   0 photos → ListingImage placeholder (no thumbs, no lightbox)
//   1 photo  → plain hero (no thumbs, no lightbox)
//   2+ photos → hero + thumbnail strip + lightbox
// Reuses the existing Radix Dialog — no carousel dependency.

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListingImage } from "@/components/listing-image";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Props {
  id: string;
  photos?: string[] | null;
  alt: string;
  location?: string | null;
  kind?: "STR" | "COLIVING" | "ROOM" | "LTR";
  rounded?: string;
}

export function ListingGallery({ id, photos, alt, location, kind, rounded = "rounded-3xl" }: Props) {
  const pics = (photos ?? []).filter(Boolean);
  const [selected, setSelected] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Keep `selected` in range if the photo list ever changes (e.g. navigation).
  const active = pics.length > 0 ? Math.min(selected, pics.length - 1) : 0;

  // 0 photos → identical branded placeholder behavior as before.
  if (pics.length === 0) {
    return (
      <div className={cn("relative aspect-[3/2] w-full overflow-hidden", rounded)}>
        <ListingImage id={id} photos={pics} alt={alt} location={location} kind={kind} rounded={rounded} />
      </div>
    );
  }

  // 1 photo → plain hero, no thumbnails, no lightbox.
  if (pics.length === 1) {
    return (
      <div className={cn("relative aspect-[3/2] w-full overflow-hidden", rounded)}>
        <img src={pics[0]} alt={alt} className={cn("h-full w-full object-cover", rounded)} loading="lazy" />
      </div>
    );
  }

  // 2+ photos → hero + thumbnail strip + lightbox.
  return (
    <div>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className={cn(
          "group relative block aspect-[3/2] w-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          rounded,
        )}
        aria-label={`View all ${pics.length} photos of ${alt}`}
      >
        <img
          src={pics[active]}
          alt={alt}
          className={cn("h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]", rounded)}
          loading="lazy"
        />
        <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {active + 1} / {pics.length}
        </span>
      </button>

      {/* Thumbnail strip */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {pics.map((src, i) => (
          <button
            key={`${src}-${i}`}
            type="button"
            onClick={() => setSelected(i)}
            className={cn(
              "relative aspect-[3/2] h-16 w-24 shrink-0 overflow-hidden rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              i === active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100",
            )}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === active}
          >
            <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
          </button>
        ))}
      </div>

      <Lightbox
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        photos={pics}
        index={active}
        setIndex={setSelected}
        alt={alt}
      />
    </div>
  );
}

interface LightboxProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  photos: string[];
  index: number;
  setIndex: (i: number) => void;
  alt: string;
}

function Lightbox({ open, onOpenChange, photos, index, setIndex, alt }: LightboxProps) {
  const prev = () => setIndex((index - 1 + photos.length) % photos.length);
  const next = () => setIndex((index + 1) % photos.length);

  // Arrow-key navigation while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setIndex((index - 1 + photos.length) % photos.length);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setIndex((index + 1) % photos.length);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, photos.length, setIndex]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid h-[92vh] max-w-[96vw] grid-rows-[1fr_auto] gap-3 border-0 bg-black/95 p-3 sm:p-6">
        <DialogTitle className="sr-only">{alt}, photo {index + 1} of {photos.length}</DialogTitle>

        <div className="relative flex min-h-0 items-center justify-center">
          <img
            src={photos[index]}
            alt={`${alt}, photo ${index + 1}`}
            className="max-h-full max-w-full object-contain"
          />
          <button
            type="button"
            onClick={prev}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
            {index + 1} / {photos.length}
          </span>
        </div>

        {/* Thumbnail strip inside the lightbox */}
        <div className="flex justify-center gap-2 overflow-x-auto pb-1">
          {photos.map((src, i) => (
            <button
              key={`lb-${src}-${i}`}
              type="button"
              onClick={() => setIndex(i)}
              className={cn(
                "relative aspect-[3/2] h-14 w-20 shrink-0 overflow-hidden rounded-md transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white",
                i === index ? "ring-2 ring-white" : "opacity-50 hover:opacity-90",
              )}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === index}
            >
              <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

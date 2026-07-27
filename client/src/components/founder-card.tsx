// client/src/components/founder-card.tsx
// One owner-operator: portrait, name, role, short first-person bio.
//
// The portrait degrades to an initials monogram if the image is missing or fails
// to load, so shipping this section before the photographs exist leaves a
// composed placeholder rather than a broken-image icon. Swap in the real photos
// (see content/founders.ts) and the monogram disappears with no code change.

import { useState } from "react";
import type { Founder } from "@/content/founders";

export function FounderCard({ founder }: { founder: Founder }) {
  const [failed, setFailed] = useState(false);

  const initials = founder.name
    .split(" ")
    .map((part) => part[0])
    .join("");

  return (
    <figure className="flex flex-col">
      <div className="aspect-[3/4] w-full overflow-hidden rounded-2xl bg-segment-room-tint">
        {failed ? (
          <div
            role="img"
            aria-label={founder.photoAlt}
            className="flex h-full w-full items-center justify-center bg-segment-room-tint font-display text-5xl font-semibold text-segment-room"
          >
            {initials}
          </div>
        ) : (
          <img
            src={founder.photo}
            alt={founder.photoAlt}
            width={800}
            height={1067}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <figcaption className="mt-4">
        <h3 className="font-display text-xl font-semibold tracking-tight">{founder.name}</h3>
        <p className="text-sm font-medium text-segment-room">{founder.role}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{founder.bio}</p>
      </figcaption>
    </figure>
  );
}

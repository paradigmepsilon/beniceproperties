// client/src/components/host-card.tsx
// One host: round avatar + name/role + area + blurb. The avatar reuses
// <ListingImage> keyed on the host id, so a missing photo degrades to a
// deterministic branded gradient (never a broken image).

import type { Host } from "@/content/hosts";
import { ListingImage } from "@/components/listing-image";

export function HostCard({ host }: { host: Host }) {
  return (
    <article className="bnp-card p-6" data-testid={`host-${host.id}`}>
      <div className="flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full">
          <ListingImage
            id={host.id}
            photos={host.photo ? [host.photo] : null}
            alt={host.name}
            kind="ROOM"
            rounded="rounded-none"
          />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-tight">{host.name}</h3>
          {host.role && <p className="text-xs font-medium uppercase tracking-wider text-primary">{host.role}</p>}
          <p className="mt-0.5 text-sm text-muted-foreground">{host.area}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-foreground/90">{host.blurb}</p>
    </article>
  );
}

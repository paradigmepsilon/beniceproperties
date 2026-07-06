// client/src/components/hosts-section.tsx
// The "meet your hosts" band — a heading over the HOSTS grid. Renders nothing
// when there are no hosts.

import { HOSTS } from "@/content/hosts";
import { HostCard } from "@/components/host-card";
import { cn } from "@/lib/utils";

export function HostsSection({
  heading = "Meet your hosts",
  subhead = "Real people who own and run these homes, and who you'll actually talk to.",
  className,
}: {
  heading?: string;
  subhead?: string;
  className?: string;
}) {
  if (HOSTS.length === 0) return null;

  return (
    <section className={cn(className)} data-testid="hosts-section">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      {subhead && <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">{subhead}</p>}
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {HOSTS.map((h) => (
          <HostCard key={h.id} host={h} />
        ))}
      </div>
    </section>
  );
}

// client/src/components/follow-strip.tsx
// A static "Follow us" row — plain links to the brand's social profiles from
// company.ts. Deliberately NOT a live third-party feed/embed: no external
// script, no CSP surface, no platform dependency. Renders nothing if no social
// links are configured.

import { Instagram, Facebook, Youtube } from "lucide-react";
import { COMPANY } from "@/content/company";
import { cn } from "@/lib/utils";

const LINKS = [
  { key: "instagram", href: COMPANY.social.instagram, label: "Instagram", Icon: Instagram },
  { key: "facebook", href: COMPANY.social.facebook, label: "Facebook", Icon: Facebook },
  { key: "youtube", href: COMPANY.social.youtube, label: "YouTube", Icon: Youtube },
] as const;

export function FollowStrip({
  heading = "Follow along",
  className,
}: {
  heading?: string;
  className?: string;
}) {
  const active = LINKS.filter((l) => Boolean(l.href));
  if (active.length === 0) return null;

  return (
    <section className={cn(className)} data-testid="follow-strip">
      <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{heading}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        See the homes and the little moments behind them.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        {active.map(({ key, href, label, Icon }) => (
          <a
            key={key}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="bnp-pill gap-2 border-primary bg-accent font-semibold text-primary hover:bg-primary hover:text-primary-foreground"
            data-testid={`link-social-${key}`}
          >
            <Icon className="h-4 w-4" /> {label}
          </a>
        ))}
      </div>
    </section>
  );
}

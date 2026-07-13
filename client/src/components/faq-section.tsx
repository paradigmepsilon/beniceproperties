// client/src/components/faq-section.tsx
// Visible FAQ accordion, rendered from a Faq[] list. Built on native
// <details>/<summary> so it is:
//   - accessible with zero JS (keyboard + screen reader out of the box),
//   - fully present in the prerendered/static HTML (the answer text is always in
//     the DOM), which is exactly what Google + AI answer engines need to honor
//     the FAQPage schema and extract answers.
// The SAME Faq[] should feed buildFaqJsonLd() on the page so the visible copy and
// the structured data stay in lockstip (Google requires visible parity).
//
// Styling mirrors the site's editorial sections: Fraunces display heading, hairline
// dividers, muted body. Chevron rotates via the open state with a group marker.

import { ChevronDown } from "lucide-react";
import type { Faq } from "@/content/faqs";
import { cn } from "@/lib/utils";

export function FaqSection({
  faqs,
  heading = "Common questions",
  subhead,
  className,
}: {
  faqs: Faq[];
  heading?: string;
  subhead?: string;
  className?: string;
}) {
  if (faqs.length === 0) return null;

  return (
    <section className={cn(className)} data-testid="faq-section">
      <div className="max-w-[52ch]">
        <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {heading}
        </h2>
        {subhead && <p className="mt-2 text-muted-foreground">{subhead}</p>}
      </div>

      <div className="mt-8 divide-y divide-border border-y border-border">
        {faqs.map((faq) => (
          <details key={faq.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-lg font-semibold leading-snug">
                {faq.q}
              </h3>
              <ChevronDown
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300 group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <p className="pb-5 pr-9 text-sm leading-relaxed text-muted-foreground">
              {faq.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

// client/src/pages/house-rules.tsx
// The public house-rules page. Linked from the welcome letter, the 24h checkout
// reminder, the stay page, the footer — and referenced by name inside the signed
// short-stay agreement, which is why the content file carries a factual-discipline
// header and every section self-guards on having real copy.

import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useSeo } from "@/lib/seo";
import { HOUSE_RULES_UPDATED, populatedHouseRules } from "@/content/house-rules";

export default function HouseRules() {
  useSeo({
    title: "House Rules",
    description:
      "The house rules for staying in a Be Nice Properties room — shared spaces, door codes, and leaving.",
    path: "/house-rules",
  });

  const sections = populatedHouseRules();

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="font-display text-3xl font-semibold tracking-tight">House rules</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          These form part of your rental agreement. Last updated {HOUSE_RULES_UPDATED}.
        </p>

        <div className="mt-10 space-y-10">
          {sections.map((section) => (
            <section key={section.id} id={section.id}>
              <h2 className="font-display text-xl font-semibold tracking-tight">
                {section.heading}
              </h2>
              <div className="mt-4 space-y-4">
                {section.rules.map((rule) => (
                  <div key={rule.title}>
                    <h3 className="text-sm font-medium">{rule.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{rule.body}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          Something not covered here? Reply to any of our emails and just ask — we would rather you
          asked than guessed.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

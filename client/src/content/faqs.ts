// client/src/content/faqs.ts
// -----------------------------------------------------------------------------
// Co-living FAQ — the single source of truth for the visible FAQ accordion AND
// the FAQPage JSON-LD (Google requires the marked-up answer to be visible on the
// page, so the same array feeds both — see components/faq-section.tsx and
// buildFaqJsonLd in lib/seo.ts).
//
// FACTUAL DISCIPLINE: every answer here asserts only confirmed facts —
//   - Inclusions come from content/inclusions.ts (utilities, wifi, weekly
//     cleaning, furnished kitchen, on-site laundry, fully furnished).
//   - Terms up to 90 days + weekly/bi-weekly/monthly cadence + first payment due
//     on booking + e-signed leases come from the platform spec (CLAUDE.md).
//   - 7-night minimum comes from COLIVING_MIN_DAYS in shared/schema.ts.
//   - Deposit-at-booking, basic screening, and "working professionals" audience
//     were confirmed by the owner (2026-07-12).
// Do NOT add specific dollar amounts, deposit sums, or screening criteria here
// without owner confirmation — unverified specifics get published as fact to AI
// answer engines. Edit copy freely; keep claims true.
// -----------------------------------------------------------------------------

export interface Faq {
  q: string;
  a: string;
}

export const COLIVING_FAQS: Faq[] = [
  {
    q: "What's included in the rent?",
    a: "One flat rate covers everything: utilities (power, water, and gas), fast Wi-Fi, weekly cleaning of the shared spaces, a fully furnished room and home, on-site laundry, and a stocked kitchen. No surprise bills and no add-ons at checkout.",
  },
  {
    q: "How long can I stay?",
    a: "Co-living stays are flexible, from about a week up to 90 days. There's a 7-night minimum, so you're free to stay for a short season or settle in for a few months.",
  },
  {
    q: "How do payments work?",
    a: "You choose the schedule that suits you — weekly, bi-weekly, or monthly — and you see every payment and due date up front before you commit. Your first payment is due when you book.",
  },
  {
    q: "Is there a deposit, and how do I sign?",
    a: "Yes. A first payment is collected when you book, and your lease is signed online with a simple typed e-signature before you move in. Everything is shown to you clearly before you commit to anything.",
  },
  {
    q: "Do I need to apply or get screened?",
    a: "Yes, there's a quick screening before move-in. Because these are shared homes with other working professionals, we keep the process simple but we do check — it's part of how we keep the houses calm and well-run.",
  },
  {
    q: "Who else lives in the homes?",
    a: "Working professionals. Co-living here means a private, furnished room in a calm, well-run shared house alongside other adults who want a comfortable, drama-free place to land.",
  },
  {
    q: "Do I book directly, or through a platform like Airbnb?",
    a: "You book directly with us, right here on our site — no platform middleman and no markup. The people answering your messages are the same people who own and run the homes.",
  },
  {
    q: "Where are the homes located?",
    a: "In the Atlanta area, out west toward Douglasville, with more locations opening as we grow. Every home is one we own or manage ourselves, so they all meet the same standard.",
  },
];

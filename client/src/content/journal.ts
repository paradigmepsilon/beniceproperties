// client/src/content/journal.ts
// -----------------------------------------------------------------------------
// The BNP journal — owned, on-site content (not a third-party blog). Posts are
// authored here as structured blocks so they render with the site's own
// typography and never depend on an external service. Placeholder posts — swap
// for real articles. Adding a post is data-only: append to JOURNAL_POSTS.
//
// A post body is an ordered list of Blocks. Block types mirror the "render only
// what's present" pattern used by ListingStory:
//   - heading:   a section heading (font-display)
//   - paragraph: plain-text prose (rendered via <RichText>; blank lines split
//                paragraphs, single newlines are soft breaks)
//   - image:     an image with alt text (falls back gracefully if src missing)
//
// `date` is an ISO date ("2026-06-30"); shortDate() formats it for display.
// `cover` is optional — a missing cover falls back to a branded gradient via
// <ListingImage> keyed on the slug.
// -----------------------------------------------------------------------------

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; src?: string; alt: string };

export interface JournalPost {
  slug: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD"
  excerpt: string;
  cover?: string;
  blocks: Block[];
}

export const JOURNAL_POSTS: JournalPost[] = [
  {
    slug: "why-we-book-direct",
    title: "Why we ask you to book direct",
    date: "2026-06-28",
    excerpt:
      "Booking straight through us means a better price for you and a real relationship with the people who run your home. Here's how it works and why it matters.",
    blocks: [
      { type: "paragraph", text: "Every time a stay runs through a big booking platform, a slice of what you pay disappears into fees — and the connection between you and the people who actually run the home gets a little thinner." },
      { type: "heading", text: "A better price, plainly" },
      { type: "paragraph", text: "When you book direct, there's no platform markup layered on top. You see the real price up front: nightly for a whole-home getaway, or a simple weekly rate for a room, with everything included. No cleaning-fee surprises at the last screen." },
      { type: "heading", text: "A real relationship" },
      { type: "paragraph", text: "You get a direct line to the host who runs the property — the person who can actually help, not a call center reading from a script. That's the whole point of what we're building." },
      { type: "paragraph", text: "We own or manage every home ourselves, so the standard is the same whether you're staying a weekend or a season." },
    ],
  },
  {
    slug: "what-included-means",
    title: "What “all-inclusive” actually means here",
    date: "2026-06-20",
    excerpt:
      "Utilities, Wi-Fi, cleaning, furniture — we say “included” and we mean it. A quick walk through exactly what your rate covers.",
    blocks: [
      { type: "paragraph", text: "“All-inclusive” gets thrown around a lot. Here's what it means for a room in one of our co-living homes, line by line." },
      { type: "heading", text: "One flat rate" },
      { type: "paragraph", text: "Your weekly rate covers the utilities — power, water, gas — plus fast Wi-Fi in every room. No separate bills to set up, no meter to worry about." },
      { type: "heading", text: "Move-in ready" },
      { type: "paragraph", text: "The home is fully furnished before you arrive: bed, linens, a stocked kitchen, and living areas set up. You can cook dinner the night you move in." },
      { type: "heading", text: "Kept fresh" },
      { type: "paragraph", text: "Shared spaces get cleaned every week, and there's a washer and dryer in the home. The goal is simple: you focus on your life, not on running a household." },
    ],
  },
  {
    slug: "settling-into-coliving",
    title: "Settling into co-living: a first-week guide",
    date: "2026-06-10",
    excerpt:
      "New to sharing a home with other professionals? A few small things make the first week feel like home instead of a hotel.",
    blocks: [
      { type: "paragraph", text: "Co-living works best when a house full of people feels like a home instead of a set of strangers. Most of that happens in the first week." },
      { type: "heading", text: "Say hi early" },
      { type: "paragraph", text: "A quick introduction to your housemates goes a long way. Everyone's a working professional here — busy, considerate, and glad to know who's who." },
      { type: "heading", text: "Learn the rhythms" },
      { type: "paragraph", text: "Kitchens and laundry have natural rush hours. A little awareness of when things are busy keeps a shared home running smoothly for everyone." },
      { type: "heading", text: "Ask your host anything" },
      { type: "paragraph", text: "Where's the good coffee, the nearest gym, the fastest way downtown? Your host lives this neighborhood — that direct line is there for exactly these questions." },
    ],
  },
];

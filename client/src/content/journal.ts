// client/src/content/journal.ts
// -----------------------------------------------------------------------------
// Journal post TYPES only. As of 2026-07-06 the journal is DB-backed: posts are
// authored in Unified Ops and fetched from /api/journal — they are no longer a
// static array here. These types describe the JSON the API returns (and the
// `blocks` shape the article renderer understands). Kept in this file so the
// existing consumers (journal-card, journal-article) keep their import path.
//
// A post body is an ordered list of Blocks:
//   - heading:   a section heading (font-display)
//   - paragraph: plain-text prose (rendered via <RichText>)
//   - image:     an image with alt text (falls back gracefully if src missing)
// `date` is an ISO date ("YYYY-MM-DD") — the publish date. `cover` is optional.
// -----------------------------------------------------------------------------

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "image"; src?: string; alt: string };

// A journal card (list payload) — no blocks.
export interface JournalPost {
  slug: string;
  title: string;
  date: string; // ISO "YYYY-MM-DD" (publish date)
  excerpt: string;
  cover?: string;
}

// A full article (detail payload) — adds the ordered content blocks.
export interface JournalArticle extends JournalPost {
  blocks: Block[];
}

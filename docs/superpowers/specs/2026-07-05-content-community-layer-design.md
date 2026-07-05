# BNP Content & Community Layer — Design Spec

**Date:** 2026-07-05
**Project:** BNP (Be Nice Properties booking platform)
**Repo:** beniceproperties (branch: main)
**Author:** Alex Henry / Claude Code
**Status:** Approved for planning

---

## 1. Problem & Goal

BNP's site today is a lean, well-built **transactional** platform: home (hero + search +
two product doors + trust band + listings grid + "how it works"), property/room detail
pages with booking cards, and the lease/checkout flow. It gets a visitor from "I see a
place" to "I've booked" fast, but it does nothing to make someone *want* to live there
before they book — no story, no community, no neighborhood, no social proof.

The reference site **livingQ.city** is the inverse: a lifestyle/community site whose entire
pitch is "you're not renting a room, you're joining a community." Its content strengths:
all-inclusive-fee amenities grid, live-in community directors with names + faces, ~10
resident testimonials, neighborhood storytelling, rich per-property feature chips, a
content engine (blog/events), and on-site email capture.

**Goal:** graft livingQ's *content and trust layer* onto BNP's *superior booking engine*
without diluting BNP's clean design or its fast path to book. This directly serves three
stated business priorities: reduce platform dependency (owned email capture, direct-booking
story), ramp marketing (content/community surface, SEO URLs), and lift conversion
(inclusions transparency + social proof are direct conversion levers).

### Non-goals (YAGNI)
- No admin UI for content (deliberate later phase).
- No live third-party embeds (Instagram widget, etc.).
- No markdown/MDX dependency.
- No changes to booking, lease, checkout, or payment flows.
- No changes to any existing DB table.

---

## 2. Key Decisions (locked)

| Decision | Choice | Rationale |
|---|---|---|
| Content sourcing | **Editable placeholders now** | Unblocked; matches existing `home.tsx` placeholder-copy pattern. Owner swaps real content later. |
| Scope | **Full content-site treatment** | New routes + community + neighborhood + brand + journal, per owner. |
| Structure | **New routes + nav** | Each topic gets room + its own SEO URL. |
| Storage | **Code constants now, DB later** | Zero schema change, zero migration risk, one file per section to edit. DB/admin is an explicit later phase. |
| Newsletter | **Own DB table + endpoint** | Owned email list; the single strategic backend touch. Additive-only. |
| Blog/events | **Data-driven from own constants, degrades to nothing when empty** | Owned, not platform-dependent. No external content service. |
| Instagram | **Static "Follow us" image strip, not a live widget** | No external script, no CSP issue, no platform dependency. |

### Alignment with CLAUDE.md floors
- **No destructive migration:** the only schema change is a brand-new `newsletter_subscribers`
  table — purely additive, touches no existing table, clears the HALT condition. Per the
  non-negotiable floor, existing tables are still exported to `/docs/migration-backups/`
  before the migration runs, even though a new-table migration cannot drop data.
- **Expansion rule:** no hard-coded property/room identities in logic. Content constants are
  keyed by city or property/room id passed as props — adding a property requires zero code
  change to these components.
- **Read before writing:** before any server work, read `shared/schema.ts`,
  `server/routes.ts`, `server/storage.ts` and mirror the existing idempotent-boot-migration
  and storage-abstraction conventions.
- **Build-log:** append an outcome entry to `/docs/build-log.md` on completion; mark the
  phase `COMPLETE — tests green` only when tests pass.

---

## 3. Architecture

All new content ships as **typed constants**, one file per content type, under a new
`client/src/content/` directory. Each file exports a clearly-marked, editable array mirroring
the existing `TRUST_ITEMS` / `STEPS` pattern in `client/src/pages/home.tsx`. New
**presentational components** consume those constants. New **routes** are registered in
`App.tsx` and linked from header/footer nav. No server logic except the one newsletter
endpoint; no schema change except the one additive table; no third-party scripts.

### 3.1 Content files (`client/src/content/`)

| File | Exports | Shape (fields) |
|---|---|---|
| `inclusions.ts` | `INCLUSIONS` | `{ icon, label, note }[]` — "what's included in your stay" |
| `testimonials.ts` | `TESTIMONIALS` + `selectTestimonials(opts)` | `{ id, name, area, city, quote, rating? }[]` |
| `hosts.ts` | `HOSTS` | `{ id, name, area, city, blurb, photo, role? }[]` |
| `neighborhoods.ts` | `NEIGHBORHOODS` (keyed by city) + `neighborhoodFor(city)` | `{ city, headline, prose, knownFor: string[], mapsUrl? }` |
| `journal.ts` | `JOURNAL_POSTS` + `postBySlug(slug)` | `{ slug, title, date, excerpt, cover, blocks: Block[] }` |
| `company.ts` | `COMPANY` | `{ missionHeadline, missionBody, foundingStory, social: {...} }` |

`Block` (journal body) reuses the existing rich-text rendering convention
(`client/src/components/rich-text.tsx`) — a discriminated union of
`{ type: "heading" | "paragraph" | "image", ... }`. No markdown dependency.

### 3.2 Components (`client/src/components/`)

Each is self-contained, driven by one content constant, styled with existing brand tokens
(`--primary` coral, segment colors, `bnp-card`, `font-display`).

| Component | Consumes | Renders | Notes |
|---|---|---|---|
| `inclusions-grid.tsx` | `INCLUSIONS` | icon grid "Everything's included" | `variant?: "full" \| "compact"` |
| `testimonials.tsx` | `selectTestimonials` | resident-quote cards | `filterByCity?`, `limit?` props |
| `host-card.tsx` | one host | face + name + area + blurb | uses image fallback |
| `hosts-section.tsx` | `HOSTS` | heading + host cards grid | |
| `neighborhood-block.tsx` | `neighborhoodFor(city)` | headline + prose + "known for" chips + optional Maps link | keyed by `city` prop; renders null if no entry |
| `journal-card.tsx` | one post | cover + title + date + excerpt, links to article | |
| `newsletter-signup.tsx` | — | name + email capture form | POSTs to own endpoint |
| `follow-strip.tsx` | `COMPANY` | static "Follow us" image strip + social links | no third-party embed |

### 3.3 Routes (registered in `App.tsx`, linked in nav)

| Route | Content | Analog |
|---|---|---|
| `/community` | hosts section + "how community works" + inclusions grid + testimonials | livingQ "Thrive Together" |
| `/journal` | index of `journal-card`s | livingQ blog/QTalks |
| `/journal/:slug` | article from `postBySlug`; unknown slug → existing not-found | — |
| `/about` | mission/founding story (`company.ts`) + inclusions + testimonials strip | livingQ "Established 2020"/mission |

### 3.4 Enrichments to existing pages

- **Home** (`home.tsx`): insert `inclusions-grid` (full) after the trust band, before
  listings; insert `testimonials` strip after the listings grid, before the "Booking direct
  should feel safe" band. Hero, search, doors, grid untouched.
- **Room detail** (`room-detail.tsx`): add `inclusions-grid` (compact) inside the
  `ListingStory` column; add `neighborhood-block` keyed by the property's city below the story.
- **Property detail** (`property-detail.tsx`): same — inclusions (compact) + neighborhood block.
- **Header** (`site-header.tsx`): add **Community** and **Journal** nav items, following the
  existing responsive tap-target + small-screen-hiding pattern (`min-h-11`, `hidden sm:inline-flex`).
- **Footer** (`site-header.tsx`): add `newsletter-signup`; add footer links for `/community`,
  `/journal`, `/about`.

---

## 4. Data Flow

### 4.1 Content (read path)
Static import → component → render. No fetch, no loading state, no error state for content.
Selection helpers (`selectTestimonials`, `neighborhoodFor`, `postBySlug`) are pure functions,
unit-tested.

### 4.2 Newsletter (write path — the one backend touch)
1. New additive table `newsletter_subscribers` (`id`, `email` unique, `name` nullable,
   `created_at`). Mirrors existing Drizzle table + idempotent-boot-migration conventions in
   `shared/schema.ts` / server boot.
2. New endpoint `POST /api/newsletter` — validates email (Zod, matching existing route
   patterns), upserts by email (idempotent — duplicate treated as success, no disclosure of
   existing membership), returns 200 on success.
3. `newsletter-signup.tsx`: client-side email validation → loading state → inline success
   message on 200 → inline error on failure. Follows existing form + `use-toast` conventions.

---

## 5. Error Handling & Graceful Degradation

- Every content section renders **nothing** (no empty shell) when its source array/entry is
  empty — e.g. a city with no neighborhood entry, or an empty journal, simply omits that
  block. Mirrors `HeroSlideshow` degrading to nothing with zero images.
- `/journal/:slug` unknown slug → existing not-found treatment.
- Newsletter POST failure → inline error; duplicate email → success (idempotent, non-disclosing).
- Images use the existing `listing-image.tsx` fallback convention so a missing host/cover
  photo never breaks layout.

---

## 6. Testing

- **Unit (Vitest, matching existing `*.test.ts`):** `selectTestimonials` filter/limit logic;
  `neighborhoodFor` lookup; `postBySlug` lookup (hit + miss).
- **Server:** `POST /api/newsletter` test mirroring existing route tests — valid insert,
  duplicate-email idempotency, invalid email rejected.
- **Gates:** `npm run check` (tsc) clean; full suite green (currently 290 tests); `npm run
  build` succeeds (build-log phase contract).
- **Manual:** drive `/community`, `/journal`, `/journal/:slug`, `/about`, the enriched
  home/detail pages, and the newsletter form in the browser before handing back.

---

## 7. Rollout / Phasing within this build

1. **Content foundation:** `client/src/content/` files + selection helpers + their unit tests.
2. **Components:** the presentational components above.
3. **Routes + nav:** `/community`, `/journal`, `/journal/:slug`, `/about`; header + footer wiring.
4. **Page enrichments:** home, room-detail, property-detail insertions.
5. **Newsletter backend:** migration-backup export → additive table → endpoint → wire form → tests.
6. **Verify:** tsc + suite + build green; browser drive; build-log entry; hand to admin verification.

Later phase (out of scope here): migrate content constants → DB tables + admin editing UI.

---

## 8. Files Touched (anticipated)

**New:**
- `client/src/content/{inclusions,testimonials,hosts,neighborhoods,journal,company}.ts`
- `client/src/content/*.test.ts` (selection-logic tests)
- `client/src/components/{inclusions-grid,testimonials,host-card,hosts-section,neighborhood-block,journal-card,newsletter-signup,follow-strip}.tsx`
- `client/src/pages/{community,about,journal-index,journal-post}.tsx`
- Server: newsletter endpoint + storage method + table def + one test

**Modified:**
- `client/src/App.tsx` (routes)
- `client/src/pages/home.tsx` (inclusions + testimonials sections)
- `client/src/pages/room-detail.tsx` (inclusions + neighborhood)
- `client/src/pages/property-detail.tsx` (inclusions + neighborhood)
- `client/src/components/site-header.tsx` (nav items + footer newsletter/links)
- `shared/schema.ts` (additive `newsletter_subscribers` table)
- `docs/build-log.md` (outcome entry)

---

## 9. livingQ → BNP Mapping (reference)

| livingQ element | BNP realization |
|---|---|
| "Our Essentials" all-inclusive grid | `inclusions-grid` on home + detail + community + about |
| Community Directors / "Thrive Together" | `hosts-section` on `/community` |
| 10 resident testimonials (name + area) | `testimonials` on home + community + about + per-property |
| Neighborhood storytelling | `neighborhood-block` on property/room detail |
| Rich per-property feature chips | inclusions (compact) surfaced on detail pages |
| Blog / QTalks / events | `/journal` + `/journal/:slug` |
| Instagram feed | `follow-strip` static image + social links (no widget) |
| Newsletter capture | `newsletter-signup` (own DB table + endpoint) |
| "Established 2020" / mission | `/about` from `company.ts` |
| Maps/Yelp links per property | optional `mapsUrl` in `neighborhood-block` |

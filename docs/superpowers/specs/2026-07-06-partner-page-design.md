# BNP Partner Page — Design Spec

**Date:** 2026-07-06
**Project:** BNP (Be Nice Properties booking platform)
**Repo / Location:** beniceproperties (branch: main)
**Route:** `/partner`

---

## Goal

A public marketing + lead-capture page that invites partners to work with BNP:
**invest** in property acquisitions, have BNP **manage** their property, **design/furnish**
their property into a bookable space, **curate events** at their property, and **build
community** there. Modeled structurally on livingq.city/partnerships, but written in BNP's
voice and themed to fit the existing site.

Non-goal: no partner accounts, no deal pipeline, no document exchange. This is a lead
funnel — capture the inquiry, follow up off-platform.

---

## Precedent this mirrors

The `/ltr` inquiry flow is the proven, in-repo template and this feature copies it end to end:

- `client/src/components/ltr-inquiry-form.tsx` — `useState` per field + `useMutation` via
  `apiRequest`, shadcn `Input/Label/Textarea/Button`, client-side name+email gate.
- `shared/schema.ts` `ltr_inquiries` — append-only, no FKs, nullable optionals,
  `createInsertSchema(...).omit({ id, createdAt })`.
- `scripts/push-ltr-inquiries.mjs` — idempotent `CREATE TABLE IF NOT EXISTS` (this repo
  applies additive DDL via push scripts, not `drizzle-kit push`).
- `server/storage.ts` `createLtrInquiry` — single `db.insert(...).values(data).returning()`.
- `server/routes.ts` `POST /api/ltr-inquiries` — `safeParse` → 400 on invalid → store → 200.

Deviations from the LTR flow (deliberate, per user decisions):
1. **`interest` is a multi-select** → stored as a Postgres `text[]` array (not single text).
2. **`company` field** added (B2B lead).
3. **Success is a confirmation dialog** (shadcn `dialog.tsx`), not the LTR inline banner.

---

## Page structure — `client/src/pages/partner.tsx`

Follows the `ltr.tsx` spine exactly: `SiteHeader` → `PageHero` → sections → `SiteFooter`,
inside `<div className="flex min-h-screen flex-col">` with a `<main className="flex-1">`.

1. **`SiteHeader`** (shared, unchanged component).

2. **`PageHero`** — new partner accent so it reads distinct from co-living/STR/LTR.
   - `accent`: a deep emerald→slate gradient, e.g. `linear-gradient(135deg, #2f5d50, #1c3a33)`
     (partner is B2B/premium; distinct from LTR amber, STR, co-living). Used as the image
     tint and the no-image fallback, same as `LTR_GRADIENT`.
   - `image`: `/heroes/partner.jpg` if present; the gradient shows through/falls back if the
     asset is missing (PageHero already tolerates a missing image).
   - `eyebrow`: "Partner with us"
   - `title`: "Own the property. We'll handle the rest."
   - `subtitle`: "Invest alongside us, hand us the keys to manage, or let us design, program,
     and build community in your space. Tell us what you're after and we'll take it from there."

3. **Offerings section** — five cards in a responsive grid
   (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`, last card wraps), each with a lucide icon,
   title, and 1–2 sentence body. Cards use the existing card tokens (`bg-card`, `rounded-2xl`,
   `border`, `shadow-card`) matching the LTR highlights strip and listings cards.

   | # | Icon (lucide) | Title | Body |
   |---|---|---|---|
   | 1 | `TrendingUp` | Invest with us | Co-invest in the properties we acquire and operate. We bring the deal, the operations, and the track record; you bring capital and share the upside. |
   | 2 | `KeyRound` | We manage your property | Full-service management — listings, guests, pricing, cleaning, maintenance. You own it; we run it and send you the returns. |
   | 3 | `Palette` | Design your property | We turn a bare space into a property people want to book — furnishing, styling, and the details that make a place feel like *somewhere*. |
   | 4 | `PartyPopper` | Curate events | Programming that turns a property into a destination and an extra revenue stream — from date nights to community gatherings. |
   | 5 | `Users` | Build community | We build real community around a property so it stays full and stays loved — the thing that makes people stay. |

   Each card carries an anchor to the form and, on click/tap of a "Get started" link,
   pre-checks its matching interest box (see form behavior below). Cards are the primary CTA
   surface; a single "Start a conversation" button also sits above/below the grid, scrolling
   to `#partner-form`.

4. **Partner inquiry form section** (`id="partner-form"`), rendered by
   `<PartnerInquiryForm />` — see next section. Light surface (`bg-card`, bordered),
   centered `max-w-2xl`, mirroring the `/ltr` foot.

5. **`SiteFooter`** (shared, unchanged component).

---

## Component — `client/src/components/partner-inquiry-form.tsx`

Copy of `ltr-inquiry-form.tsx` structure with these fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `name` | text input | yes | client gate: non-empty |
| `email` | email input | yes | client gate: `EMAIL_RE` |
| `phone` | tel input | no | |
| `company` | text input | no | |
| `interest` | multi-select | no | 6 options (below); stored as `string[]` |
| `message` | textarea | no | |

**Interest options** (value → label):
`INVEST` → "Invest with us", `MANAGE` → "Manage my property",
`DESIGN` → "Design my property", `EVENTS` → "Curate events",
`COMMUNITY` → "Build community", `OTHER` → "Something else".

**Multi-select UI:** no `checkbox` primitive exists in the repo, so render the options as a
wrap of toggle "chips" — `<button type="button">` styled with the segment/accent tokens,
`aria-pressed` for state, toggling membership in a `string[]` state. This matches the repo's
convention of building inline-form controls from primitives rather than adding a dep. Each
offering card's "Get started" link can navigate to `#partner-form` with the matching value
pre-selected (via a small module-level setter or a URL hash param the form reads on mount —
implementer's choice, kept simple).

**Submit + confirmation dialog:**
- `canSubmit = name non-empty && EMAIL_RE.test(email) && !isPending`.
- On success, open a shadcn `Dialog` (`client/src/components/ui/dialog.tsx`) with a friendly
  confirmation: title "Thanks — we've got it." body "Your note is in. We'll be in touch
  shortly to talk through the details." and a "Done" close button. Reset the form on close so
  a second inquiry is possible. (This replaces the LTR inline `bg-good-bg` banner.)
- On error, inline `text-destructive` message (same as LTR), form stays editable.
- POSTs to `/api/partner-inquiries` via `apiRequest("POST", ...)`, sending only populated
  fields (`phone`/`company`/`message` omitted when blank; `interest` omitted when empty).

`data-testid`s throughout, matching the LTR form's convention
(`partner-inquiry-form`, `input-partner-name`, `button-partner-submit`,
`partner-inquiry-success`, `partner-inquiry-error`).

---

## Backend

### Schema — `shared/schema.ts`

New `partner_inquiries` table, placed next to `ltr_inquiries`, same additive conventions
(append-only, no FKs, nullable optionals, no `updated_at`):

```ts
export const partnerInquiries = pgTable("partner_inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  company: text("company"),
  // Which offerings the partner is interested in. Multi-select → array. Empty
  // array when they didn't pick any (a general "let's talk" inquiry).
  interest: text("interest").array().notNull().default(sql`ARRAY[]::text[]`),
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertPartnerInquirySchema = createInsertSchema(partnerInquiries, {
  email: z.string().email(),
  name: z.string().min(1),
  interest: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true });

export type PartnerInquiry = typeof partnerInquiries.$inferSelect;
export type InsertPartnerInquiry = z.infer<typeof insertPartnerInquirySchema>;
```

### Migration — `scripts/push-partner-inquiries.mjs`

Copy of `push-ltr-inquiries.mjs`, retargeted to `partner_inquiries`. Single
`CREATE TABLE IF NOT EXISTS` statement; idempotent, additive-only; pre/post existence check.
Brand-new empty table → no migration backup required (per CLAUDE.md floor).

```sql
CREATE TABLE IF NOT EXISTS "partner_inquiries" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "company" text,
  "interest" text[] NOT NULL DEFAULT ARRAY[]::text[],
  "message" text,
  "created_at" timestamp DEFAULT now() NOT NULL
)
```

### Storage — `server/storage.ts`

Add to `IStorage` interface and impl, mirroring `createLtrInquiry`:

```ts
createPartnerInquiry(data: InsertPartnerInquiry): Promise<PartnerInquiry>;
// impl:
async createPartnerInquiry(data: InsertPartnerInquiry): Promise<PartnerInquiry> {
  const [row] = await db.insert(partnerInquiries).values(data).returning();
  return row;
}
```
Plus the import/type-export additions alongside the existing `ltrInquiries` imports.

### Route — `server/routes.ts`

Add next to `POST /api/ltr-inquiries`:

```ts
// Partner inquiry capture. Public, append-only lead (a person may inquire more
// than once). Valid → store → 200; invalid name/email → 400.
app.post("/api/partner-inquiries", async (req, res, next) => {
  try {
    const parsed = insertPartnerInquirySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid inquiry" });
    }
    await storage.createPartnerInquiry(parsed.data);
    res.status(200).json({ ok: true });
  } catch (err) {
    next(err);
  }
});
```

---

## Navigation

Add "Partner" in two places (user chose top nav + footer):

- **`client/src/components/site-header.tsx`** — a `<Link href="/partner">Partner</Link>` in
  the desktop `<nav>`, styled like the existing `Community`/`Journal` links
  (`min-h-11`, muted→foreground hover). Add it to the mobile menu list too (alongside the
  `/community` / `/journal` entries). Demote below a breakpoint like the other secondary links
  if the header gets crowded — implementer's call to keep the row from wrapping.
- **`client/src/components/site-header.tsx` `SiteFooter`** — add "Partner" to the Company nav
  link group.

### Router — `client/src/App.tsx`

Add `<Route path="/partner" component={Partner} />` (with `Partner` imported), placed with the
other top-level marketing routes (near `/community`).

---

## Testing / verification

Manual verification (this repo has no automated test runner wired for pages):

1. `npx tsc --noEmit` (or the repo's typecheck) passes clean.
2. `node scripts/push-partner-inquiries.mjs` runs, is idempotent (run twice → no-op), and
   `partner_inquiries` exists after.
3. Load `/partner` in the dev server: hero renders with partner accent, five offering cards
   render, form renders.
4. Submit with only name+email → confirmation dialog appears; row lands in `partner_inquiries`
   with `interest = {}`.
5. Check two interest chips + fill all fields + submit → row lands with the two interest
   values in the array and company/phone/message populated.
6. Submit with blank/invalid email → submit disabled (client gate); server `safeParse`
   returns 400 if bypassed.
7. "Partner" link appears in top nav + footer and routes to `/partner`; offering-card
   "Get started" pre-selects the matching interest chip.

---

## Files touched (summary)

**New:**
- `client/src/pages/partner.tsx`
- `client/src/components/partner-inquiry-form.tsx`
- `scripts/push-partner-inquiries.mjs`

**Edited:**
- `shared/schema.ts` (add `partnerInquiries` + schema + types)
- `server/storage.ts` (import, `IStorage`, impl)
- `server/routes.ts` (add POST route)
- `client/src/App.tsx` (add route)
- `client/src/components/site-header.tsx` (nav + footer link)

**Deferred / out of scope:** email/SMS notification on new inquiry; a Unified Ops read view
of partner inquiries; partner accounts or deal tracking. Leads are read from the DB for now.

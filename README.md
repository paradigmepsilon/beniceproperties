# Be Nice Properties (BNP) — Booking App

Public, guest-facing booking app for **whole-home stays (STR)** and **by-the-room co-living (MTR)** in the Atlanta metro and Antigua. Browses inventory, takes bookings, and takes real money (Stripe + manual CashApp/Zelle).

This app deliberately mirrors the TRAD app's stack. It owns its **own thin Neon Postgres database** and pushes **sanitized aggregate rollups** up to Unified Ops (no shared DB).

> **Build status: all phases (0–6) complete.** Payments run in **Stripe test mode** (live card payments require a real `sk_test_…`/`pk_test_…` then a confirmed flip to live). Inventory is **placeholder** until real listings are provided. UO rollup is **dry-run** until UO ships its endpoint.

---

## Stack

- **Frontend:** React 18 + TypeScript, Vite, Wouter (routing), shadcn/ui on Radix + Tailwind, TanStack React Query, React Hook Form + Zod, Stripe.js / React Stripe.
- **Backend:** Express REST API, Drizzle ORM → Neon serverless Postgres, a storage abstraction layer (all DB access through it), session-based admin auth (passport-local + express-session + connect-pg-simple), a background scheduler for recurring jobs.
- **Shared:** `shared/schema.ts` (Drizzle tables + Zod insert schemas — single source of truth) and `shared/pricing.ts` (all financial constants + one canonical `calculateBreakdown()` used by **both** client and server, so the quoted total equals the charged total).

---

## Project layout

```
client/         React SPA (pages/, components/, hooks/, lib/)
server/         Express API
  db.ts             Drizzle + Neon
  storage.ts        IStorage interface + Storage class (ALL DB access)
  auth.ts           passport-local + session auth
  routes.ts         REST registration
  scheduler.ts      recurring jobs (stubs until Phase 4/6)
  integrations/
    unifiedOps.ts   ISOLATED, STUBBED UO rollup push
shared/         schema.ts + pricing.ts (single sources of truth)
scripts/        seed.ts (PLACEHOLDER inventory)
```

---

## Quick start

```bash
npm install
cp .env.example .env          # then fill in the values below
npm run db:push               # push schema to your Neon TEST branch
npm run seed                  # load PLACEHOLDER inventory (idempotent)
npm run dev                   # http://127.0.0.1:5060
```

Type-check anytime with `npm run check`.

---

## Environment variables

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | BNP's own Neon Postgres. **Use a test branch in dev.** |
| `SESSION_SECRET` | Express session signing secret. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrap admin (hashed at rest, seeded on startup). |
| `STRIPE_SECRET_KEY` | Stripe server key. **`sk_test_…` until go-live.** |
| `VITE_STRIPE_PUBLIC_KEY` | Stripe browser key. **`pk_test_…` until go-live.** |
| `STRIPE_WEBHOOK_SECRET` | Verifies inbound Stripe webhooks (Phase 4). |
| `CASHAPP_TAG` | BNP's `$cashtag` shown in manual-payment instructions. |
| `ZELLE_HANDLE` | BNP's Zelle email/phone shown in manual-payment instructions. |
| `UO_ENDPOINT` | Unified Ops rollup endpoint (**stub** until UO ships it). |
| `UO_SERVICE_TOKEN` | Shared secret for the UO push (`Authorization: Bearer …`). |
| `UO_PUSH_ENABLED` | `false` (default) = dry-run logging; `true` = actually POST. |

Never commit `.env`. Never log secret values.

---

## Payments (three paths)

1. **Stripe (automated).** One-time/deposit via Stripe Checkout; weekly co-living rent via **Stripe Subscriptions** (recurring weekly). A **3.5% surcharge** (`CREDIT_CARD_RATE`) is added as a **visible line item**. Payment state comes from **webhooks**, never the client.
2. **CashApp (manual).** Guest sees BNP's `$cashtag` + amount + booking reference for the memo. Booking is `PENDING_PAYMENT`; an admin marks it paid. **No surcharge.**
3. **Zelle (manual).** Same as CashApp with BNP's Zelle handle. **No surcharge.**

The selected payment method drives the quote: Stripe shows the surcharge; CashApp/Zelle do not. **PCI:** Stripe Checkout/Elements only — no raw card capture, no card data in this database (Stripe references only).

---

## Seeding inventory

`npm run seed` loads **clearly-labeled `[PLACEHOLDER]` listings** and is idempotent (keyed on property name). To load real inventory, edit `scripts/seed.ts` (replace the `PLACEHOLDER_INVENTORY` array) or add properties through the admin UI (Phase 5).

---

## Going live (do NOT do these until explicitly confirmed)

- **Flip Stripe to live:** swap `STRIPE_SECRET_KEY` → `sk_live_…`, `VITE_STRIPE_PUBLIC_KEY` → `pk_live_…`, and set the live `STRIPE_WEBHOOK_SECRET` from the live webhook endpoint.
- **Point the UO rollup at the real endpoint:** set `UO_ENDPOINT` to UO's real `/api/integration/*` URL, set `UO_SERVICE_TOKEN` to the agreed shared secret, and set `UO_PUSH_ENABLED=true`. Until then it dry-runs and logs the sanitized payload.
- **Run migrations against production only with explicit go-ahead.**

---

## Routes

Public: `/` (browse) · `/property/:id` · `/room/:id` · `/checkout` · `/confirmation/:reference` · `/lookup`
Admin: `/admin/login` · `/admin` (Overview / Reconciliation / Inventory / Payments tabs)

Default admin (local dev): `admin@beniceproperties.com` / `changeme-local-dev` — **change before any deploy.**

## Phase roadmap

- **0** Schema + pricing + folders ✅
- **1** Scaffold ✅
- **2** Inventory + browse + property/room detail ✅
- **3** Booking flow + method-aware quote ✅
- **4** Payments — Stripe Checkout + Subscriptions + webhooks; CashApp/Zelle pending flow ✅
- **5** Admin dashboard + reconciliation + inventory management ✅
- **6** Unified Ops rollup module (sanitized snapshots, dry-run endpoint) ✅

## Enabling Stripe (test mode)

1. Put real test keys in `.env`: `STRIPE_SECRET_KEY=sk_test_…`, `VITE_STRIPE_PUBLIC_KEY=pk_test_…`.
2. For webhooks locally: `stripe listen --forward-to localhost:3005/api/stripe/webhook` and copy the `whsec_…` into `STRIPE_WEBHOOK_SECRET`.
3. Restart `npm run dev`. The checkout's "Pay with card" path now redirects to Stripe Checkout; webhooks confirm bookings.

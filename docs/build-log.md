# BNP Booking Platform — Build Log

This file is the cross-session memory for the nine-phase BNP build (see `CLAUDE.md`
and `BNP_Booking_Lease_Build_Prompt.md`). Each phase appends an outcome entry:
what was built, files touched, tests run + results, decisions, deferred items.

A phase is marked DONE only when its tests pass. The done line reads exactly
`PHASE <n>: COMPLETE — tests green` so a goal evaluator can confirm it.

---

## Architectural decision recorded before Phase 1 (resolves a spec ↔ repo conflict)

The spec (`PHASE 1`) calls for dedicated `leases`, `lease_rooms`, `payment_schedule`,
and `late_fees` tables and an "own scheduler, not Stripe Subscriptions" model. The
repo's initial commit instead modeled co-living rent with a `bookings` row + a
`subscriptions` table backed by **Stripe Subscriptions** — which the spec explicitly
rejects ("Saved card + own scheduler, not Stripe Subscriptions").

**Resolution (no halt — additive, not destructive):**
- The new lease tables are **added**. The existing `bookings`, `payments`, and
  `subscriptions` tables are **left untouched** — they continue to serve the STR
  nightly path and remain valid for any already-live data. No column is dropped or
  altered, so NON-NEGOTIABLE FLOOR #1 (export before destructive migration) is not
  triggered and the live-TRAD-table halt condition does not apply.
- Co-living moves onto the lease model in Phase 2+. The `subscriptions` table becomes
  dormant for new co-living bookings (Phase 4 uses saved-card + own scheduler against
  `payment_schedule`), but is not removed in this stretch to keep the change reversible.
- Property `type` enum: the repo uses `STR` | `COLIVING`; the spec's metadata contract
  uses `STR_WHOLE` | `COLIVING_ROOM`. The DB column keeps the existing `STR`/`COLIVING`
  values (no destructive change). The Stripe **metadata** `product_type` is mapped to
  the contract's `STR_WHOLE`/`COLIVING_ROOM` at the point the metadata is built
  (Phase 4), so the on-the-wire contract is honored without a data migration.
- `entity` is added to `properties` (default `BNP`) so the metadata contract's
  `entity` field is sourced from data, never hard-coded.

---

## PHASE 1 — Data Model: Properties, Rooms, Leases, Payment Schedules

**What was built**
- New enums in `shared/schema.ts`: `PROPERTY_ENTITIES`, `PAYMENT_CADENCES`,
  `LEASE_STATUSES`, `SCHEDULE_STATUSES`, `SCHEDULE_PAYMENT_METHODS`,
  `LATE_FEE_STATUSES`, plus constants `CADENCE_WEEKS`, `CADENCE_DAYS`,
  `MAX_LEASE_DAYS` (90), `LATE_FEE_PER_DAY` (25).
- Four new tables (additive): `leases`, `lease_rooms`, `payment_schedule`,
  `late_fees`. All Stripe fields are REFERENCES only (no card data, per the PCI
  discipline already in the schema). `late_fees` has a unique (lease, seq, day)
  index to make daily accrual idempotent on scheduler re-runs (Phase 5/9).
- Two additive columns: `properties.entity` (default `BNP`) and `rooms.room_number`
  (nullable) — both feed the Stripe Metadata Contract from data, not hard-coded.
- `shared/leaseSchedule.ts` — the ONE canonical schedule generator (mirrors the
  `shared/pricing.ts` "compute once, share client+server" pattern). Implements the
  cadence rules (WEEKLY/BIWEEKLY/MONTHLY = ×1/×2/×4 weekly rate × rooms), schedule_seq
  1 due on the booking date, and a documented day-proration rule for the trailing
  partial period. Throws on term > 90 days / bad input.
- `server/storage.ts` — `IStorage` extended with lease/schedule/late-fee CRUD,
  `createLeaseWithSchedule()` (enforces ≤ 90-day term, ≥ 1 room, and the room-overlap
  availability guard), and `isRoomAvailableForRange()` (no room on a
  DRAFT/PENDING_*/ACTIVE lease with overlapping inclusive dates). `StorageError`
  carries an HTTP status for the route layer.

**Files touched**
- `shared/schema.ts` (additive: enums, constants, 4 tables, 2 columns)
- `shared/leaseSchedule.ts` (new)
- `server/storage.ts` (additive: imports, interface, methods, StorageError)
- `scripts/seed.ts` (additive: room_number on placeholder rooms)
- `package.json` (+`vitest` dev dep, +`test`/`test:watch` scripts)
- `vitest.config.ts` (new), `shared/leaseSchedule.test.ts` (new),
  `shared/pricing.test.ts` (new)
- `migrations/0000_phase1_leases.sql` (generated; baseline, fully additive)

**Tests run + results**
- `npm test` → **17 passed** (12 schedule generator + 5 pricing contract). DB-free
  by design (pure shared logic).
- `npx tsc` → exit 0 (full project typechecks).
- `npm run build` → exit 0 (vite client + esbuild server bundle).
- `npx drizzle-kit generate` → parsed 12 tables, emitted SQL; grep confirms **zero**
  DROP/ALTER…DROP/DELETE — fully additive.

**Decisions**
- Lease tables added alongside the existing `bookings`/`subscriptions` rather than
  replacing them — no existing table altered, so the live-TRAD-table halt condition
  and FLOOR #1 (export before destructive change) do not apply.
- `db:push` to the live Neon branch was **deferred, not run**: `.env`'s `DATABASE_URL`
  points at a single Neon branch with no clear test marker, and the floor forbids
  migrating a prod branch without confirmation. The schema is proven valid via
  `drizzle-kit generate` instead, and the migration is verified non-destructive. The
  goal's gates (`npm test`, `npm run build`) do not require a DB connection.

**⚠ Surfaced for the user**
- `.env` currently holds a **`sk_live_` Stripe secret key**. No code in Phases 1–3
  executes a Stripe call, so nothing live was hit — but per FLOOR #2 the dev env
  should hold `sk_test_…` before Phase 4. Flagging, not changing (the file is the
  user's; I do not flip keys).

**Deferred / suggested**
- Run `npm run db:push` (or apply `migrations/0000_phase1_leases.sql`) against a
  confirmed **test** Neon branch before Phase 4 needs live rows.
- Swap the dev `.env` Stripe key to test mode before Phase 4.

**PHASE 1: COMPLETE — tests green**

---

## PHASE 2 — Guest-Facing Booking Flow (both product types)

**What was built**
- STR path was already complete in the repo (dates → `/api/quote` → `/api/bookings`
  → Stripe Checkout / manual instructions). Left intact; no payment processing
  added (Phase 4 owns money).
- Co-living LEASE path (new), to the "ready to pay" state:
  - `shared/api-types.ts` — `leaseQuoteRequestSchema` + `LeaseQuoteResponse`
    (full schedule preview contract: per-installment due date/amount/proration,
    `dueOnBooking` flag, total lease value, proration note, dueToday).
  - `server/lib/lease.ts` — `buildLeaseQuote()` validates the selection (property
    is COLIVING + active, every room belongs + is AVAILABLE, term ≤ 90 days, each
    room free via the overlap guard) and shapes the preview from the SAME shared
    `generateSchedule()` the server will persist + charge with. Multi-room rents
    are summed. Creates nothing, charges nothing. `LeaseError` carries HTTP status.
  - `server/routes.ts` — `POST /api/lease-quote` (public, read-only preview).
  - `client/src/pages/lease-booking.tsx` — co-living flow: confirmed room(s) →
    term date pickers (≤ 90 days) → cadence selector (Weekly/Bi-weekly/Monthly) →
    live schedule preview (first payment highlighted "Due today", per-row prorated
    badge, total lease value, proration note) → guest identity → "Review & sign
    lease" hand-off to `/lease/sign` (Phase 3). Mobile-first, shared shadcn cards.
  - `client/src/App.tsx` — `/lease` route registered.
  - `client/src/pages/room-detail.tsx` — "Reserve" now routes co-living rooms to
    `/lease` (the schedule-preview flow) instead of the one-time STR checkout.

**Files touched**
- `shared/api-types.ts`, `server/lib/lease.ts` (new), `server/routes.ts`,
  `client/src/pages/lease-booking.tsx` (new), `client/src/App.tsx`,
  `client/src/pages/room-detail.tsx`, `server/lib/lease.test.ts` (new)

**Tests run + results**
- `npm test` → **24 passed** (added 7 lease-quote builder tests over a mocked
  storage: multi-room sum, dueToday = seq 1, single dueOnBooking, and guards for
  non-co-living / unavailable / overlapping / >90-day / wrong-property).
- `npx tsc` → exit 0.  `npm run build` → exit 0.

**Decisions**
- The lease preview is computed server-side via the shared generator so the guest
  sees exactly what will be persisted + charged (same contract as `pricing.ts`).
  The client never invents a schedule.
- Co-living supports multiple rooms on one lease (spec: room fields comma-join in
  metadata). `buildLeaseQuote` sums per-room weekly rents and passes the sum with
  `roomCount: 1` to the generator, which correctly handles rooms at different rates.
- The old room-detail → deposit-checkout path is superseded for co-living by the
  lease flow. The legacy `/checkout` deposit path and `subscriptions` table remain
  for back-compat but are not used by the new co-living flow.

**Deferred / suggested**
- `/lease/sign` page + lease creation land in Phase 3 (this phase hands off to it).
- An end-to-end browser test of the booking flow is deferred (no DB wired locally);
  the builder is covered by unit tests.

**PHASE 2: COMPLETE — tests green**

---

## PHASE 3 — Lease Generation + E-Signature (in-app)

**What was built**
- `server/lib/leaseDocument.ts` — co-living Room Rental Agreement generator from
  an ADMIN-EDITABLE template (`DEFAULT_LEASE_TEMPLATE`: intro + 6 sections +
  house rules + E-SIGN/UETA affirmation statement, `{{token}}` substitution).
  `renderLeaseHtml()` produces the review render; `renderSignedLeaseHtml()` appends
  the signature block (typed name, ISO timestamp, IP). Escapes user-supplied
  fields. Generic — every name comes from lease data, nothing hard-coded. Late-fee
  policy ($25/day from the day after due date) and the full schedule table are
  rendered in.
- `server/lib/leaseFlow.ts`:
  - `createDraftLease()` re-validates the selection via `buildLeaseQuote`
    (server recompute, never trust client), upserts the guest, persists the lease +
    room links + payment schedule via `createLeaseWithSchedule`, sets status
    `PENDING_SIGNATURE`, returns the review document.
  - `signLease()` captures typed legal name + affirmation + timestamp + IP,
    rebuilds the signed agreement from the lease's OWN persisted data (no drift),
    stores it, sets the signature fields + `signedPdfUrl` (serve route) +
    `signedDocumentHtml`, and moves the lease `PENDING_SIGNATURE →
    PENDING_FIRST_PAYMENT`. **Never reaches ACTIVE** — that gate is the first
    payment (Phase 4). Idempotent: re-signing a signed lease is a no-op.
- `shared/schema.ts` — additive column `leases.signed_document_html` (stores the
  rendered signed artifact inline; no blob store wired yet).
- `shared/api-types.ts` — `createDraftLeaseSchema` / `signLeaseSchema` + response
  types. The sign schema requires `affirmed: true`.
- `server/routes.ts` — `POST /api/leases` (create draft), `GET /api/leases/:id`
  (lease + schedule + guest for the sign page), `POST /api/leases/:id/sign` (IP
  captured from X-Forwarded-For / socket), `GET /api/leases/:id/document` (serves
  the signed HTML; guest re-download anytime).
- `client/src/pages/lease-sign.tsx` + `/lease/sign` route — creates the draft on
  load, shows the agreement in a sandboxed iframe, captures typed name +
  affirmation checkbox, signs, then confirms "pending first payment" with a
  download link. Hands off to payment setup (Phase 4).

**Files touched**
- `server/lib/leaseDocument.ts` (new), `server/lib/leaseFlow.ts` (new),
  `shared/schema.ts` (+1 column), `shared/api-types.ts`, `server/routes.ts`,
  `client/src/pages/lease-sign.tsx` (new), `client/src/App.tsx`,
  `server/lib/leaseDocument.test.ts` (new), `server/lib/leaseFlow.test.ts` (new),
  `migrations/` (reset to a single clean `0000_bnp_baseline.sql`)

**Tests run + results**
- `npm test` → **39 passed** (added 7 document-render + 8 lease-flow tests). Flow
  tests assert the key invariant: signing moves to PENDING_FIRST_PAYMENT and
  **never** to ACTIVE; name/affirmation guards; IP + timestamp capture; idempotent
  re-sign; 404 on missing lease.
- `npx tsc` → exit 0.  `npm run build` → exit 0.
- `drizzle-kit generate` → clean baseline, 12 tables, **zero** destructive ops.

**Decisions**
- **PDF artifact = self-contained HTML** (print-to-PDF), stored in
  `signed_document_html` and served at `/api/leases/:id/document`. Rationale: no
  PDF library is in the dependency set, and adding puppeteer/pdfkit would bloat the
  Vercel serverless bundle and add a dependency for a format choice. E-SIGN/UETA
  validity comes from the captured name + affirmation + timestamp + IP on the lease
  row, not the file container. This is a low-stakes, reversible engineering choice
  (artifact format), so it was made without halting; a true PDF renderer can be
  swapped in later behind the same route.
- The signed document is rebuilt from the lease's persisted data at signing time,
  not re-quoted, so the artifact can never drift if inventory changes after booking.
- IP is taken from `X-Forwarded-For` (first hop) then the socket address — works
  behind Vercel's proxy.

**Deferred / suggested**
- Admin UI to edit `DEFAULT_LEASE_TEMPLATE` (template is already data-shaped for it).
- Swap the HTML artifact for a true PDF renderer if a hard PDF is later required.
- First-payment collection + lease → ACTIVE transition are Phase 4 (gated).

**PHASE 3: COMPLETE — tests green**

---

## POST-PHASE-3 — Schema applied to the database

After the user confirmed the current `DATABASE_URL` branch is a dev/test branch
(not prod), the additive lease schema was applied:

- `drizzle-kit push` could not be used non-interactively (it prompts to
  disambiguate new-column vs rename and there is no TTY in this shell). Instead an
  idempotent additive migration script was written and run:
  `scripts/push-lease-schema.mjs` — every statement is `IF NOT EXISTS` /
  `ADD COLUMN IF NOT EXISTS`, so it never drops or alters an existing column and is
  safe to re-run.
- **Pre-state verified:** existing tables (admin_users, bookings, guests,
  kpi_snapshots, payments, properties, rooms, subscriptions, admin_sessions) all
  present; none of the new tables/columns existed yet (no partial migration).
- **Applied:** 4 new tables (`leases`, `lease_rooms`, `payment_schedule`,
  `late_fees`) + indexes, and 3 additive columns (`properties.entity`,
  `rooms.room_number`, `leases.signed_document_html`).
- **Post-state verified:** all 4 tables + 3 columns present; existing data intact
  (3 placeholder properties preserved, 0 bookings). `npm test` (39) and `npx tsc`
  still green afterward.

The DB is now ready for Phase 4 to write real lease/schedule rows. (The
`migrations/0000_bnp_baseline.sql` drizzle baseline remains as the schema-of-record
artifact; the script is the applied delta.)

---

## PHASE 4 — Payments: First Payment, Saved Card, Scheduled Charges  🛑 GATE (built; awaiting review)

> Stripe was in **TEST mode** for all of this (user swapped `.env` to `sk_test_`/
> `pk_test_` before "go"). No live charge was executed. The live-key flip remains a
> manual human step.

**What was built**
- `server/lib/paymentMetadata.ts` — THE single builder of the Stripe Metadata
  Contract. `buildLeaseChargeMetadata` (co-living; comma-joins multi-room fields)
  and `buildStrChargeMetadata` (whole-property), plus `assertCompleteMetadata`
  which throws if any of the 10 contract keys is missing/empty. Maps the DB type
  `STR`/`COLIVING` → contract `STR_WHOLE`/`COLIVING_ROOM`. Null serialized as the
  string `"null"` so a key is never silently absent.
- `server/lib/stripe.ts` — added the saved-card primitives (NOT Stripe
  Subscriptions): `ensureCustomer`, `createFirstPaymentIntent`
  (`setup_future_usage: off_session`), `chargeSavedCard` (off-session, `confirm:
  true`, per-installment idempotency key), `retrievePaymentIntent`. Every PI
  creation runs `assertCompleteMetadata` first. `createCheckoutSession` now
  requires + stamps full metadata on the **PaymentIntent** (via
  `payment_intent_data.metadata`), so STR charges reconcile by metadata too.
- `server/lib/leasePayments.ts`:
  - `startFirstPayment()` — gated to `PENDING_FIRST_PAYMENT`; creates/【reuses】 the
    Customer, builds a `FIRST_PAYMENT` PI that saves the card, records the PI id on
    installment 1, returns the client secret. Idempotency key `lease-first-<id>`.
  - `finalizeFirstPayment()` (webhook-driven) — marks seq 1 PAID, persists the
    saved `payment_method` + customer on the lease, moves lease → **ACTIVE**, and
    occupies the rooms. Idempotent (no-ops if already ACTIVE / untracked PI).
  - `runScheduledRentSweep()` — the scheduler job. Charges every **due
    CARD_ON_FILE** installment off-session against the saved card. Success → PAID;
    decline → FAILED (Phase 5 owns dunning). Idempotent: skips first-payment,
    manual rows, not-yet-due rows, non-chargeable statuses, and any row already
    carrying a PI id; Stripe idempotency key `lease-rent-<id>-seq-<n>`. Surcharge
    is added at charge time via the canonical breakdown (stored amount is rent
    only).
- `server/routes.ts` — `POST /api/leases/:id/first-payment` (returns client
  secret + publishable key), `GET /api/payments/config`, and webhook handling for
  `payment_intent.succeeded` / `payment_intent.payment_failed` routed by
  `metadata.payment_kind` (FIRST_PAYMENT → finalize; SCHEDULED_RENT → settle the
  installment by lease_id+schedule_seq). STR booking route now builds + passes full
  metadata.
- Scheduler spines both call the sweep: in-process `server/scheduler.ts`
  (`weeklyRentRun` → `runScheduledRentSweep`, replacing the old Subscriptions
  stub) and the Vercel cron `api-src/cron/sweep.ts`.
- `client/src/pages/lease-pay.tsx` + `/lease/pay` route — Stripe Elements
  (`PaymentElement`) first-payment page; confirms the PI, then routes to the
  portal (lease activates server-side via webhook). `lease-sign` success now routes
  to `/lease/pay`.
- Rebuilt the committed Vercel API bundle (`npm run build:api`) so the serverless
  functions carry the new code.

**Files touched**
- `server/lib/paymentMetadata.ts` (new), `server/lib/leasePayments.ts` (new),
  `server/lib/stripe.ts`, `server/routes.ts`, `server/scheduler.ts`,
  `api-src/cron/sweep.ts`, `client/src/pages/lease-pay.tsx` (new),
  `client/src/pages/lease-sign.tsx`, `client/src/App.tsx`,
  `server/lib/paymentMetadata.test.ts` (new), `server/lib/leasePayments.test.ts`
  (new), `scripts/phase4-stripe-proof.mjs` (new), bundled `api/index.js` +
  `api/cron/sweep.js`

**How money flow was tested (TEST-MODE evidence)**
- Unit: `npm test` → **56 passed** (+17 Phase 4: 10 metadata-contract, 10 payment
  flow — incl. idempotency skips, decline→FAILED, surcharge, finalize→ACTIVE).
- Live test-mode end-to-end via `scripts/phase4-stripe-proof.mjs` (hard-refuses any
  non-`sk_test_` key):
  - First-payment PI `pi_3Tn3yZ…` → **succeeded**, card saved
    (`pm_1Tn3yZ…`), full 10-key metadata present.
  - Off-session scheduled-rent PI `pi_3Tn3ya…` → **succeeded**
    (`payment_kind=SCHEDULED_RENT`, `schedule_seq=2`).
  - Idempotency: re-running the same idempotency key returned the **same PI id**
    (no double charge).
- `npx tsc` → 0. `npm run build` → 0. `npm run build:api` → 0.

**Sample PaymentIntent metadata (the contract, fully populated):**
```json
{ "entity":"BNP","product_type":"COLIVING_ROOM","property_id":"prop-test-1",
  "property_name":"Old Bill Cook","room_id":"room-test-2","room_name":"Room 2 - Garden",
  "room_number":"2","lease_id":"lease-test-1","payment_kind":"FIRST_PAYMENT","schedule_seq":"1" }
```

**Payment-schedule state machine (as built)**
- `SCHEDULED` → (due & charged ok) `PAID` · → (due & declined) `FAILED` · seq 1
  via first-payment flow only. Sweep transitions only `SCHEDULED`/`DUE` rows; a row
  with a PI id is never re-charged. `requires_action`/processing → left `DUE` with
  PI recorded, settled by webhook. `LATE`/`WAIVED` are Phase 5.
- Lease: `PENDING_FIRST_PAYMENT` → (first PI succeeds, webhook) `ACTIVE`. Cannot
  reach ACTIVE without a successful first payment.

**Things I was unsure about → choice made**
- *Vercel cron granularity*: `vercel.json` runs the sweep **daily** (08:00 UTC),
  not every 15 min (the spec's example). Vercel Hobby/standard cron is coarse; the
  in-process scheduler (self-host) runs hourly. Daily is sufficient for
  rent that's due on calendar dates and the charge is idempotent. **Left as daily**;
  flagged here — bump the cron expression if you want finer granularity.
- *Surcharge on rent*: stored installment `amount` is rent only; the 3.5% card
  surcharge is added at charge time (consistent with the booking quote, which shows
  the weekly surcharge). So a $250 weekly installment charges $258.75.
- *Legacy co-living deposit path*: the old `/api/bookings` Stripe-Checkout deposit
  for co-living still exists but is superseded by the lease flow; it now carries a
  `BOOKING_DEPOSIT` metadata block too. Not removed (reversible).

**Deferred / suggested**
- Manual (Zelle/CashApp) rent settlement → UO "Mark Paid" write-back is Phase 8;
  MANUAL schedule rows are already excluded from auto-charge.
- Reminders / failure dunning / late-fee accrual / defaults → **Phase 5** (the next
  gate). The FAILED transition is in place for Phase 5 to build on.
- A true reconciliation report is Phase 9 (metadata is in place to power it).

**PHASE 4: BUILT — test-mode green — awaiting "go" review (no live charge run)**

> Phase 4 reviewed; user replied "go". Stripe confirmed in TEST mode before build.

---

## PHASE 5 — Reminders, Failures, Late Fees, Defaults  🛑 GATE (built; awaiting review)

> All TEST mode. No live charge. Default threshold set to **7 days** (Alex).

**What was built**
- `server/lib/notifications.ts` (new) — email (Nodemailer/SMTP, incl. SendGrid SMTP)
  + SMS (Twilio), **env-gated exactly like Stripe/UO**: with creds it sends, without
  them it logs a dry-run and returns `{sent:false}` (never throws). `notifyGuest`
  fans out to both channels. So the whole dunning machine runs/tests without creds.
- `server/lib/dunning.ts` (new) — the dunning state machine:
  - `runDunningSweep(today)` per ACTIVE lease, per open installment:
    **Reminders** 7d/3d/day-of before due (email+SMS), each sent once
    (notification_log dedupe), suppressed once PAID. **Overdue** (from day-after-due):
    marks the row LATE, accrues **$25/day** (one row/day, idempotent via the unique
    accrual guard, no cap), and for the first 3 days messages the guest daily +
    raises a MEDIUM UO escalation. **Default**: unpaid ≥ threshold days → lease
    DEFAULTED + a HIGH UO escalation (once).
  - `handleChargeFailure()` — card decline: row FAILED, HIGH UO escalation
    immediately, email+SMS payment-fix link (`/lease/pay?leaseId=`).
  - `billAccruedLateFees()` — when an installment is PAID, charges all its ACCRUED
    fees as a **single SEPARATE `LATE_FEE` PaymentIntent** (never folded into rent),
    marks the fee rows BILLED. Skips manual-pay leases (no saved card) → fees stay
    ACCRUED for manual settlement.
- Schema (additive): `notification_log` (idempotent sends), `app_settings`
  (admin-configurable values), `uo_escalations` (failed-payment/overdue/default
  flags BNP raises for UO to consume + resolve in Phase 8). Storage methods incl.
  `accrueLateFeeOnce`, `hasNotification`/`recordNotification`,
  `getSettingNumber`/`setSetting`, `raiseEscalationOnce`.
- Wiring: rent sweep now fires `handleChargeFailure` on decline and
  `billAccruedLateFees` on success; webhook does the same for async
  succeed/fail. Dunning sweep runs in both scheduler spines (in-process +
  Vercel cron). Admin routes: GET/PUT default-threshold, GET escalations.

**Files touched**
- `server/lib/notifications.ts` (new), `server/lib/dunning.ts` (new),
  `shared/schema.ts` (+3 tables, +enums/consts), `server/storage.ts` (+methods),
  `server/lib/leasePayments.ts` (failure + late-fee hooks), `server/routes.ts`
  (webhook + admin routes), `server/scheduler.ts`, `api-src/cron/sweep.ts`,
  `server/lib/dunning.test.ts` (new), `scripts/push-lease-schema.mjs` (+3 tables),
  `scripts/stripe-payments-proof.mjs` (renamed; +late-fee), bundled `api/*`,
  `package.json` (+nodemailer, +twilio, +@types/nodemailer)

**How it was tested (TEST-MODE evidence)**
- Unit: `npm test` → **71 passed** (+15 dunning: reminder windows + dedupe + PAID
  suppression, overdue LATE + daily-3 messaging, $25/day accrual + idempotency,
  default at threshold + custom threshold, failure path, separate late-fee billing).
- Live test-mode (`scripts/stripe-payments-proof.mjs`): first payment, off-session
  rent, idempotency (same key → same PI), **and a separate LATE_FEE charge**
  (`pi_3Tn4EZ…`, $50, `payment_kind=LATE_FEE`) — all succeeded.
- `tsc` 0 · `build` 0 · `build:api` 0. 3 new tables applied to the DB (additive,
  verified); drizzle baseline regenerated (15 tables, 0 destructive).

**State machines (as built)**
- `payment_schedule`: `SCHEDULED`/`DUE` →(charge ok)`PAID` · →(decline)`FAILED`
  →(failure path) UO flag + fix link · →(day-after-due, sweep)`LATE` (+$25/day
  accrual) · admin `WAIVED`. PAID/WAIVED are terminal & suppress all dunning.
- `late_fees`: `ACCRUED` (one/day) →(installment paid, card on file)`BILLED` via a
  separate PI · `WAIVED` (Phase 8). `PAID` reserved for manual settlement.
- `uo_escalations`: `OPEN` →(Phase 8 write-back)`ACKNOWLEDGED`/`RESOLVED`. Deduped:
  one OPEN per (lease, seq, kind).
- `lease`: `ACTIVE` →(unpaid ≥ threshold)`DEFAULTED` (+HIGH escalation).

**Things I was unsure about → choice made**
- *Email/SMS deps*: spec says "reuse TRAD's Nodemailer/SendGrid + Twilio," but none
  were installed and no creds exist. **Installed `nodemailer` + `twilio`**, gated on
  env (dry-run + log without creds — same pattern as Stripe/UO). Flagged as added
  deps. Real sends light up when you set creds (see `notifications.ts` header for
  the env names).
- *Default threshold*: **7 days** (your answer), stored in `app_settings`
  (`defaulted_threshold_days`), editable via the admin route — not hard-coded.
- *Late-fee billing trigger*: billed when the rent installment is PAID (sweep or
  webhook). For manual-pay leases with no saved card, fees stay ACCRUED for the UO
  "Mark Paid" flow (Phase 8) to settle.
- *Cron cadence*: dunning rides the same daily Vercel cron as rent. Reminders are
  date-window based and the accrual/sends are idempotent per day, so daily is
  correct; finer cadence is unnecessary.

**Deferred / suggested**
- Wire real SendGrid + Twilio creds in `.env` before go-live (names in
  `notifications.ts`). Until then, sends dry-run to the log.
- UO consumption + resolution of `uo_escalations`, and "Waive late fee" / "Mark
  Paid" write-backs → **Phase 8**.
- Guest portal surfacing of schedule/late status → Phase 6.

**PHASE 5: BUILT — test-mode green — awaiting "go" review (no live charge run)**

> Phase 5 reviewed; user replied "go". Phases 6–8 run autonomously; 9 stops for final review.

---

## PHASE 6 — Guest Portal (book, pay, sign, ask, check status)

**What was built**
- Token-authenticated portal (no account): `leases.portal_token` (additive,
  unguessable 32-char nanoid, set at lease creation). Self-serve link is
  `/portal/<token>` — mirrors TRAD's tokenized links.
- `server/lib/portal.ts` (new): `getPortalView` (lease + rooms + full schedule
  with paid/upcoming/late status + accrued late-fee total + message threads +
  signed-lease URL), `payInstallmentNow` (charge an open/LATE/FAILED installment
  early against the saved card — same idempotency key as the scheduler so a portal
  pay + a sweep can't double-charge — then bills that row's accrued late fees),
  and threaded messaging (`submitMessage`/`replyToThread`/`getThread`).
- `guest_messages` table (additive): threaded (root row points to itself;
  replies share `thread_id`), `author_role` GUEST/STAFF, status OPEN/ANSWERED/
  RESOLVED on the root. Storage methods incl. self-referential root creation.
- Routes: `GET /api/portal/:token`, `POST /api/portal/:token/pay/:seq`,
  `POST /api/portal/:token/messages`, `GET …/messages/:threadId`,
  `POST …/messages/:threadId/reply`.
- `client/src/pages/portal.tsx` + `/portal/:token` route — lease summary, schedule
  with a "Pay now" on the next due row (saved-card leases), accrued late fees,
  signed-lease download, and a submit/track messages panel. The first-payment
  page now redirects to `/portal/<token>` on success.

**Files touched**
- `shared/schema.ts` (+`portal_token`, +`guest_messages`), `server/storage.ts`
  (+token lookup, +message methods), `server/lib/portal.ts` (new),
  `server/lib/leaseFlow.ts` (generate portal token), `server/lib/leasePayments.ts`
  (return token), `server/routes.ts` (+portal routes), `client/src/pages/portal.tsx`
  (new), `client/src/pages/lease-pay.tsx` (redirect to portal), `client/src/App.tsx`,
  `server/lib/portal.test.ts` (new), `scripts/push-lease-schema.mjs` (+P6), bundled `api/*`

**Tests + results**
- `npm test` → **79 passed** (+8 portal: token resolution, view shape + accrued
  late-fee total, pay-installment success + no-card/already-paid guards, message
  submit + reply-reopens-thread + foreign-thread rejection).
- `tsc` 0 · `build` 0 · `build:api` 0. `guest_messages` + `portal_token` applied to
  DB (additive); baseline regenerated (16 tables, 0 destructive).

**Decisions**
- Portal pay reuses the scheduler's per-installment Stripe idempotency key, so a
  guest paying early and the nightly sweep can never double-charge the same row.
- STR guests keep the existing reference+email `/lookup`; the token portal is the
  co-living lease surface. (Both coexist.)
- "Update saved card" is surfaced conceptually; a full card-update Elements flow is
  deferred (the fix-card link from the failure path already routes to `/lease/pay`).

**Deferred / suggested**
- Staff replies to guest messages come via the UO write-back (Phase 8).
- Dedicated card-update Elements page (separate from first payment).

**PHASE 6: COMPLETE — tests green**

---

## PHASE 7 — Guest Lifecycle Automation

**What was built**
- `lifecycle_events` table (additive) — the `email_sends`-equivalent spine. One row
  per (lease, event_type, schedule_seq) makes every send idempotent. Mirrors TRAD's
  `bookingEmailCoordinator` record-keeping.
- `server/lib/lifecycle.ts` (new): admin-editable `LIFECYCLE_TEMPLATES` (data,
  variable-substituted) + events:
  - `onLeaseActivated()` (fired from `finalizeFirstPayment`): guest **welcome**,
    full **schedule recap**, and an **admin new-lease** notice (to `ADMIN_EMAIL`).
    Each sent once.
  - `onPaymentReceived()` (fired on each successful rent charge — first payment,
    sweep success): a **payment receipt**, idempotent per installment.
  - `runLeaseEndingNotices()` (daily scheduler): **lease-ending notice ~14 days**
    before `end_date`, with a renewal nudge, once.
- All sends route through the env-gated notifications layer (dry-run + log without
  creds), so the spine runs/tests without live email/SMS.
- Wired: activation + first-payment receipt in `finalizeFirstPayment`; per-charge
  receipt in the rent sweep; lease-ending notices in both scheduler spines
  (in-process + Vercel cron).
- STR lifecycle: the existing booking/Checkout confirmation path stands; per the
  spec the co-living spine is the new work (STR reuse is the existing flow).

**Files touched**
- `shared/schema.ts` (+`lifecycle_events` + enums/const), `server/storage.ts`
  (+lifecycle methods), `server/lib/lifecycle.ts` (new), `server/lib/leasePayments.ts`
  (activation + receipt hooks), `server/scheduler.ts`, `api-src/cron/sweep.ts`,
  `server/lib/lifecycle.test.ts` (new), `scripts/push-lease-schema.mjs` (+P7),
  bundled `api/*`

**Tests + results**
- `npm test` → **87 passed** (+8 lifecycle: activation sends each-once + idempotent,
  receipt once-per-installment, lease-ending window + dedupe, daysUntil math).
- `tsc` 0 · `build` 0 · `build:api` 0. `lifecycle_events` applied to DB (additive);
  baseline regenerated (17 tables, 0 destructive).

**Decisions**
- Lifecycle sends are idempotent via `lifecycle_events`, so re-running the sweep or
  re-processing a webhook never double-emails.
- Admin notice goes to `ADMIN_EMAIL`; skipped (recorded SKIPPED) if unset.
- Lease-ending notice fires anywhere in the 0–14-day pre-end window (covers a cron
  that misses the exact 14th day), but only once.

**Deferred / suggested**
- Pre-arrival/check-in/checkout/review STR cadence beyond the existing confirmation
  (port more of TRAD's spine) if STR lifecycle parity is wanted later.
- An admin UI to edit `LIFECYCLE_TEMPLATES` (already data-shaped).

**PHASE 7: COMPLETE — tests green**

---

## PHASE 8 — UO Integration: Read API + Write-Back Actions

**What was built** — BNP **exposes** an authenticated API; UO **consumes** it. BNP
stays the system of record; UO never writes BNP's DB directly (no UO-DB writes —
architectural rule honored).
- `server/lib/serviceAuth.ts` (new) — `requireServiceToken`: `Authorization:
  Bearer <UO_BNP_API_TOKEN>`, constant-time compare, **fail-closed** (503 if the
  token is unset — the surface is disabled, never open). Mirrors UO's
  `isInternalRelay`.
- `server/lib/uoApi.ts` (new):
  - **Reads**: `listPropertiesWithRooms`, `listLeases`/`getLeaseDetail` (schedule
    + signature + payment status), `listPaymentsWithMetadata` (every rent + late-fee
    row with the **full Stripe Metadata Contract** built from the DB — powers
    per-entity/property/room economics without a Stripe round-trip),
    `listGuestMessageThreads`, `listEscalations`.
  - **Write-backs** (constrained, idempotent): `markPaid` (MANUAL rows only →
    writes MANUAL_RECONCILE note + metadata, resolves the matching OPEN
    escalation), `approveLease` (DRAFT → PENDING_SIGNATURE; no-op otherwise),
    `respondToMessage` (STAFF reply → thread ANSWERED, surfaces in the portal),
    `resolveEscalation`, `waiveLateFees` (ACCRUED → WAIVED + reason note).
- Routes under `/api/uo/*`, all behind `requireServiceToken`.
- `.env.example` — added `UO_BNP_API_TOKEN` (named-only, nothing committed) plus
  the email/SMS env names for Phases 5/7.

**Files touched**
- `server/lib/serviceAuth.ts` (new), `server/lib/uoApi.ts` (new),
  `server/routes.ts` (+`/api/uo/*`), `.env.example`,
  `server/lib/serviceAuth.test.ts` (new), `server/lib/uoApi.test.ts` (new),
  bundled `api/*`

**Tests + results**
- `npm test` → **100 passed** (+13: serviceAuth fail-closed/401/next; mark-paid
  MANUAL-only + idempotent + escalation-resolve; approve idempotent; respond
  STAFF+ANSWERED; waive WAIVED+note; payments-with-metadata contract complete).
- `tsc` 0 · `build` 0 · `build:api` 0. No schema change (uses existing tables) —
  no DB push needed.

**Decisions**
- Fail-closed auth: unset token ⇒ 503 (disabled), not open. Matches the
  Stripe/webhook gating posture.
- Payments-with-metadata is derived from the DB (lease + room snapshots) so it
  matches what was/will be sent to Stripe, and works even for rows not yet charged.
- `markPaid` is restricted to MANUAL installments (card rows settle via Stripe),
  and resolves the matching OPEN escalation so the dunning loop closes.
- Mapping to UO models (`BnpProperty`/`BnpBooking`/`BnpPayment`/`OpsIssue`) is the
  consumer's (UO's) job; this side exposes the data + the metadata breakdown UO
  maps from. **SBA note honored**: no WSH/BFT data, no federal cross-entity rollup.

**Deferred / suggested**
- UO-side consumption + model mapping (built in the UO repo, not here).
- Optional: pagination on the list endpoints if lease volume grows.

**PHASE 8: COMPLETE — tests green**

---

## PHASE 9 — Hardening, Reconciliation Report, Expansion Test

**What was built**
- `server/lib/reconciliation.ts` (new) — `buildReconciliationReport(from, to,
  generatedAt)`: per-entity → per-property → per-room collected totals for a date
  range, split **rent (card vs manual)** and **late fees**, reconciled via the
  metadata contract (the breakout fields come from the same DB data the metadata
  builder uses, so it ties to Stripe by metadata). PAID installments are bucketed
  by `paid_at` in range + `payment_method`; BILLED/PAID late fees by `accrual_date`.
- Routes: `GET /api/uo/reconciliation` (service token) + `GET
  /api/admin/reconciliation-report` (admin), sharing a module-level handler.
- `scripts/expansion-test.mjs` (new) — **the rule-4 proof**. Adds a 3rd co-living
  house (2 rooms) + a 4th STR villa via plain INSERTs against the EXISTING tables
  (zero DDL). Idempotent (keyed off name).
- `scripts/stripe-payments-proof.mjs` already exercises the money paths in test
  mode (first payment, off-session rent, idempotency, late fee).

**Tests + results**
- `npm test` → **105 passed** (+5: 3 reconciliation rollup/date-range/multi-entity,
  2 idempotency-audit double-run checks — no double charge, no duplicate late fee).
- Live: reconciliation report runs end-to-end against the DB (valid structure).
- `tsc` 0 · `build` 0 · `build:api` 0.

**EXPANSION TEST — PASSED (rule #4 holds)**
- Ran `node scripts/expansion-test.mjs`: created "[EXPANSION TEST] Third Co-Living
  House" (+Rooms X, Y) and "[EXPANSION TEST] Fourth STR Villa" as **data only**.
  Verified counts (co-living: 3, STR: 2). **Zero schema/migration change** was
  required — `Property`/`Room` are generic, `type`/`entity` are data. A re-run added
  0 (idempotent). If adding a property had required DDL, the model would have failed
  rule #4; it did not.

**Idempotency audit (no double charges / no duplicate late fees)**
- Rent sweep: a row carrying a `stripePaymentIntentId` (or not in SCHEDULED/DUE) is
  skipped; per-(lease,seq) Stripe idempotency key (`lease-rent-<id>-seq-<n>`) is
  shared by the scheduler AND the portal pay path, so they can't double-charge.
  Double-run test confirms exactly one charge.
- Late fees: `accrueLateFeeOnce` enforces one row per (lease, seq, day) via a
  select-guard; double-run same day accrues once. Late-fee billing uses
  `lease-latefee-<id>-seq-<n>`.
- First payment: `lease-first-<id>` key; `finalizeFirstPayment` no-ops if the lease
  is already ACTIVE.
- Lifecycle + dunning sends: deduped via `lifecycle_events` / `notification_log`
  (one per kind per day/installment).
- UO write-backs: mark-paid/approve/resolve are no-ops when already in the target
  state.

**Edge cases handled**
- Lease ending mid-schedule: final installment is day-prorated (Phase 1 generator).
- Manual-pay overdue: late fees accrue but are NOT auto-charged; settle via UO
  Mark Paid (fees stay ACCRUED until then).
- Room → maintenance / rename: lease_rooms snapshots preserve name/number; metadata
  uses the snapshot.
- Charge dispute / async outcome: webhook is source of truth; requires_action rows
  stay DUE with the PI recorded, settled on webhook.
- Partial manual payment: out of scope for auto-charge; admin Mark Paid settles the
  installment, with the note capturing context.

**Deferred / suggested (post-foundation)**
- Real SendGrid + Twilio creds (sends dry-run until set; env names in
  `notifications.ts`).
- Live Stripe key flip (manual human step) — still in TEST mode.
- Admin UIs for lease/lifecycle templates + a reconciliation dashboard view.
- Multi-room room-level reconciliation currently attributes a multi-room lease's
  money to the lease's primary (first) room for the room rollup; property/entity
  totals are exact. Split per-room if needed later.

**PHASE 9: COMPLETE — tests green**

---

## BUILD COMPLETE — all 9 phases

All nine phases built, tested, and committed. **105 unit tests pass**; `npm run
build` and `npm run build:api` succeed; the full additive schema (17 tables) is
applied to the DB with zero destructive operations. Stripe remained in TEST mode
throughout — no live charge was ever executed; the live-key flip is the user's
manual step. No Unified Ops database was ever written (UO consumes BNP's API).

**Phase gates honored:** Phases 4 and 5 (the money gates) stopped for human review
and only advanced on explicit "go". Phases 1–3 and 6–9 ran autonomously.

**What a co-living guest can now do end-to-end:** browse rooms → pick term +
cadence → preview the full payment schedule → sign a lease in-app → pay the first
installment and save a card → get charged on schedule → receive reminders/receipts
→ self-serve in the portal (pay early, ask questions) → and be managed from UO
(mark-paid, approve, respond, resolve, waive). STR nightly booking is unchanged and
now carries full charge metadata.

**Before go-live (carry-through):** set test→live Stripe keys (manual), add
SendGrid/Twilio creds, set `UO_BNP_API_TOKEN` + `CRON_SECRET` in prod, replace
placeholder/expansion-test inventory with real properties, and run a real
(refundable) end-to-end checkout once live keys are in.

---

## PHASE 6.5 — Tenant identity verification: license + vehicle upload, approval-gated activation

Post-build addition. Lets a signed, deposit-paid co-living tenant upload their
driver's license and vehicle info from the portal; an admin reviews the license
(verifying the tenant's name against the signed agreement) and **approves to
activate the lease**. Additive — the STR path and every existing table are
untouched; nothing in Phases 1–9 changed behavior except the deposit→activation
split described below.

**What was built (files touched):**
- **File storage (new dependency):** `server/lib/storage-r2.ts` — `uploadBuffer` /
  `getPresignedDownloadUrl` / `isR2Configured` against the **same Cloudflare R2
  bucket UO uses** (`@aws-sdk/client-s3`, S3-compatible). BNP objects are
  namespaced under a `bnp/` key prefix. Licenses are **private** — server-derived
  keys, presigned GET reads only (600 s), never a public URL. Env-gated exactly
  like Stripe/email (`isR2Configured()`): degrades to a clean 503 when the four
  `R2_*` vars are unset. Deps added: `@aws-sdk/client-s3`,
  `@aws-sdk/s3-request-presigner`, `multer`, `@types/multer`.
- **Schema (additive):** `shared/schema.ts` — six verification columns on `leases`
  (`verification_status` + license/review metadata), a new `PENDING_VERIFICATION`
  lease status, `VERIFICATION_STATUSES`, a new `vehicles` table (one row per lease),
  and `VERIFICATION_PENDING` added to `ESCALATION_KINDS`. Storage:
  `getVehicleByLease` / `upsertVehicleByLease`; `PENDING_VERIFICATION` added to
  `ROOM_BLOCKING_LEASE_STATUSES` so a deposit-paid, awaiting-review lease keeps
  holding its room.
- **Service:** `server/lib/verification.ts` — token-authed `uploadLicense` /
  `saveVehicle` / `uploadVehiclePhoto` (reuses `resolvePortalLease`), plus
  admin-side `getLicenseViewUrl` / `approveVerification` / `rejectVerification`.
  `getPortalView` extended with `verification` + `vehicle` blocks.
- **Activation gate (`server/lib/leasePayments.ts`):** `finalizeDepositPayment` now
  secures the room + parks the lease in `PENDING_VERIFICATION` (no longer straight
  to ACTIVE, no first-week charge). New `activateVerifiedLease()` — called from the
  admin approve action — does the ACTIVE transition + `onLeaseActivated` + first-week
  rent (charge if move-in ≤ today, else defer to the sweep). Rent sweep + dunning
  already filter `status === "ACTIVE"`, so an unverified tenant is never charged —
  verified, no extra guard needed. Deposit-receipt copy updated to direct the tenant
  to upload their license.
- **Routes (`server/routes.ts`):** 3 portal routes (`POST /api/portal/:token/license`,
  `/vehicle`, `/vehicle-photo` — multer memory storage for the two file routes) +
  4 admin routes (`GET /api/admin/verifications`, `GET
  /api/admin/leases/:id/license-url`, `POST …/approve-verification`, `POST
  …/reject-verification`), all `requireAdmin`.
- **UI:** `client/src/pages/portal.tsx` — Verification card (upload / in-review /
  rejected-with-reason / approved states) + Vehicle card (make/model/year/color/
  plate/state + optional photo, "no vehicle" toggle).
  `client/src/pages/admin/dashboard.tsx` — new "Verifications" tab: queue with
  signed-name vs guest-name comparison, "View license" (presigned), Approve &
  activate, Reject-with-reason.
- **Migration:** `scripts/push-verification-schema.mjs` — idempotent, additive-only
  (`ADD COLUMN IF NOT EXISTS` / `CREATE TABLE IF NOT EXISTS`), mirroring the
  existing `push-lease-schema.mjs` pattern (drizzle-kit push prompts without a TTY).
  Pre/post state verified; re-run is a confirmed no-op. **Zero destructive
  operations.**

**Decisions:** manual admin review (no OCR/KYC vendor); reuse UO's R2 bucket per the
user's instruction (object storage, not the forbidden UO Postgres; `bnp/` prefix
isolates it); deposit reserves the room, admin approval activates; on reject the
tenant is emailed/SMSed the reason + portal link and the room stays held.

**Tests + results:** `npm run check` (tsc) clean; `npm test` → **185/185 pass**
(was 164; added `server/lib/verification.test.ts` (16) + `activateVerifiedLease`
cases, and updated the deposit tests to assert the new `PENDING_VERIFICATION`
landing + no first-week charge). `npm run build` succeeds (client bundle + server
esbuild + PWA). Dev server boots on `127.0.0.1:3005`; all 7 routes verified live —
admin routes 401 unauthed, portal upload 503 when R2 unset (env-gate working),
vehicle route 404 on a bad token.

**Deferred:** OCR/automated name match; insurance-card capture; a full password
account system (the portal token stays the login); STR-guest verification
(co-living only, per the request).

**Carry-through for go-live:** set the four `R2_*` env vars in this app's
environment (the same values UO uses) so uploads leave dry-run mode.

**PHASE 6.5: COMPLETE — tests green**

---

## 2026-07-01 — Enhancement: co-living room cards inline + clickable images

**What:** "Available rooms" section on the co-living property page: (1) each room
card image is now a link to the room's detail page (`/room/:id`, all statuses —
the room page shows the status badge; aria-label + `link-room-image-<id>`
testid); (2) card layout `sm:grid-cols-2` → `md:grid-flow-col md:auto-cols-fr` —
one equal-width inline row on desktop for any room count (no hard-coded column
count), stacked full-width on mobile; (3) fixed a squeeze the narrower cards
exposed: long room names pushed the status badge past the card edge under
`overflow-hidden` — heading `min-w-0`, badge `shrink-0`, row `items-start gap-2`.

**Files:** `client/src/pages/property-detail.tsx`. Branch `feat/room-cards-inline`.

**Tests + results:** `npm run check` clean; `npm test` → 185/185 pass; `npm run
build` green. Playwright smoke on OBC Home (dev, port 3005): desktop 1280px = 3
cards in one row (equal widths, images aligned), image click → room detail page;
mobile 390px = stacked full-width; "Reserve this room" unchanged; 0 console
errors/warnings.

**Tracker:** Build Tracker ticket "Co-living property page — clickable room
images + inline room-card row" (BNP) → Needs Admin Verification.

**Follow-up (same day, admin kick-back):** the room-card row was still capped at
704px on desktop — the details/sidebar grid (`lg:grid-cols-[1fr_360px]`) reserved
a 360px right column even on co-living pages, where no sidebar renders. The
two-column template now applies only to STR; co-living details (and the card row)
span the full content width (~1104px, cards ~355px each). STR page verified
unchanged (details + sticky booking card). tsc clean · 185/185 · smoke re-run.

---

## 2026-07-01 — Enhancement: home-page listing display (co-living "from" price + city filter)

**What (two related home-page fixes):**
1. **Co-living "from" price.** Co-living cards showed a static "Rooms available";
   they now show "from $X / week" where $X is the lowest `weeklyRent` among the
   property's AVAILABLE rooms — mirroring the STR "from $X / night" pattern. If no
   room is AVAILABLE the card reads "Fully booked". Computed server-side: the
   `/api/properties` list endpoint now returns `fromWeeklyRent` per property (new
   `PropertyListItem` type = `Property & { fromWeeklyRent: string | null }`); the
   raw `Property` table type is untouched. STR pricing unchanged.
2. **Location filter → city.** The "Where" filter matched the raw `location`
   string, which is inconsistent free-text (full street address vs. bare city), so
   the same city listed under two different pills and never grouped. Added
   `cityOf(location)` (client/src/lib/format.ts): take the segment before the
   first comma, strip a leading street part (keep text after the last "."), fall
   back to the trimmed input for name-only locations. Filter list + match now use
   `cityOf`. The two Atlanta properties (one full address, one bare "Atlanta") now
   collapse into a single "Atlanta" pill and filter together.

**Files:** `shared/schema.ts`, `server/routes.ts`, `client/src/pages/home.tsx`,
`client/src/lib/format.ts` (+ `format.test.ts`). Branch `feat/room-cards-inline`.

**Tests + results:** `npm run check` clean; `npm test` → 191/191 pass (added 6
`cityOf` unit tests). Verified live (dev :3005): API returns fromWeeklyRent 300 /
300 / null; home grid shows "from $300.00 / week" (both co-living) and "from
$92.86 / night" (STR); "Where" shows one "Atlanta" pill; selecting it shows both
Atlanta properties and hides Antigua; 0 console errors.

**Known data issue (not a code bug):** the Antigua STR has no street address — its
`location` is the property name "ANTIGUAN VILLAGE RETREAT", so that string appears
as a city pill. Fix is data (give it a real city/location in Unified Ops), or add
a dedicated `city` column later.

**Tracker:** BNP ticket "Home page — co-living cards show 'from $X/week'…" → Needs
Admin Verification.

---

## 2026-07-01 — Enhancement: real cities in "Where" filter + stacked filter rows

**What:**
1. **Filter-bar layout.** "Where" and "Type" now sit on separate lines (outer
   filter-bar container `flex flex-wrap` row → `flex flex-col`).
2. **Real city data.** Two properties had no usable city. Updated their stored
   `location` (admin/storage path, not raw SQL): OBC Home "5870 Old Bill Cook Rd.
   Atlanta, GA 30349" → "Atlanta"; Antiguan Village Retreat "ANTIGUAN VILLAGE
   RETREAT" → "St. John's, Antigua". The "Where" filter now reads All locations ·
   Atlanta · St. John's. Prior values backed up to
   `docs/migration-backups/property-locations-2026-07-01.json`.
3. **cityOf hardening.** "St. John's, Antigua" broke the old parser (it stripped
   everything after the last "." → "s"). New rule only strips a street prefix when
   the pre-comma segment STARTS WITH A DIGIT (a real house number), so
   abbreviations inside a city name ("St. John's", "St. Louis") are preserved.

**Files:** `client/src/pages/home.tsx`, `client/src/lib/format.ts` (+ 2 new
`format.test.ts` cases), `docs/migration-backups/property-locations-2026-07-01.json`.
Data edit applied to the BNP Neon DB. Branch `feat/location-city-filter`.

**Tests + results:** `npm run check` clean; `npm test` → 193/193 (was 191).
Verified live (dev :3005): "Where" shows Atlanta + St. John's on their own line,
"Type" on the line below; selecting St. John's shows only the Antigua listing,
Atlanta shows both Atlanta homes; cards show cleaned locations; 0 console errors.
(One transient Neon ConnectTimeoutError 500 observed pre-edit — DB cold start, not
code; all subsequent requests 200.)

**Note for later (not blocking):** GET /api/properties now does one
getRoomsByProperty call per co-living property (N+1). Fine at current inventory;
worth collapsing to a single grouped query if the property count grows.

**Tracker:** BNP ticket "Home page — co-living 'from $X/week' price + filter
locations by city" covers the filter; layout + city-data added same session.

---

## 2026-07-01 — Fix: hero image ratio 16:7 → 3:2 (room + property heroes)

**What:** The detail-page hero (a selected room image, or a property hero) was
`aspect-[16/7]` (~2.29:1) — a short letterbox that cropped too much vertical off
room/property photos. Changed to `aspect-[3/2]` (1.5:1, ~50% taller), matching the
gallery thumbnails and the home-page room cards. Applied to all hero surfaces:
ListingGallery's three hero branches (0/1/2+ photos — covers the STR property hero
and the co-living room hero) and the co-living property hero (ListingImage wrapper
in property-detail). Thumbnail strips stay 3:2 (unchanged).

**Files:** `client/src/components/listing-gallery.tsx` (lines 36, 45, 58),
`client/src/pages/property-detail.tsx` (co-living hero wrapper). Branch
`fix/hero-aspect-3-2`.

**Tests + results:** `npm run check` clean (no test surface — visual only).
Verified live (dev :3005): room hero 976×651, STR property hero 1104×736,
co-living property hero 1104×736 — all exactly 3:2; 0 console errors.

**Tracker:** BNP quick fix off the room-cards work.

---

## 2026-07-02 — Full-site redesign: template adoption (coral edition)

**What:** Rebuilt the public site to the owner-supplied design template while
keeping the existing coral palette and PNG logo. Homepage: hero (eyebrow, serif
H1, sub) + wired search card (Where/Check-in/Check-out; Where filters the grid,
dates ride card links as query params) + two "door" cards (coral = whole
property → STR filter; teal = by the room → COLIVING filter) + trust band
(template copy verbatim as placeholders, constants at top of home.tsx) +
listings section with filter chips (segment dots; replaces the old sticky
FilterGroup bar) + coral "How it works" band + dark 3-column footer with honest
deep links (/?type=…&city=…#stays; home honors both on load and hash-scrolls
once data renders). New card anatomy: 5px left segment accent bar, segment pill
(dot+label), Available/Fully-booked status pill (new green "good" tint —
green = status only, never brand), serif names, static ★4.9 placeholder.
Available cards sort before booked ones.

**Server — `nextOpening` on GET /api/properties:** fully-booked cards can now
show "Next opening · <date>". COLIVING: min endDate of OCCUPYING leases
(PENDING_VERIFICATION | ACTIVE — deposit paid holds the room) + 1 day (endDate
is the inclusive last night). STR: back-to-back chain walk over non-cancelled
STR bookings covering today; checkout day itself bookable (matches
strHasConflict). Two batched storage queries (getSoonestOccupyingLeaseEndByProperty,
getStrBookingsEndingOnOrAfter) — no N+1. Pure math in `server/lib/nextOpening.ts`.

**Design tokens:** `--background` #ffffff → #fbfaf7 (warm paper; cards stay
white islands); new vars `--segment-whole` (coral) / `--segment-room` #2c6e8f
(+tint) / `--good` (+bg); `.bnp-chip`, `.is-booked` component classes; Tailwind
`segment.*` + `good.*` colors; shadcn Card base → rounded-2xl + shadow-card
(site-wide reskin incl. admin, intentionally); theme-color meta fixed
#0f172a → #e0533d.

**Other pages:** property-detail seeds dates from ?checkIn/?checkOut (validated
>= today / out > in), segment pills with dots, room cards get teal accent bar +
good/gray status pills + friendly labels, min-nightly IIFE deduped into shared
`fromNightly()` (lib/format.ts, also used by the home card); room-detail gets
segment pill + teal accent on reserve card; lookup/portal badges use the good
tint via statusClass; confirmation check icon → good tint; lease-booking
cadence buttons → pill-shaped; not-found link → coral pill button.

**Files:** client/src/pages/home.tsx (rebuilt), new
client/src/components/{property-card,search-bar}.tsx, site-header.tsx (header +
dark footer), index.css, tailwind.config.ts, client/index.html, ui/card.tsx,
pages/{property-detail,room-detail,booking-lookup,portal,confirmation,
lease-booking,not-found}.tsx, lib/format.ts (+shortDate/fromNightly),
shared/schema.ts (PropertyListItem +nextOpening), server/routes.ts,
server/storage.ts (2 new batched methods), new server/lib/nextOpening.ts.
Branch `feat/site-redesign`.

**Tests + results:** `npm run check` clean; 206 vitest tests pass (193 prior +
9 nextOpening + 4 format); vite build + `npm run build:api` clean (api bundle
regenerated so prod gets nextOpening). Playwright (dev :3006): desktop 1440 +
mobile 390 full-page homepage OK, 0 console errors; /?type=COLIVING#stays
deep link filters + scrolls; search dates propagate to card hrefs; STR detail
prefills dates + checkout enabled; co-living detail shows teal room cards;
lookup + admin login sane on paper background. "Next opening" render path unit-
tested (no booked inventory in dev DB to see live).

**Deferred/flagged:** sticky filter bar intentionally removed (template puts
chips in the section head) — restore if Alex wants it; trust-band claims +
★4.9 are owner-approved placeholders; dark mode still declared-but-undefined.

**Tracker:** BNP "Full-site redesign — template adoption" → Needs Admin
Verification.

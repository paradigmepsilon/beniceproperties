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

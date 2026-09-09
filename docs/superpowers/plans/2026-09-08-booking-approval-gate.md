# BNP — Gated booking flow for co-living short stays

## Context

Today a BNP co-living short stay (7–28 nights) goes live the instant Stripe confirms the card.
`materializeShortStayBooking` writes the booking `ACTIVE`, marks the room `OCCUPIED`, sends one
confirmation email, and that is the entire guest journey. Nobody collects an ID, nobody signs
anything, nobody reviews the reservation, and the guest is never told how to get into the building.

Worse, that confirmation email promises every guest *"Check-in details arrive the day before
arrival"* ([lifecycle.ts:109](server/lib/lifecycle.ts#L109)) and **no code sends it** — there is no
pre-arrival job, and no door code, wifi password, or directions stored anywhere in the schema.
That is a live broken promise in production.

The goal: a guest who always knows the next step — pay, upload a license, sign the agreement, get
approved, receive real arrival instructions, get reminded before checkout, extend in one tap.

Most of the machinery already exists but is wired exclusively to co-living **leases** (>28 nights):
typed E-SIGN/UETA signature, license upload to private R2, an admin approve/reject queue with a
name-mismatch flag, Telegram admin alerts, and a tokenized portal. This work generalizes it to
short-stay **bookings** rather than building it twice.

## "A month" is 28 nights here

The gate is `LEASE_REQUIRED_ABOVE_DAYS = 28` ([schema.ts:238-256](shared/schema.ts#L238-L256)), so a
**29-night stay is already a lease today**. Everything below targets `isDirectCoLivingStay()` — 7 to
28 nights. Moving that boundary to a literal 30 days would change lease exposure, cadence rules, and
the pricing cascade. **Not changing it here.** The >28-night flow is the next conversation.

## Owner decisions (settled)

| Decision | Choice |
|---|---|
| Approval gate scope | **Co-living 7–28 nights only.** Whole-property STR books instantly. |
| Doc collection | **After payment** — confirmation page + emailed link. |
| Admin rejection | **Two actions.** *Request fix* (non-terminal, dates held, no money moves) · *Decline & refund* (terminal, full refund, dates released, mis-click guarded). |
| Ghosted guest | Nudges, then **auto-decline + full refund at 72h of silence**. |
| STR | No gate. Gets the **day-before pre-arrival email only** — no checkout reminders, no extension. |
| House rules | New public **`/house-rules`** page, content-file pattern. |
| Checkout reminders | **Day-granular** (2 days out with extension offer, 1 day out), co-living only. |
| Extension | **Extends the existing booking's `check_out`.** One reference, same door code, no re-approval. **Allowed past 28 nights** (owner override — see Legal). |
| Door code in `message_log` | **Logged verbatim** (owner decision: access codes are UO-managed, so UO visibility is moot). Still excluded from Telegram, SMS, and server logs. |
| Payment methods | **Keep all methods.** Add the missing `return_url`; make the surcharge label method-aware. |

## Pre-existing bugs to fix FIRST (independent of this feature)

These are live today. Two of them would silently defeat the gate.

1. **Five sites bypass the gate.** `model === "COLIVING" ? "ACTIVE" : "CONFIRMED"` is computed
   independently in [materialize.ts:305](server/lib/materialize.ts#L305),
   [bookingConflicts.ts:93](server/lib/bookingConflicts.ts#L93),
   [manualSettle.ts:89](server/lib/manualSettle.ts#L89), and twice in
   [routes.ts:2235](server/routes.ts#L2235). Gate only materialize and a CashApp settlement, a
   conflict resolution, or the legacy Checkout webhook walks a guest to `ACTIVE` with no ID and no
   door code. **Collapse all five into one `postPaymentStatusFor()` before writing any feature code**,
   with a source-grep test (precedent: [nextOpening.test.ts:135-145](server/lib/nextOpening.test.ts#L135-L145)).
2. **Stripe idempotency keys expire after 24h.** `refund:${stripeRef}` therefore does not protect a
   sweep that retries daily; the real guard is Stripe's `charge_already_refunded`, which is currently
   **uncaught** and surfaces as a failure. Treat it as success. This closes an existing hole in
   [bookingConflicts.ts:190-211](server/lib/bookingConflicts.ts#L190-L211) too.
3. **`confirmPayment` has no `return_url`** ([checkout.tsx:321](client/src/pages/checkout.tsx#L321))
   while the PI enables `automatic_payment_methods`. Any guest choosing Cash App Pay or Klarna hits an
   `IntegrationError` presented as a generic failure. Add `confirmParams.return_url`.
4. **Surcharge is method-blind.** A 3.5% line labelled card processing is applied to Klarna and Cash
   App Pay. Make it method-aware (see Legal — verify surcharge rules first).
5. **`CRON_SECRET` fails open** — the guard is `if (secret && ...)`
   ([sweep.ts:24](api-src/cron/sweep.ts#L24)), so unset means world-callable, and the ghost sweep will
   be the first cron that refunds money. Harden to fail closed in production.

Also worth a follow-up (not on this path): `NON_BLOCKING_BOOKING_STATUSES` claims to be the single
source of truth, but `getColivingBookingsForRoom` ([storage.ts:1385](server/storage.ts#L1385)) and
`getOccupiedRoomIdsOn` ([storage.ts:1401](server/storage.ts#L1401)) hard-code the pair instead.

## Architecture

### State: one new status, sub-state derived

`BOOKING_STATUSES += "PENDING_APPROVAL"`. **It must NOT join
`NON_BLOCKING_BOOKING_STATUSES`** — the guest paid, so the dates stay held. This is the load-bearing
assertion and gets its own regression test.

Zero DDL needed for that: the exclusion constraints in
[push-deconfliction-messaging.mjs:75-88](scripts/push-deconfliction-messaging.mjs#L75-L88) read
`status NOT IN ('CANCELLED','CONFLICT')`, so any new status is automatically blocking.

**Declined + refunded reuses `CANCELLED`**, not a new status. A new *non-blocking* status would
require `DROP CONSTRAINT` / `ADD CONSTRAINT` on live `bookings` — an `ACCESS EXCLUSIVE` lock, a
validating scan, and a window with no double-booking guard. That is destructive and a halt condition.
Declined-vs-cancelled is a **reason**, not a state.

Sub-state (`AWAITING_DOCS` / `AWAITING_REVIEW` / `FIX_REQUESTED` / `APPROVED`) is a **pure derived
function** in new `shared/bookingGate.ts`, mirroring how leases pair
`status = PENDING_VERIFICATION` with `verificationStatus`. Client and server both import it.

### Storage: four new tables, zero `ALTER TABLE`

Gate state goes in a 1:1 side table, **not** columns on `bookings` — because
`GET /api/lookup` ([routes.ts:1470](server/routes.ts#L1470)) returns the whole booking row, so a
`door_code` column would publish on a reference+email challenge. Same reasoning for access info:
`GET /api/properties` selects property rows, so a `wifi_password` column would land on the public API.
Separate tables make the leak impossible rather than merely forbidden.

- **`booking_gate`** (PK `booking_id`) — `gate_token` (**24-char base62**, unique), `docs_deadline_at`,
  agreement fields (`agreement_signed_name/_at/_ip/_document_html/_document_url`), verification fields
  mirroring [schema.ts:893-901](shared/schema.ts#L893-L901), `approved_at/_by`, `name_matches_ack`,
  `door_code`, `fix_requested_at/_by/_reason`, `fix_request_count`, `cancel_reason`, `cancelled_by`,
  `original_check_out`, `extension_count`.
  Token length is load-bearing: 24 chars keeps the extension SMS inside one 160-char segment.
  `extension_count` is required — `lifecycle_events` has no date in its key, so without a monotonic
  ordinal an extended stay silently never gets another checkout reminder.
- **`payment_refunds`** — one row per Stripe refund, `UNIQUE(stripe_refund_id)` makes
  double-recording structurally impossible. `PAYMENT_STATUSES += "REFUNDED"` (plain text column, no
  CHECK — value-only change), which keeps `getKpiAggregates`'s existing `status = "PAID"` filter
  correct with no code change. **Not** a negative-amount `payments` row: that would put two rows on
  one `stripe_ref` and `getPaymentByStripeRef` destructures `const [row] =` with no `ORDER BY`.
- **`property_access_info`** / **`room_access_info`** — PK + `jsonb info` + `updated_by`, so a new
  field needs zero migration. Property: wifi SSID/password, building entry, directions, parking,
  check-in/check-out times, house-rules URL. Room: finding notes, floor, door label.

Migration script `scripts/push-booking-gate.mjs` follows
[push-verification-schema.mjs](scripts/push-verification-schema.mjs) with pre/post-state assertions,
plus a test asserting every statement is `IF NOT EXISTS`-guarded and none contains `DROP` or
`ALTER TABLE ... ALTER COLUMN`.

### Guest surface

- **`/confirmation/:reference` rework.** The client navigates here the moment `confirmPayment`
  resolves — typically *before* the webhook has materialized the booking (a separate Vercel
  invocation). So it must handle "booking doesn't exist yet": `POST /api/stay/claim {reference, email}`
  returns `{portalToken, gate}`, or `202 {pending:true}` while the webhook is in flight (poll 2s for
  60s). `checkout.tsx` stashes `{reference, email}` in `sessionStorage` so the happy path
  auto-claims; otherwise the page renders the reference+email challenge inline, reusing
  `booking-lookup.tsx`'s form. Same auth level `/api/lookup` already uses — a bare reference would be
  an auth downgrade since references appear in Stripe receipts.
  Per-state screens: pending · awaiting docs (checklist + one CTA) · fix requested (reason in
  `text-destructive`) · awaiting approval ("within 24 hours") · approved · declined · STR.
- **`/stay/:token`** — its own page, **not** `/portal/:token`. The lease portal's 600-line view model
  is schedule/cadence/installment-shaped; overloading it means a token discriminator and a union
  view model inside the live lease flow. Shared UI is extracted into components instead.
- **`/stay/:token/extend`** — token-authed, no challenge (guests arrive from SMS on a phone).
  Availability-bounded night presets, price summary reusing `checkout.tsx`'s shape, `PaymentElement`.
- Mint `portalToken` for **all** short stays including STR (needed for pre-arrival links), with a
  `stayPortalUrl(booking)` that falls back to `lookupUrl()` on a null token exactly like
  `portalUrl(lease)` ([publicUrl.ts:36-38](server/lib/publicUrl.ts#L36-L38)) so legacy bookings never
  get a dead link.

### Client extraction boundary

`vitest.config.ts` is `environment: "node"` with no jsdom and no `@testing-library` — all six existing
client tests are pure modules under `client/src/lib/`. **So any screen logic worth testing must live in
`lib/` or `shared/`, not JSX.** Extract and share:

- `client/src/lib/portalFetch.ts` — `uploadFile()` + `cleanError()` (already duplicated in
  [portal.tsx:97](client/src/pages/portal.tsx#L97) and
  [lease-sign.tsx:29](client/src/pages/lease-sign.tsx#L29); a third copy is the tipping point)
- `client/src/components/license-upload-card.tsx` — the four-state Card from
  [portal.tsx:278-332](client/src/pages/portal.tsx#L278-L332), extracted **verbatim** with identical
  DOM and `data-testid`s; copy differences passed as a required prop, no defaults
- `client/src/components/agreement-signer.tsx` + `client/src/content/esign.ts` — highest-value
  extraction, because the E-SIGN/UETA affirmation language is legally load-bearing and must not fork
- `client/src/lib/esign.ts` (`canSign`), `client/src/lib/nameMatch.ts` (lifted verbatim from the
  untested inline compare at [dashboard.tsx:295-298](client/src/pages/admin/dashboard.tsx#L295-L298) —
  **no semantic change**), `shared/bookingGate.ts`, `shared/doorCode.ts`,
  `server/lib/uploadValidation.ts` (from [verification.ts:37-69](server/lib/verification.ts#L37-L69))

Deliberately **duplicated**: page shells, mutation wiring/query keys, and everything
schedule/late-fee/manual-payment (irrelevant to a paid-in-full stay).

`verification.ts` is **not** parameterized — its exported signatures stay byte-identical and
`verification.test.ts` must pass unmodified. That is the acceptance criterion for the extraction. A
parallel `server/lib/stayVerification.ts` mirrors it under R2 keys
`bnp/licenses/booking/<id>/<uuid>.<ext>`.

### Admin surface

**New tab in its own file** — `client/src/pages/admin/stay-approvals-tab.tsx`, following the existing
`MessagesTab` / `BlocksPanel` extraction precedent, so `dashboard.tsx`'s diff is ~6 lines. Not folded
into Verifications: different subject, different action set, and mixing them invites clicking a
terminal money action on the wrong row. Each queue needs its own visible count, using the existing
inlined-template-string convention, not a `<Badge>`.

Row: name-mismatch flag · view license · view signed agreement · **required door-code input**
(validated by shared `shared/doorCode.ts`, re-validated server-side — a client-only check is not a
check) · `[Approve & send welcome]` · `[Request fix]` + reason · `[Decline & refund]`.

Mis-click guard **reuses what already exists**: `@radix-ui/react-alert-dialog` is not installed, but
`ConflictBookingActions` ([dashboard.tsx:826-853](client/src/pages/admin/dashboard.tsx#L826-L853))
already implements a typed-amount confirmation for this exact action, and
`client/src/lib/adminRefund.ts` provides tested `refundEligibility()` + `amountMatches()`. Server-side
the real guard: `POST .../decline-refund {reason, expectedRefundAmount}` returns **409** if the amount
doesn't match the server-computed PAID-Stripe total.

**Approval is gated on data, not identity:** if the property has no access-info row (or is missing
wifi/directions), approve returns 409 — an admin cannot approve into a blank welcome letter.

### Refund path

`Decline & refund` wraps the existing `cancelBooking()` for the CANCELLED + free-room +
resolve-escalations half, then owns the refund loop to add what `cancelBooking` lacks: refund
metadata, a DB row, and per-payment error containment.

Stripe refund metadata is a **separate 50-key bag that does not inherit from the PaymentIntent**, so a
refund with no metadata is invisible to metadata-driven reconciliation. Add `buildRefundMetadata()`
guarded by the existing `assertCompleteMetadata`.

On a Stripe error: never roll `CANCELLED` back (the guest must not keep a room they were declined
for, and the retry is safe) — collect into `failed[]`, raise a HIGH `REFUND_FAILED` escalation, page
an admin, respond 502 with the partial result. Add an **unrefunded-cancellation** line to
`server/lib/reconciliation.ts` so stranded money can never sit silently.

### Notifications

15 new `LIFECYCLE_EVENT_TYPES`, all on **`lifecycle_events`**, none on `notification_log` —
`notification_log.lease_id` is `NOT NULL` with no `booking_id` column, so a booking-scoped message is
impossible there without migrating a live money table.

`scheduleSeq` is repurposed as a **round counter**: fix-request loop keys on `fix_request_count + 1`
(without it, a guest asked to fix who then ghosts gets no nudge and is auto-declined with no warning);
checkout reminders key on `extension_count` so each extension re-arms both.

Templates live in a new pure `server/lib/stayTemplates.ts`, not grown onto the 488-line lease-shaped
`lifecycle.ts`. An **anti-cycle refactor comes first**: move `daysUntil` → `shared/dates.ts`,
`fmtMoney` + `roomDisplayName` → `server/lib/formatShared.ts`, re-export from `lifecycle.ts` for
back-compat, so `lifecycle.ts` never imports `stayLifecycle.ts` — the branch lives in `materialize.ts`,
which already has an injectable `MaterializeDeps` built for this.

`materialize.ts` has **two** call sites to branch — `materializeShortStayBooking:395` and
`repairExistingBooking:145` (the webhook-retry path) — via one local `fireConfirmation()` helper,
or a Stripe retry re-fires the wrong template.

Door codes: verbatim in the email body and in `message_log` per the owner's decision. **Never** in
`smsBody`, `telegramText`, subjects, PostHog properties, or `log()` — enforced by a ratchet test, not
by discipline. Any SMS carrying a link routes through `sms_include_links` (the A2P 10DLC kill-switch
at [dunning.ts:125-129](server/lib/dunning.ts#L125-L129)).

### Scheduler

Every job registers in **both** `server/scheduler.ts` and `api-src/cron/sweep.ts`, then
`npm run build:api` — the committed `api/` bundle is what Vercel serves, and forgetting it means the
job silently never runs in production. Each new job gets **its own try/catch** (jobs 5/6/7 have none,
so a throw there aborts the rest of the pass) and is placed **after** the existing money jobs.

- **Checkout reminders** — window + once-ever, *not* strict equality: query `checkOut ∈ [today, +2]`,
  fire 48h at `d ∈ [1,2]` and 24h at `d ∈ [0,1]`, mutually exclusive per pass via `continue`. A
  skipped cron day still sends both, in order, losing nothing. Both templates carry the extension
  link so no path loses the offer. `checkOut === null` (open-ended) is skipped explicitly.
- **Ghost sweep** — nudges are day-windowed (resilient); the **decline uses strict elapsed hours ≥ 72**
  (the `ABANDONED_HOURS` pattern from [leaseHolds.ts:76](server/lib/leaseHolds.ts#L76)) so a guest is
  never declined *before* the 72 hours they were promised. Clock runs from `fix_requested_at ??
  created_at` — "silence" means since we last asked.
  Three guards on the money: `!docsSubmitted` tests only the **guest's** part (a guest who submitted at
  hour 2 and is waiting on the admin at hour 73 is never declined); `checkIn > todayIso()`; and
  `guest_auto_notifications === "false"` suppresses **both** nudge and decline, escalating instead —
  otherwise flipping guest sends off would silently refund and release paying guests who were never
  told what was needed.
  **Check-in guard is an independent branch**, not the `else` of the deadline: a booking made today
  for tomorrow reaches check-in at hour ~24, so `checkIn ≤ today ∧ !docsSubmitted` raises a HIGH
  escalation on its own trigger. **No money moves, ever, on that path.**
- **STR pre-arrival** — day-before with a same-day catch-up. If access info is missing it raises a
  deduped `ACCESS_INFO_MISSING` escalation and **deliberately does not record** a lifecycle row —
  because `lifecycle_events` has no date in its key, recording SKIPPED would permanently burn the slot
  and the guest would never get check-in details even after an operator fills them in.

**Production granularity is daily, 08:00 UTC (03:00/04:00 ET).** So the 72h deadline actually fires
between 72 and 96 hours. **Guest copy must say "3 days", never "72 hours"**, and the final nudge names
a date. `/api/cron/calendar` already runs hourly, so the plan is not Hobby-limited and a finer cron is
available later if the lateness bites — shipping daily first.

Use `todayIso()` from `@shared/dates` for all new date math. [lifecycle.ts:29](server/lib/lifecycle.ts#L29)
has a local `ymd` that is **UTC, not ET**; it gets away with it only because the cron runs at 08:00 UTC.

## Ordered steps

TDD throughout — test file first, then implementation, then `npx tsc` + `npx vitest run`.
**Verified baseline: 631 tests / 53 files passing** (run 2026-09-08). Preserve or exceed it.

Naming precedent worth following: [shared/leaseGate.test.ts](shared/leaseGate.test.ts) is a
dedicated lock-file whose subject (`requiresLease`, `isDirectCoLivingStay`, the two boundary
constants) lives in `schema.ts` — there is no `shared/leaseGate.ts`. So the boundary constants stay
in `schema.ts`, the richer derived-stage logic gets a new `shared/bookingGate.ts`, and its lock-file
is `shared/bookingGate.test.ts`. The assertion that the gate boundary stays at 28 belongs in the
existing `leaseGate.test.ts`.

**Phase A — pre-existing fixes, shipped alone so a regression is unambiguous**
1. `return_url` + method-aware surcharge in `checkout.tsx` / `stripe.ts`; harden `CRON_SECRET` to fail closed.
2. Collapse the five post-payment status sites into `postPaymentStatusFor()` + source-grep test.
3. Catch `charge_already_refunded` as success in the refund path.

**Phase B — pure primitives, no behaviour change**
4. Anti-cycle refactor (`daysUntil` → `shared/dates.ts`; `fmtMoney`/`roomDisplayName` → `formatShared.ts`).
5. `shared/bookingGate.ts`, `shared/doorCode.ts`, `server/lib/uploadValidation.ts`, `server/lib/smsLinks.ts`.
6. Schema constants + `scripts/push-booking-gate.mjs` + its guard test.

**Phase C — server**
7. Storage layer: gate/refund/access-info accessors, three windowed sweep queries, and
   `getBookingsWithGuest`'s default statuses += `PENDING_APPROVAL` ([storage.ts:671](server/storage.ts#L671)).
8. `server/lib/stayAgreementDocument.ts` — reuses `leaseDocument.ts`'s escaping and E-SIGN block verbatim.
9. `server/lib/stayTemplates.ts` + the **ratchet test first** (locks SMS length, ASCII, links, code containment).
10. `logBody` seam on `sendEmail`/`notifyGuest`; `accessInfo.ts`; `stayLifecycle.ts`; branch both `materialize.ts` call sites.
11. Refund metadata + `payment_refunds` + `bookingGateDecline.ts` (**highest-risk unit, most cases**).
12. `stayReminders.ts` (three sweeps) → register in both schedulers → `npm run build:api`.
13. Guest server surface: `stayPortal.ts`, `stayVerification.ts`, `/api/stay/*` routes.
14. `stayApproval.ts` + admin/UO routes.
15. `bookingExtension.ts` + `EXTENSION` PaymentKind + webhook branch.

**Phase D — client**
16. Extraction only, rewiring `portal.tsx` + `lease-sign.tsx` to byte-identical output. Ships alone.
17. Rewrite `confirmation.tsx`; add `pages/stay.tsx`; `sessionStorage` handoff in `checkout.tsx`.
18. `pages/admin/stay-approvals-tab.tsx` + ~6-line `dashboard.tsx` diff.
19. `pages/stay-extend.tsx`.
20. `/house-rules`: content file, page, route, `scripts/prerender.mjs` ROUTES, sitemap entry, footer link.

**Phase E — hardening**
21. Re-run every sweep twice in tests to prove idempotency; grep-assert no door code in SMS/Telegram/logs/fixtures.
22. `npm run build` + `npm run build:api`; build-log entry ending exactly `PHASE <n>: COMPLETE — tests green`,
    recording the owner overrides and legal flags.

### Extension pricing

**Re-price the whole stay via `cascadeStayPrice()` and charge `newTotal − alreadyPaid`.** Pricing added
nights in isolation would create a second divergent money rule for the same room-nights. The cascade
bills whole periods, so 21 nights (3 weeks @ $400 = $1200) extended to 28 re-prices to one month
($1400) — a $200 delta for 7 nights, cheaper *and* honest, because the guest is now on a monthly stay.

A re-price landing **below** what was already paid returns **409** to a human. An extension must never
move money outward.

Mutating `check_out` widens the row's own `daterange`, so the exclusion constraint re-evaluates on
`UPDATE` and can raise `23P01`. Payment-first: charge, then the webhook moves the date; on `23P01`
record the payment, **do not refund**, raise a HIGH `EXTENSION_CONFLICT`, leave `check_out` unchanged.
Same money rule as [materialize.ts:10-17](server/lib/materialize.ts#L10-L17).

## Verification

- `npx vitest run` — full suite green, count ≥ baseline.
- `npx tsc` — clean.
- `npm run build && npm run build:api` — and **confirm `api/cron/sweep.js` contains the new job names**,
  since a stale bundle means the jobs never run in production.
- Sweep idempotency: run each sweep twice against mocked storage, assert one send and one refund.
- Grep the repo for the synthetic door code used in fixtures — must appear in no SMS body, no
  `telegramText`, no subject, no `log()` call.
- **Manual, owner-run, with Stripe TEST keys** (local `.env` points at production Neon and LIVE
  Stripe, so every automated test here is mocked): book 10 nights → confirmation page shows two
  outstanding items → upload a license → sign → admin email + Telegram arrive → approve with a door
  code → welcome letter contains code/wifi/directions/house-rules → extend from the stay page →
  extension confirmation arrives with new dates and amount.

## Owner / ops steps I cannot do

1. **R2 env vars** (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`) in
   Vercel. Without them **every license upload returns 503** and the gate cannot complete. Absent from
   `.env.example`; [build-log.md:795](docs/build-log.md#L795) flags this as a go-live carry-through.
2. **Twilio env vars.** SMS is currently unconfigured, so it dry-runs — the checkout reminders and
   ghost nudges would log and never send.
3. **`CRON_SECRET`** set in Vercel production before the ghost sweep ships.
4. Run `node scripts/backup-tables.mjs bookings payments`, then `node scripts/push-booking-gate.mjs`
   **against production Neon** — additive and idempotent, but it is production.
5. Add every missing key to `.env.example` (R2 ×4, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID`,
   `CRON_SECRET`, Twilio ×3, `SENDGRID_API_KEY`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`).
6. **House-rules copy.** Owner content, referenced by a signed agreement — I won't invent quiet hours,
   pet, smoking, guest, or early-termination policies. The page renders only the sections supplied, so
   it ships partial.

## Legal — flagged, not resolved

1. **Short-stay agreement terms.** `DEFAULT_LEASE_TEMPLATE` is built around cadence, schedule, late
   fees, deposit, and card authorization — none of which apply to a stay paid in full upfront. A new
   template is required and its substantive terms are a counsel question. Ships structurally correct,
   reusing the reviewed E-SIGN/UETA affirmation verbatim, marked **PENDING OWNER/COUNSEL REVIEW**.
2. **Extension past 28 nights** (owner override). Beyond the bookings/leases disagreement, a long
   occupancy can convert a guest into a tenant with statutory eviction protections regardless of what
   the agreement says — which is plausibly why the 28-day boundary exists. **I don't know Georgia's
   specific threshold and won't guess.** Worth confirming with counsel before this ships, since it
   changes how a non-paying occupant can be removed.
3. **Method-aware surcharge** (owner choice). Whether a surcharge may be applied to BNPL and wallet
   methods, and at what rate, is governed by card-network rules and state law, not just labelling.
   Verify before the label change ships.
4. **Door code in `message_log`** — owner override of the global sensitive-data rule, on the reasoning
   that access codes are UO-managed so UO visibility is moot. Recorded in the build log. Note the one
   residual: `message_log` is append-only and permanent, so it accumulates every historical code per
   guest, where UO holds only the current value.

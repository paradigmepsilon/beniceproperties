# BNP Booking Platform — Build Governance (CLAUDE.md)

This repo is the **Be Nice Properties (BNP)** booking platform. This file is the governing
spec and is inherited on every turn. Read it before building anything. Read the real repo
files (`shared/schema.ts`, `server/routes.ts`, `server/storage.ts`, `server/scheduler.ts`,
`shared/pricing.ts`, the booking client) before writing code in any phase. Mirror the
existing TRAD conventions — do not reinvent.

**Live:** `https://beniceproperties.vercel.app` · **Repo:** `github.com/paradigmepsilon/beniceproperties`

---

## NON-NEGOTIABLE FLOORS (every phase, every turn)

1. **No destructive migration without exporting affected tables to `/docs/migration-backups/` FIRST.**
2. **Stripe TEST keys only. Never a live charge. Never flip to live** — that is a manual human
   step. If a step seems to need live keys, HALT and ask.
3. **Every phase appends an outcome entry to `/docs/build-log.md`** (what was built, files touched,
   tests run + results, decisions, deferred items). This is session memory across runs.
4. **Halt-and-ask on genuine ambiguity** (money, legal, data loss, security, irreversible action)
   not answered in this spec. Guess only on low-stakes reversible choices (naming, layout). When
   unsure whether something is high-stakes, treat it as high-stakes.

## HALT CONDITIONS (stop regardless of mode)

- A step needing live Stripe keys, real guest PII, or production credentials.
- A schema change to an EXISTING TRAD table that could break the live TRAD app.
- Any direct write to a Unified Ops database (forbidden — BNP owns its data; UO reads via API only).
- A conflict between this file and repo code that needs a judgment call on intent.
- Build or tests failing in a way you can't fix in two attempts without changing intent.

## ALREADY DECIDED — do NOT ask to reconfirm

- Stripe shared with TRAD; metadata does the entity/property/room breakout.
- Saved card + own scheduler, not Stripe Subscriptions.
- In-app typed e-signature, not a third-party provider.
- Cadences: Weekly / Bi-weekly / Monthly; first payment due on booking.
- Late fee $25/day from the day after due date, accrues indefinitely, auto-billed as a separate line item.
- Co-living allows manual payment, settled via UO "Mark Paid."
- UO reads this app + constrained write-backs; BNP owns its data.

## EXPANSION RULE

No hard-coded property/room identities, ever. Property type is an enum; properties and rooms are
data. Adding a property or room must require **zero** schema change. If you catch yourself typing
"Hutchens" or "TRAD" into logic rather than data, stop and generalize.

## BUILD-LOG PHASE CONTRACT

Mark a phase DONE in `/docs/build-log.md` only when its tests pass. The log line must read exactly:
`PHASE <n>: COMPLETE — tests green` so a goal evaluator can confirm it from the transcript.

---

# PROMPT 0 — Shared Context

You are building out the BNP booking platform — the **one-stop shop for current and potential
guests** to book, pay for, sign leases on, and manage their stay across two product types:

1. **STR (whole-property short-term rental)** — e.g. TRAD (The Retreat at Douglasville), a themed
   date-night property. Nightly bookings. Sibling implementation exists in the TRAD repo; mirror
   its patterns, do not reinvent.
2. **Co-living / room rental (by-the-room MTR)** — e.g. Hutchens, Old Bill Cook. A guest rents a
   specific named room in a shared house for a fixed lease term, paying on a recurring schedule.

**Stack (same as the TRAD app — the reference implementation):** React 18 + Vite + TypeScript,
Wouter routing, shadcn/ui + Tailwind, TanStack Query, React Hook Form + Zod, Express API, Drizzle
ORM against Neon Postgres, Stripe payments, Nodemailer/SendGrid email, Twilio SMS, a background
scheduler in the server process. Single codebase, single server process serving both API and built
client.

### Architectural rules (non-negotiable in any phase)

1. **BNP app owns its own data.** This app's Neon Postgres is the system of record for BNP bookings,
   leases, payments, and guest messages. It is **not** UO. Never write to a UO database.
2. **"Manage from UO" = a read API + a small set of write-back actions** (approve, mark-paid,
   send-message, resolve-issue). UO is not the booking database. Mirror the TRAD pattern exactly.
3. **Shared Stripe account with TRAD — metadata tagging is mandatory on every charge.** Entity/
   property/room breakout happens in this database and in metadata, never by separate Stripe
   accounts. A charge with missing/incomplete metadata is a bug.
4. **Build for expansion.** Two property types today, more later. Model `Property` and `Room`
   generically; property type is an enum. Adding a property/room requires zero schema change.
5. **Phase-gated execution** is governed by the `/goal` setup, not by asking mid-phase. Follow the
   floors and halt conditions above.

### Stripe Metadata Contract (every PaymentIntent, no exceptions)

```
entity:        "TRAD" | "BNP"
product_type:  "STR_WHOLE" | "COLIVING_ROOM"
property_id:   "<uuid>"
property_name: "<human readable, e.g. Old Bill Cook>"
room_id:       "<uuid>"   | null   (null for whole-property)
room_name:     "<e.g. Room 2 - Garden>" | null
room_number:   "<e.g. 2>" | null
lease_id:      "<uuid>"   | null   (null for STR nightly)
payment_kind:  "BOOKING_DEPOSIT" | "FIRST_PAYMENT" | "SCHEDULED_RENT" | "LATE_FEE" | "MANUAL_RECONCILE"
schedule_seq:  "<int>"    | null   (which scheduled payment in the lease, 1-based)
```

For a co-living lease including multiple rooms, the room fields carry the included rooms
(comma-joined where multiple). Build a single helper that constructs this metadata from a lease +
schedule row so it can never be partially populated.

### Read before writing

Before any code in any phase, read the actual repo files listed above. Mirror existing conventions
(storage abstraction, idempotent boot migrations, shared pricing math used by both client and
server). Do not design against assumptions.

---

# NINE-PHASE SPEC

## PHASE 1 — Data Model: Properties, Rooms, Leases, Payment Schedules

Schema + storage layer + Drizzle migration only. No UI, no payments.

- `properties` — id, name, type (`STR_WHOLE` | `COLIVING_ROOM`), entity (`TRAD` | `BNP`), address,
  status (`ACTIVE` | `INACTIVE`), description, base config. Generic — no hard-coded identities.
- `rooms` — id, property_id (FK), room_number, room_name, weekly_rate, status (`AVAILABLE` |
  `OCCUPIED` | `MAINTENANCE` | `INACTIVE`), description. STR properties have zero rooms.
- `leases` — id, property_id, guest_id, start_date, end_date (≤ 90 days enforced), payment_cadence
  (`WEEKLY` | `BIWEEKLY` | `MONTHLY`), weekly_rate_snapshot, total_lease_value, status (`DRAFT` |
  `PENDING_SIGNATURE` | `PENDING_FIRST_PAYMENT` | `ACTIVE` | `COMPLETED` | `TERMINATED` |
  `DEFAULTED`), signature fields (signed_name, signed_at, signed_ip, signed_pdf_url), timestamps.
- `lease_rooms` — join: lease_id, room_id, room_number_snapshot, room_name_snapshot.
- `payment_schedule` — id, lease_id, schedule_seq (1-based), due_date, amount, status (`SCHEDULED` |
  `DUE` | `PAID` | `FAILED` | `LATE` | `WAIVED`), paid_at, payment_method (`CARD_ON_FILE` |
  `MANUAL`), stripe_payment_intent_id, manual_note, timestamps. Row 1 always due on booking date.
- `late_fees` — id, lease_id, schedule_seq, accrual_date, amount (25.00), status (`ACCRUED` |
  `BILLED` | `PAID` | `WAIVED`), stripe_payment_intent_id. One row per day late.

**Cadence → schedule generation (document in code):**
- WEEKLY: every 7 days from start_date, each = weekly_rate × room count.
- BIWEEKLY: every 14 days, each = weekly_rate × 2 × room count.
- MONTHLY: every ~28 days, each = weekly_rate × 4 × room count; first month due in full on booking.
- All: schedule_seq 1 due on booking date. Final payment prorated if term doesn't divide evenly —
  document the proration rule and surface it on the lease.

**Enforce:** term ≤ 90 days; no room on two ACTIVE/PENDING leases with overlapping dates; cadence
locked at booking, immutable for the term.

## PHASE 2 — Guest-Facing Booking Flow (both product types)

Public booking UI to a "ready to pay" state. No payment processing yet.

- Dates-first availability, mirroring TRAD.
- STR path: dates → whole-property availability (direct + synced OTA) → nightly quote from
  `shared/pricing.ts`. Largely reuse the existing TRAD flow.
- Co-living path: pick property → see available rooms (photo, name, number, weekly rate) → pick
  room(s) → pick term (≤ 90 days) → pick cadence → **full payment schedule preview** (every due
  date + amount, first payment today highlighted, total, proration note), generated by a shared
  module both client and server use.
- Guest identity (first, last, email, phone) required up front. Mobile-first.

## PHASE 3 — Lease Generation + E-Signature (in-app)

Co-living only (STR nightly stays generate no lease).

- Lease document generator from an admin-editable template: guest, property, room(s), term,
  cadence, full schedule, late-fee policy ($25/day after due date, accruing), house rules.
- In-app e-signature: typed legal name + checkbox affirmation + timestamp + IP. On signing, render
  signed PDF (signature block, timestamp, IP), store it, set lease signature fields, move lease
  `DRAFT → PENDING_FIRST_PAYMENT`. Guest can re-download anytime.
- Lease cannot reach `ACTIVE` until signature complete AND first payment succeeded.

## PHASE 4 — Payments: First Payment, Saved Card, Scheduled Charges

Saved-card-on-file model with own scheduler (not Stripe Subscriptions).

- STR: payment-first, booking materializes only after Stripe confirms `succeeded`. Reuse TRAD's
  two-phase pattern.
- Co-living first payment: after signature, collect schedule_seq 1 AND save the payment method to a
  Stripe Customer (`setup_future_usage`). On success: mark row 1 PAID, set saved method on lease,
  move lease → ACTIVE, fire lifecycle.
- Every PaymentIntent carries the full Metadata Contract via the single helper.
- Scheduler — scheduled rent: extend `server/scheduler.ts`; a job (~every 15 min) finds
  `payment_schedule` rows due, status SCHEDULED/DUE, method CARD_ON_FILE, creates an off-session
  PaymentIntent against the saved card. Success → PAID; decline → FAILED → failure path (Phase 5).
- Manual payment path: MANUAL rows are NOT auto-charged; settled by an admin "Mark Paid" action
  from UO (Phase 8), writing a MANUAL_RECONCILE record with metadata + manual_note.
- Reconciliation: reuse/extend TRAD's service so every charge maps to entity/property/room/lease.

## PHASE 5 — Reminders, Failures, Late Fees, Defaults

**Reminders (per due payment, unless already paid):** 7 days before, 3 days before, day of — email
+ SMS each. Suppressed the moment payment records PAID.

**Card-on-file charge FAILURE:** flag to UO immediately (OpsIssue-style); email + SMS the guest a
payment-fix link; mark row FAILED.

**Payment not received by due date (manual-pay, or unresolved failure):** from the day after due
date, flag to UO + message the guest every day for the next 3 days (email + SMS). **Late fee
$25/day from the day after due date, accruing indefinitely** — one `late_fees` row per day,
status ACCRUED. When payment is finally made, **auto-bill accrued late fees as a separate
line-item charge** (`payment_kind = LATE_FEE`, own PaymentIntent + metadata) — never folded into rent.

**Default:** an admin-configurable threshold (unpaid + N days) moves lease → DEFAULTED and raises a
high-priority UO escalation. Threshold is a setting, not a magic number.

## PHASE 6 — Guest Portal (book, pay, sign, ask, check status)

Logged-in (tokenized like TRAD's preference links, or lightweight account) self-serve:
- View active lease(s): term, rooms, full schedule with paid/upcoming/late status, downloadable PDF.
- Make/fix a payment: pay an upcoming/late row early, update saved card, settle late fees.
- Submit questions/requests → `guest_messages` row, surfaced to UO (Phase 8), threaded.
- Check status of submitted items (open / answered / resolved).
- STR guests see booking + lifecycle status (mirrors TRAD).

## PHASE 7 — Guest Lifecycle Automation

Mirror TRAD's `bookingEmailCoordinator` spine.
- STR: reuse TRAD's lifecycle (confirmation, pre-arrival, check-in, checkout, review).
- Co-living lease activation: welcome/confirmation (guest + admin), lease + schedule recap, move-in
  info, "payment received" receipts on each successful charge, lease-ending notice (~14 days before
  end_date) with renewal option.
- All templated, variable-substituted, admin-editable, scheduler-driven.

## PHASE 8 — UO Integration: Read API + Write-Back Actions

This app exposes an authenticated API; UO's BNP module consumes it. UO reads; constrained
write-backs only.

**Read:** properties + rooms + availability; leases (schedule, signature, payment status); payments
with full metadata breakdown; guest messages; escalations raised here.

**Write-back (constrained, authenticated, idempotent):** Mark Paid (settle a MANUAL row); Approve;
Respond to guest message; Resolve issue/escalation; Waive late fee (writes WAIVED row + reason).

**Auth/transport:** service-to-service (shared secret/service token in env, named-only, nothing
committed). This app exposes; UO consumes. Map to existing UO models where they align: `BnpProperty`,
`BnpBooking`, `BnpPayment`, `BnpMaintenanceTask`; route failed-payment/default escalations into UO's
`OpsIssue`.

**SBA note:** BNP/TRAD carry no spousal-isolation constraint and no WSH/BFT data touches this app.
Add no cross-entity rollup involving federal entities here.

## PHASE 9 — Hardening, Reconciliation Report, Expansion Test

- Reconciliation report: per date range, per-entity → per-property → per-room collected totals (rent
  vs. late fees, card vs. manual), reconciled against Stripe via metadata.
- Expansion test: add a third co-living property and a fourth STR **as data only** — log in
  `/docs/build-log.md` that it required zero migration. If it didn't, rule 4 failed; fix it.
- Edge cases: lease ending mid-schedule, early termination + proration, room → maintenance
  mid-lease, charge dispute, partial manual payment.
- Idempotency audit on all scheduler jobs and write-backs (no double charges, no duplicate late fees
  on re-runs).

---

# PRE-BUILD CHECKLIST (resolve before Phase 4)

- [ ] Shared Stripe TEST keys in this app's env.
- [ ] Real inventory list: every co-living property + rooms (number, name, weekly rate, status).
- [ ] CashApp tag + Zelle handle (manual-payment instructions for co-living guests).
- [ ] Late-fee default threshold for DEFAULTED status (pick a number).
- [ ] Twilio + SendGrid/Nodemailer creds present (reused from TRAD).

---

# EXECUTION NOTE

Phases 1–3 and 6–9 run autonomously under `/goal` conditions. **Phases 4 and 5 are run manually with
human review gates** — they are the only phases that move real money, save payment credentials, and
accrue charges. Do not self-advance through 4 or 5. Keep `/docs/build-log.md` current throughout; it
is the memory that lets any future session resume.


---

## Build Tracker
- Project: BNP
- Repo / Location: beniceproperties (branch: main)
This repo follows the global Build Tracker Protocol. Tag all tickets with the Project above; do not re-ask.

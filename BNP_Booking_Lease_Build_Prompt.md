# BNP Booking + Lease + Payment Platform — Claude Code Build Prompt

**Target repo:** `https://github.com/paradigmepsilon/beniceproperties`
**Live:** `https://beniceproperties.vercel.app`
**Prepared:** 27 June 2026
**For:** Alex Henry
**Pattern:** Phase-gated. Agent shows a plan, waits for "go," builds one phase, logs outcome to `/docs/build-log.md`, stops. Alex passes one phase block at a time — never all phases at once.

---

## PROMPT 0 — Shared Context (re-paste at the start of every Claude Code session)

You are building out the Be Nice Properties (BNP) booking platform. BNP is the property-management arm of a multi-entity portfolio. This app is the **one-stop shop for current and potential guests** to book, pay for, sign leases on, and manage their stay across two product types:

1. **STR (whole-property short-term rental)** — e.g. TRAD (The Retreat at Douglasville), a themed date-night property. Nightly bookings. This flow already has a sibling implementation in the TRAD repo; mirror its patterns, do not reinvent.
2. **Co-living / room rental (by-the-room MTR)** — e.g. Hutchens, Old Bill Cook. A guest rents **a specific named room** in a shared house for a fixed lease term, paying on a recurring schedule.

**This is the same stack as the TRAD app** (the system you should treat as the reference implementation): React 18 + Vite + TypeScript, Wouter routing, shadcn/ui + Tailwind, TanStack Query, React Hook Form + Zod, Express API, Drizzle ORM against Neon Postgres, Stripe for payments, Nodemailer/SendGrid for email, Twilio for SMS, a background scheduler in the server process. Single codebase, single server process serving both API and built client.

### Architectural rules (non-negotiable — do not violate in any phase)

1. **BNP app owns its own data.** This app's Neon Postgres is the system of record for BNP bookings, leases, payments, and guest messages. It is **not** UO. Do not attempt to write to a UO database. (Same isolation pattern TRAD uses.)
2. **"Manage from UO" = a read API + a small set of write-back actions.** UO's BNP module reads this app's data over an authenticated API and can issue a constrained set of writes (approve, mark-paid, send-message, resolve-issue). UO is **not** the booking database. Mirror the TRAD pattern exactly.
3. **Shared Stripe account with TRAD — metadata tagging is mandatory on every charge.** TRAD and BNP share one Stripe account by design (TRAD is a subset of BNP). The entity/property/room breakout happens in **this database and in metadata**, never by separate Stripe accounts. **Every** PaymentIntent must carry metadata (see PROMPT 0 → Stripe Metadata Contract). A charge with missing/incomplete metadata is a bug.
4. **Build for expansion.** Two property types today, more later. Model `Property` and `Room` generically; never hard-code "Hutchens" or "TRAD." Property type is an enum. Adding a third co-living house or a fourth STR must require **zero schema changes** — only data rows.
5. **Phase-gated.** At the start of each phase: show the plan, list files you will touch, wait for "go." Build only that phase. Keep changes reversible and scoped. End each phase by appending an outcome entry to `/docs/build-log.md` and stopping for review.

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

For a co-living lease that includes multiple rooms, `room_id`/`room_name`/`room_number` carry the included rooms (comma-joined where multiple). This metadata is what lets BNP reconciliation answer "what did Old Bill Cook Room 2 collect this month" without manual untangling.

### Read before writing

Before producing any code in any phase, read the actual files in this repo: the existing `shared/schema.ts`, `server/routes.ts`, `server/storage.ts`, `server/scheduler.ts`, `shared/pricing.ts`, and the booking flow client code. Mirror existing conventions (storage abstraction, idempotent boot migrations, shared pricing math used by both client and server). Do not design against assumptions — read the real code first.

---

## PHASE 1 — Data Model: Properties, Rooms, Leases, Payment Schedules

**Goal:** Establish the generic, expansion-ready schema. No UI, no payments yet. Schema + storage layer + Drizzle migration only.

**Build:**

- `properties` — id, name, type (`STR_WHOLE` | `COLIVING_ROOM`), entity (`TRAD` | `BNP`), address fields, status (`ACTIVE` | `INACTIVE`), description, base config. Generic — no hard-coded property identities.
- `rooms` — id, property_id (FK), room_number, room_name, weekly_rate, status (`AVAILABLE` | `OCCUPIED` | `MAINTENANCE` | `INACTIVE`), description. Only co-living properties have rooms; STR properties have zero rooms (the whole property is the unit).
- `leases` — id, property_id, guest_id, lease term (`start_date`, `end_date`; max 3 months / 90 days enforced), `payment_cadence` (`WEEKLY` | `BIWEEKLY` | `MONTHLY`), `weekly_rate_snapshot`, `total_lease_value`, status (`DRAFT` | `PENDING_SIGNATURE` | `PENDING_FIRST_PAYMENT` | `ACTIVE` | `COMPLETED` | `TERMINATED` | `DEFAULTED`), signature fields (signed_name, signed_at, signed_ip, signed_pdf_url), created/updated.
- `lease_rooms` — join table: a lease includes one or more rooms (lease_id, room_id, room_number_snapshot, room_name_snapshot). Snapshots preserve the name/number even if the room is later renamed.
- `payment_schedule` — id, lease_id, `schedule_seq` (1-based), `due_date`, `amount`, status (`SCHEDULED` | `DUE` | `PAID` | `FAILED` | `LATE` | `WAIVED`), `paid_at`, `payment_method` (`CARD_ON_FILE` | `MANUAL`), `stripe_payment_intent_id`, `manual_note`, created/updated. **The schedule is generated from the lease term + cadence and is part of the lease.** First row (`schedule_seq = 1`) is always `due_date = booking date` (first payment due on booking).
- `late_fees` — id, lease_id, schedule_seq (the payment it attaches to), `accrual_date`, `amount` (25.00), status (`ACCRUED` | `BILLED` | `PAID` | `WAIVED`), `stripe_payment_intent_id`. One row per day late, accruing indefinitely (see Phase 5 rules).

**Cadence → schedule generation logic (document in code comments):**
- `WEEKLY`: a payment every 7 days from start_date, each = weekly_rate × room count.
- `BIWEEKLY`: every 14 days, each = weekly_rate × 2 × room count.
- `MONTHLY`: every ~28 days (4 weeks), each = weekly_rate × 4 × room count. **First month due in full on booking.**
- All cadences: `schedule_seq = 1` due on booking date. Final payment prorated if the lease term doesn't divide evenly — document the proration rule explicitly and surface it on the lease.

**Constraints to enforce in schema/storage:**
- Lease term ≤ 90 days (reject longer at the storage layer).
- A room cannot be on two `ACTIVE` or `PENDING_*` leases with overlapping date ranges (availability guard — same conflict-detection spirit as the TRAD calendar engine).
- Cadence is locked at booking; immutable for the lease term.

**Stop. Show the proposed Drizzle schema and storage methods. Wait for "go" before writing the migration. Log to `/docs/build-log.md`.**

---

## PHASE 2 — Guest-Facing Booking Flow (both product types)

**Goal:** Public booking UI. Guest can find availability and reach a "ready to pay" state. **No payment processing yet** (Phase 4).

**Build:**

- **Dates-first availability**, mirroring TRAD's flow conventions.
- **STR path:** pick dates → whole-property availability check (against direct + synced OTA, reuse TRAD's availability engine pattern) → nightly quote from `shared/pricing.ts`. This path largely mirrors the existing TRAD booking flow; reuse, don't rebuild.
- **Co-living path:** pick a property → see available **rooms** with photos, names, numbers, weekly rates → pick room(s) → pick lease term (date range, ≤ 90 days) → pick cadence (Weekly / Bi-weekly / Monthly) → see a **full payment schedule preview** (every due date and amount, first payment due today highlighted, total lease value, proration note). The schedule preview is generated by the same logic the server uses (shared module, like `pricing.ts`) so the guest sees exactly what will be charged.
- Guest identity (first, last, email, phone) required up front, same as TRAD (no nameless bookings).
- Mobile-first. Co-living and STR guests are different cohorts — keep the two flows visually distinct but on shared components.

**Stop. Show the flow structure and the shared schedule-preview module. Wait for "go." Log outcome.**

---

## PHASE 3 — Lease Generation + E-Signature (in-app)

**Goal:** Co-living guest can review and sign a lease in-app. STR bookings do not generate leases (nightly stays).

**Build:**

- Lease document generator: renders a residential-style room-rental agreement from a template, populated with guest, property, room(s), term, cadence, full payment schedule, late-fee policy ($25/day after due date, accruing), and house rules. Template stored editable (admin-configurable, like TRAD's email templates).
- **In-app e-signature** (per Alex's decision — valid under E-SIGN/UETA): typed legal name + checkbox affirmation + captured timestamp + IP. On signing, render the signed agreement to PDF (with signature block, timestamp, IP) and store it; set `signed_name`, `signed_at`, `signed_ip`, `signed_pdf_url` on the lease; move lease `DRAFT → PENDING_FIRST_PAYMENT`.
- Guest can re-download their signed lease anytime from the guest portal (Phase 6).
- Lease cannot move to `ACTIVE` until **both** signature complete **and** first payment succeeded.

**Stop. Show the lease template structure, signature capture, and PDF render approach. Wait for "go." Log outcome.**

---

## PHASE 4 — Payments: First Payment, Saved Card, Scheduled Charges

**Goal:** Money moves. Saved-card-on-file model with your own scheduler (per Alex's decision — not Stripe Subscriptions).

**Build:**

- **STR:** payment-first flow identical in spirit to TRAD — PaymentIntent with full metadata, booking materializes only after Stripe confirms `succeeded`. Reuse TRAD's two-phase pattern.
- **Co-living first payment:** after signature, collect first payment (`schedule_seq = 1`) AND **save the payment method** to a Stripe Customer (SetupIntent or PaymentIntent with `setup_future_usage`). On success: mark schedule row 1 `PAID`, set the saved payment method on the lease, move lease → `ACTIVE`, fire lifecycle (Phase 7).
- **Stripe Customer per guest**, saved card stored off-session for the lease's recurring charges.
- **Every** PaymentIntent carries the full Metadata Contract (PROMPT 0). Build a single helper that constructs metadata from a lease + schedule row so it can never be partially populated.
- **Scheduler — scheduled rent charges:** extend the existing `server/scheduler.ts`. A job runs (e.g. every 15 min) that finds `payment_schedule` rows where `due_date <= now`, status `SCHEDULED`/`DUE`, `payment_method = CARD_ON_FILE`, and creates an off-session PaymentIntent against the saved card. On success → `PAID`. On decline → `FAILED`, trigger the failure path (Phase 5).
- **Manual payment path:** co-living guests may pay by Zelle/CashApp/cash. These are **not** auto-charged. A schedule row marked `payment_method = MANUAL` is settled by an admin **"Mark Paid"** action from UO (Phase 8) — write a `MANUAL_RECONCILE` record with metadata and a `manual_note`. This is the same manual-reconciliation pattern BNP/TRAD already use.

**Reconciliation:** reuse/extend the TRAD reconciliation service so every charge maps back to entity/property/room/lease via metadata.

**Stop. Show the saved-card flow, the metadata helper, and the scheduler job. Wait for "go." Log outcome.**

---

## PHASE 5 — Payment Reminders, Failures, Late Fees, Defaults

**Goal:** The full dunning + late-fee state machine. This is where co-living economics live or die.

**Reminder schedule (per due payment, unless already paid):**
- **7 days before** due → email + SMS reminder.
- **3 days before** due → email + SMS reminder.
- **Day of** due → email + SMS reminder.
- Reminders suppressed the moment the payment is recorded `PAID`.

**On a card-on-file charge FAILURE (Stripe declines saved card):**
- Flag to UO **immediately** as an `OpsIssue`-style escalation (Phase 8 surfaces it; here, write the BNP-side record + call the UO write-back).
- Email **and** SMS the guest a **payment-fix link** (update card / retry).
- Mark schedule row `FAILED`.

**On a payment simply NOT received by due date (manual-pay guests, or unresolved failure):**
- Beginning the **day after** the due date: flag to UO + message the guest **every day for the next 3 days** (email + SMS).
- **Late fee: $25/day, beginning the day after the due date, accruing indefinitely** (per Alex — no cap). One `late_fees` row per day, status `ACCRUED`.
- When payment is finally made, **auto-bill accrued late fees as a separate line-item charge** (`payment_kind = LATE_FEE`, its own PaymentIntent with metadata). Do not fold late fees into the rent charge — keep them a distinct, separately-reconciled line.

**Default handling:** define a threshold (e.g. schedule row unpaid + N days) that moves the lease → `DEFAULTED` and raises a high-priority UO escalation. Make the threshold an admin-configurable setting, not a magic number.

**Stop. Show the state machine (states + transitions for payment_schedule and late_fees), the reminder scheduler additions, and the UO-flag calls. Wait for "go." Log outcome.**

---

## PHASE 6 — Guest Portal (book, pay, sign, ask, check status)

**Goal:** The "one-stop shop." A logged-in (tokenized, like TRAD's preference links, or lightweight account) guest can self-serve everything.

**Build:**
- View active lease(s): term, rooms, full payment schedule with paid/upcoming/late status, downloadable signed lease PDF.
- Make/fix a payment: pay an upcoming or late row early, update saved card, settle late fees.
- **Submit questions / requests** → creates a `guest_message` (or maintenance request) row, surfaced to UO for response (Phase 8). Threaded.
- **Check status** of submitted items (open / answered / resolved).
- STR guests see their booking + lifecycle status (mirrors TRAD).

**Stop. Show portal routes and the guest_messages model. Wait for "go." Log outcome.**

---

## PHASE 7 — Guest Lifecycle Automation

**Goal:** Post-booking / post-lease-activation automation, mirroring TRAD's `bookingEmailCoordinator` spine.

**Build:**
- **STR:** reuse TRAD's lifecycle (confirmation, pre-arrival, check-in, checkout, review). Don't rebuild — port the pattern.
- **Co-living lease activation:** welcome/confirmation (guest + admin), lease + schedule recap email, move-in info, recurring "payment received" receipts on each successful charge, lease-ending notice (e.g. 14 days before `end_date`) with renewal option.
- All templated, variable-substituted, admin-editable (TRAD pattern). Scheduler-driven sends from a `email_sends`-equivalent table.

**Stop. Show lifecycle events and templates. Wait for "go." Log outcome.**

---

## PHASE 8 — UO Integration: Read API + Write-Back Actions

**Goal:** "Manage from UO." This app exposes an authenticated API; UO's BNP module consumes it. **Same direction and auth model as the TRAD/Integration Contract pattern: UO reads this app; constrained write-backs only.**

**Read endpoints (UO BNP module consumes):**
- Properties + rooms + availability.
- Leases (with schedule, signature status, payment status).
- Payments (scheduled, paid, failed, late) with full metadata breakdown (entity / property / room / lease) — this is what powers per-property, per-room BNP economics in UO.
- Guest messages / requests.
- Escalations raised by this app (failed payments, defaults).

**Write-back actions (constrained, authenticated, idempotent):**
- **Mark Paid** — settle a `MANUAL` schedule row (Zelle/CashApp/cash), annotated on UO, writes `MANUAL_RECONCILE` + `manual_note` here.
- **Approve** — e.g. approve a draft lease or a pending action.
- **Respond to guest message** — UO posts an answer to a guest's question/request; surfaces in the guest portal.
- **Resolve issue / escalation.**
- **Waive late fee** — admin override, writes a `WAIVED` late_fees row with reason.

**Auth & transport:** authenticated service-to-service (shared secret / service token in env, named-only, nothing committed), mirroring the existing Integration Contract conventions. This app exposes; UO consumes. Map to the existing UO BNP models where they align: `BnpProperty`, `BnpBooking`, `BnpPayment`, `BnpMaintenanceTask`, and route failed-payment/default escalations into UO's `OpsIssue`.

**SBA note (carry-through):** BNP/TRAD are not WSH/BFT and carry no spousal-isolation constraint. No WSH/BFT data touches this app. Do not add any cross-entity rollup involving federal entities here.

**Stop. Show the API surface (routes, payloads, auth) and the UO model mapping. Wait for "go." Log outcome.**

---

## PHASE 9 — Hardening, Reconciliation Report, Expansion Test

**Goal:** Prove the foundation is expansion-ready and the money ties out.

**Build:**
- **Reconciliation report:** given a date range, produce per-entity → per-property → per-room collected totals (rent vs. late fees, card vs. manual), reconciled against Stripe via metadata. This is the report that answers "what did OBC Room 2 collect this month."
- **Expansion test:** add a third co-living property and a fourth STR **as data only** (no code/schema change). Document in `/docs/build-log.md` that it required zero migration — if it didn't, the model failed rule 4 and must be fixed.
- Edge cases: lease ending mid-schedule, early termination + proration, room moved to maintenance mid-lease, guest disputing a charge, partial manual payment.
- Idempotency audit on all scheduler jobs and write-backs (no double charges, no duplicate late fees on scheduler re-runs).

**Stop. Final log entry. Summarize what's live vs. deferred.**

---

## Pre-Build Checklist (Alex resolves before Phase 4)

These are real-world inputs the code can't invent — needed by the payment phase, not before:

- [ ] Confirm shared Stripe account API keys available to this app's env.
- [ ] **Real inventory list:** every co-living property, its rooms (number, name, weekly rate, status). Needed to seed `properties`/`rooms`.
- [ ] CashApp tag + Zelle handle (for manual-payment instructions shown to co-living guests).
- [ ] Late-fee default threshold for `DEFAULTED` status (Phase 5) — pick a number.
- [ ] Confirm Twilio + SendGrid/Nodemailer creds present (reused from TRAD pattern).

---

## Sequencing note for Alex

This is a multi-phase build, not a weekend. Phases 1–4 get you to "a co-living guest can book, sign, and pay first month." Phases 5–8 are what make it operationally real (dunning, portal, UO management). Phase 9 proves the foundation. Pass one phase block at a time; review the plan before each writes code. Respect the capacity ceiling — this is an Alex-led build and competes with everything else in the Active slot.

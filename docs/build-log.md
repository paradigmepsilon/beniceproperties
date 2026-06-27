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

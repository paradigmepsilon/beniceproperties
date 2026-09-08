# UO-managed BNP pricing and property details — design

**Date:** 2026-09-08 · **Company:** bnp · **Repos:** `Websites/BNP` (ships first), `Unified Ops Folder/Unified-Ops` (ships second)
**Status:** draft for owner review

## Goal

Unified Ops (UO) is the primary place BNP property details and prices are edited. Every price the
BNP site charges must be editable from UO, and an edit must show on the site immediately.

## Decisions already made (owner, 2026-09-08)

1. **Direction:** BNP's Neon database stays the single system of record. UO edits it; the site
   reads its own database, so there is no sync job and no second copy of prices.
2. **Write path:** UO's price and detail edits go through BNP's authenticated `/api/uo/*` service
   API as new write-backs, not through UO's direct Drizzle connection to the BNP database.
3. **Code-constant prices become settings:** the late fee per day ($25) and the card surcharge
   rate (3.5%) move to BNP `app_settings`, editable from UO.
4. **UO surface:** per-listing prices stay on the existing Pricing tab in the listing detail sheet
   of the BNP Inventory page (Overview · Pricing · Access · History). No new page and no moved
   fields. Site-wide pricing settings (late fee, card surcharge) are edited on the existing BNP
   Site Settings page and shown read-only on each listing's Pricing tab with a link.

## Why the write path changes

Today UO's Pricing tab writes rate columns straight into the BNP database through a hand-written
schema mirror (`src/lib/bnp-db.ts`). BNP added `biweekly_rate` on 2026-09-08 and UO has no
knowledge of it: the mirror, the input types, the inventory shaping and the Pricing tab all miss
it. Nothing detects that drift. Moving writes onto BNP's API means BNP's own Zod insert schemas
validate every field, BNP attributes the change to the UO actor, and a new BNP price field is a
one-line label change in UO rather than a four-file mirror update. Reads stay on the mirror (UO's
documented division of labour) and gain a drift check.

## Current state (verified 2026-09-08)

- BNP `/api/uo/*` is live in production behind `UO_BNP_API_TOKEN` (unauthenticated GET returns 401,
  not 503). UO has `BNP_API_URL` and `BNP_API_TOKEN` set.
- BNP exposes reads (`properties`, `leases`, `payments`, `escalations`, `reconciliation`,
  `booking-intents`, messaging, blocks, calendar) and write-backs (`mark-paid`, `approve`,
  `respond`, `resolve`, `waive-late-fee`, booking `confirm`/`cancel`, blocks, calendar refresh,
  `settings/guest-auto-notifications`). **No property or room write-back exists.**
  `GET /api/uo/properties` returns only id, name, entity, type, location, active, and per-room
  id, name, roomNumber, weeklyRent, status.
- BNP admin already accepts any column via `insertPropertySchema.partial()` and
  `insertRoomSchema.partial()` on `PATCH /api/admin/properties/:id` and `/api/admin/rooms/:id`.
- Price columns: properties `base_price, cleaning_fee, daily_rate, weekly_rate, biweekly_rate,
  monthly_rate, down_payment, mon_price … sun_price`; rooms `weekly_rent, deposit_amount,
  cleaning_fee, daily_rate, biweekly_rate, monthly_rate`.
- Constants: `LATE_FEE_PER_DAY = 25.0` (`shared/schema.ts`), used by `server/lib/dunning.ts`
  (accrual amount + guest message copy) and `server/lib/leaseDocument.ts` (clause 5 token).
  `CREDIT_CARD_RATE = 0.035` (`shared/pricing.ts`), used by `calculateBreakdown`, `server/lib/stripe.ts`
  (weekly subscription checkout), and as literal "3.5%" copy in `server/lib/booking.ts` (quote line
  label), `server/lib/leaseDocument.ts` (clause 7), and client `checkout.tsx`, `lease-booking.tsx`,
  `portal.tsx`.
- Leases already snapshot `deposit_amount_snapshot` and `cleaning_fee_snapshot` at creation "so a
  later re-price never changes a signed lease."
- UO: `src/lib/bnp/api-client.ts` (`bnpApi`, `bnpApiConfigured`, `BnpApiError`), proxy routes under
  `src/app/api/bnp-admin/*` with `withModuleAccess` + `runBnp` + `createAuditLog`, detail sheet in
  `src/components/bnp/admin/bnp-inventory-admin.tsx` (Pricing tab ~L1464-1587, `saveDetail`
  ~L1199), write helper `updateInventoryDetail` in `src/lib/bnp/inventory.ts`, TRAD-only schema
  drift checker `scripts/check-trad-schema.ts` (`npm run trad:schema:check`). UO tree is clean at
  `4a1d7c3`.

## Design

### Part A — BNP: property and room write-backs

**Routes** (all `requireServiceToken`, all in the `/api/uo` block of `server/routes.ts`):

| Route | Body | Behaviour |
|---|---|---|
| `GET /api/uo/properties` | — | **Shape change:** return full `Property` rows with full `Room` rows nested (`rooms: []` for non-COLIVING). UO does not consume this route today, so the change breaks nothing. |
| `PATCH /api/uo/properties/:id` | `{ actor: string, patch: Partial<InsertProperty> }` | Validate `patch` with `insertPropertySchema.partial()`. Reject an empty patch (400). 404 if missing. Returns the updated row. |
| `PATCH /api/uo/rooms/:id` | `{ actor: string, patch: Partial<InsertRoom> }` | Same, with `insertRoomSchema.partial()`. |
| `POST /api/uo/properties` | `{ actor, property: InsertProperty }` | Same validation as the admin create. 201. |
| `POST /api/uo/properties/:id/rooms` | `{ actor, room: Omit<InsertRoom,"propertyId"> }` | 400 unless the parent is COLIVING. 201. |

**Implementation** — new functions in `server/lib/uoApi.ts`: `updateProperty`, `updateRoom`,
`createProperty`, `createRoom`, each thin over `storage.*` and each writing one server log line
tagged `uo` naming the actor and the changed keys (values are not logged; the iCal URL is
secret-ish). `actor` is required and non-empty like the other write-backs. The Zod schemas are the
same objects the admin routes use, so admin and UO can never accept different field sets.

The `propertyId` of a room and the `entity` of a property are accepted by the schema today. Leave
that as-is (admin already allows it); UO's UI never sends them.

### Part B — BNP: late fee and card surcharge as settings

**Setting keys** (declared in the shared-keys block of `shared/schema.ts` next to
`GUEST_AUTO_NOTIFICATIONS_SETTING`):

- `late_fee_per_day` — dollars, decimal string. Fallback `DEFAULT_LATE_FEE_PER_DAY = 25`.
- `card_surcharge_rate` — fraction, e.g. `"0.035"`. Fallback `DEFAULT_CREDIT_CARD_RATE = 0.035`.

Rename the constants to `DEFAULT_*`. `CREDIT_CARD_RATE` stays exported as an alias of the default
so the client keeps compiling; the client stops using it for display (see below).

**Reader** — new `server/lib/pricingSettings.ts` with `getLateFeePerDay()` and
`getCardSurchargeRate()` returning numbers via `storage.getSettingNumber(key, fallback)`, plus
`getPricingSettings()` returning both. Validation on write: late fee `0 ≤ x ≤ 500`, surcharge
`0 ≤ x ≤ 0.10`. No caching; `app_settings` is a primary-key lookup.

**Routes** — one handler pair mounted twice, mirroring `mountMessagingRoutes`:
`GET/PUT /api/uo/settings/pricing` (service token, `actor` in body/query) and
`GET/PUT /api/admin/settings/pricing` (admin session). Body `{ lateFeePerDay?: number,
cardSurchargeRate?: number, actor }`; either field may be omitted. Response
`{ lateFeePerDay, cardSurchargeRate }`. Log the change with actor.

**Public config** — `GET /api/payments/config` gains `cardSurchargeRate` so the client renders the
real percentage instead of the literal "3.5%".

**Lease snapshots (contract integrity)** — two new nullable columns on `leases`:
`late_fee_per_day_snapshot numeric(10,2)` and `card_surcharge_rate_snapshot numeric(6,4)`. Set at
lease creation in `server/lib/leaseFlow.ts` from the current settings. Every later read of either
value for an existing lease uses `lease.snapshot ?? currentSetting`, so a changed setting applies
to new leases only and never alters what a signed agreement says. Null on old leases resolves to
the current setting, which equals today's constants until someone changes them.

**Call-site changes:**

- `shared/pricing.ts` — `calculateBreakdown` gains optional `surchargeRate` (default
  `DEFAULT_CREDIT_CARD_RATE`). Pure function, still shared.
- `server/lib/booking.ts` `buildQuote` — accepts `surchargeRate`; the quote line label formats
  the real percentage. Callers fetch the rate once via `getCardSurchargeRate()`.
- `server/lib/leasePayments.ts` and `server/lib/portal.ts` `chargeTotalFor` — take the lease and
  use `lease.cardSurchargeRateSnapshot ?? await getCardSurchargeRate()`.
- `server/lib/stripe.ts` `createWeeklySubscriptionCheckout` — accepts `surchargeRate`.
- `server/lib/dunning.ts` — accrual amount and message copy use
  `lease.lateFeePerDaySnapshot ?? await getLateFeePerDay()`.
- `server/lib/leaseDocument.ts` — `tokenMap` takes `lateFeePerDay` and `cardSurchargePct` from
  `LeaseDocData` (filled from the lease snapshots by the caller); clause 7's literal "3.5%" becomes
  `{{cardSurchargePct}}`.
- Client `checkout.tsx`, `lease-booking.tsx`, `portal.tsx` — read `cardSurchargeRate` from
  `/api/payments/config` (already fetched where Stripe is enabled) and format it; fall back to the
  default when the config has not loaded.

**Migration** — `scripts/push-pricing-snapshots.mjs`, additive and idempotent
(`ADD COLUMN IF NOT EXISTS` ×2), same shape as `push-biweekly-rate.mjs`. No destructive change, so
no `/docs/migration-backups/` export is required. **Owner runs it against production before the
BNP deploy** (the session classifier blocks production writes). The order matters: Drizzle
`select()` on `leases` fails if the columns are absent, so the deploy that ships this code must
follow the migration. The build-log entry records both steps.

### Part C — UO: consume the new write-backs

- `src/lib/bnp/api-client.ts` — unchanged; add typed helpers in a new
  `src/lib/bnp/inventory-api.ts`: `patchProperty(id, patch, actor)`, `patchRoom(id, patch, actor)`,
  `getPricingSettings(actor)`, `putPricingSettings(values, actor)`.
- `src/lib/bnp/inventory.ts` `updateInventoryDetail(scope, id, patch, actor)` — call the API
  instead of `updateProperty`/`updateRoom`. Keep the room `address` strip (UO rule: rooms inherit
  the property address). When `bnpApiConfigured()` is false, throw `BnpApiError(503)` so the
  sheet's toast says "Connect BNP API" rather than silently writing nothing.
- `src/app/api/bnp-admin/inventory/[id]/route.ts` PATCH — pass `authResult.user.email` as actor;
  add `rejectNonBnpBusinessCode` and pin `BNP_BUSINESS_CODE` (the route currently reads
  `businessCode` from the query, the privilege-selector bug already fixed elsewhere). Audit log
  unchanged.
- Creates and Airbnb-assign flows (`createProperty`, `createRoom`, `assignListingAs*`,
  soft/hard/cascade delete) **stay on the direct-DB path** in this change. They are listed under
  follow-ups; the detail-sheet save is the path that carries prices.

### Part D — UO: mirror hygiene and the missing fields

- `src/lib/bnp-db.ts` — add `biweeklyRate` to `properties` and `rooms`, `cleaningFee` to `rooms`.
  Update the stale comment that says day/week/month rates are "not yet wired into billing."
- `scripts/check-bnp-schema.ts` + `npm run bnp:schema:check` — extract the comparison core of
  `check-trad-schema.ts` into `scripts/lib/check-schema-mirror.ts` (parametrised by mirror module,
  db handle, env var name) and make both checkers thin wrappers. Exit 1 on drift; `--allow-skip`
  when the URL is absent. Run it once locally against the live BNP DB (read-only
  `information_schema` query) and record the result.
- `src/lib/bnp/inventory.ts` types and `listBnpInventory` shaping — add `biweeklyRate` to
  `InventoryProperty` and `InventoryRoom`, `cleaningFee` to `InventoryRoom`.
- `src/lib/bnp-admin/properties.ts` `PropertyInput`/`RoomInput` — add the same fields (still used
  by the create paths).
- `bnp-inventory-admin.tsx` Pricing tab — add a **Biweekly** input to the rate row for both scopes
  (property `biweeklyRate`, room `biweeklyRate`), a **Cleaning fee** input for rooms, load them in
  the `setDetail` effect, and replace the stale helper copy with the cascade rule: "Stays are
  priced by cascading tiers, monthly, then biweekly, then weekly, then daily, using each tier's
  rate; a blank tier falls back to the next shorter one."
- Same tab, below the per-listing fields: a small read-only **"Applies to all listings"** block
  showing the current late fee per day and card surcharge rate (fetched once per sheet open from
  the UO pricing-settings route in Part E), with a link to the Site Settings page where they are
  edited. Owner decision 2026-09-08: per-listing prices are edited here; site-wide values are
  edited on Site Settings and only displayed here. When the BNP API is not configured the block
  shows "Connect BNP API" instead of values.

### Part E — UO: site-wide pricing settings

- New proxy route `src/app/api/bnp-admin/pricing-settings/route.ts` (GET, PUT) following the
  `calendar/route.ts` pattern: `rejectNonBnpBusinessCode`, `withModuleAccess(BNP, "FINANCES",
  READ|WRITE)`, `runBnp`, `bnpApi` to `/api/uo/settings/pricing`, `createAuditLog` with
  `entityType: "BnpSetting"`, `entityId: "pricing"`, `after: { lateFeePerDay, cardSurchargeRate }`.
  GET returns `{ configured: false }` when the API is not configured.
- `bnp-site-settings-admin.tsx` — add a "Pricing" card under the page toggles with two inputs
  (late fee $/day, card surcharge %), a Save button, and a one-line note: "Applies to new leases
  and quotes. Signed leases keep the rates they were signed under."

## Data flow after the change

```
UO detail sheet ──PATCH /api/bnp-admin/inventory/:id──▶ UO route (session, audit)
   └─▶ bnpApi PATCH /api/uo/properties/:id | /api/uo/rooms/:id  {actor, patch}
         └─▶ BNP requireServiceToken → Zod partial schema → storage.update* → BNP Neon
BNP site reads BNP Neon directly; the next quote uses the new rates.
UO inventory list still reads BNP Neon via the mirror (bnp:schema:check guards it).
```

## Error handling

- BNP: invalid patch → 400 with the first Zod message (same as admin). Unknown id → 404. Empty
  patch → 400. Token unset → 503 (fail closed, existing). All surfaced through UO's `runBnp`, which
  mirrors the upstream status.
- UO: API unconfigured → 503 "BNP API is not configured" toast, no silent no-op.
- Settings out of range → 400 with the range in the message.

## Testing

BNP (vitest, currently 593 green):
- `uoApi.test.ts` — update/create property and room: happy path, 404, empty patch rejected,
  invalid field rejected, actor required, log line names keys not values.
- `pricingSettings.test.ts` — fallbacks when unset, range validation.
- `pricing.test.ts` — `calculateBreakdown` honours `surchargeRate`; default unchanged.
- `dunning.test.ts` — accrual uses the lease snapshot when present, the setting when null.
- `leaseDocument.test.ts` — clause 5 and 7 render the passed values.
- `leaseFlow` test — new lease carries both snapshots.
- `tsc`, `vitest run`, `npm run build`, `npm run build:api`.

UO (vitest + eslint + tsc):
- `inventory.test.ts` — `updateInventoryDetail` calls the API with the actor and strips room
  address; throws 503 when unconfigured.
- `pricing-settings` route test — proxies and audits.
- `npm run typecheck`, `npm run lint`, `npm test`, `npm run bnp:schema:check` (against the live
  BNP DB, read-only).

## Deploy order and owner steps

1. Merge and deploy BNP after the owner runs `node scripts/push-pricing-snapshots.mjs` against
   production (additive; safe to re-run).
2. Deploy UO. No UO Prisma migration in this change.
3. Verify: edit a biweekly rate on a room in UO, confirm the site's quote for a 14-night stay on
   that room reflects it; change the surcharge to a test value and back, confirm a fresh STR quote
   label updates.

## Legal/tax flag

Making the late fee and surcharge editable means a future edit changes what new guests are
charged. The snapshots keep already-signed leases on their original terms. Whether the late fee
amount itself or a surcharge above processor cost is permissible in a given jurisdiction is a
legal question this change does not answer; flagging it, not assuming.

## Out of scope / follow-ups

- Moving UO's create, Airbnb-assign, and delete flows for properties and rooms onto the BNP API.
- Rate-change history (BNA's `BnaMovementRate` pattern) — not requested; lease snapshots cover the
  contract-integrity need.
- Seasonal or date-range pricing.
- Retiring UO's direct-DB reads of the BNP database.
- A pricing editor in the BNP site's own admin dashboard beyond the biweekly field already added.

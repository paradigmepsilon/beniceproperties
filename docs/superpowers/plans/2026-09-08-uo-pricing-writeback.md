# UO-Managed BNP Pricing Write-Back Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Unified Ops the primary editor of BNP property, room and pricing data by adding property/room write-backs and editable late-fee / card-surcharge settings to BNP's `/api/uo/*` API, then pointing UO's existing Pricing tab and Site Settings page at them.

**Architecture:** BNP's Neon database stays the system of record. BNP exposes new service-token routes (PATCH/POST property and room, GET/PUT pricing settings) validated by the same Zod insert schemas its admin uses; the late fee and card surcharge move from code constants to `app_settings` with per-lease snapshots so signed leases keep their terms. UO's detail-sheet save and a new Site Settings card call those routes through UO's existing `bnpApi` client and session-authenticated proxy routes; UO's Drizzle mirror gains the missing columns and a drift check.

**Tech Stack:** BNP: Express, Drizzle (Neon Postgres), Zod, vitest, esbuild api bundle. UO: Next.js 16 App Router, Drizzle mirror (`src/lib/bnp-db.ts`), vitest, eslint, tsc.

**Spec:** `/Users/alexhenry/Projects/Websites/BNP/docs/superpowers/specs/2026-09-08-uo-pricing-writeback-design.md`

## Global Constraints

- Two repos. BNP tasks (1–8) run in `/Users/alexhenry/Projects/Websites/BNP`. UO tasks (9–15) run in `/Users/alexhenry/Projects/Unified Ops Folder/Unified-Ops`. Every command below is prefixed with the repo it runs in.
- **Do not commit or push unless Alex has authorised it in this session.** Alex's global rules require asking before committing. If authorised, commit per task on a feature branch (`feat/uo-pricing-writeback` in each repo); otherwise leave the tree staged and stop at the commit step.
- **Stripe TEST keys only. Never a live charge.** Local BNP `.env` points at production Neon and LIVE Stripe (memory `bnp-deconfliction-branch-pending-ops`). Never start the scheduler locally, never open `/checkout`, never run any script that writes to the database. Unit tests mock storage.
- **No production writes from this session.** The migration script is written here and run by Alex. The classifier blocks prod DB writes, `vercel env`, and reading `.env` values.
- **No hard-coded property or room identities** in logic. Properties and rooms are data.
- **Never log secret values.** Property and room patches may include `airbnbIcalUrl`; log changed key names only.
- Setting keys (exact): `late_fee_per_day`, `card_surcharge_rate`. Defaults: `25` and `0.035`. Validation ranges: late fee `0..500`, surcharge `0..0.10`.
- New lease columns (exact): `late_fee_per_day_snapshot numeric(10,2)`, `card_surcharge_rate_snapshot numeric(6,4)`, both nullable.
- Every UO write-back body carries `actor` (the signed-in UO user's email); BNP requires it non-empty and logs it as `uo:<actor>`.
- UO helper copy for the Pricing tab (exact): "Stays are priced by cascading tiers, monthly, then biweekly, then weekly, then daily, using each tier's rate; a blank tier falls back to the next shorter one."
- UO Site Settings note (exact): "Applies to new leases and quotes. Signed leases keep the rates they were signed under."
- Deploy order: Alex runs `node scripts/push-pricing-snapshots.mjs` against production, then BNP deploys, then UO deploys. Record both in the build-log.
- BNP suite baseline: `npx vitest run` → 593 tests green, `npx tsc` clean. UO baseline: `npm run typecheck`, `npm run lint`, `npm test` all clean at `4a1d7c3`. Re-run the relevant one after every task.

---

## File map

**BNP — create**
- `server/lib/pricingSettings.ts` — read/write the two settings; per-lease resolvers.
- `server/lib/pricingSettings.test.ts`
- `scripts/push-pricing-snapshots.mjs` — additive migration for the two lease columns.
- `client/src/lib/usePricingConfig.ts` — client hook over `GET /api/payments/config`.

**BNP — modify**
- `shared/schema.ts` — setting keys, `DEFAULT_LATE_FEE_PER_DAY`, two lease columns.
- `shared/pricing.ts` — `DEFAULT_CREDIT_CARD_RATE`, `surchargeRate` param, `formatSurchargePct`.
- `shared/pricing.test.ts`
- `server/lib/uoApi.ts` (+ `.test.ts`) — property/room write-backs, fuller GET.
- `server/routes.ts` — new `/api/uo/*` and `/api/admin/settings/pricing` routes; quote routes fetch the rate; `/api/payments/config` gains `cardSurchargeRate`.
- `server/lib/booking.ts` (+ `.test.ts`) — `buildQuote` takes `surchargeRate`.
- `server/lib/leasePayments.ts`, `server/lib/portal.ts` (+ tests) — `chargeTotalFor(lease, base)`.
- `server/lib/stripe.ts` — `createWeeklySubscriptionCheckout` takes `surchargeRate`.
- `server/lib/dunning.ts` (+ `.test.ts`) — late fee from lease snapshot or setting; copy uses real values.
- `server/lib/leaseDocument.ts` (+ `.test.ts`) — `LeaseDocData` gains `lateFeePerDay`, `cardSurchargeRate`; clause 7 tokenised.
- `server/lib/leaseFlow.ts` (+ `.test.ts`) — snapshots at creation; doc data filled from snapshots.
- `client/src/pages/checkout.tsx`, `client/src/pages/lease-booking.tsx`, `client/src/pages/portal.tsx` — replace literal "3.5%".
- `.env.example` — comment noting the two new settings.
- `docs/build-log.md` — entry.
- `api/**` — rebuilt bundle (committed artefact).

**UO — create**
- `scripts/lib/check-schema-mirror.ts` — shared drift checker core.
- `scripts/check-bnp-schema.ts` — BNP wrapper.
- `src/lib/bnp/inventory-api.ts` (+ `.test.ts`) — typed helpers over `bnpApi`.
- `src/lib/bnp/inventory.test.ts` — `updateInventoryDetail` via API.
- `src/app/api/bnp-admin/pricing-settings/route.ts` + `tests/routes/bnp-pricing-settings.test.ts`.

**UO — modify**
- `scripts/check-trad-schema.ts` — becomes a thin wrapper.
- `package.json` — `bnp:schema:check` script.
- `src/lib/bnp-db.ts` — `biweeklyRate` (properties, rooms), `cleaningFee` (rooms); comment fix.
- `src/lib/bnp-admin/properties.ts` — `PropertyInput`/`RoomInput` fields.
- `src/lib/bnp/inventory.ts` — types, shaping, `updateInventoryDetail(scope, id, patch, actor)`.
- `src/app/api/bnp-admin/inventory/[id]/route.ts` — actor, BNP pin.
- `src/components/bnp/admin/bnp-inventory-admin.tsx` — Pricing tab fields, copy, read-only global block.
- `src/components/bnp/admin/bnp-site-settings-admin.tsx` — Pricing card.
- `docs/system_map.md`, `.env.example` — notes.

---

## BNP

### Task 1: Pricing settings module and shared constants

**Files:**
- Modify: `shared/schema.ts:257-258` (replace `LATE_FEE_PER_DAY`), `shared/schema.ts:1134-1141` (setting keys block)
- Modify: `shared/pricing.ts:20-38, 44-58, 96-124`
- Create: `server/lib/pricingSettings.ts`
- Test: `server/lib/pricingSettings.test.ts`, `shared/pricing.test.ts`

**Interfaces:**
- Produces (`shared/schema.ts`): `DEFAULT_LATE_FEE_PER_DAY = 25.0`, `LATE_FEE_PER_DAY_SETTING = "late_fee_per_day"`, `CARD_SURCHARGE_RATE_SETTING = "card_surcharge_rate"`. `LATE_FEE_PER_DAY` is removed (its two users are rewired in Task 5).
- Produces (`shared/pricing.ts`): `DEFAULT_CREDIT_CARD_RATE = 0.035`; `CREDIT_CARD_RATE` kept as an alias; `BreakdownInput.surchargeRate?: number`; `formatSurchargePct(rate: number): string` ("3.5%").
- Produces (`server/lib/pricingSettings.ts`):
  ```ts
  export interface PricingSettings { lateFeePerDay: number; cardSurchargeRate: number }
  export const pricingSettingsInputSchema: z.ZodType<{ lateFeePerDay?: number; cardSurchargeRate?: number }>
  export async function getLateFeePerDay(): Promise<number>
  export async function getCardSurchargeRate(): Promise<number>
  export async function getPricingSettings(): Promise<PricingSettings>
  export async function updatePricingSettings(input: { lateFeePerDay?: number; cardSurchargeRate?: number }, actor: string): Promise<PricingSettings>
  export function leaseLateFeePerDay(lease: { lateFeePerDaySnapshot: string | null }, fallback: number): number
  export function leaseCardSurchargeRate(lease: { cardSurchargeRateSnapshot: string | null }, fallback: number): number
  ```
  (The two lease fields are added to the schema in Task 3; until then the resolver types are structural and compile on their own.)

- [ ] **Step 1: Write the failing tests**

`server/lib/pricingSettings.test.ts`:
```ts
// server/lib/pricingSettings.test.ts
// Late fee + card surcharge as admin-editable settings (2026-09-08). Locks the
// fallbacks, the write validation ranges, and the per-lease snapshot-first rule.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getSettingNumber: vi.fn(),
  setSetting: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import {
  getLateFeePerDay,
  getCardSurchargeRate,
  getPricingSettings,
  updatePricingSettings,
  leaseLateFeePerDay,
  leaseCardSurchargeRate,
} from "./pricingSettings";
import { LeaseError } from "./lease";

beforeEach(() => {
  vi.clearAllMocks();
  // storage.getSettingNumber(key, fallback) returns the fallback when unset.
  mockStorage.getSettingNumber.mockImplementation(async (_k: string, fb: number) => fb);
  mockStorage.setSetting.mockResolvedValue(undefined);
});

describe("readers", () => {
  it("fall back to $25/day and 3.5% when nothing is stored", async () => {
    expect(await getLateFeePerDay()).toBe(25);
    expect(await getCardSurchargeRate()).toBe(0.035);
    expect(await getPricingSettings()).toEqual({ lateFeePerDay: 25, cardSurchargeRate: 0.035 });
  });
  it("read the stored value by the shared key", async () => {
    mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
      k === "late_fee_per_day" ? 40 : k === "card_surcharge_rate" ? 0.03 : fb,
    );
    expect(await getPricingSettings()).toEqual({ lateFeePerDay: 40, cardSurchargeRate: 0.03 });
  });
});

describe("updatePricingSettings", () => {
  it("writes only the provided fields and returns the refreshed pair", async () => {
    const out = await updatePricingSettings({ lateFeePerDay: 30 }, "alex@example.com");
    expect(mockStorage.setSetting).toHaveBeenCalledTimes(1);
    expect(mockStorage.setSetting).toHaveBeenCalledWith("late_fee_per_day", "30");
    expect(out.cardSurchargeRate).toBe(0.035);
  });
  it("stores the surcharge as a decimal fraction string", async () => {
    await updatePricingSettings({ cardSurchargeRate: 0.029 }, "alex@example.com");
    expect(mockStorage.setSetting).toHaveBeenCalledWith("card_surcharge_rate", "0.029");
  });
  it("rejects out-of-range values and an empty body", async () => {
    await expect(updatePricingSettings({ lateFeePerDay: -1 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({ lateFeePerDay: 501 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({ cardSurchargeRate: 0.2 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({}, "a")).rejects.toBeInstanceOf(LeaseError);
    expect(mockStorage.setSetting).not.toHaveBeenCalled();
  });
  it("requires an actor", async () => {
    await expect(updatePricingSettings({ lateFeePerDay: 30 }, "")).rejects.toBeInstanceOf(LeaseError);
  });
});

describe("per-lease resolvers", () => {
  it("prefer the lease snapshot, else the fallback", () => {
    expect(leaseLateFeePerDay({ lateFeePerDaySnapshot: "20.00" }, 25)).toBe(20);
    expect(leaseLateFeePerDay({ lateFeePerDaySnapshot: null }, 25)).toBe(25);
    expect(leaseCardSurchargeRate({ cardSurchargeRateSnapshot: "0.0300" }, 0.035)).toBe(0.03);
    expect(leaseCardSurchargeRate({ cardSurchargeRateSnapshot: null }, 0.035)).toBe(0.035);
  });
});
```

Append to `shared/pricing.test.ts`:
```ts
import { DEFAULT_CREDIT_CARD_RATE, formatSurchargePct } from "./pricing";

describe("surchargeRate override", () => {
  it("defaults to 3.5% and honours an explicit rate", () => {
    expect(DEFAULT_CREDIT_CARD_RATE).toBe(0.035);
    const b = calculateBreakdown({ baseAmount: 100, paymentMethod: "STRIPE", surchargeRate: 0.03 });
    expect(b.surcharge).toBe(3);
    expect(b.total).toBe(103);
  });
  it("still charges nothing for CashApp/Zelle whatever the rate", () => {
    const b = calculateBreakdown({ baseAmount: 100, paymentMethod: "ZELLE", surchargeRate: 0.05 });
    expect(b.surcharge).toBe(0);
  });
});

describe("formatSurchargePct", () => {
  it("renders whole and fractional percents without trailing zeros", () => {
    expect(formatSurchargePct(0.035)).toBe("3.5%");
    expect(formatSurchargePct(0.03)).toBe("3%");
    expect(formatSurchargePct(0.0299)).toBe("2.99%");
    expect(formatSurchargePct(0)).toBe("0%");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run (BNP): `npx vitest run server/lib/pricingSettings.test.ts shared/pricing.test.ts`
Expected: FAIL — `./pricingSettings` not found; `formatSurchargePct` / `DEFAULT_CREDIT_CARD_RATE` not exported.

- [ ] **Step 3: Update `shared/schema.ts`**

Replace lines 257-258:
```ts
/**
 * Default flat daily late fee, in dollars (spec: $25/day, no cap). Admin-editable
 * since 2026-09-08 via app_settings `late_fee_per_day`; this is only the
 * fallback. Each lease snapshots the value in force when it was created
 * (leases.late_fee_per_day_snapshot) so a later edit never changes a signed lease.
 */
export const DEFAULT_LATE_FEE_PER_DAY = 25.0;
```

In the shared-keys block (after `GUEST_AUTO_NOTIFICATIONS_SETTING`, ~line 1141) add:
```ts
/** Flat daily late fee in dollars (decimal string). Fallback DEFAULT_LATE_FEE_PER_DAY. */
export const LATE_FEE_PER_DAY_SETTING = "late_fee_per_day";
/** Card surcharge as a fraction, e.g. "0.035". Fallback DEFAULT_CREDIT_CARD_RATE (shared/pricing.ts). */
export const CARD_SURCHARGE_RATE_SETTING = "card_surcharge_rate";
```

- [ ] **Step 4: Update `shared/pricing.ts`**

Replace the `CREDIT_CARD_RATE` block (lines 20-27):
```ts
/**
 * Default Stripe processing surcharge, ADDED to the guest's total as a visible
 * line item for STRIPE payments only. 3.5% flat (matches TRAD). Admin-editable
 * since 2026-09-08 via app_settings `card_surcharge_rate` (see
 * server/lib/pricingSettings.ts); callers on the server pass the live value as
 * `surchargeRate`, and each lease snapshots the rate it was created under.
 */
export const DEFAULT_CREDIT_CARD_RATE = 0.035;
/** @deprecated alias kept for the client bundle; prefer the live rate from /api/payments/config. */
export const CREDIT_CARD_RATE = DEFAULT_CREDIT_CARD_RATE;

/** "0.035" → "3.5%", "0.03" → "3%". Shared by server quote labels, lease doc, client copy. */
export const formatSurchargePct = (rate: number): string => {
  const pct = Math.round(rate * 10000) / 100;
  return `${pct}%`;
};
```

Add to `BreakdownInput`:
```ts
  /** Card surcharge fraction; defaults to DEFAULT_CREDIT_CARD_RATE. Server passes the live setting. */
  surchargeRate?: number;
```

In `calculateBreakdown`, destructure `surchargeRate = DEFAULT_CREDIT_CARD_RATE` and use it:
```ts
  const surcharge =
    paymentMethod === "STRIPE" ? roundCurrency((subtotal + tax) * surchargeRate) : 0;
```
Update the `BreakdownResult.surcharge` doc comment to say "surchargeRate × (subtotal + tax)".

- [ ] **Step 5: Create `server/lib/pricingSettings.ts`**

```ts
// server/lib/pricingSettings.ts
// =============================================================================
// Late fee per day + card surcharge rate as admin-editable settings (2026-09-08).
// Both used to be code constants. They now live in app_settings (BNP is the
// system of record; UO edits them over /api/uo/settings/pricing) with the old
// constants as fallbacks. Every lease snapshots both at creation, so a change
// applies to NEW quotes and leases only — a signed agreement keeps its terms.
// =============================================================================

import { z } from "zod";
import { storage } from "../storage";
import {
  DEFAULT_LATE_FEE_PER_DAY,
  LATE_FEE_PER_DAY_SETTING,
  CARD_SURCHARGE_RATE_SETTING,
} from "@shared/schema";
import { DEFAULT_CREDIT_CARD_RATE } from "@shared/pricing";
import { LeaseError } from "./lease";
import { log } from "../server-log";

export interface PricingSettings {
  /** Dollars per day late, e.g. 25. */
  lateFeePerDay: number;
  /** Fraction, e.g. 0.035. */
  cardSurchargeRate: number;
}

export const pricingSettingsInputSchema = z
  .object({
    lateFeePerDay: z.number().min(0, "lateFeePerDay must be 0–500").max(500, "lateFeePerDay must be 0–500").optional(),
    cardSurchargeRate: z
      .number()
      .min(0, "cardSurchargeRate must be 0–0.10")
      .max(0.1, "cardSurchargeRate must be 0–0.10")
      .optional(),
  })
  .refine((v) => v.lateFeePerDay !== undefined || v.cardSurchargeRate !== undefined, {
    message: "Provide lateFeePerDay and/or cardSurchargeRate",
  });

export async function getLateFeePerDay(): Promise<number> {
  return storage.getSettingNumber(LATE_FEE_PER_DAY_SETTING, DEFAULT_LATE_FEE_PER_DAY);
}

export async function getCardSurchargeRate(): Promise<number> {
  return storage.getSettingNumber(CARD_SURCHARGE_RATE_SETTING, DEFAULT_CREDIT_CARD_RATE);
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const [lateFeePerDay, cardSurchargeRate] = await Promise.all([getLateFeePerDay(), getCardSurchargeRate()]);
  return { lateFeePerDay, cardSurchargeRate };
}

/** Validate + persist; returns the refreshed pair. Logs the actor, never a secret. */
export async function updatePricingSettings(
  input: { lateFeePerDay?: number; cardSurchargeRate?: number },
  actor: string,
): Promise<PricingSettings> {
  if (!actor || !actor.trim()) throw new LeaseError("actor is required", 400);
  const parsed = pricingSettingsInputSchema.safeParse(input);
  if (!parsed.success) throw new LeaseError(parsed.error.errors[0]?.message ?? "Invalid pricing settings", 400);
  if (parsed.data.lateFeePerDay !== undefined) {
    await storage.setSetting(LATE_FEE_PER_DAY_SETTING, String(parsed.data.lateFeePerDay));
  }
  if (parsed.data.cardSurchargeRate !== undefined) {
    await storage.setSetting(CARD_SURCHARGE_RATE_SETTING, String(parsed.data.cardSurchargeRate));
  }
  log(`pricing settings updated by ${actor}: ${Object.keys(parsed.data).join(", ")}`, "uo");
  return getPricingSettings();
}

/** Lease-scoped late fee: the snapshot the lease was created under, else the fallback. */
export function leaseLateFeePerDay(lease: { lateFeePerDaySnapshot: string | null }, fallback: number): number {
  const snap = lease.lateFeePerDaySnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}

/** Lease-scoped card surcharge: the snapshot the lease was created under, else the fallback. */
export function leaseCardSurchargeRate(
  lease: { cardSurchargeRateSnapshot: string | null },
  fallback: number,
): number {
  const snap = lease.cardSurchargeRateSnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}
```

Note: `LeaseError` is imported from `./lease` and has the shape `new LeaseError(message, status)` (see `server/lib/lease.ts`). It is what the `/api/uo` error mapper `uoErr` already understands.

- [ ] **Step 6: Run tests to verify they pass**

Run (BNP): `npx vitest run server/lib/pricingSettings.test.ts shared/pricing.test.ts`
Expected: PASS. Then `npx tsc` — expect **two** errors only: `dunning.ts` and `leaseDocument.ts` importing the removed `LATE_FEE_PER_DAY`. Those are fixed in Task 5; do not restore the old constant.

- [ ] **Step 7: Commit (only if authorised)**

```bash
git add shared/schema.ts shared/pricing.ts shared/pricing.test.ts server/lib/pricingSettings.ts server/lib/pricingSettings.test.ts
git commit -m "feat(pricing): late fee + card surcharge become app_settings with fallbacks

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Settings routes and public config

**Files:**
- Modify: `server/routes.ts` — imports (~line 90), `/api/payments/config` (~line 1280), new routes after the `waive-late-fee` write-back (~line 1594)
- Test: covered by Task 1's unit tests plus a manual curl in Task 8; BNP has no HTTP-level tests.

**Interfaces:**
- Consumes: `getPricingSettings`, `updatePricingSettings`, `pricingSettingsInputSchema`, `getCardSurchargeRate` from Task 1.
- Produces: `GET/PUT /api/uo/settings/pricing` (service token; `actor` in body on PUT, `?actor=` on GET, optional), `GET/PUT /api/admin/settings/pricing` (admin session; actor = admin email). Response `{ lateFeePerDay: number, cardSurchargeRate: number }`. `GET /api/payments/config` adds `cardSurchargeRate: number`.

- [ ] **Step 1: Add the import**

After `import * as uo from "./lib/uoApi";` add:
```ts
import { getPricingSettings, updatePricingSettings, getCardSurchargeRate } from "./lib/pricingSettings";
```

- [ ] **Step 2: Extend `/api/payments/config`**

Replace the handler body:
```ts
  app.get("/api/payments/config", async (_req, res, next) => {
    try {
      res.json({
        stripeEnabled: isStripeConfigured() && stripePublishableConfigured(),
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY ?? null,
        // Live card surcharge so the client renders the real percentage.
        cardSurchargeRate: await getCardSurchargeRate(),
      });
    } catch (err) {
      next(err);
    }
  });
```

- [ ] **Step 3: Add the shared handler pair and mount it twice**

Immediately after the `waive-late-fee` route (before the `TASK 6` comment block):
```ts
  // --- Pricing settings (late fee $/day, card surcharge rate) ---
  // One handler pair, mounted for UO (service token) and admin (session).
  // Reads fall back to the defaults; writes validate ranges and log the actor.
  const pricingSettingsBody = z.object({
    lateFeePerDay: z.number().optional(),
    cardSurchargeRate: z.number().optional(),
    actor: z.string().optional(),
  });
  const getPricingSettingsHandler = async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    try { res.json(await getPricingSettings()); } catch (e) { uoErr(e, res, next); }
  };
  const putPricingSettingsHandler = (actorFrom: (req: express.Request) => string) =>
    async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const parsed = pricingSettingsBody.safeParse(req.body);
        if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
        const { actor: _ignored, ...values } = parsed.data;
        res.json(await updatePricingSettings(values, actorFrom(req)));
      } catch (e) { uoErr(e, res, next); }
    };
  app.get("/api/uo/settings/pricing", requireServiceToken, getPricingSettingsHandler);
  app.put(
    "/api/uo/settings/pricing",
    requireServiceToken,
    putPricingSettingsHandler((req) => `uo:${typeof req.body?.actor === "string" && req.body.actor.trim() ? req.body.actor.trim() : "unknown"}`),
  );
  app.get("/api/admin/settings/pricing", requireAdmin, getPricingSettingsHandler);
  app.put(
    "/api/admin/settings/pricing",
    requireAdmin,
    putPricingSettingsHandler((req) => `admin:${(req.user as { email?: string } | undefined)?.email ?? "admin"}`),
  );
```

`uoErr` is the module-level error mapper declared at the top of the UO block (`routes.ts` ~line 1483); it maps `LeaseError` to its status. `requireAdmin` populates `req.user` via passport (see `server/auth.ts:160`).

- [ ] **Step 4: Typecheck**

Run (BNP): `npx tsc`
Expected: only the two pre-existing Task-1 errors in `dunning.ts` / `leaseDocument.ts` remain.

- [ ] **Step 5: Commit (only if authorised)**

```bash
git add server/routes.ts
git commit -m "feat(api): GET/PUT pricing settings for UO + admin; surcharge in payments config

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Lease snapshots — schema, migration script, creation

**Files:**
- Modify: `shared/schema.ts:860-875` (leases table, after `cleaningFeePaidAt`)
- Create: `scripts/push-pricing-snapshots.mjs`
- Modify: `server/lib/leaseFlow.ts:131-150` (`createDraftLease`)
- Test: `server/lib/leaseFlow.test.ts`

**Interfaces:**
- Consumes: `getPricingSettings` (Task 1).
- Produces: `leases.lateFeePerDaySnapshot: string | null`, `leases.cardSurchargeRateSnapshot: string | null` on the `Lease` type; `createDraftLease` writes both.

- [ ] **Step 1: Write the failing test**

In `server/lib/leaseFlow.test.ts`, add `getSettingNumber: vi.fn()` to `mockStorage` and in `beforeEach` add:
```ts
  mockStorage.getSettingNumber.mockImplementation(async (_k: string, fb: number) => fb);
```
Add a test inside `describe("createDraftLease")`:
```ts
  it("snapshots the late fee and card surcharge in force at creation", async () => {
    mockStorage.getProperty.mockResolvedValue(PROP);
    mockStorage.getRoom.mockResolvedValue(ROOM);
    mockStorage.upsertGuestByEmail.mockResolvedValue({ id: "g1", name: "Jane", email: "jane@example.com" });
    mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
      k === "late_fee_per_day" ? 30 : k === "card_surcharge_rate" ? 0.03 : fb,
    );
    mockStorage.createLeaseWithSchedule.mockImplementation(async (args: { lease: Record<string, unknown> }) => ({
      id: "lease-1",
      ...args.lease,
    }));
    await createDraftLease({
      propertyId: "prop-1",
      roomIds: ["r1"],
      startDate: "2026-10-01",
      endDate: "2026-10-30",
      cadence: "WEEKLY",
      guest: { name: "Jane", email: "jane@example.com" },
    });
    const lease = mockStorage.createLeaseWithSchedule.mock.calls[0][0].lease;
    expect(lease.lateFeePerDaySnapshot).toBe("30");
    expect(lease.cardSurchargeRateSnapshot).toBe("0.03");
  });
```
(Mirror the existing happy-path test's mock setup exactly if it differs — read the first `createDraftLease` test in the file and copy its `mockStorage.*` arrangement; the assertions above are what matter.)

- [ ] **Step 2: Run to verify it fails**

Run (BNP): `npx vitest run server/lib/leaseFlow.test.ts -t "snapshots"`
Expected: FAIL — `lateFeePerDaySnapshot` is `undefined`.

- [ ] **Step 3: Add the columns to `shared/schema.ts`**

After `cleaningFeePaidAt: timestamp("cleaning_fee_paid_at"),` in the `leases` table:
```ts
    // --- Pricing terms frozen at creation (added 2026-09-08). The late fee and
    // card surcharge are admin-editable settings now; these snapshots keep every
    // signed lease on the terms its agreement states. Null on pre-2026-09-08
    // leases → resolvers fall back to the current setting (== the old constants
    // until someone changes them). Additive, nullable. ---
    lateFeePerDaySnapshot: decimal("late_fee_per_day_snapshot", { precision: 10, scale: 2 }),
    cardSurchargeRateSnapshot: decimal("card_surcharge_rate_snapshot", { precision: 6, scale: 4 }),
```

- [ ] **Step 4: Create `scripts/push-pricing-snapshots.mjs`**

```js
// scripts/push-pricing-snapshots.mjs
// Add the two pricing-term snapshot columns to leases (2026-09-08). The late fee
// per day and the card surcharge rate became admin-editable app_settings; each
// lease freezes the values in force when it was created so a later edit never
// changes a signed agreement. Nullable — existing leases read null and fall back
// to the current setting. Additive + idempotent (ADD COLUMN IF NOT EXISTS), same
// pattern as scripts/push-biweekly-rate.mjs. Re-running is a safe no-op.
//
// RUN BEFORE deploying the BNP build that reads these columns:
//   node scripts/push-pricing-snapshots.mjs
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }
const db = drizzle({ client: neon(url) });

const statements = [
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "late_fee_per_day_snapshot" numeric(10,2)`,
  `ALTER TABLE "leases" ADD COLUMN IF NOT EXISTS "card_surcharge_rate_snapshot" numeric(6,4)`,
];

for (const [i, stmt] of statements.entries()) {
  try {
    await db.execute(sql.raw(stmt));
    console.log(`[${i + 1}/${statements.length}] OK  ${stmt.slice(0, 70).replace(/\s+/g, " ")}...`);
  } catch (err) {
    console.error(`[${i + 1}/${statements.length}] FAIL`, err.message);
    process.exit(1);
  }
}
console.log("pricing snapshot columns present on leases.");
```
**Do not run this script in this session.** Alex runs it against production.

- [ ] **Step 5: Snapshot at creation in `server/lib/leaseFlow.ts`**

Add the import: `import { getPricingSettings } from "./pricingSettings";`

In `createDraftLease`, before `const lease = await storage.createLeaseWithSchedule({`:
```ts
  // Freeze the pricing terms the agreement will state. Editing the settings
  // later changes new leases only.
  const pricing = await getPricingSettings();
```
In the `lease: { ... }` object after `cleaningFeeStatus: "PENDING",`:
```ts
      lateFeePerDaySnapshot: String(pricing.lateFeePerDay),
      cardSurchargeRateSnapshot: String(pricing.cardSurchargeRate),
```

- [ ] **Step 6: Run the tests**

Run (BNP): `npx vitest run server/lib/leaseFlow.test.ts`
Expected: PASS (all tests in the file; other tests now need `getSettingNumber` mocked — the `beforeEach` line from Step 1 covers them).

- [ ] **Step 7: Commit (only if authorised)**

```bash
git add shared/schema.ts scripts/push-pricing-snapshots.mjs server/lib/leaseFlow.ts server/lib/leaseFlow.test.ts
git commit -m "feat(leases): snapshot late fee + surcharge rate at creation (additive migration script)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: Live surcharge on every charge path

**Files:**
- Modify: `server/lib/booking.ts:315-360` (`buildQuote`), `server/routes.ts:736, 766` (quote callers)
- Modify: `server/lib/leasePayments.ts:69-71, 111, 545, 600, 691`
- Modify: `server/lib/portal.ts:121-123, 149`
- Modify: `server/lib/stripe.ts:93-103`
- Test: `server/lib/booking.test.ts`, `server/lib/leasePayments.test.ts`, `server/lib/portal.test.ts`

**Interfaces:**
- Consumes: `getCardSurchargeRate`, `leaseCardSurchargeRate` (Task 1); `formatSurchargePct`, `DEFAULT_CREDIT_CARD_RATE` (Task 1).
- Produces: `buildQuote(resolved, paymentMethod, surchargeRate = DEFAULT_CREDIT_CARD_RATE)`; `chargeTotalFor(lease: Lease, base: number): Promise<number>` in both `leasePayments.ts` and `portal.ts`; `createWeeklySubscriptionCheckout(opts & { surchargeRate?: number })`.

- [ ] **Step 1: Write the failing tests**

In `server/lib/booking.test.ts` (find the existing `buildQuote` STR test and add beside it):
```ts
  it("labels the card line with the surcharge rate it was given", () => {
    const resolved = { model: "STR", nights: 2, baseAmount: 200, cleaningFee: 0, rateTier: "DAILY" } as never;
    const q = buildQuote(resolved, "STRIPE", 0.03);
    const card = q.dueNow.lines.find((l) => l.label.startsWith("Card processing"));
    expect(card?.label).toBe("Card processing (3%)");
    expect(q.dueNow.surcharge).toBe(6);
  });
```
(If the file's `ResolvedBooking` fixtures use a helper, build the STR case with that helper instead of the `as never` cast; the label and amount assertions are the point.)

In `server/lib/leasePayments.test.ts` and `server/lib/portal.test.ts`: ensure `mockStorage` includes `getSettingNumber: vi.fn()` and `beforeEach` sets `mockStorage.getSettingNumber.mockImplementation(async (_k: string, fb: number) => fb);`. Add one test in `portal.test.ts` beside the existing `payInstallmentNow` success test:
```ts
  it("charges rent plus the lease's snapshotted surcharge, not the current setting", async () => {
    // Existing arrangement for a payable row: copy the mocks from the success
    // test above, then override the lease + setting:
    mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
      k === "card_surcharge_rate" ? 0.05 : fb,
    );
    // lease fixture carries cardSurchargeRateSnapshot: "0.0300"; row.amount "250"
    // → expect chargeSavedCard called with amount 257.5 (250 × 1.03), not 262.5.
    const args = mockStripe.chargeSavedCard.mock.calls[0][0];
    expect(args.amount).toBe(257.5);
  });
```
Adapt the fixture names to the file's existing helpers (`activeLease`/`row`-style factories are the convention in `dunning.test.ts`; `portal.test.ts` has its own — read its first `payInstallmentNow` test and mirror it).

- [ ] **Step 2: Run to verify they fail**

Run (BNP): `npx vitest run server/lib/booking.test.ts server/lib/portal.test.ts server/lib/leasePayments.test.ts`
Expected: booking label test FAILS ("Card processing (3.5%)"); portal test FAILS (262.5 ≠ 257.5).

- [ ] **Step 3: `server/lib/booking.ts`**

Add import: `import { calculateBreakdown, DEFAULT_CREDIT_CARD_RATE, formatSurchargePct } from "@shared/pricing";` (merge with the existing pricing import).

Change the signature and both `calculateBreakdown` calls:
```ts
export function buildQuote(
  resolved: ResolvedBooking,
  paymentMethod: PaymentMethod,
  surchargeRate: number = DEFAULT_CREDIT_CARD_RATE,
): QuoteResponse {
  if (resolved.model === "STR") {
    const b = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod,
      surchargeRate,
    });
```
Replace the literal label: `if (b.surcharge > 0) lines.push({ label: \`Card processing (${formatSurchargePct(surchargeRate)})\`, amount: b.surcharge });`
Apply the same two edits (pass `surchargeRate`, dynamic label) to the co-living short-stay branch below it (the second `calculateBreakdown` call at ~line 346 and any "Card processing" label in that branch).

- [ ] **Step 4: `server/routes.ts` quote callers**

Line ~736: `res.json(buildQuote(resolved, paymentMethod, await getCardSurchargeRate()));`
Line ~766: `const quote = buildQuote(resolved, "STRIPE", await getCardSurchargeRate());`

- [ ] **Step 5: `server/lib/leasePayments.ts`**

Add import: `import { getCardSurchargeRate, leaseCardSurchargeRate } from "./pricingSettings";`

Replace `chargeTotalFor`:
```ts
/**
 * The amount actually charged for an installment. Card-on-file charges carry the
 * Stripe surcharge (we pay Stripe per charge); the stored `amount` is rent only,
 * so the surcharge is added at charge time via the canonical breakdown — at the
 * rate this LEASE was created under (snapshot), falling back to the live setting.
 */
async function chargeTotalFor(lease: Lease, base: number): Promise<number> {
  const rate = leaseCardSurchargeRate(lease, await getCardSurchargeRate());
  return calculateBreakdown({ baseAmount: base, paymentMethod: "STRIPE", surchargeRate: rate }).total;
}
```
Update the four call sites (lines ~111, ~545, ~600, ~691) to `const amount = await chargeTotalFor(lease, parseFloat(first.amount));` / `await chargeTotalFor(lease, fee)` / `await chargeTotalFor(lease, parseFloat(row.amount))`. Each enclosing function already has `lease` in scope (from `loadLeaseContext` or a parameter) and is `async`.

- [ ] **Step 6: `server/lib/portal.ts`**

Same import and same replacement of `chargeTotalFor`; call site ~line 149 becomes `const amount = await chargeTotalFor(lease, parseFloat(row.amount));`.

- [ ] **Step 7: `server/lib/stripe.ts`**

Change the import to `import { DEFAULT_CREDIT_CARD_RATE } from "@shared/pricing";`, add `surchargeRate?: number;` to the `createWeeklySubscriptionCheckout` opts, and compute `const weeklyTotal = opts.weeklyRent * (1 + (opts.surchargeRate ?? DEFAULT_CREDIT_CARD_RATE));`.

- [ ] **Step 8: Run the tests**

Run (BNP): `npx vitest run server/lib/booking.test.ts server/lib/portal.test.ts server/lib/leasePayments.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit (only if authorised)**

```bash
git add server/lib/booking.ts server/lib/booking.test.ts server/lib/leasePayments.ts server/lib/leasePayments.test.ts server/lib/portal.ts server/lib/portal.test.ts server/lib/stripe.ts server/routes.ts
git commit -m "feat(payments): charge paths use the live or lease-snapshotted surcharge rate

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: Live late fee in dunning and the lease document

**Files:**
- Modify: `server/lib/dunning.ts:33-37, 160-165, 198-231`
- Modify: `server/lib/leaseDocument.ts:25, 40-63, 108-124, 172-196`
- Modify: `server/lib/leaseFlow.ts:58-84` (`docDataFrom`), `:225-250` (signLease `docData`)
- Test: `server/lib/dunning.test.ts`, `server/lib/leaseDocument.test.ts`

**Interfaces:**
- Consumes: `getLateFeePerDay`, `leaseLateFeePerDay`, `leaseCardSurchargeRate`, `getCardSurchargeRate` (Task 1); `formatSurchargePct`.
- Produces: `LeaseDocData.lateFeePerDay: number`, `LeaseDocData.cardSurchargeRate: number`; template token `{{cardSurchargePct}}`.

- [ ] **Step 1: Write the failing tests**

`server/lib/leaseDocument.test.ts` — add to the `DATA` fixture: `lateFeePerDay: 25, cardSurchargeRate: 0.035,`. Add tests:
```ts
  it("states the late fee and surcharge the lease was created under", () => {
    const html = renderLeaseHtml({ ...DATA, lateFeePerDay: 40, cardSurchargeRate: 0.03 });
    expect(html).toMatch(/\$40\.00 per day/);
    expect(html).toMatch(/subject to a 3% processing fee/);
    expect(html).not.toMatch(/3\.5%/);
  });
```
Keep the existing `$25.00 per day` test (the fixture still says 25).

`server/lib/dunning.test.ts` — in `beforeEach` change the `getSettingNumber` mock to a key-aware one so the threshold test data still works:
```ts
  mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
    k === "defaulted_threshold_days" ? 7 : fb,
  );
```
and update the two existing tests that call `mockStorage.getSettingNumber.mockResolvedValue(3)` (~line 194) to `mockImplementation(async (k, fb) => (k === "defaulted_threshold_days" ? 3 : fb))`. Add:
```ts
  it("accrues the lease's snapshotted late fee, else the current setting", async () => {
    // Same arrangement as the day-1 overdue test above (lease ACTIVE, row seq 2 due
    // 2026-07-09, today 2026-07-10, no prior notification), with:
    mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
      k === "late_fee_per_day" ? 40 : k === "defaulted_threshold_days" ? 7 : fb,
    );
    // (a) lease without snapshot → 40
    // (b) lease with lateFeePerDaySnapshot "20.00" → 20
    // Assert storage.accrueLateFeeOnce's `amount` for each, and that the guest
    // email body contains "$40.00/day" / "$20.00/day" respectively.
  });
```
Write (a) and (b) as two `it` blocks copying the arrangement of the existing "on day 1 past due" test (line ~143) verbatim, changing only the lease fixture and the expected amount.

- [ ] **Step 2: Run to verify they fail**

Run (BNP): `npx vitest run server/lib/leaseDocument.test.ts server/lib/dunning.test.ts`
Expected: FAIL (compile error on the removed constant, then assertion failures once it compiles).

- [ ] **Step 3: `server/lib/leaseDocument.ts`**

Import: replace `LATE_FEE_PER_DAY` with nothing (`import { CADENCE_DAYS } from "@shared/schema";`) and add `import { formatSurchargePct } from "@shared/pricing";`.

`LeaseDocData` — after `cleaningFeeTotal: number;` add:
```ts
  /** Late fee per day this lease was created under (snapshot), in dollars. */
  lateFeePerDay: number;
  /** Card surcharge fraction this lease was created under (snapshot). */
  cardSurchargeRate: number;
```
Clause 7 body: replace `"scheduled payment either by that card (subject to a 3.5% processing fee) or manually by "` with `"scheduled payment either by that card (subject to a {{cardSurchargePct}} processing fee) or manually by "`.

`tokenMap`: replace `lateFeePerDay: fmtMoney(LATE_FEE_PER_DAY),` with:
```ts
    lateFeePerDay: fmtMoney(data.lateFeePerDay),
    cardSurchargePct: formatSurchargePct(data.cardSurchargeRate),
```

- [ ] **Step 4: `server/lib/leaseFlow.ts`**

`docDataFrom` gains a fifth parameter `pricing: { lateFeePerDay: number; cardSurchargeRate: number }` and emits `lateFeePerDay: pricing.lateFeePerDay, cardSurchargeRate: pricing.cardSurchargeRate,`. Callers:
- `previewLease`: `const pricing = await getPricingSettings();` then pass `pricing`.
- `createDraftLease`: pass the `pricing` fetched in Task 3 (the same values written to the snapshots).
- `signLease` `docData` literal (~line 225): add
  ```ts
    lateFeePerDay: leaseLateFeePerDay(lease, await getLateFeePerDay()),
    cardSurchargeRate: leaseCardSurchargeRate(lease, await getCardSurchargeRate()),
  ```
  and extend the import to `import { getPricingSettings, getLateFeePerDay, getCardSurchargeRate, leaseLateFeePerDay, leaseCardSurchargeRate } from "./pricingSettings";`.

- [ ] **Step 5: `server/lib/dunning.ts`**

Import: replace `LATE_FEE_PER_DAY,` in the `@shared/schema` import with nothing; add `import { getLateFeePerDay, getCardSurchargeRate, leaseLateFeePerDay, leaseCardSurchargeRate } from "./pricingSettings";` and `import { formatSurchargePct } from "@shared/pricing";`.

In `handleOverdue`, before the accrual block:
```ts
  const lateFeePerDay = leaseLateFeePerDay(lease, await getLateFeePerDay());
```
Then `amount: lateFeePerDay,` in `accrueLateFeeOnce`, and in the two message strings replace `LATE_FEE_PER_DAY.toFixed(2)` → `lateFeePerDay.toFixed(2)` and `LATE_FEE_PER_DAY.toFixed(0)` → `lateFeePerDay.toFixed(0)`.

In `maybeSendReminder` (~line 160) replace the literal `"…plus a 3.5% card processing fee."` with:
```ts
        ? `It will be charged automatically to your card on file, plus a ${formatSurchargePct(
            leaseCardSurchargeRate(lease, await getCardSurchargeRate()),
          )} card processing fee.`
```

- [ ] **Step 6: Run the tests and typecheck**

Run (BNP): `npx vitest run server/lib/leaseDocument.test.ts server/lib/dunning.test.ts server/lib/leaseFlow.test.ts && npx tsc`
Expected: PASS; `tsc` clean (the two Task-1 errors are gone).

- [ ] **Step 7: Commit (only if authorised)**

```bash
git add server/lib/dunning.ts server/lib/dunning.test.ts server/lib/leaseDocument.ts server/lib/leaseDocument.test.ts server/lib/leaseFlow.ts
git commit -m "feat(dunning,lease-doc): late fee + surcharge from lease snapshots, not constants

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: Property and room write-backs on `/api/uo`

**Files:**
- Modify: `server/lib/uoApi.ts:28-50` (fuller GET) and append write-backs
- Modify: `server/routes.ts` — replace the `GET /api/uo/properties` handler (~line 1489) and add four routes after the pricing-settings block from Task 2
- Test: `server/lib/uoApi.test.ts`

**Interfaces:**
- Consumes: `storage.getProperties/getRoomsByProperty/getProperty/getRoom/updateProperty/updateRoom/createProperty/createRoom`; `insertPropertySchema`, `insertRoomSchema` from `@shared/schema`.
- Produces (`uoApi.ts`):
  ```ts
  export async function listPropertiesWithRooms(): Promise<Array<Property & { rooms: Room[] }>>
  export async function updateProperty(args: { propertyId: string; patch: unknown; actor: string }): Promise<Property>
  export async function updateRoom(args: { roomId: string; patch: unknown; actor: string }): Promise<Room>
  export async function createProperty(args: { property: unknown; actor: string }): Promise<Property>
  export async function createRoom(args: { propertyId: string; room: unknown; actor: string }): Promise<Room>
  ```
  Routes: `PATCH /api/uo/properties/:id`, `PATCH /api/uo/rooms/:id` body `{ actor, patch }`; `POST /api/uo/properties` body `{ actor, property }`; `POST /api/uo/properties/:id/rooms` body `{ actor, room }`.

- [ ] **Step 1: Write the failing tests**

Append to `server/lib/uoApi.test.ts` (extend `mockStorage` with `getProperties, getRoomsByProperty, getRoom, updateProperty, updateRoom, createProperty, createRoom` as `vi.fn()`; import the four new functions plus `listPropertiesWithRooms`):
```ts
describe("listPropertiesWithRooms", () => {
  it("returns full property rows with full room rows nested", async () => {
    const prop = { ...PROP, biweeklyRate: "700.00", airbnbIcalUrl: "https://x/ical" };
    const room = { id: "r1", propertyId: "prop-1", name: "Room 1", weeklyRent: "350.00", biweeklyRate: "650.00", cleaningFee: "0", status: "AVAILABLE" };
    mockStorage.getProperties.mockResolvedValue([prop]);
    mockStorage.getRoomsByProperty.mockResolvedValue([room]);
    const out = await listPropertiesWithRooms();
    expect(out[0]).toMatchObject({ ...prop, rooms: [room] });
  });
  it("gives non-COLIVING properties an empty rooms array without querying", async () => {
    mockStorage.getProperties.mockResolvedValue([{ ...PROP, type: "STR" }]);
    const out = await listPropertiesWithRooms();
    expect(out[0].rooms).toEqual([]);
    expect(mockStorage.getRoomsByProperty).not.toHaveBeenCalled();
  });
});

describe("updateProperty / updateRoom write-backs", () => {
  beforeEach(() => {
    mockStorage.updateProperty.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
    mockStorage.updateRoom.mockImplementation(async (id: string, patch: Record<string, unknown>) => ({ id, ...patch }));
  });
  it("validates through insertPropertySchema.partial() and returns the updated row", async () => {
    const out = await updateProperty({ propertyId: "prop-1", patch: { biweeklyRate: "700.00", monPrice: "120.00" }, actor: "alex@x.com" });
    expect(mockStorage.updateProperty).toHaveBeenCalledWith("prop-1", { biweeklyRate: "700.00", monPrice: "120.00" });
    expect(out).toMatchObject({ id: "prop-1", biweeklyRate: "700.00" });
  });
  it("rejects an invalid field value with 400", async () => {
    await expect(updateProperty({ propertyId: "prop-1", patch: { type: "CASTLE" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
    expect(mockStorage.updateProperty).not.toHaveBeenCalled();
  });
  it("rejects an empty patch and a missing actor", async () => {
    await expect(updateProperty({ propertyId: "prop-1", patch: {}, actor: "a" })).rejects.toMatchObject({ status: 400 });
    await expect(updateProperty({ propertyId: "prop-1", patch: { name: "X" }, actor: "" })).rejects.toMatchObject({ status: 400 });
  });
  it("404s when the row does not exist", async () => {
    mockStorage.updateProperty.mockResolvedValue(undefined);
    await expect(updateProperty({ propertyId: "nope", patch: { name: "X" }, actor: "a" })).rejects.toMatchObject({ status: 404 });
  });
  it("updates a room's cleaning fee and biweekly rate", async () => {
    const out = await updateRoom({ roomId: "r1", patch: { cleaningFee: "50.00", biweeklyRate: "650.00" }, actor: "a" });
    expect(mockStorage.updateRoom).toHaveBeenCalledWith("r1", { cleaningFee: "50.00", biweeklyRate: "650.00" });
    expect(out).toMatchObject({ id: "r1", cleaningFee: "50.00" });
  });
  it("rejects a bad room status", async () => {
    await expect(updateRoom({ roomId: "r1", patch: { status: "ON_FIRE" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
  });
});

describe("createProperty / createRoom write-backs", () => {
  it("creates a property through insertPropertySchema", async () => {
    mockStorage.createProperty.mockImplementation(async (p: Record<string, unknown>) => ({ id: "new", ...p }));
    const out = await createProperty({ property: { name: "Third House", location: "Atlanta", type: "COLIVING" }, actor: "a" });
    expect(out).toMatchObject({ id: "new", name: "Third House" });
  });
  it("creates a room only under a COLIVING parent", async () => {
    mockStorage.getProperty.mockResolvedValue({ ...PROP, type: "STR" });
    await expect(createRoom({ propertyId: "prop-1", room: { name: "R", weeklyRent: "300", depositAmount: "300" }, actor: "a" })).rejects.toMatchObject({ status: 400 });
    mockStorage.getProperty.mockResolvedValue({ ...PROP, type: "COLIVING" });
    mockStorage.createRoom.mockImplementation(async (r: Record<string, unknown>) => ({ id: "r9", ...r }));
    const out = await createRoom({ propertyId: "prop-1", room: { name: "R", weeklyRent: "300", depositAmount: "300" }, actor: "a" });
    expect(mockStorage.createRoom).toHaveBeenCalledWith(expect.objectContaining({ propertyId: "prop-1", name: "R" }));
    expect(out.id).toBe("r9");
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run (BNP): `npx vitest run server/lib/uoApi.test.ts`
Expected: FAIL — functions not exported; GET shape assertions fail.

- [ ] **Step 3: Implement in `server/lib/uoApi.ts`**

Imports: add `import { insertPropertySchema, insertRoomSchema } from "@shared/schema";` and extend the type import to `type { Lease, Property, Room, LeaseRoom }`.

Replace `listPropertiesWithRooms`:
```ts
/**
 * Every property with its rooms — FULL rows (all rate tiers, weekday prices,
 * photos, address, iCal URL…). UO's inventory editor needs the whole record, and
 * exposing it here is what lets UO stop reading BNP's DB for edits. Rooms only
 * for COLIVING; other types get [] without a query. Authenticated operator
 * surface — the iCal URL is secret-ish but UO already manages it.
 */
export async function listPropertiesWithRooms(): Promise<Array<Property & { rooms: Room[] }>> {
  const properties = await storage.getProperties();
  const out: Array<Property & { rooms: Room[] }> = [];
  for (const p of properties) {
    const rooms = p.type === "COLIVING" ? await storage.getRoomsByProperty(p.id) : [];
    out.push({ ...p, rooms });
  }
  return out;
}
```

Append after `waiveLateFees`:
```ts
// ---------------------------------------------------------------------------
// PROPERTY / ROOM WRITE-BACKS (2026-09-08). UO is the primary editor of BNP
// inventory and prices; these are the same Zod schemas the BNP admin routes
// use, so admin and UO can never accept different field sets. Logs name the
// actor and the changed KEYS only (a patch may carry the tokenised iCal URL).
// ---------------------------------------------------------------------------

function requireActor(actor: string): string {
  if (!actor || !actor.trim()) throw new LeaseError("actor is required", 400);
  return actor.trim();
}

function firstIssue(err: { errors: Array<{ message: string }> }, fallback: string): string {
  return err.errors[0]?.message ?? fallback;
}

export async function updateProperty(args: { propertyId: string; patch: unknown; actor: string }): Promise<Property> {
  const actor = requireActor(args.actor);
  const parsed = insertPropertySchema.partial().safeParse(args.patch);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid property patch"), 400);
  const keys = Object.keys(parsed.data);
  if (keys.length === 0) throw new LeaseError("Empty patch", 400);
  const updated = await storage.updateProperty(args.propertyId, parsed.data);
  if (!updated) throw new LeaseError("Property not found", 404);
  log(`property ${args.propertyId} updated by uo:${actor}: ${keys.join(", ")}`, "uo");
  return updated;
}

export async function updateRoom(args: { roomId: string; patch: unknown; actor: string }): Promise<Room> {
  const actor = requireActor(args.actor);
  const parsed = insertRoomSchema.partial().safeParse(args.patch);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid room patch"), 400);
  const keys = Object.keys(parsed.data);
  if (keys.length === 0) throw new LeaseError("Empty patch", 400);
  const updated = await storage.updateRoom(args.roomId, parsed.data);
  if (!updated) throw new LeaseError("Room not found", 404);
  log(`room ${args.roomId} updated by uo:${actor}: ${keys.join(", ")}`, "uo");
  return updated;
}

export async function createProperty(args: { property: unknown; actor: string }): Promise<Property> {
  const actor = requireActor(args.actor);
  const parsed = insertPropertySchema.safeParse(args.property);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid property"), 400);
  const created = await storage.createProperty(parsed.data);
  log(`property ${created.id} created by uo:${actor}`, "uo");
  return created;
}

export async function createRoom(args: { propertyId: string; room: unknown; actor: string }): Promise<Room> {
  const actor = requireActor(args.actor);
  const parent = await storage.getProperty(args.propertyId);
  if (!parent) throw new LeaseError("Property not found", 404);
  if (parent.type !== "COLIVING") throw new LeaseError("Rooms can only be added to COLIVING properties", 400);
  const parsed = insertRoomSchema.safeParse({ ...(args.room as object), propertyId: args.propertyId });
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid room"), 400);
  const created = await storage.createRoom(parsed.data);
  log(`room ${created.id} created under ${args.propertyId} by uo:${actor}`, "uo");
  return created;
}
```

- [ ] **Step 4: Routes in `server/routes.ts`**

The existing `GET /api/uo/properties` handler needs no code change (it already calls `uo.listPropertiesWithRooms()`). Add after the pricing-settings block:
```ts
  // --- Property / room write-backs (UO is the primary inventory + price editor) ---
  const actorBody = z.string().min(1, "actor is required");
  app.patch("/api/uo/properties/:id", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: actorBody, patch: z.record(z.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.updateProperty({ propertyId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.patch("/api/uo/rooms/:id", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: actorBody, patch: z.record(z.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await uo.updateRoom({ roomId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/properties", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: actorBody, property: z.record(z.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await uo.createProperty(parsed.data));
    } catch (e) { uoErr(e, res, next); }
  });
  app.post("/api/uo/properties/:id/rooms", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z.object({ actor: actorBody, room: z.record(z.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await uo.createRoom({ propertyId: req.params.id, ...parsed.data }));
    } catch (e) { uoErr(e, res, next); }
  });
```

- [ ] **Step 5: Run the tests**

Run (BNP): `npx vitest run server/lib/uoApi.test.ts && npx tsc`
Expected: PASS; `tsc` clean.

- [ ] **Step 6: Commit (only if authorised)**

```bash
git add server/lib/uoApi.ts server/lib/uoApi.test.ts server/routes.ts
git commit -m "feat(uo-api): property + room write-backs and full-row inventory read

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: Client copy reads the live surcharge

**Files:**
- Create: `client/src/lib/usePricingConfig.ts`
- Modify: `client/src/pages/checkout.tsx:248`, `client/src/pages/lease-booking.tsx:500`, `client/src/pages/portal.tsx:491`

**Interfaces:**
- Consumes: `GET /api/payments/config` → `{ stripeEnabled, publishableKey, cardSurchargeRate }` (Task 2); `formatSurchargePct`, `DEFAULT_CREDIT_CARD_RATE` from `@shared/pricing`.
- Produces: `usePricingConfig(): { cardSurchargeRate: number; surchargePct: string }` (falls back to the default until loaded).

- [ ] **Step 1: Create the hook**

```ts
// client/src/lib/usePricingConfig.ts
// The live card surcharge for guest-facing copy. Server-side quotes already carry
// the real rate in their line labels; this hook exists for the three places that
// used to hard-code "3.5%" in prose. Falls back to the default until loaded so
// the page never renders an empty percentage.
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CREDIT_CARD_RATE, formatSurchargePct } from "@shared/pricing";

interface PaymentsConfig {
  stripeEnabled: boolean;
  publishableKey: string | null;
  cardSurchargeRate: number;
}

export function usePricingConfig(): { cardSurchargeRate: number; surchargePct: string } {
  const { data } = useQuery<PaymentsConfig>({
    queryKey: ["/api/payments/config"],
    staleTime: 5 * 60 * 1000,
  });
  const rate = typeof data?.cardSurchargeRate === "number" ? data.cardSurchargeRate : DEFAULT_CREDIT_CARD_RATE;
  return { cardSurchargeRate: rate, surchargePct: formatSurchargePct(rate) };
}
```
(`queryClient.ts` sets a default `queryFn` that GETs `queryKey.join("/")`; confirm in `client/src/lib/queryClient.ts:35-45` that the default options include it — they do in the TRAD-mirrored setup. If not, pass `queryFn: getQueryFn({ on401: "throw" })`.)

- [ ] **Step 2: Replace the three literals**

- `checkout.tsx`: `const { surchargePct } = usePricingConfig();` in the component; line 248 → `<span>Card processing ({surchargePct})</span>`.
- `lease-booking.tsx`: same hook; line 500 → `({surchargePct} fee) or by CashApp/Zelle (no fee).`
- `portal.tsx`: same hook; line 491 → `Card payments include a {surchargePct} processing fee. CashApp/Zelle has no fee. Your payment is`.
Import in each: `import { usePricingConfig } from "@/lib/usePricingConfig";`.

- [ ] **Step 3: Typecheck and build the client**

Run (BNP): `npx tsc && npm run build`
Expected: both clean. The build also runs the prerender step; it must complete without error.

- [ ] **Step 4: Commit (only if authorised)**

```bash
git add client/src/lib/usePricingConfig.ts client/src/pages/checkout.tsx client/src/pages/lease-booking.tsx client/src/pages/portal.tsx
git commit -m "feat(client): guest copy renders the live card surcharge

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: BNP bundle, docs, full verification

**Files:**
- Modify: `.env.example:40-43`, `docs/build-log.md` (append), `api/**` (regenerated)

- [ ] **Step 1: `.env.example`**

After the `UO_BNP_API_TOKEN` line add:
```
# Late fee per day and card surcharge rate are NOT env: they live in app_settings
# (`late_fee_per_day`, `card_surcharge_rate`) and are edited from Unified Ops.
```

- [ ] **Step 2: Rebuild the api bundle**

Run (BNP): `npm run build:api && git status --short api/`
Expected: `api/index.js` (and possibly `api/cron/*.js`) modified. These are committed artefacts.

- [ ] **Step 3: Full verification**

Run (BNP): `npx tsc && npx vitest run && npm run build`
Expected: `tsc` clean; vitest ≥ 593 + new tests, 0 failures; build clean. Record the exact test count.

- [ ] **Step 4: Build-log entry**

Append to `docs/build-log.md`:
```markdown
## 2026-09-08 (evening) — UO becomes the primary editor of BNP inventory + prices

**Why.** UO's Pricing tab wrote BNP rate columns straight into BNP's Neon DB through
a hand-written schema mirror; the biweekly tier added this morning was invisible to
it within the day. Spec: docs/superpowers/specs/2026-09-08-uo-pricing-writeback-design.md.

**What was built (BNP side)**
- `/api/uo/*` write-backs: `PATCH /api/uo/properties/:id`, `PATCH /api/uo/rooms/:id`,
  `POST /api/uo/properties`, `POST /api/uo/properties/:id/rooms` — body `{actor, …}`,
  validated by the SAME `insertPropertySchema`/`insertRoomSchema` the admin uses.
  `GET /api/uo/properties` now returns full rows (all rate tiers) with rooms nested.
- Late fee ($/day) and card surcharge (fraction) moved from constants to `app_settings`
  keys `late_fee_per_day` / `card_surcharge_rate` (`server/lib/pricingSettings.ts`),
  `GET/PUT /api/uo/settings/pricing` + `/api/admin/settings/pricing`,
  `cardSurchargeRate` on `/api/payments/config`.
- Leases snapshot both at creation (`late_fee_per_day_snapshot`,
  `card_surcharge_rate_snapshot`); dunning, portal/lease charges and the lease
  document read the snapshot first. A settings edit changes NEW leases only.
- Client copy renders the live percentage (`client/src/lib/usePricingConfig.ts`).

**Files touched** — <list from `git diff --stat main`>

**Tests + results** — `npx tsc` 0 · `npx vitest run` <N passed> · `npm run build` 0 · `npm run build:api` 0.

**Owner steps (in order)**
1. `node scripts/push-pricing-snapshots.mjs` against production (additive; re-runnable).
2. Deploy BNP.
3. Deploy UO (companion branch `feat/uo-pricing-writeback` in the Unified-Ops repo).
4. Verify: edit a room's biweekly rate in UO → BNP quote for 14 nights on that room reflects it.

**Legal flag** — editable late fee / surcharge; snapshots protect signed leases; permissibility per jurisdiction not assessed here.
```
Fill the two `<…>` placeholders with the real values from Steps 2–3 before finishing the task.

- [ ] **Step 5: Commit (only if authorised)**

```bash
git add .env.example docs/build-log.md api/
git commit -m "chore: api bundle + build-log for UO pricing write-back

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Unified Ops

### Task 9: Mirror columns and a BNP schema-drift check

**Files:**
- Modify: `src/lib/bnp-db.ts:80-95, 128-135`
- Create: `scripts/lib/check-schema-mirror.ts`, `scripts/check-bnp-schema.ts`
- Modify: `scripts/check-trad-schema.ts` (thin wrapper), `package.json` scripts

**Interfaces:**
- Produces (`src/lib/bnp-db.ts`): `properties.biweeklyRate`, `rooms.biweeklyRate`, `rooms.cleaningFee` (all `decimal(10,2)`, nullable) → on `BnpProperty` / `BnpRoom` types.
- Produces (`scripts/lib/check-schema-mirror.ts`):
  ```ts
  export async function runMirrorCheck(opts: {
    mirror: Record<string, unknown>;          // the module namespace exporting pgTables
    execute: (q: SQL) => Promise<unknown>;    // db.execute
    envVar: string;                           // e.g. "BNP_DATABASE_URL"
    mirrorPath: string;                       // for messages, e.g. "src/lib/bnp-db.ts"
    ownerLabel: string;                       // e.g. "the BNP site repo"
    argv: string[];
  }): Promise<never>                          // calls process.exit
  ```

- [ ] **Step 1: Add the mirror columns**

In `properties` after `weeklyRate`:
```ts
  // Biweekly tier (additive, 2026-09-08). A priced tier in its own right on the
  // site (cascadeStayPrice: months → biweeks → weeks → days), not 2 × weekly.
  biweeklyRate: decimal("biweekly_rate", { precision: 10, scale: 2 }),
```
Replace the stale properties comment "Storage + admin only for now — NOT yet wired into the BNP site's billing math (Phase 3). base_price still drives current STR charges." with "LIVE in the site's billing since 2026-09-08: shared/rateSelection.ts cascadeStayPrice() prices a stay by whole months, then biweeks, then weeks, then days, each at its own tier rate; a blank tier falls back to the next shorter one."

In `rooms` after `depositAmount`:
```ts
  // Per-room one-time cleaning fee (additive, 2026-07-04 on the site). "0" default.
  cleaningFee: decimal("cleaning_fee", { precision: 10, scale: 2 }),
```
and after `dailyRate`:
```ts
  biweeklyRate: decimal("biweekly_rate", { precision: 10, scale: 2 }),
```
Replace the rooms comment "Storage + admin only — not yet wired into billing (Phase 3)." with "Live in the site's cascade pricing since 2026-09-08."

- [ ] **Step 2: Extract the checker core**

Create `scripts/lib/check-schema-mirror.ts` by moving everything from `scripts/check-trad-schema.ts` between the `SQL_TYPE_TO_INFORMATION_SCHEMA` constant and the end of `compare()` into it unchanged, then replacing the `import * as mirror` and `mirror.tradDb.execute` references with the `opts.mirror` / `opts.execute` parameters, and wrapping `main()` as `runMirrorCheck(opts)`. Keep the header comment (it explains the bug class) but reword the first paragraph to say the checker is shared by every foreign-DB mirror in `src/lib/*-db.ts`. The messages that say "TRAD" become `${opts.ownerLabel}` / `${opts.mirrorPath}` / `${opts.envVar}`.

- [ ] **Step 3: Thin wrappers**

`scripts/check-trad-schema.ts`:
```ts
/**
 * TRAD schema-drift check — verifies src/lib/trad-db.ts against the live TRAD DB.
 *   npm run trad:schema:check   (see scripts/lib/check-schema-mirror.ts for why)
 */
import "dotenv/config";
import * as mirror from "../src/lib/trad-db";
import { runMirrorCheck } from "./lib/check-schema-mirror";

runMirrorCheck({
  mirror,
  execute: (q) => mirror.tradDb.execute(q),
  envVar: "TRAD_DATABASE_URL",
  mirrorPath: "src/lib/trad-db.ts",
  ownerLabel: "the TRAD site repo",
  argv: process.argv,
}).catch((e) => { console.error(e); process.exit(1); });
```
`scripts/check-bnp-schema.ts`: identical with `bnp-db`, `bnpDb`, `BNP_DATABASE_URL`, `src/lib/bnp-db.ts`, `the BNP site repo (beniceproperties)`.

`package.json` scripts: add `"bnp:schema:check": "npx tsx scripts/check-bnp-schema.ts",` next to the TRAD one.

- [ ] **Step 4: Run both checks**

Run (UO): `npm run trad:schema:check -- --allow-skip && npm run bnp:schema:check`
Expected: TRAD unchanged from before the refactor (same error/warning counts as `git stash; npm run trad:schema:check; git stash pop` — run that comparison once). BNP: **0 errors** once Task 3's columns exist in production; before Alex runs the migration the check must still report 0 errors because UO's mirror does not declare the two new `leases` columns. If `BNP_DATABASE_URL` is unset locally, the command exits 1 by design — report that rather than passing `--allow-skip` silently.

- [ ] **Step 5: Typecheck + lint**

Run (UO): `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 6: Commit (only if authorised)**

```bash
git add src/lib/bnp-db.ts scripts/lib/check-schema-mirror.ts scripts/check-bnp-schema.ts scripts/check-trad-schema.ts package.json
git commit -m "chore(bnp): mirror gains biweekly_rate + room cleaning_fee; shared schema-drift check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Typed BNP inventory/pricing API helpers

**Files:**
- Create: `src/lib/bnp/inventory-api.ts`
- Test: `src/lib/bnp/inventory-api.test.ts`

**Interfaces:**
- Consumes: `bnpApi<T>(path, { method, json })`, `bnpApiConfigured()`, `BnpApiError` from `src/lib/bnp/api-client.ts`.
- Produces:
  ```ts
  export interface BnpPricingSettings { lateFeePerDay: number; cardSurchargeRate: number }
  export function patchBnpProperty(id: string, patch: Record<string, unknown>, actor: string): Promise<Record<string, unknown>>
  export function patchBnpRoom(id: string, patch: Record<string, unknown>, actor: string): Promise<Record<string, unknown>>
  export function getBnpPricingSettings(actor: string): Promise<BnpPricingSettings>
  export function putBnpPricingSettings(values: Partial<BnpPricingSettings>, actor: string): Promise<BnpPricingSettings>
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/bnp/inventory-api.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const api = vi.fn();
vi.mock("@/lib/bnp/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bnp/api-client")>();
  return { ...actual, bnpApi: (...a: unknown[]) => api(...a) };
});

import { patchBnpProperty, patchBnpRoom, getBnpPricingSettings, putBnpPricingSettings } from "./inventory-api";

beforeEach(() => api.mockReset());

describe("inventory-api", () => {
  it("PATCHes a property with {actor, patch}", async () => {
    api.mockResolvedValue({ id: "p1", biweeklyRate: "700.00" });
    const out = await patchBnpProperty("p1", { biweeklyRate: "700.00" }, "alex@x.com");
    expect(api).toHaveBeenCalledWith("/api/uo/properties/p1", {
      method: "PATCH",
      json: { actor: "alex@x.com", patch: { biweeklyRate: "700.00" } },
    });
    expect(out).toEqual({ id: "p1", biweeklyRate: "700.00" });
  });
  it("PATCHes a room", async () => {
    api.mockResolvedValue({ id: "r1" });
    await patchBnpRoom("r1", { cleaningFee: "50" }, "a@x.com");
    expect(api).toHaveBeenCalledWith("/api/uo/rooms/r1", { method: "PATCH", json: { actor: "a@x.com", patch: { cleaningFee: "50" } } });
  });
  it("encodes the actor on GET and sends it in the body on PUT for pricing settings", async () => {
    api.mockResolvedValue({ lateFeePerDay: 25, cardSurchargeRate: 0.035 });
    await getBnpPricingSettings("a b@x.com");
    expect(api).toHaveBeenCalledWith("/api/uo/settings/pricing?actor=a%20b%40x.com");
    await putBnpPricingSettings({ lateFeePerDay: 30 }, "a@x.com");
    expect(api).toHaveBeenCalledWith("/api/uo/settings/pricing", { method: "PUT", json: { lateFeePerDay: 30, actor: "a@x.com" } });
  });
  it("encodes ids in the path", async () => {
    api.mockResolvedValue({});
    await patchBnpRoom("r/1", {}, "a");
    expect(api.mock.calls[0][0]).toBe("/api/uo/rooms/r%2F1");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (UO): `npx vitest run src/lib/bnp/inventory-api.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/lib/bnp/inventory-api.ts
// Typed helpers over the BNP service API for inventory + pricing WRITES (2026-09-08).
// UO is the primary editor of BNP property/room details and prices; the site
// validates every patch with its own Zod insert schemas and attributes the change
// to `actor`. Reads still come from the bnp-db mirror. Server-only (see api-client).
import { bnpApi } from "@/lib/bnp/api-client";

export interface BnpPricingSettings {
  /** Dollars per day late. */
  lateFeePerDay: number;
  /** Fraction, e.g. 0.035. */
  cardSurchargeRate: number;
}

export function patchBnpProperty(id: string, patch: Record<string, unknown>, actor: string) {
  return bnpApi<Record<string, unknown>>(`/api/uo/properties/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: { actor, patch },
  });
}

export function patchBnpRoom(id: string, patch: Record<string, unknown>, actor: string) {
  return bnpApi<Record<string, unknown>>(`/api/uo/rooms/${encodeURIComponent(id)}`, {
    method: "PATCH",
    json: { actor, patch },
  });
}

export function getBnpPricingSettings(actor: string) {
  return bnpApi<BnpPricingSettings>(`/api/uo/settings/pricing?actor=${encodeURIComponent(actor)}`);
}

export function putBnpPricingSettings(values: Partial<BnpPricingSettings>, actor: string) {
  return bnpApi<BnpPricingSettings>("/api/uo/settings/pricing", {
    method: "PUT",
    json: { ...values, actor },
  });
}
```

- [ ] **Step 4: Run the test**

Run (UO): `npx vitest run src/lib/bnp/inventory-api.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit (only if authorised)**

```bash
git add src/lib/bnp/inventory-api.ts src/lib/bnp/inventory-api.test.ts
git commit -m "feat(bnp): typed helpers for BNP property/room/pricing write-backs

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 11: Detail-sheet save goes through the API

**Files:**
- Modify: `src/lib/bnp/inventory.ts:429-447` (`updateInventoryDetail`)
- Modify: `src/app/api/bnp-admin/inventory/[id]/route.ts:67-113` (PATCH)
- Test: `src/lib/bnp/inventory.test.ts` (new)

**Interfaces:**
- Consumes: `patchBnpProperty`, `patchBnpRoom` (Task 10); `bnpApiConfigured`, `BnpApiError`.
- Produces: `updateInventoryDetail(scope, liveId, patch, actor): Promise<Record<string, unknown>>`.

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/bnp/inventory.test.ts
// updateInventoryDetail is UO's price/detail write path for BNP listings. Since
// 2026-09-08 it calls the BNP service API (validated + attributed on the site)
// instead of writing the mirror. Locks: actor forwarded, room address stripped,
// 503 when the API is not configured (never a silent no-op).
import { describe, it, expect, vi, beforeEach } from "vitest";

const patchProperty = vi.fn();
const patchRoom = vi.fn();
vi.mock("@/lib/bnp/inventory-api", () => ({
  patchBnpProperty: (...a: unknown[]) => patchProperty(...a),
  patchBnpRoom: (...a: unknown[]) => patchRoom(...a),
}));
const configured = vi.fn();
vi.mock("@/lib/bnp/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bnp/api-client")>();
  return { ...actual, bnpApiConfigured: () => configured() };
});
// inventory.ts imports the bnp-db mirror + prisma at module load; neutralise them.
vi.mock("@/lib/bnp-db", () => ({ bnpDb: {}, properties: {}, rooms: {} }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/bnp-admin/properties", () => ({}));
vi.mock("@/lib/bnp/airbnb", () => ({}));

import { updateInventoryDetail } from "./inventory";
import { BnpApiError } from "@/lib/bnp/api-client";

beforeEach(() => {
  patchProperty.mockReset();
  patchRoom.mockReset();
  configured.mockReturnValue(true);
});

describe("updateInventoryDetail", () => {
  it("patches a property through the API with the actor", async () => {
    patchProperty.mockResolvedValue({ id: "p1" });
    await updateInventoryDetail("property", "p1", { biweeklyRate: "700.00", name: "X" }, "alex@x.com");
    expect(patchProperty).toHaveBeenCalledWith("p1", { biweeklyRate: "700.00", name: "X" }, "alex@x.com");
  });
  it("strips a room's address before patching (rooms inherit the property address)", async () => {
    patchRoom.mockResolvedValue({ id: "r1" });
    await updateInventoryDetail("room", "r1", { address: "1 Main", cleaningFee: "50" }, "a@x.com");
    expect(patchRoom).toHaveBeenCalledWith("r1", { cleaningFee: "50" }, "a@x.com");
  });
  it("throws 503 when the BNP API is not configured", async () => {
    configured.mockReturnValue(false);
    await expect(updateInventoryDetail("property", "p1", { name: "X" }, "a")).rejects.toBeInstanceOf(BnpApiError);
    expect(patchProperty).not.toHaveBeenCalled();
  });
});
```
If `inventory.ts` imports other modules that touch a database at load time, add `vi.mock` stubs for them in the same style (check the import list at the top of `inventory.ts`; the ones listed above cover `bnp-db`, `prisma`, `bnp-admin/properties`, and the Airbnb listing reader — adjust the last path to the real module name found in the imports).

- [ ] **Step 2: Run to verify it fails**

Run (UO): `npx vitest run src/lib/bnp/inventory.test.ts`
Expected: FAIL — `updateInventoryDetail` calls `updateProperty` from the mirror and ignores the fourth argument.

- [ ] **Step 3: Rewrite `updateInventoryDetail`**

Add imports at the top of `inventory.ts`:
```ts
import { bnpApiConfigured, BnpApiError } from "@/lib/bnp/api-client";
import { patchBnpProperty, patchBnpRoom } from "@/lib/bnp/inventory-api";
```
Replace the function:
```ts
/**
 * Patch descriptive detail + prices on a live property or room. Since 2026-09-08
 * this goes through the BNP service API (`PATCH /api/uo/properties/:id` /
 * `/api/uo/rooms/:id`): the site validates the patch with its own Zod insert
 * schema and logs `actor`, so a new BNP column is never silently dropped by a
 * stale mirror. `actor` is the signed-in UO user's email. Throws BnpApiError 503
 * (not a silent no-op) when BNP_API_URL/BNP_API_TOKEN are unset.
 */
export async function updateInventoryDetail(
  scope: InventoryScope,
  liveId: string,
  patch: Partial<PropertyInput> | Partial<RoomInput>,
  actor: string,
): Promise<Record<string, unknown>> {
  if (!bnpApiConfigured()) {
    throw new BnpApiError("BNP API is not configured (set BNP_API_URL and BNP_API_TOKEN)", 503);
  }
  if (scope === "property") {
    return patchBnpProperty(liveId, patch as Record<string, unknown>, actor);
  }
  // Rooms inherit the parent property's address — never let a room patch write
  // its own address column (single source of truth).
  const { address: _ignoredRoomAddress, ...roomPatch } = patch as Partial<RoomInput>;
  return patchBnpRoom(liveId, roomPatch as Record<string, unknown>, actor);
}
```
Remove `updateProperty`/`updateRoom` from the `@/lib/bnp-admin/properties` import **only if** nothing else in `inventory.ts` uses them (`assignListingAsRoom` and `unassignListing` do — keep the import).

- [ ] **Step 4: Route passes the actor and pins BNP**

In `src/app/api/bnp-admin/inventory/[id]/route.ts` PATCH handler: import `BNP_BUSINESS_CODE, rejectNonBnpBusinessCode` from `@/lib/bnp-admin/route-helpers`; at the top of the handler add
```ts
    const bcGuard = rejectNonBnpBusinessCode(req);
    if (bcGuard) return bcGuard;
    const authResult = await withModuleAccess(BNP_BUSINESS_CODE, "OPERATIONS", "WRITE");
```
(replacing the `businessCode` query read), and change the detail call to
```ts
        result.detail = await updateInventoryDetail(scope, id, body.detail, authResult.user.email);
```
Apply the same `rejectNonBnpBusinessCode` + `BNP_BUSINESS_CODE` pin to the GET and DELETE handlers in the file (same two-line pattern), and delete the now-unused `const BC = "BNP";`.

- [ ] **Step 5: Run tests, typecheck, lint**

Run (UO): `npx vitest run src/lib/bnp/inventory.test.ts && npm run typecheck && npm run lint`
Expected: PASS / clean.

- [ ] **Step 6: Commit (only if authorised)**

```bash
git add src/lib/bnp/inventory.ts src/lib/bnp/inventory.test.ts "src/app/api/bnp-admin/inventory/[id]/route.ts"
git commit -m "feat(bnp): detail-sheet saves go through the BNP service API with actor

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 12: Inventory types, shaping and inputs carry the new fields

**Files:**
- Modify: `src/lib/bnp/inventory.ts:66-124` (types), `:250-285` (shaping)
- Modify: `src/lib/bnp-admin/properties.ts:100-125` (`PropertyInput`), `:53-75` (`listPropertiesWithRooms` output), `:180-195` (`RoomInput`), `createProperty`/`createRoom` value maps

**Interfaces:**
- Produces: `InventoryProperty.biweeklyRate: string | null`; `InventoryRoom.biweeklyRate: string | null`, `InventoryRoom.cleaningFee: string | null`; `PropertyInput.biweeklyRate?`, `RoomInput.biweeklyRate?`, `RoomInput.cleaningFee?`.

- [ ] **Step 1: Types**

`InventoryRoom`: after `dailyRate: string | null;` add `biweeklyRate: string | null;` and after `depositAmount` add `cleaningFee: string | null;`.
`InventoryProperty`: after `weeklyRate: string | null;` add `biweeklyRate: string | null;`.

- [ ] **Step 2: Shaping in `listBnpInventory`**

Room literal: add `cleaningFee: r.cleaningFee ?? null,` and `biweeklyRate: r.biweeklyRate ?? null,`. Property literal: add `biweeklyRate: p.biweeklyRate ?? null,`. The `satisfies` clauses will fail to compile until both are present.

- [ ] **Step 3: `src/lib/bnp-admin/properties.ts`**

`PropertyInput`: add `biweeklyRate?: string | null;` after `weeklyRate`. `RoomInput`: add `cleaningFee?: string | null;` after `depositAmount` and `biweeklyRate?: string | null;` after `dailyRate`. In `createProperty` values add `biweeklyRate: input.biweeklyRate ?? null,`; in `createRoom` values add `cleaningFee: input.cleaningFee ?? null,` and `biweeklyRate: input.biweeklyRate ?? null,`. In `listPropertiesWithRooms` output add `biweeklyRate: p.biweeklyRate,` to the property object and `cleaningFee: r.cleaningFee, biweeklyRate: r.biweeklyRate,` to the room object.

- [ ] **Step 4: Typecheck + lint**

Run (UO): `npm run typecheck && npm run lint`
Expected: clean.

- [ ] **Step 5: Commit (only if authorised)**

```bash
git add src/lib/bnp/inventory.ts src/lib/bnp-admin/properties.ts
git commit -m "feat(bnp): inventory types + inputs carry biweekly rate and room cleaning fee

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 13: Pricing settings proxy route

**Files:**
- Create: `src/app/api/bnp-admin/pricing-settings/route.ts`
- Test: `tests/routes/bnp-pricing-settings.test.ts`

**Interfaces:**
- Consumes: `getBnpPricingSettings`, `putBnpPricingSettings` (Task 10); `withModuleAccess`, `withErrorHandling`, `runBnp`, `rejectNonBnpBusinessCode`, `BNP_BUSINESS_CODE`, `createAuditLog`, `getIpAddress`, `bnpApiConfigured`, `badRequest`.
- Produces: `GET /api/bnp-admin/pricing-settings?businessCode=BNP` → `{ configured: boolean, lateFeePerDay: number | null, cardSurchargeRate: number | null }`; `PUT` body `{ lateFeePerDay?: number, cardSurchargeRate?: number }` → `{ configured: true, lateFeePerDay, cardSurchargeRate }`. Module: `OPERATIONS`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/routes/bnp-pricing-settings.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

const moduleAccess = vi.fn();
vi.mock("@/lib/api-middleware", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api-middleware")>();
  return { ...actual, withModuleAccess: (...a: unknown[]) => moduleAccess(...a) };
});
const getSettings = vi.fn();
const putSettings = vi.fn();
vi.mock("@/lib/bnp/inventory-api", () => ({
  getBnpPricingSettings: (...a: unknown[]) => getSettings(...a),
  putBnpPricingSettings: (...a: unknown[]) => putSettings(...a),
}));
const configured = vi.fn();
vi.mock("@/lib/bnp/api-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/bnp/api-client")>();
  return { ...actual, bnpApiConfigured: () => configured() };
});
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/permissions", () => ({ checkPermission: vi.fn(), checkBusinessAccess: vi.fn() }));
const audit = vi.fn();
vi.mock("@/lib/audit", () => ({
  createAuditLog: (...a: unknown[]) => audit(...a),
  getIpAddress: vi.fn().mockReturnValue("127.0.0.1"),
}));

import { GET, PUT } from "@/app/api/bnp-admin/pricing-settings/route";

const AUTH = { user: { id: "u1", email: "alex@x.com", role: "ADMIN" }, businessId: "b-bnp" };
const url = (q = "businessCode=BNP") => `http://localhost/api/bnp-admin/pricing-settings?${q}`;

beforeEach(() => {
  vi.clearAllMocks();
  moduleAccess.mockResolvedValue(AUTH);
  configured.mockReturnValue(true);
});

describe("GET", () => {
  it("rejects a non-BNP businessCode", async () => {
    const res = await GET(new NextRequest(url("businessCode=BNA")));
    expect(res.status).toBe(400);
  });
  it("answers configured:false without calling BNP when the API is unset", async () => {
    configured.mockReturnValue(false);
    const res = await GET(new NextRequest(url()));
    expect(await res.json()).toEqual({ configured: false, lateFeePerDay: null, cardSurchargeRate: null });
    expect(getSettings).not.toHaveBeenCalled();
  });
  it("proxies the settings with the actor", async () => {
    getSettings.mockResolvedValue({ lateFeePerDay: 25, cardSurchargeRate: 0.035 });
    const res = await GET(new NextRequest(url()));
    expect(getSettings).toHaveBeenCalledWith("alex@x.com");
    expect(await res.json()).toEqual({ configured: true, lateFeePerDay: 25, cardSurchargeRate: 0.035 });
  });
  it("passes a module-access denial through", async () => {
    moduleAccess.mockResolvedValue(NextResponse.json({ error: "forbidden" }, { status: 403 }));
    const res = await GET(new NextRequest(url()));
    expect(res.status).toBe(403);
  });
});

describe("PUT", () => {
  const put = (body: unknown) =>
    PUT(new NextRequest(url(), { method: "PUT", body: JSON.stringify(body), headers: { "content-type": "application/json" } }));
  it("400s on a body with neither field or a non-number", async () => {
    expect((await put({})).status).toBe(400);
    expect((await put({ lateFeePerDay: "30" })).status).toBe(400);
  });
  it("writes through BNP and audits the result", async () => {
    putSettings.mockResolvedValue({ lateFeePerDay: 30, cardSurchargeRate: 0.035 });
    const res = await put({ lateFeePerDay: 30 });
    expect(putSettings).toHaveBeenCalledWith({ lateFeePerDay: 30 }, "alex@x.com");
    expect(await res.json()).toEqual({ configured: true, lateFeePerDay: 30, cardSurchargeRate: 0.035 });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ entityType: "BnpSetting", entityId: "pricing", after: { lateFeePerDay: 30, cardSurchargeRate: 0.035 } }),
    );
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run (UO): `npx vitest run tests/routes/bnp-pricing-settings.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 3: Implement the route**

```ts
// src/app/api/bnp-admin/pricing-settings/route.ts
// Site-wide BNP pricing settings — late fee per day and card surcharge rate. Both
// live in the BNP site's app_settings and are edited HERE (Site Settings page);
// the listing Pricing tab only displays them. Proxied to BNP's
// GET/PUT /api/uo/settings/pricing with the signed-in user as actor, and audited.
import { NextRequest, NextResponse } from "next/server";
import { withErrorHandling, withModuleAccess } from "@/lib/api-middleware";
import { badRequest } from "@/lib/api-errors";
import { createAuditLog, getIpAddress } from "@/lib/audit";
import { BNP_BUSINESS_CODE, rejectNonBnpBusinessCode, runBnp } from "@/lib/bnp-admin/route-helpers";
import { bnpApiConfigured } from "@/lib/bnp/api-client";
import { getBnpPricingSettings, putBnpPricingSettings } from "@/lib/bnp/inventory-api";

const UNCONFIGURED = { configured: false, lateFeePerDay: null, cardSurchargeRate: null };

export const GET = withErrorHandling("GET /api/bnp-admin/pricing-settings", async (req: NextRequest) => {
  const bcGuard = rejectNonBnpBusinessCode(req);
  if (bcGuard) return bcGuard;
  const authResult = await withModuleAccess(BNP_BUSINESS_CODE, "OPERATIONS", "READ");
  if (authResult instanceof NextResponse) return authResult;
  if (!bnpApiConfigured()) return NextResponse.json(UNCONFIGURED);
  return runBnp(async () => ({ configured: true, ...(await getBnpPricingSettings(authResult.user.email)) }));
});

export const PUT = withErrorHandling("PUT /api/bnp-admin/pricing-settings", async (req: NextRequest) => {
  const bcGuard = rejectNonBnpBusinessCode(req);
  if (bcGuard) return bcGuard;
  const authResult = await withModuleAccess(BNP_BUSINESS_CODE, "OPERATIONS", "WRITE");
  if (authResult instanceof NextResponse) return authResult;

  const body = (await req.json().catch(() => null)) as { lateFeePerDay?: unknown; cardSurchargeRate?: unknown } | null;
  if (!body) return badRequest("JSON body required");
  const values: { lateFeePerDay?: number; cardSurchargeRate?: number } = {};
  if (body.lateFeePerDay !== undefined) {
    if (typeof body.lateFeePerDay !== "number" || !Number.isFinite(body.lateFeePerDay)) return badRequest("lateFeePerDay must be a number");
    values.lateFeePerDay = body.lateFeePerDay;
  }
  if (body.cardSurchargeRate !== undefined) {
    if (typeof body.cardSurchargeRate !== "number" || !Number.isFinite(body.cardSurchargeRate)) return badRequest("cardSurchargeRate must be a number");
    values.cardSurchargeRate = body.cardSurchargeRate;
  }
  if (values.lateFeePerDay === undefined && values.cardSurchargeRate === undefined) {
    return badRequest("Provide lateFeePerDay and/or cardSurchargeRate");
  }

  return runBnp(async () => {
    const result = await putBnpPricingSettings(values, authResult.user.email);
    await createAuditLog({
      userId: authResult.user.id,
      action: "UPDATE",
      entityType: "BnpSetting",
      entityId: "pricing",
      businessId: authResult.businessId,
      after: { lateFeePerDay: result.lateFeePerDay, cardSurchargeRate: result.cardSurchargeRate },
      ipAddress: getIpAddress(req),
    });
    return { configured: true, ...result };
  });
});
```
Range validation (0–500, 0–0.10) is enforced by BNP and surfaces as a 400 through `runBnp`; UO only checks types.

- [ ] **Step 4: Run tests, typecheck, lint**

Run (UO): `npx vitest run tests/routes/bnp-pricing-settings.test.ts && npm run typecheck && npm run lint`
Expected: PASS / clean.

- [ ] **Step 5: Commit (only if authorised)**

```bash
git add src/app/api/bnp-admin/pricing-settings/route.ts tests/routes/bnp-pricing-settings.test.ts
git commit -m "feat(bnp): pricing-settings proxy route (late fee, card surcharge) with audit

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 14: Pricing tab fields + read-only global block; Site Settings Pricing card

**Files:**
- Modify: `src/components/bnp/admin/bnp-inventory-admin.tsx:1150-1175` (seed), `:1464-1587` (Pricing tab)
- Modify: `src/components/bnp/admin/bnp-site-settings-admin.tsx`

**Interfaces:**
- Consumes: `GET/PUT /api/bnp-admin/pricing-settings` (Task 13); `InventoryProperty.biweeklyRate`, `InventoryRoom.biweeklyRate/cleaningFee` (Task 12); `send(url, method, body?)` (existing sheet prop).

- [ ] **Step 1: Seed the new fields in the detail sheet**

In the `useEffect` that seeds `detail` (~line 1150): property branch add `biweeklyRate: d.biweeklyRate,` after `weeklyRate: d.weeklyRate,`; room branch add `biweeklyRate: d.biweeklyRate,` after `dailyRate` and `cleaningFee: d.cleaningFee,` after `depositAmount`.

In `saveDetail`'s `ltrNulls` (~line 1205) add `biweeklyRate: null,` to the LTR branch (LTR carries two prices only).

- [ ] **Step 2: Fetch the site-wide values when the sheet opens**

Add state near the other sheet state: `const [globalPricing, setGlobalPricing] = useState<{ configured: boolean; lateFeePerDay: number | null; cardSurchargeRate: number | null } | null>(null);`
In the seeding `useEffect`, after `setPhotos(...)`:
```ts
    send(`/api/bnp-admin/pricing-settings?${qs}`, "GET")
      .then((j) => setGlobalPricing(j as typeof globalPricing))
      .catch(() => setGlobalPricing({ configured: false, lateFeePerDay: null, cardSurchargeRate: null }));
```
(`send` and `qs` are already props of `DetailSheet`.)

- [ ] **Step 3: Pricing tab — non-LTR branch**

Change the first rate row from `grid-cols-3` to `grid-cols-4` and insert a Biweekly field between Weekly and Monthly:
```tsx
                  <Field label="Biweekly">
                    <Input
                      inputMode="decimal"
                      value={detail.biweeklyRate ?? ""}
                      onChange={(e) => set("biweeklyRate", e.target.value)}
                    />
                  </Field>
```
In the second row, the room branch currently renders only Deposit; make it two fields:
```tsx
                  {isRoom ? (
                    <>
                      <Field label="Deposit">
                        <Input inputMode="decimal" value={detail.depositAmount ?? ""} onChange={(e) => set("depositAmount", e.target.value)} />
                      </Field>
                      <Field label="Cleaning fee (one-time)">
                        <Input inputMode="decimal" value={detail.cleaningFee ?? ""} onChange={(e) => set("cleaningFee", e.target.value)} />
                      </Field>
                    </>
                  ) : (
```
Replace the stale helper paragraph ("Bookings auto-apply the best rate for the stay length (28+ nights → monthly, 7+ → weekly, else daily)…") with:
```tsx
                <p className="text-xs text-muted-foreground">
                  Stays are priced by cascading tiers, monthly, then biweekly, then weekly, then daily,
                  using each tier&apos;s rate; a blank tier falls back to the next shorter one.
                  {!isRoom && " Under 7 nights, any weekday prices set above bill per night (summed) and override the daily rate."}
                </p>
```
Update the weekday helper line "Stays under 7 nights bill the sum…" to "The daily tail of a stay bills the sum of each night's weekday price. Blank weekdays fall back to the Daily / Nightly fallback rate."

- [ ] **Step 4: Read-only "Applies to all listings" block**

After the Save pricing button in the non-LTR branch (and also after the LTR Save button — extract to a small `GlobalPricingNote` component beside `Field` at the bottom of the file and render it in both places):
```tsx
function GlobalPricingNote({
  pricing,
  businessCode,
}: {
  pricing: { configured: boolean; lateFeePerDay: number | null; cardSurchargeRate: number | null } | null;
  businessCode: string;
}) {
  const href = `/${businessCode.toLowerCase()}/bnp-admin/site-settings`;
  return (
    <div className="rounded-md border border-dashed border-border p-3 text-xs">
      <div className="mb-1 font-medium text-foreground">Applies to all listings</div>
      {pricing === null ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : !pricing.configured ? (
        <p className="text-muted-foreground">Connect BNP API to see site-wide pricing.</p>
      ) : (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-muted-foreground">
          <span>Late fee: <span className="text-foreground">${(pricing.lateFeePerDay ?? 0).toFixed(2)}/day</span></span>
          <span>Card surcharge: <span className="text-foreground">{Math.round((pricing.cardSurchargeRate ?? 0) * 10000) / 100}%</span></span>
        </div>
      )}
      <a href={href} className="mt-1 inline-block underline underline-offset-2 hover:text-foreground">
        Edit in Site Settings
      </a>
    </div>
  );
}
```
Render `<GlobalPricingNote pricing={globalPricing} businessCode={businessCode} />` under each Save button.

- [ ] **Step 5: Site Settings Pricing card**

In `bnp-site-settings-admin.tsx`, add state and loader:
```tsx
  type Pricing = { configured: boolean; lateFeePerDay: number | null; cardSurchargeRate: number | null };
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [lateFee, setLateFee] = useState("");
  const [surchargePct, setSurchargePct] = useState("");
  const [savingPricing, setSavingPricing] = useState(false);

  const loadPricing = useCallback(async () => {
    try {
      const res = await fetch(`/api/bnp-admin/pricing-settings?${qs}`);
      if (!res.ok) throw new Error(`Failed to load pricing (${res.status})`);
      const p = (await res.json()) as Pricing;
      setPricing(p);
      setLateFee(p.lateFeePerDay == null ? "" : String(p.lateFeePerDay));
      setSurchargePct(p.cardSurchargeRate == null ? "" : String(Math.round(p.cardSurchargeRate * 10000) / 100));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load pricing settings");
    }
  }, [qs]);
  useEffect(() => { loadPricing(); }, [loadPricing]);

  async function savePricing() {
    const fee = Number(lateFee);
    const pct = Number(surchargePct);
    if (!Number.isFinite(fee) || !Number.isFinite(pct)) { toast.error("Enter numbers"); return; }
    setSavingPricing(true);
    try {
      const res = await fetch(`/api/bnp-admin/pricing-settings?${qs}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lateFeePerDay: fee, cardSurchargeRate: Math.round(pct * 100) / 10000 }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || `Save failed (${res.status})`);
      setPricing(json as Pricing);
      toast.success("Pricing settings saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingPricing(false);
    }
  }
```
Render below the page-visibility section (inside the same `max-w-3xl` wrapper, after the existing `<p>`), importing `Input`, `Button`, `Label` from `@/components/ui/*` and `DollarSign` from `lucide-react`:
```tsx
          <h3 className="pt-4 text-sm font-semibold text-foreground">Pricing</h3>
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">Site-wide rates</span>
                <p className="mt-1 text-sm text-muted-foreground">
                  Per-listing prices live on each listing&apos;s Pricing tab. These two apply everywhere.
                </p>
                {pricing === null ? (
                  <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
                ) : !pricing.configured ? (
                  <p className="mt-3 text-sm text-amber-600">Connect BNP API (BNP_API_URL / BNP_API_TOKEN) to edit pricing.</p>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="grid gap-1">
                        <Label className="text-xs">Late fee ($ per day)</Label>
                        <Input inputMode="decimal" value={lateFee} onChange={(e) => setLateFee(e.target.value)} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Card surcharge (%)</Label>
                        <Input inputMode="decimal" value={surchargePct} onChange={(e) => setSurchargePct(e.target.value)} />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Applies to new leases and quotes. Signed leases keep the rates they were signed under.
                    </p>
                    <Button onClick={savePricing} disabled={savingPricing} className="mt-3">
                      {savingPricing ? "Saving…" : "Save pricing"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
```
Update the `PageHeader` subtitle to end with "…flip it back on when it's ready. Site-wide pricing rates are also set here."

- [ ] **Step 6: Typecheck, lint, visual check**

Run (UO): `npm run typecheck && npm run lint`
Expected: clean. Then start UO (`npm run dev`), open `/bnp/bnp-admin/inventory`, open a room's detail sheet → Pricing tab shows Daily · Weekly (billing) · Biweekly · Monthly, Deposit · Cleaning fee, the cascade copy, and the "Applies to all listings" block with a Site Settings link. Open `/bnp/bnp-admin/site-settings` → Pricing card renders. **Do not click Save** against production data in this session; saving is verified by Alex after deploy (Task 15 records the steps). Take one screenshot of each surface for the report.

- [ ] **Step 7: Commit (only if authorised)**

```bash
git add src/components/bnp/admin/bnp-inventory-admin.tsx src/components/bnp/admin/bnp-site-settings-admin.tsx
git commit -m "feat(bnp): Pricing tab gains biweekly + room cleaning fee, cascade copy, site-wide read-only block; Site Settings pricing card

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 15: UO docs and full verification

**Files:**
- Modify: `docs/system_map.md:48-50, 55-71`, `.env.example:14-25`

- [ ] **Step 1: `docs/system_map.md`**

In the env table, extend the `BNP_API_URL` row's description: "…confirm/cancel+refund a conflicted booking, **edit property/room details and prices, set the site-wide late fee and card surcharge**) — see `src/lib/bnp/api-client.ts` and `src/lib/bnp/inventory-api.ts`". In the deploy-order section add a bullet under the numbered list: "2026-09-08: the pricing write-back release requires BNP to run `scripts/push-pricing-snapshots.mjs` first (two nullable `leases` columns), then deploy BNP, then UO. Drift check: `npm run bnp:schema:check`."

- [ ] **Step 2: `.env.example`**

Extend the `BNP_API_URL` comment block: "Since 2026-09-08 this is also the write path for listing details, prices (Inventory → Pricing tab) and the site-wide late fee / card surcharge (Site Settings). With it unset, those saves fail with a visible 'Connect BNP API' error rather than silently doing nothing."

- [ ] **Step 3: Full verification**

Run (UO): `npm run typecheck && npm run lint && npm test && npm run bnp:schema:check`
Expected: all clean; schema check 0 errors. Record the test count.

- [ ] **Step 4: Commit (only if authorised)**

```bash
git add docs/system_map.md .env.example
git commit -m "docs(bnp): pricing write-back release notes, env comment, schema check

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

- [ ] **Step 5: Report**

Final message to Alex must contain: files changed per repo, the exact commands run with results, the owner steps in order (migration → BNP deploy → UO deploy → live verification), what remains unverified (live save from UO against production, the two Vercel deploys), and the legal flag from the spec.

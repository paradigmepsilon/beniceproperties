# Booking Deconfliction, Admin Alerts, Guest Messaging — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make BNP bookings impossible to double-sell, alert the owner (email + Telegram) on every booking event, let staff message guests with delivery tracking, and let Unified Ops manage all of it.

**Architecture:** BNP (Express + Drizzle on Neon) stays the system of record. Availability is derived from four overlapping sources (direct bookings, leases, Airbnb blocks, manual blocks) plus a Postgres exclusion constraint. A single `message_log` table records every outbound/inbound message; `notifyAdmin` fans out to email + Telegram. Unified Ops reads BNP's DB directly (existing pattern) and calls BNP's service-token API for side effects.

**Tech Stack:** TypeScript, Express, Drizzle ORM (neon-http), Zod, Vitest, React 18 + shadcn/ui + TanStack Query (BNP); Next.js 15 + Vitest (Unified Ops).

**Spec:** `docs/superpowers/specs/2026-09-02-booking-deconfliction-and-messaging-design.md`

## Global Constraints

- Stripe TEST keys only in code paths you exercise locally; never trigger a live charge or refund. Refunds happen only via the explicit admin/UO action added in Task 6.
- No guest notification may fire for the two backfilled bookings (BNP-5F2B-WNJM, BNP-BGFK-W3FL). Auto-sends only run from the webhook path.
- Additive schema only. Every DDL statement is `IF NOT EXISTS` / idempotent. Do NOT run `scripts/push-deconfliction-messaging.mjs` against the production DB from this plan; the owner runs it (spec "Operational steps").
- All dates on the wire are `YYYY-MM-DD` strings. Range `end` is EXCLUSIVE (first free day) for bookings, external blocks, manual blocks, and `BusyRange`. Lease `endDate` is INCLUSIVE.
- Never log or commit secrets. Env var NAMES only.
- Every task: `npm run check` (tsc) and `npm test` green before commit. Commit messages end with `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`.
- Work on branch `feat/booking-deconfliction-and-messaging` (BNP) and `feat/bnp-date-fix-and-management` (UO). Do not push, do not deploy.

## File Structure

BNP (`/Users/alexhenry/Projects/Websites/BNP`):
- `shared/dates.ts` — NEW: `todayIso()` (America/New_York) and `addDaysIso()`.
- `shared/schema.ts` — MODIFY: enums, `manual_blocks`, `message_log`, nullable/booking columns.
- `shared/api-types.ts` — MODIFY: `BusyRange.source` adds `"manual"`.
- `scripts/push-deconfliction-messaging.mjs` — NEW: idempotent DDL + settings seed.
- `scripts/backup-tables.mjs` — NEW: exports named tables to `docs/migration-backups/`.
- `server/storage.ts` — MODIFY: manual blocks, message log, availability signature, booking/message helpers.
- `server/lib/availability.ts`, `server/lib/booking.ts`, `server/lib/lease.ts` — MODIFY: manual blocks + status gate.
- `client/src/lib/availability.ts`, `client/src/pages/room-detail.tsx`, `client/src/pages/lease-booking.tsx` — MODIFY: half-open.
- `server/lib/telegram.ts` — NEW.
- `server/lib/notifications.ts` — MODIFY: `notifyAdmin`, message_log context.
- `server/lib/lifecycle.ts` — MODIFY: `onBookingConfirmed`, templates.
- `server/lib/adminMessages.ts` — NEW: `sendStaffMessage`, thread listing.
- `server/lib/bookingConflicts.ts` — NEW: `materializeOrConflict` helpers (confirm/cancel/refund actions).
- `server/lib/icalSync.ts` — MODIFY: host blocks setting, last-sync settings.
- `server/lib/uoApi.ts` — MODIFY: `respondToMessage` delegates.
- `server/routes.ts` — MODIFY: materialize path, admin + UO routes.
- `api-src/cron/sweep.ts`, `server/scheduler.ts` — MODIFY: occupancy sync + stale sync alert.
- `client/src/pages/admin/dashboard.tsx` — MODIFY: Messages tab, Blocks, sync status, conflict actions.
- `docs/build-log.md` — APPEND.

Unified Ops (`/Users/alexhenry/Projects/Unified Ops Folder/Unified-Ops`):
- `src/lib/format-date.ts` — NEW + test.
- `src/components/bnp/admin/bnp-bookings-admin.tsx`, `src/components/crm/contact-stay-history.tsx`, `src/components/bnp/admin/bnp-inventory-admin.tsx` — MODIFY.
- `src/lib/bnp-db.ts` — MODIFY: mirror `manual_blocks`, `message_log`.
- `src/lib/bnp/ical-export.ts`, `src/lib/bnp/availability.ts` — MODIFY: manual blocks.
- `src/lib/bnp/api-client.ts` — NEW.
- `src/components/bnp/admin/bnp-messages-admin.tsx`, `bnp-blocks-admin.tsx` — NEW; bookings/availability pages — MODIFY.

---

### Task 1: Shared dates helper + schema additions + push script

**Files:**
- Create: `shared/dates.ts`, `shared/dates.test.ts`
- Modify: `shared/schema.ts` (enums at :46-52, :185-201, guest_messages :1110-1134, lifecycle_events :1152-1189, add two tables after external_bookings :1325)
- Modify: `shared/api-types.ts:66-70`
- Create: `scripts/push-deconfliction-messaging.mjs`, `scripts/backup-tables.mjs`

**Interfaces:**
- Produces: `todayIso(): string`, `addDaysIso(iso: string, days: number): string`; tables `manualBlocks`, `messageLog` with insert schemas/types `ManualBlock`, `InsertManualBlock`, `MessageLogRow`, `InsertMessageLog`; enums `MANUAL_BLOCK_KINDS`, `MESSAGE_CHANNELS`, `MESSAGE_DIRECTIONS`, `MESSAGE_AUDIENCES`, `MESSAGE_LOG_STATUSES`; `BOOKING_STATUSES` gains `"CONFLICT"`; `ESCALATION_KINDS` gains `"BOOKING_CONFLICT"`, `"CALENDAR_SYNC_FAILED"`; `LIFECYCLE_EVENT_TYPES` gains `"BOOKING_CONFIRMED"`, `"ADMIN_NEW_BOOKING"`; `guestMessages.leaseId` nullable + `bookingId`; `lifecycleEvents.leaseId` nullable + `bookingId`; `uoEscalations.leaseId` nullable + `bookingId`; `BusyRange.source: "direct" | "external" | "manual"`.

- [ ] **Step 1: Write the failing test** `shared/dates.test.ts`

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { todayIso, addDaysIso } from "./dates";

afterEach(() => vi.useRealTimers());

describe("todayIso", () => {
  it("returns the New York calendar day, not the UTC day", () => {
    // 2026-09-03T02:30Z is still Sep 2 in New York (EDT, UTC-4).
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-03T02:30:00Z"));
    expect(todayIso()).toBe("2026-09-02");
  });
});

describe("addDaysIso", () => {
  it("adds calendar days without timezone drift", () => {
    expect(addDaysIso("2026-09-30", 1)).toBe("2026-10-01");
    expect(addDaysIso("2026-03-08", 1)).toBe("2026-03-09"); // DST start weekend
    expect(addDaysIso("2026-01-01", -1)).toBe("2025-12-31");
  });
});
```

- [ ] **Step 2: Run** `npx vitest run shared/dates.test.ts` — expect FAIL (module not found).

- [ ] **Step 3: Implement** `shared/dates.ts`

```ts
// shared/dates.ts — one source of truth for "today" and day arithmetic on
// YYYY-MM-DD strings. Calendar days are hotel-local (America/New_York);
// arithmetic is done in UTC so DST never shifts a day.
export const HOTEL_TZ = "America/New_York";

export function todayIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TZ, year: "numeric", month: "2-digit", day: "2-digit",
  }).format(now);
}

export function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
```

- [ ] **Step 4: Run** `npx vitest run shared/dates.test.ts` — expect PASS.

- [ ] **Step 5: Schema changes in `shared/schema.ts`**

Replace the `BOOKING_STATUSES` block (:46-52) with:
```ts
export const BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
  // Paid, but the dates were taken (race / OTA block / constraint). Does NOT block
  // dates and never auto-notifies the guest. Admin resolves: confirm or cancel+refund.
  "CONFLICT",
] as const;
```
Add to `ESCALATION_KINDS` (:191-196): `"BOOKING_CONFLICT", "CALENDAR_SYNC_FAILED"`.
Add to `LIFECYCLE_EVENT_TYPES` (:1152): `"BOOKING_CONFIRMED", // short-stay booking materialized (guest)` and `"ADMIN_NEW_BOOKING", // short-stay booking materialized (admin)`.
In `guestMessages`: change `leaseId: varchar("lease_id").notNull()` → `leaseId: varchar("lease_id")`, add `bookingId: varchar("booking_id")` after it, add index `bookingIdx: index("guest_messages_booking_idx").on(table.bookingId)`.
In `lifecycleEvents`: same two changes (`lease_id` nullable, `booking_id` added, index `lifecycle_events_booking_idx`).
In `uoEscalations`: same (`lease_id` nullable, `booking_id` added, index `uo_escalations_booking_idx`).
After `externalBookings` add:
```ts
// =============================================================================
// manual_blocks — owner/UO-entered unavailability: off-platform bookings,
// maintenance, owner use. end_date is EXCLUSIVE (first free day), like
// external_bookings and BusyRange. room_id null = whole STR property.
// =============================================================================
export const MANUAL_BLOCK_KINDS = ["OFF_PLATFORM_BOOKING", "MAINTENANCE", "OWNER_USE", "OTHER"] as const;
export const MANUAL_BLOCK_SOURCES = ["ADMIN", "UO"] as const;

export const manualBlocks = pgTable(
  "manual_blocks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id").notNull().references(() => properties.id),
    roomId: varchar("room_id").references(() => rooms.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    kind: text("kind").notNull().default("OTHER"),
    note: text("note"),
    guestName: text("guest_name"),
    source: text("source").notNull().default("ADMIN"),
    createdBy: text("created_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyRangeIdx: index("manual_blocks_property_range_idx").on(table.propertyId, table.startDate, table.endDate),
    roomRangeIdx: index("manual_blocks_room_range_idx").on(table.roomId, table.startDate, table.endDate),
  }),
);
export const insertManualBlockSchema = createInsertSchema(manualBlocks, {
  kind: z.enum(MANUAL_BLOCK_KINDS).optional(),
  source: z.enum(MANUAL_BLOCK_SOURCES).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });
export type ManualBlock = typeof manualBlocks.$inferSelect;
export type InsertManualBlock = z.infer<typeof insertManualBlockSchema>;

// =============================================================================
// message_log — the single audit trail of every message the platform sends or
// receives (guest + admin, every channel). Written by the send layer itself so
// nothing can send without leaving a row. No card data; bodies may hold guest
// names/addresses — treat as PII.
// =============================================================================
export const MESSAGE_DIRECTIONS = ["OUTBOUND", "INBOUND"] as const;
export const MESSAGE_AUDIENCES = ["GUEST", "ADMIN"] as const;
export const MESSAGE_CHANNELS = ["EMAIL", "SMS", "TELEGRAM", "PORTAL"] as const;
export const MESSAGE_LOG_STATUSES = ["SENT", "FAILED", "DRY_RUN", "SKIPPED"] as const;

export const messageLog = pgTable(
  "message_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id"),
    leaseId: varchar("lease_id"),
    guestId: varchar("guest_id"),
    direction: text("direction").notNull().default("OUTBOUND"),
    audience: text("audience").notNull().default("GUEST"),
    channel: text("channel").notNull(),
    // Template key (e.g. BOOKING_CONFIRMED) or MANUAL for staff-composed.
    kind: text("kind").notNull().default("MANUAL"),
    toAddress: text("to_address"),
    subject: text("subject"),
    body: text("body").notNull(),
    status: text("status").notNull(),
    providerRef: text("provider_ref"),
    error: text("error"),
    // "system" | admin email | "uo:<actor>"
    sentBy: text("sent_by").notNull().default("system"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index("message_log_booking_idx").on(table.bookingId),
    leaseIdx: index("message_log_lease_idx").on(table.leaseId),
    guestIdx: index("message_log_guest_idx").on(table.guestId),
    createdIdx: index("message_log_created_idx").on(table.createdAt),
  }),
);
export const insertMessageLogSchema = createInsertSchema(messageLog, {
  direction: z.enum(MESSAGE_DIRECTIONS).optional(),
  audience: z.enum(MESSAGE_AUDIENCES).optional(),
  channel: z.enum(MESSAGE_CHANNELS),
  status: z.enum(MESSAGE_LOG_STATUSES),
}).omit({ id: true, createdAt: true });
export type MessageLogRow = typeof messageLog.$inferSelect;
export type InsertMessageLog = z.infer<typeof insertMessageLogSchema>;
```
In `shared/api-types.ts:69` change `source: "direct" | "external";` → `source: "direct" | "external" | "manual";`.

- [ ] **Step 6: Push script** `scripts/push-deconfliction-messaging.mjs` (pattern: `push-room-cleaning-fee.mjs`). Statements, in order:

```js
const statements = [
  `CREATE EXTENSION IF NOT EXISTS btree_gist`,
  `CREATE TABLE IF NOT EXISTS "manual_blocks" (
     "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     "property_id" varchar NOT NULL REFERENCES "properties"("id"),
     "room_id" varchar REFERENCES "rooms"("id"),
     "start_date" date NOT NULL, "end_date" date NOT NULL,
     "kind" text NOT NULL DEFAULT 'OTHER', "note" text, "guest_name" text,
     "source" text NOT NULL DEFAULT 'ADMIN', "created_by" text,
     "created_at" timestamp NOT NULL DEFAULT now(), "updated_at" timestamp NOT NULL DEFAULT now(),
     CONSTRAINT manual_blocks_range_chk CHECK (end_date > start_date))`,
  `CREATE INDEX IF NOT EXISTS manual_blocks_property_range_idx ON manual_blocks(property_id, start_date, end_date)`,
  `CREATE INDEX IF NOT EXISTS manual_blocks_room_range_idx ON manual_blocks(room_id, start_date, end_date)`,
  `CREATE TABLE IF NOT EXISTS "message_log" (
     "id" varchar PRIMARY KEY DEFAULT gen_random_uuid(),
     "booking_id" varchar, "lease_id" varchar, "guest_id" varchar,
     "direction" text NOT NULL DEFAULT 'OUTBOUND', "audience" text NOT NULL DEFAULT 'GUEST',
     "channel" text NOT NULL, "kind" text NOT NULL DEFAULT 'MANUAL',
     "to_address" text, "subject" text, "body" text NOT NULL, "status" text NOT NULL,
     "provider_ref" text, "error" text, "sent_by" text NOT NULL DEFAULT 'system',
     "created_at" timestamp NOT NULL DEFAULT now())`,
  `CREATE INDEX IF NOT EXISTS message_log_booking_idx ON message_log(booking_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_lease_idx ON message_log(lease_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_guest_idx ON message_log(guest_id)`,
  `CREATE INDEX IF NOT EXISTS message_log_created_idx ON message_log(created_at)`,
  `ALTER TABLE "guest_messages" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "guest_messages" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS guest_messages_booking_idx ON guest_messages(booking_id)`,
  `ALTER TABLE "lifecycle_events" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "lifecycle_events" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS lifecycle_events_booking_idx ON lifecycle_events(booking_id)`,
  `ALTER TABLE "uo_escalations" ALTER COLUMN "lease_id" DROP NOT NULL`,
  `ALTER TABLE "uo_escalations" ADD COLUMN IF NOT EXISTS "booking_id" varchar`,
  `CREATE INDEX IF NOT EXISTS uo_escalations_booking_idx ON uo_escalations(booking_id)`,
  // Exclusion constraints: two live bookings can never overlap on one room /
  // one whole-property STR. CONFLICT and CANCELLED rows are exempt.
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_room_no_overlap') THEN
       ALTER TABLE bookings ADD CONSTRAINT bookings_room_no_overlap
         EXCLUDE USING gist (room_id WITH =, daterange(check_in, check_out) WITH &&)
         WHERE (room_id IS NOT NULL AND check_out IS NOT NULL AND status NOT IN ('CANCELLED','CONFLICT'));
     END IF;
   END $$`,
  `DO $$ BEGIN
     IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bookings_str_no_overlap') THEN
       ALTER TABLE bookings ADD CONSTRAINT bookings_str_no_overlap
         EXCLUDE USING gist (property_id WITH =, daterange(check_in, check_out) WITH &&)
         WHERE (room_id IS NULL AND model = 'STR' AND check_out IS NOT NULL AND status NOT IN ('CANCELLED','CONFLICT'));
     END IF;
   END $$`,
  `INSERT INTO app_settings (key, value) VALUES ('ical_honor_host_blocks', 'true') ON CONFLICT (key) DO NOTHING`,
  `INSERT INTO app_settings (key, value) VALUES ('guest_auto_notifications', 'true') ON CONFLICT (key) DO NOTHING`,
];
```
Check `app_settings` column names in `shared/schema.ts:1041` before writing the INSERTs (adjust `key`/`value` to the real column names and any `updated_at`).

`scripts/backup-tables.mjs`: takes table names as argv, writes `docs/migration-backups/<YYYY-MM-DD>-<table>.json` with `SELECT *` rows (mask nothing; the folder is gitignored — verify with `git check-ignore docs/migration-backups`; if it is NOT ignored, add it to `.gitignore` in this task). Header comment: "Run before any push script: `node scripts/backup-tables.mjs bookings guest_messages lifecycle_events uo_escalations`."

- [ ] **Step 7: Verify** `npm run check` and `npm test` pass (existing tests only compile; nothing runs the push script). Fix any type fallout from nullable `leaseId` (grep `leaseId` usages in `server/lib/uoApi.ts`, `portal.ts`, `dunning.ts`, `lifecycle.ts` — add `?? null` / narrowing as needed; do not change behavior).

- [ ] **Step 8: Commit** `feat(schema): manual blocks, message log, booking-scoped messages/events, CONFLICT status, shared date helpers`

---

### Task 2: Storage — manual blocks, message log, availability signature, helpers

**Files:**
- Modify: `server/storage.ts` (interface `IStorage` near top + `DatabaseStorage`; availability at :1001-1036; external helpers at :1093-1110; messages at :736-790)
- Test: `server/storage.availability.test.ts` (new; pure-logic tests via a small extracted function)

**Interfaces:**
- Produces on `storage`:
  - `getManualBlocksForRoom(roomId): Promise<ManualBlock[]>`, `getManualBlocksForProperty(propertyId): Promise<ManualBlock[]>` (property-level = `room_id IS NULL`), `getManualBlocks(opts?: { propertyId?; roomId?; from?: string }): Promise<ManualBlock[]>`, `createManualBlock(data: InsertManualBlock)`, `deleteManualBlock(id)`.
  - `isRoomAvailableForRange(args: { roomId; startDate; endDate; endExclusive: boolean; excludeLeaseId?; excludeBookingId? })` — now includes manual blocks.
  - `createMessageLog(data: InsertMessageLog): Promise<MessageLogRow>`, `getMessageLog(opts: { bookingId?; leaseId?; guestId?; limit? }): Promise<MessageLogRow[]>`.
  - `getMessageThreadsByBooking(bookingId)`, `getMessageThreadRoots(opts?: { status? })` (single query over roots: `thread_id = id`).
  - `getBookingsWithGuest(opts?: { statuses?: string[]; from?: string })` returning `Array<Booking & { guest: Guest; property: Property; room: Room | null }>`.
  - `getOccupiedRoomIdsOn(dateIso): Promise<Set<string>>` (rooms with a live booking, blocking lease, external or manual block covering the date).
- Exports pure helper `overlapsRange(a: {start; end; endExclusive: boolean}, b: {start; end; endExclusive: boolean}): boolean` from `server/lib/ranges.ts` (NEW) used by storage + booking.ts.

- [ ] **Step 1: Write failing tests** `server/lib/ranges.test.ts`

```ts
import { describe, it, expect } from "vitest";
import { overlapsRange } from "./ranges";

const X = (start: string, end: string, endExclusive = true) => ({ start, end, endExclusive });

describe("overlapsRange", () => {
  it("half-open vs half-open: same-day turnover is free", () => {
    expect(overlapsRange(X("2026-09-01", "2026-09-07"), X("2026-09-07", "2026-09-10"))).toBe(false);
    expect(overlapsRange(X("2026-09-01", "2026-09-07"), X("2026-09-06", "2026-09-10"))).toBe(true);
  });
  it("inclusive lease end occupies its end date", () => {
    expect(overlapsRange(X("2026-09-01", "2026-09-07", false), X("2026-09-07", "2026-09-10"))).toBe(true);
    expect(overlapsRange(X("2026-09-01", "2026-09-07", false), X("2026-09-08", "2026-09-10"))).toBe(false);
  });
  it("a stay checking out the day a lease starts is free", () => {
    expect(overlapsRange(X("2026-09-05", "2026-09-12"), X("2026-09-12", "2026-10-10", false))).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run server/lib/ranges.test.ts` — FAIL.

- [ ] **Step 3: Implement** `server/lib/ranges.ts`

```ts
// Normalize every range to half-open [start, endExclusive) then test overlap.
import { addDaysIso } from "@shared/dates";
export interface DateRange { start: string; end: string; endExclusive: boolean }
export function toHalfOpen(r: DateRange): { start: string; end: string } {
  return { start: r.start, end: r.endExclusive ? r.end : addDaysIso(r.end, 1) };
}
export function overlapsRange(a: DateRange, b: DateRange): boolean {
  const A = toHalfOpen(a), B = toHalfOpen(b);
  return A.start < B.end && B.start < A.end;
}
```

- [ ] **Step 4: Run** — PASS.

- [ ] **Step 5: Storage implementation.** Rewrite `isRoomAvailableForRange`:

```ts
async isRoomAvailableForRange(args: {
  roomId: string; startDate: string; endDate: string; endExclusive: boolean;
  excludeLeaseId?: string; excludeBookingId?: string;
}): Promise<boolean> {
  const want = { start: args.startDate, end: args.endDate, endExclusive: args.endExclusive };
  const leases = (await this.getRoomBlockingLeasesForRoom(args.roomId)).filter((l) => l.id !== args.excludeLeaseId);
  if (leases.some((l) => overlapsRange(want, { start: l.startDate, end: l.endDate, endExclusive: false }))) return false;
  const bookings = (await this.getColivingBookingsForRoom(args.roomId)).filter((b) => b.id !== args.excludeBookingId && b.status !== "CONFLICT");
  if (bookings.some((b) => b.checkOut !== null && overlapsRange(want, { start: b.checkIn, end: b.checkOut, endExclusive: true }))) return false;
  const ext = await this.getExternalBlocksForRoom(args.roomId);
  if (ext.some((b) => overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true }))) return false;
  const manual = await this.getManualBlocksForRoom(args.roomId);
  return !manual.some((b) => overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true }));
}
```
Update every caller: `booking.ts:215` passes `endExclusive: true`; `lease.ts` / `createLeaseWithSchedule` (storage :664 region) pass `endExclusive: false`. `getColivingBookingsForRoom` must exclude `CONFLICT` as well as `CANCELLED` (check its `where`). Add the manual-block, message-log, thread-root, bookings-with-guest, and occupied-rooms methods with Drizzle queries (`manualBlocks`, `messageLog` imported from `@shared/schema`). `getMessageThreadRoots` = `where(sql\`${guestMessages.threadId} = ${guestMessages.id}\`)` + optional status, `orderBy(desc(createdAt))`. `getBookingsWithGuest` = left joins on guests/properties/rooms; default statuses `["CONFIRMED","ACTIVE","CONFLICT","PENDING_PAYMENT"]`.

- [ ] **Step 6: Verify** `npm run check && npm test` (update `booking.test.ts` / `lease.test.ts` mocks that stub `isRoomAvailableForRange` if the new arg breaks assertions — assert the new `endExclusive` value).

- [ ] **Step 7: Commit** `feat(storage): manual blocks, message log, unified range overlap, booking helpers`

---

### Task 3: Availability gates + calendar boundary fixes

**Files:**
- Modify: `server/lib/availability.ts`, `server/lib/booking.ts:118-152,:196`, `server/lib/lease.ts:93-112`, `client/src/lib/availability.ts`, `client/src/pages/room-detail.tsx:127` + its `rangeHitsBusy`/`datesBookable` calls, `client/src/pages/lease-booking.tsx:109` + calls, `server/routes.ts:513,:623,:680` (todayIso)
- Test: `server/lib/availability.test.ts` (extend), `server/lib/booking.test.ts` (extend), `client/src/lib/availability.test.ts` (new or extend)

**Interfaces:**
- Consumes: `storage.getManualBlocksForRoom/Property`, `overlapsRange`, `todayIso`.
- Produces: `buildRoomAvailability`/`buildStrAvailability` include `source: "manual"` ranges; `strHasConflict` includes manual blocks; room status gate = `["MAINTENANCE","INACTIVE"]` only.

- [ ] **Step 1: Failing tests.** In `server/lib/availability.test.ts` add (follow the file's existing mock setup; add `getManualBlocksForRoom: vi.fn()` and `getManualBlocksForProperty: vi.fn()` to the storage mock):

```ts
it("includes manual blocks as busy ranges (source manual)", async () => {
  mockStorage.getRoomBlockingLeasesForRoom.mockResolvedValue([]);
  mockStorage.getColivingBookingsForRoom.mockResolvedValue([]);
  mockStorage.getExternalBlocksForRoom.mockResolvedValue([]);
  mockStorage.getManualBlocksForRoom.mockResolvedValue([{ startDate: "2026-12-01", endDate: "2026-12-05" }]);
  const res = await buildRoomAvailability("room-1");
  expect(res.busy).toEqual([{ start: "2026-12-01", end: "2026-12-05", source: "manual" }]);
});
```
In `server/lib/booking.test.ts` add: `strHasConflict` returns true when only a manual block overlaps; `resolveBooking` accepts a room with `status: "OCCUPIED"` when dates are free, and rejects `status: "MAINTENANCE"`.
In `client/src/lib/availability.test.ts`:
```ts
it("half-open: the checkout day of a busy range stays selectable", () => {
  const m = busyToDisabledMatchers([{ start: "2026-09-01", end: "2026-09-07", source: "direct" }], { minDate: "2026-08-01", halfOpen: true });
  expect(m[1]).toEqual({ from: parseISO("2026-09-01"), to: parseISO("2026-09-06") });
});
```

- [ ] **Step 2: Run** the three files — FAIL.

- [ ] **Step 3: Implement.**
  - `availability.ts`: import `todayIso` from `@shared/dates` (delete the local one); add a `manualRanges` block in both builders mapping `{ start: b.startDate, end: b.endDate, source: "manual" }` filtered `endDate >= today`.
  - `booking.ts`: `strHasConflict` adds `(3) manual blocks` using `storage.getManualBlocksForProperty`; `resolveBooking` co-living branch: replace `room.status !== "AVAILABLE"` with `["MAINTENANCE","INACTIVE"].includes(room.status)`; pass `endExclusive: true`.
  - `lease.ts`: same status rule; conflict check uses `overlapsRange` over external AND manual blocks with `{ endExclusive: false }` for the requested lease range.
  - `client/src/lib/availability.ts`: keep the API; `room-detail.tsx` and `lease-booking.tsx` pass `halfOpen: true` everywhere (the server already normalizes lease ends to exclusive). Update the header comment.
  - `routes.ts` :513, :623, :680: replace `new Date().toISOString().slice(0,10)` with `todayIso()`.

- [ ] **Step 4: Run** `npm run check && npm test` — PASS.

- [ ] **Step 5: Commit** `fix(availability): manual blocks in every gate, room status no longer blocks future dates, half-open co-living calendar, NY today`

---

### Task 4: Telegram + notifyAdmin + message_log on every send

**Files:**
- Create: `server/lib/telegram.ts`, `server/lib/telegram.test.ts`
- Modify: `server/lib/notifications.ts`
- Test: `server/lib/notifications.test.ts` (new)

**Interfaces:**
- Produces: `isTelegramConfigured(): boolean`; `sendTelegram({ text, chatIds? }): Promise<SendResult & { channel: "telegram" }>`; `SendResult.channel` union becomes `"email" | "sms" | "telegram"`; `sendEmail/sendSms/sendTelegram` accept optional `context?: MessageContext` where `MessageContext = { bookingId?; leaseId?; guestId?; audience: "GUEST"|"ADMIN"; kind: string; sentBy?: string }` and write one `message_log` row per call (status `SENT` / `FAILED` / `DRY_RUN` / `SKIPPED`); `notifyGuest(opts & { context? })`; `notifyAdmin({ subject, body, context? }): Promise<{ email: SendResult; telegram: SendResult }>` using `ADMIN_NOTIFY_EMAIL || ADMIN_EMAIL`.

- [ ] **Step 1: Failing tests** `server/lib/telegram.test.ts`

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendTelegram, isTelegramConfigured } from "./telegram";

const fetchMock = vi.fn();
beforeEach(() => { vi.stubGlobal("fetch", fetchMock); fetchMock.mockReset(); });
afterEach(() => { vi.unstubAllGlobals(); delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_ADMIN_CHAT_ID; });

describe("sendTelegram", () => {
  it("dry-runs without creds and never calls fetch", async () => {
    expect(isTelegramConfigured()).toBe(false);
    const r = await sendTelegram({ text: "hi" });
    expect(r).toMatchObject({ sent: false, channel: "telegram", reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("posts to every comma-separated chat id and never leaks the token in the result", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "123:abc"; process.env.TELEGRAM_ADMIN_CHAT_ID = "1, 2";
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    const r = await sendTelegram({ text: "hello" });
    expect(r.sent).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.telegram.org/bot123:abc/sendMessage");
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ chat_id: "2", text: "hello" });
    expect(JSON.stringify(r)).not.toContain("123:abc");
  });
  it("reports failure without throwing", async () => {
    process.env.TELEGRAM_BOT_TOKEN = "t"; process.env.TELEGRAM_ADMIN_CHAT_ID = "1";
    fetchMock.mockResolvedValue({ ok: false, status: 400, json: async () => ({ ok: false, description: "bad" }) });
    const r = await sendTelegram({ text: "x" });
    expect(r).toMatchObject({ sent: false, reason: "bad" });
  });
});
```
`server/lib/notifications.test.ts` (mock `../storage` with `createMessageLog: vi.fn()` and mock `./telegram`): `notifyAdmin` sends email to `ADMIN_NOTIFY_EMAIL` when set, else `ADMIN_EMAIL`; calls `sendTelegram`; `sendEmail` with `context` writes a `message_log` row with `status: "DRY_RUN"` when not configured; `sendSms` with no phone writes `SKIPPED`.

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** `server/lib/telegram.ts`

```ts
// server/lib/telegram.ts — admin-only Telegram alerts. Same env-gated, dry-run,
// never-throw shape as notifications.ts. ENV: TELEGRAM_BOT_TOKEN,
// TELEGRAM_ADMIN_CHAT_ID (comma-separated chat ids). Token never logged.
import { log } from "../server-log";
export interface TelegramResult { sent: boolean; channel: "telegram"; reason?: string }
export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}
export function adminChatIds(): string[] {
  return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
export async function sendTelegram(opts: { text: string; chatIds?: string[] }): Promise<TelegramResult> {
  if (!isTelegramConfigured()) {
    log(`[dry-run telegram] "${opts.text.slice(0, 60)}…" (telegram not configured)`, "notify");
    return { sent: false, channel: "telegram", reason: "not-configured" };
  }
  const ids = opts.chatIds ?? adminChatIds();
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  let failure: string | undefined;
  for (const chat_id of ids) {
    try {
      const res = await fetch(url, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id, text: opts.text.slice(0, 4000), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      if (!res.ok || json.ok === false) failure = json.description || `HTTP ${res.status}`;
    } catch (err) { failure = (err as Error).message; }
  }
  if (failure) { log(`telegram FAILED: ${failure}`, "notify"); return { sent: false, channel: "telegram", reason: failure }; }
  log(`telegram sent to ${ids.length} chat(s)`, "notify");
  return { sent: true, channel: "telegram" };
}
```
In `notifications.ts`: add `MessageContext`, a private `record(channel, ctx, to, subject, body, result)` that calls `storage.createMessageLog` inside try/catch (a logging failure must never block a send; log and continue), thread it through `sendEmail`, `sendSms`, and a new `sendTelegram` wrapper (re-export from telegram.ts with logging), extend `notifyGuest` with `context`, add:
```ts
export async function notifyAdmin(opts: { subject: string; body: string; context?: Omit<MessageContext, "audience"> }) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const ctx = { ...(opts.context ?? { kind: "ADMIN_ALERT" }), audience: "ADMIN" as const };
  const [email, telegram] = await Promise.all([
    to ? sendEmail({ to, subject: opts.subject, text: opts.body, context: ctx })
       : Promise.resolve<SendResult>({ sent: false, channel: "email", reason: "no-admin-email" }),
    sendTelegramLogged({ text: `${opts.subject}\n\n${opts.body}`, context: ctx }),
  ]);
  return { email, telegram };
}
```
Import `storage` lazily (`const { storage } = await import("../storage")`) inside `record` to avoid a circular import at module load (storage does not import notifications, but keep it lazy anyway and note why).

- [ ] **Step 4: Run** `npm run check && npm test` — PASS (update `lifecycle.test.ts` / `dunning.test.ts` mocks if they assert exact call args).

- [ ] **Step 5: Commit** `feat(notify): Telegram admin alerts, notifyAdmin fan-out, message_log on every send`

---

### Task 5: Booking lifecycle — onBookingConfirmed, CONFLICT materialization, admin alerts

**Files:**
- Create: `server/lib/bookingConflicts.ts`, `server/lib/bookingConflicts.test.ts`
- Modify: `server/lib/lifecycle.ts` (templates :45-90, new fn), `server/lib/lifecycle.test.ts`, `server/routes.ts:1826-1932` (materialize), `:1936-1990` (checkout.session), `:1661-1700` (manual mark-paid → admin alert), `server/lib/leasePayments.ts:345,:410` (admin alerts on deposit/activation), `server/lib/dunning.ts` + `server/storage.ts:971` (`raiseEscalationOnce` → notifyAdmin)
- Modify: `server/storage.ts` — `hasLifecycleEvent(ref: { leaseId?; bookingId? }, eventType, scheduleSeq)` and `recordLifecycleEvent` accept `bookingId`.

**Interfaces:**
- Produces: `onBookingConfirmed({ booking, property, room, guest }): Promise<void>` (guest BOOKING_CONFIRMED if `guest_auto_notifications` setting is `"true"`; admin ADMIN_NEW_BOOKING always; both idempotent via lifecycle_events keyed on bookingId).
- `materializeShortStayBooking(pi)` behavior: on gate failure or a Postgres `23P01` exclusion error → `createBooking` with `status: "CONFLICT"`, PAID payment, `raiseEscalationOnce({ bookingId, kind: "BOOKING_CONFLICT", severity: "HIGH", detail })`, `notifyAdmin`; NO refund call. Room status set `OCCUPIED` only on success.
- `bookingConflicts.ts` exports `confirmConflictBooking(bookingId, actor)` (re-checks gate; sets CONFIRMED/ACTIVE; resolves escalation; fires `onBookingConfirmed`) and `cancelBooking({ bookingId, actor, refund: boolean })` (sets CANCELLED, frees room; if `refund`, calls `refundPaymentIntent` for the PAID Stripe payment and records a message_log ADMIN row + log line; returns `{ refunded: boolean; refundId?: string }`).

- [ ] **Step 1: Failing tests.**
  `lifecycle.test.ts`: `onBookingConfirmed` sends guest + admin once, skips guest when `getSetting("guest_auto_notifications")` returns `{ value: "false" }`, and is a no-op on second call (mock `hasLifecycleEvent` → true).
  `bookingConflicts.test.ts` (mock storage + `./stripe` + `./notifications`): `cancelBooking({ refund: false })` never calls `refundPaymentIntent`; `cancelBooking({ refund: true })` calls it with the PAID payment's `stripeRef` and idempotency key `refund:<stripeRef>`; `confirmConflictBooking` throws a `BookingError` (409) when `isRoomAvailableForRange` is false and does not change status.
  Add a routes-level unit test is impractical here; instead extract the materialize body into `server/lib/materialize.ts` `materializeShortStayBooking(pi, deps)` with injectable `deps = { storage, resolveBooking, notifyAdmin, onBookingConfirmed, raiseEscalationOnce }` and test: gate failure → CONFLICT booking written, escalation raised, `notifyAdmin` called, `refundPaymentIntent` NOT imported/called; success → CONFIRMED + `onBookingConfirmed` called.

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement.** Templates:
```ts
bookingConfirmed: (v: { name: string; property: string; room: string | null; checkIn: string; checkOut: string; reference: string; total: string; lookupUrl: string }) => ({
  subject: `You're booked — ${v.property}${v.room ? `, ${v.room}` : ""} (${v.reference})`,
  body: `Hi ${v.name}, your stay at ${v.property}${v.room ? ` (${v.room})` : ""} is confirmed for ${v.checkIn} to ${v.checkOut}. ` +
        `Reference ${v.reference}, paid ${v.total}. Check-in details arrive the day before arrival. ` +
        `View your booking anytime: ${v.lookupUrl}`,
}),
adminNewBooking: (v: { property: string; room: string | null; guest: string; email: string; phone: string; checkIn: string; checkOut: string; reference: string; total: string; status: string }) => ({
  subject: `${v.status === "CONFLICT" ? "⚠️ CONFLICT — " : ""}New booking — ${v.property}${v.room ? ` ${v.room}` : ""} ${v.checkIn}→${v.checkOut}`,
  body: `${v.guest} (${v.email}${v.phone ? `, ${v.phone}` : ""}) · ${v.reference} · ${v.total}${v.status === "CONFLICT" ? "\n\nDATES WERE ALREADY TAKEN. Booking saved as CONFLICT (paid, not blocking). Resolve in the admin console: confirm, or cancel + refund." : ""}`,
}),
```
`lookupUrl` = `${process.env.PUBLIC_BASE_URL ?? "https://beniceproperties.vercel.app"}/lookup`. In `materialize.ts`, wrap `storage.createBooking` in try/catch: if `(err as { code?: string }).code === "23P01"` treat as conflict. Route `routes.ts` becomes a thin call. Deposit-paid / lease-activated / manual mark-paid / `raiseEscalationOnce` call `notifyAdmin` with a one-line summary (kind = the event name). `raiseEscalationOnce` returns `null` when deduped — only notify when it returns a row.

- [ ] **Step 4: Run** `npm run check && npm test` — PASS.

- [ ] **Step 5: Commit** `feat(bookings): confirm/admin notifications, CONFLICT instead of auto-refund, explicit refund action`

---

### Task 6: Staff messaging + admin/UO routes

**Files:**
- Create: `server/lib/adminMessages.ts`, `server/lib/adminMessages.test.ts`
- Modify: `server/lib/uoApi.ts:279-295` (`respondToMessage` delegates), `server/lib/portal.ts:226` (`submitMessage` also logs INBOUND to message_log + `notifyAdmin`), `server/routes.ts` (admin + UO routes), `server/lib/icalSync.ts` (Task 7 provides refresh; routes here)

**Interfaces:**
- Produces: `sendStaffMessage({ bookingId?: string; leaseId?: string; threadId?: string; subject?: string; body: string; channels: Array<"EMAIL"|"SMS">; actor: string }): Promise<{ messageId: string; threadId: string; delivery: { email: SendResult; sms: SendResult } }>`; `listThreads({ status? })` → roots with guest name/email, property, booking/lease ref, last message at; `getThread(threadId)` → messages + delivery rows from message_log for that thread's ids.
- Routes (all JSON, Zod-validated):
  - Admin (`requireAdmin`): `GET /api/admin/messages?status=` (threads), `GET /api/admin/messages/:threadId`, `POST /api/admin/messages` (new thread: `{ bookingId|leaseId, subject, body, channels }`), `POST /api/admin/messages/:threadId/reply` (`{ body, channels }`), `GET /api/admin/message-log?bookingId|leaseId|limit`, `GET /api/admin/blocks?propertyId`, `POST /api/admin/blocks` (`insertManualBlockSchema` minus source/createdBy), `DELETE /api/admin/blocks/:id`, `POST /api/admin/bookings/:id/confirm`, `POST /api/admin/bookings/:id/cancel` (body `{ refund?: boolean }` — extend existing route via `cancelBooking`), `POST /api/admin/calendar/refresh`, `GET /api/admin/calendar/status`, `GET /api/admin/guests` (bookings + leases for the picker via `getBookingsWithGuest` + `getLeases` joined to guests), `GET/PUT /api/admin/settings/guest-auto-notifications`.
  - UO (`requireServiceToken`): the same set under `/api/uo/...` with `actor` taken from body `actor` (string, required) and prefixed `uo:`.
- `respondToMessage` → `sendStaffMessage({ threadId, body, channels: ["EMAIL","SMS"], actor: \`uo:${actor}\` })`.

- [ ] **Step 1: Failing tests** `adminMessages.test.ts` (mock `../storage`, `./notifications`): new thread on a booking creates root STAFF row with `bookingId`, calls `notifyGuest` with the guest's email/phone and `context.kind = "MANUAL"`, returns delivery; reply on a thread creates child row + sets root `ANSWERED`; `channels: ["EMAIL"]` does not pass a phone to `notifyGuest`; missing both ids throws 400. `uoApi.test.ts`: `respondToMessage` now calls `sendStaffMessage` (mock `./adminMessages`).

- [ ] **Step 2: Run** — FAIL.

- [ ] **Step 3: Implement** `adminMessages.ts` (resolve guest via booking or lease; `subject` defaults to `"Message from Be Nice Properties"`; `notifyGuest({ email, phone: channels.includes("SMS") ? guest.phone : null, ..., context: { bookingId, leaseId, guestId, audience: "GUEST", kind: "MANUAL", sentBy: actor } })`; if `!channels.includes("EMAIL")` call `sendSms` directly instead of `notifyGuest`). Add routes in `routes.ts` next to the existing admin/UO blocks; share handler functions between admin and UO variants (`function messageHandlers(actorFrom: (req) => string)`).

- [ ] **Step 4: Run** `npm run check && npm test` — PASS.

- [ ] **Step 5: Commit** `feat(messages): staff→guest messaging with delivery tracking; admin + UO routes for messages, blocks, conflicts, calendar`

---

### Task 7: iCal sync — honor host blocks, record last sync, stale alert; occupancy sync job

**Files:**
- Modify: `server/lib/icalSync.ts:180-215,:406-420`, `server/lib/icalSync.test.ts`, `api-src/cron/sweep.ts`, `api-src/cron/calendar.ts`, `server/scheduler.ts`
- Create: `server/lib/occupancy.ts` (+ test)

**Interfaces:**
- `parseICalData(icalData, opts?: { honorHostBlocks?: boolean })` — when true, "Not available" events are kept with `summary: "Airbnb (Not available)"`.
- `syncAllListings(dryRun)` reads `storage.getSetting("ical_honor_host_blocks")` (default true), passes it through, and after the run writes `ical_last_sync_at` (ISO) and `ical_last_sync_result` (JSON of `{ totalListings, ok, failed, created, removed, listings: [{ key,label,ok,error }] }`) via `storage.setSetting`.
- `checkCalendarSyncHealth()` in icalSync: if last sync older than 3h or last result had failures → `raiseEscalationOnce({ kind: "CALENDAR_SYNC_FAILED", severity: "MEDIUM", detail })` + `notifyAdmin` (dedupe: `raiseEscalationOnce` with `scheduleSeq = <yyyymmdd as int>`).
- `syncRoomOccupancyStatus(today = todayIso())` in `occupancy.ts`: for every room not in `MAINTENANCE`/`INACTIVE`, set `OCCUPIED` if in `getOccupiedRoomIdsOn(today)` else `AVAILABLE`; returns `{ occupied: number; available: number }`. Called from `sweep.ts` and `scheduler.ts` daily.

- [ ] **Step 1: Failing tests.** `icalSync.test.ts`: `parseICalData(feedWithNotAvailable, { honorHostBlocks: true })` yields the block; default omits it. `occupancy.test.ts`: two rooms, one occupied today → statuses set accordingly; a `MAINTENANCE` room untouched.

- [ ] **Step 2: Run** — FAIL.  **Step 3: Implement.**  **Step 4: Run** — PASS.

- [ ] **Step 5: Commit** `feat(calendar): honor Airbnb host blocks, record sync status, stale-sync alert, daily room occupancy sync`

---

### Task 8: Admin console UI

**Files:**
- Modify: `client/src/pages/admin/dashboard.tsx` (tabs :165-178; Overview :181-212; Inventory :250-252)
- Create: `client/src/pages/admin/messages-tab.tsx`, `client/src/pages/admin/blocks-panel.tsx`, `client/src/pages/admin/calendar-sync-panel.tsx`

**Interfaces:** consumes the Task 6 admin routes exactly as named.

- [ ] **Step 1: Messages tab** (`messages-tab.tsx`): left column = thread list from `GET /api/admin/messages` (filter chips OPEN/ANSWERED/RESOLVED) plus a "New message" button that opens a guest picker fed by `GET /api/admin/guests`; right column = thread view from `GET /api/admin/messages/:threadId` rendering each message with author, time, and delivery badges (`Email ✓` / `Email ✗` / `SMS ✓` / `SMS —` from message_log rows joined by id), a reply box with Email/SMS checkboxes → `POST /api/admin/messages/:threadId/reply`. Compose form → `POST /api/admin/messages`. Use existing `apiRequest`, `useQuery`, `useMutation`, shadcn `Card`, `Badge`, `Button`, `Input`, `Textarea`, `Checkbox`. `data-testid` on every control (`thread-<id>`, `button-send-message`, `checkbox-channel-email`, …). Invalidate `/api/admin/messages` on success.
- [ ] **Step 2: Blocks panel** (`blocks-panel.tsx`, rendered at the top of the Inventory tab): table of `GET /api/admin/blocks` (listing, dates, kind, note, source, delete button → `DELETE`), and a form (listing select built from `properties` + their rooms, start date, end date [exclusive — label it "Free from"], kind select, note, guest name) → `POST /api/admin/blocks`.
- [ ] **Step 3: Calendar sync panel** (`calendar-sync-panel.tsx`, also in Inventory): shows `GET /api/admin/calendar/status` (last sync time, ok/failed per feed) and a "Sync Airbnb now" button → `POST /api/admin/calendar/refresh`; plus the `guest_auto_notifications` toggle (`GET/PUT /api/admin/settings/guest-auto-notifications`).
- [ ] **Step 4: Overview**: booking rows show a red `CONFLICT` badge with two buttons: "Confirm" → `POST /api/admin/bookings/:id/confirm`; "Cancel + refund" → `window.confirm("Refund <amount> to the guest? This cannot be undone.")` then `POST /api/admin/bookings/:id/cancel` `{ refund: true }`.
- [ ] **Step 5: Verify** `npm run check && npm run build`; run the dev server (`npm run dev`) with a TEST Stripe key or none, log in at `/admin`, click through every new control against the local DB (screenshot each tab into the scratchpad).
- [ ] **Step 6: Commit** `feat(admin): Messages tab, manual blocks, calendar sync status, conflict resolution`

---

### Task 9: Build log + verification pass

- [ ] **Step 1:** Append to `docs/build-log.md` a section `## 2026-09-02 — DECONFLICTION-ALERTS-MESSAGING` summarizing the incident, what was built (files), tests run + counts, the manual operational steps (from the spec), and deferred items (portal messaging for short-stay guests, template editing UI, Stripe API version).
- [ ] **Step 2:** `npm run check && npm test && npm run build` — record the exact counts in the log entry.
- [ ] **Step 3: Commit** `docs: build log for deconfliction/alerts/messaging`

---

### Task 10 (Unified Ops): date formatter fix

**Files:**
- Create: `src/lib/format-date.ts`, `src/lib/format-date.test.ts`
- Modify: `src/components/bnp/admin/bnp-bookings-admin.tsx:135-139`, `src/components/crm/contact-stay-history.tsx:71-76`, `src/components/bnp/admin/bnp-inventory-admin.tsx:72`

- [ ] **Step 1: Failing test**
```ts
import { describe, it, expect } from "vitest";
import { formatIsoDate } from "./format-date";
describe("formatIsoDate", () => {
  it("renders a YYYY-MM-DD as that calendar day regardless of TZ", () => {
    expect(formatIsoDate("2025-09-05")).toBe("Sep 5, 2025");
    expect(formatIsoDate("2025-09-05", { month: "numeric", day: "numeric", year: "numeric" })).toBe("9/5/2025");
  });
  it("falls back for empty / invalid input", () => {
    expect(formatIsoDate(null)).toBe("—");
    expect(formatIsoDate("not a date")).toBe("not a date");
  });
});
```
Run with `TZ=America/New_York npx vitest run src/lib/format-date.test.ts` — FAIL.
- [ ] **Step 2: Implement**
```ts
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
export function formatIsoDate(v: string | null | undefined, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" }): string {
  if (!v) return "—";
  const m = ISO.exec(v);
  if (!m) return v;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: "UTC" }).format(d);
}
```
- [ ] **Step 3:** Replace the three local `fmtDate` helpers with `formatIsoDate` (keep the inventory one's numeric style via opts). Timestamps keep their existing `fmtDateTime`. Run test — PASS; `npm run test`, `npx tsc --noEmit`.
- [ ] **Step 4: Commit** (UO repo, branch `feat/bnp-date-fix-and-management`) `fix(bnp): render YYYY-MM-DD dates as calendar days (was one day early in US timezones)`

---

### Task 11 (Unified Ops): BNP management surface

**Files:**
- Modify: `src/lib/bnp-db.ts` (mirror `manual_blocks`, `message_log`, new columns), `src/lib/bnp/ical-export.ts:108-165` (+ manual blocks), `src/lib/bnp/availability.ts` (+ manual blocks, source `"manual"`), `.env.example` (`BNP_API_URL`, `BNP_API_TOKEN`)
- Create: `src/lib/bnp/api-client.ts` (+ test), `src/app/api/bnp-admin/messages/route.ts` + `[threadId]/route.ts`, `src/app/api/bnp-admin/blocks/route.ts`, `src/app/api/bnp-admin/calendar/route.ts`, `src/app/api/bnp-admin/bookings/[id]/[action]/route.ts`, `src/components/bnp/admin/bnp-messages-admin.tsx`, `src/components/bnp/admin/bnp-blocks-admin.tsx`, page `src/app/(platform)/[businessCode]/bnp-admin/messages/page.tsx`
- Modify: `src/components/bnp/admin/bnp-bookings-admin.tsx` (CONFLICT badge + Confirm / Cancel+Refund), `src/components/bnp/admin/bnp-availability-calendar.tsx` (manual source colour + Blocks panel + sync status/sync-now), BNP admin nav (find where `bnp-admin/bookings` is registered and add `messages`)

**Interfaces:**
- `bnpApi(path, init?)` in `api-client.ts`: `fetch(\`${process.env.BNP_API_URL}${path}\`, { ...init, headers: { authorization: \`Bearer ${process.env.BNP_API_TOKEN}\`, "content-type": "application/json" } })`; throws with status + message on non-2xx; unit test with mocked fetch asserts header and URL; when env missing returns `{ configured: false }` from a `bnpApiConfigured()` helper and the UI shows "Connect BNP API" instead of buttons.
- UO API routes are thin server-side proxies (session-authenticated like the existing `bnp-admin` routes) that add `actor: session.user.email` and forward to BNP `/api/uo/...`.

- [ ] **Step 1:** Failing test for `api-client.ts` → implement → PASS.
- [ ] **Step 2:** Mirror tables in `bnp-db.ts`; extend `getBlockedRangesForListing` with manual blocks (`kind: "manual"`, UID namespace `manual:`); extend `availability.ts` merge with manual blocks; tests for both (follow the existing test files next to them).
- [ ] **Step 3:** Proxy routes + Messages page (thread list, thread view with delivery badges, compose, reply — same behaviour as BNP Task 8 but in UO's component conventions) + Blocks panel + sync panel + CONFLICT actions (refund requires a typed confirmation of the amount).
- [ ] **Step 4:** `npm run test`, `npx tsc --noEmit`, `npm run build`.
- [ ] **Step 5: Commit** `feat(bnp-admin): messages, manual blocks, calendar sync, conflict actions via BNP service API`

---

## Self-review

- Spec coverage: A → Task 10; B1 → Tasks 1,2,3,6,8,11; B2 → 3,7; B3 → 2,3; B4 → 1 (constraint) + 5 (23P01 handling); B5 → 5,6,8,11; B6 → 7,6,8,11; C → 4,5,7; D1 → 1,4; D2 → 1; D3 → 6; D4 → 5; D5 → 6,8; E → 11. Operational steps stay with the owner (spec).
- Type consistency: `endExclusive` (Task 2) used in Task 3/5; `sendStaffMessage` signature (Task 6) used by Task 8/11 routes; `notifyAdmin` (Task 4) used in 5/6/7; `MessageContext.kind` strings: `BOOKING_CONFIRMED`, `ADMIN_NEW_BOOKING`, `MANUAL`, `ADMIN_ALERT`, escalation kinds.

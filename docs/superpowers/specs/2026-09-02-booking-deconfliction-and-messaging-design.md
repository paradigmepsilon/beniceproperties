# BNP — Booking deconfliction, admin alerts, guest messaging (design)

Date: 2026-09-02 · Company: `bnp` · Branch: `feat/booking-deconfliction-and-messaging`

## Why

On 2026-09-02 an audit found two real guests had paid deposits through the site
(Stripe live) with no booking, guest, or payment row, no confirmation, and no
room block. Root causes and adjacent gaps:

1. Stripe webhook endpoint not subscribed to `payment_intent.succeeded` (the only
   path that materializes a payment-first booking).
2. Production Vercel env has no email or SMS provider — every notification in the
   codebase has been a dry-run no-op since launch.
3. Airbnb iCal import has never written a row (`external_bookings` empty) despite
   feed URLs on all seven listings and an hourly cron. Host-blocked ranges are
   skipped by design.
4. `rooms.status = OCCUPIED` is a global gate: once set, a room is unbookable for
   any future date until an admin flips it.
5. No outbound notification exists for short-stay bookings (guest or admin); staff
   replies to guest messages never reach the guest; no admin compose surface;
   no Telegram anywhere in the Node codebase.
6. Unified Ops Bookings page renders `YYYY-MM-DD` one day early
   (`new Date(iso).toLocaleDateString()`), the source of "Sep 4 to Sep 18".
7. No way to record an off-platform booking or block a room manually.

Owner decisions (2026-09-02): reuse the Henry AI System Telegram bot and Alex's
chat id; SMTP creds from UO's BNP mailbox, Twilio from UO, from-address
`stay@beniceproperties.com`; Airbnb host-blocks count as unavailable; the two
backfilled guests are in their rooms; **no guest notification and no refund
without explicit owner approval**; UO must be able to manage the whole backend.

## Scope (in this order)

### A. Unified Ops date fix (bounded)
Replace `fmtDate` in `bnp-bookings-admin.tsx`, `contact-stay-history.tsx`,
`bnp-inventory-admin.tsx` with a shared `formatIsoDate()` in
`src/lib/format-date.ts` that parses `YYYY-MM-DD` as UTC and formats with
`timeZone: "UTC"` (the pattern `bnp-availability-calendar.tsx` already uses).
Timestamps (`created_at` etc.) keep local rendering. Vitest: `2025-09-05` renders
`Sep 5, 2025` under `TZ=America/New_York`.

### B. Deconfliction (BNP)

**B1. Manual blocks.** New table `manual_blocks`: `id`, `property_id` (FK),
`room_id` (FK, null = whole STR property), `start_date`, `end_date`
(**exclusive**, first free day — same contract as `external_bookings` and
`BusyRange`), `kind` (`OFF_PLATFORM_BOOKING` | `MAINTENANCE` | `OWNER_USE` |
`OTHER`), `note`, `guest_name` (optional, for off-platform bookings), `source`
(`ADMIN` | `UO`), `created_by`, `created_at`, `updated_at`. Adding a block
requires zero schema change per listing (expansion rule).
- Included in every gate: `storage.isRoomAvailableForRange`, `strHasConflict`,
  `buildRoomAvailability` / `buildStrAvailability` (new `BusyRange.source:
  "manual"`), `createLeaseQuote`, and UO's `ical-export` blocked ranges.
- Routes: admin `GET/POST/DELETE /api/admin/blocks`; UO `GET/POST/DELETE
  /api/uo/blocks` (service token). Admin UI: "Blocks" section on the Inventory
  tab (pick listing, dates, kind, note). UO: blocks list + create on the BNP
  availability page.

**B2. Room status is no longer a date gate.** `resolveBooking` and
`createLeaseQuote` reject only `MAINTENANCE` / `INACTIVE`. Occupancy is derived
from overlaps (bookings, leases, external, manual). `OCCUPIED` remains a display
value written on materialize/activation, and a daily sweep job
(`syncRoomOccupancyStatus`) sets `OCCUPIED`/`AVAILABLE` from today's overlaps
so it stays truthful without blocking future dates.

**B3. Boundary consistency.** `isRoomAvailableForRange` takes
`endExclusive: boolean` (bookings pass `true`, leases pass `false`). Client
co-living pages pass `halfOpen: true` and the lease `+1` normalization stays on
the server, so the checkout day is bookable everywhere. One `todayIso()`
(America/New_York) in `shared/dates.ts` replaces every
`new Date().toISOString().slice(0,10)`.

**B4. DB-level exclusion.** Enable `btree_gist`; add
`bookings_room_no_overlap EXCLUDE USING gist (room_id WITH =,
daterange(check_in, check_out) WITH &&) WHERE (room_id IS NOT NULL AND status
NOT IN ('CANCELLED','CONFLICT'))` and the STR equivalent on `property_id`
where `room_id IS NULL AND model = 'STR'`. Leases keep the app-level check.

**B5. Conflict handling replaces auto-refund.** `materializeShortStayBooking`
no longer refunds. On a gate failure or an exclusion-constraint violation it
writes the booking with `status = CONFLICT` (new `BOOKING_STATUSES` value; does
not block dates, never auto-notifies the guest), records the PAID payment,
raises a HIGH `uo_escalations` row (`kind: BOOKING_CONFLICT`) and a
`notifyAdmin`. Admin resolves via `POST /api/admin/bookings/:id/confirm`
(force-confirm) or `POST /api/admin/bookings/:id/cancel?refund=true` (explicit
refund). Same two actions exposed under `/api/uo/bookings/:id/*`.

**B6. Airbnb sync observability.** `icalSync` honors "Not available" host
blocks when `app_settings.ical_honor_host_blocks = "true"` (default true;
seeded by the push script). Each run writes `ical_last_sync_at` and
`ical_last_sync_result` (JSON summary) to `app_settings`. `POST
/api/admin/calendar/refresh` and `POST /api/uo/calendar/refresh` trigger a run;
the Inventory tab and UO show last-sync time and per-feed status, and a failed
or stale (> 3 h) sync raises an admin alert once per day.

### C. Admin alerts

- `server/lib/telegram.ts`: `isTelegramConfigured()`, `sendTelegram({ text })`
  via `fetch` to `https://api.telegram.org/bot<token>/sendMessage`; env
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ADMIN_CHAT_ID` (comma-separated allowed);
  dry-run + never throws, same shape as `sendEmail`.
- `notifyAdmin({ subject, body })` in `notifications.ts`: email to
  `ADMIN_NOTIFY_EMAIL || ADMIN_EMAIL` plus Telegram; returns per-channel results;
  logs to `message_log` (audience `ADMIN`).
- Triggers: short-stay booking materialized; booking CONFLICT; manual
  (CashApp/Zelle) booking created; co-living deposit paid; lease activated;
  card-on-file failure; every `raiseEscalationOnce`; iCal sync failure/stale;
  new inbound guest message.

### D. Guest messaging with tracking

**D1. `message_log`** — the single audit trail for every outbound/inbound
message: `id`, `booking_id` (nullable), `lease_id` (nullable), `guest_id`
(nullable), `direction` (`OUTBOUND` | `INBOUND`), `audience` (`GUEST` |
`ADMIN`), `channel` (`EMAIL` | `SMS` | `TELEGRAM` | `PORTAL`), `kind`
(template key or `MANUAL`), `to_address`, `subject`, `body`, `status`
(`SENT` | `FAILED` | `DRY_RUN` | `SKIPPED`), `provider_ref`, `error`,
`sent_by` (`system` | admin email | `uo:<actor>`), `created_at`. `sendEmail`,
`sendSms`, `sendTelegram` accept an optional `context` and write a row each;
`lifecycle_events` / `notification_log` keep their dedupe role unchanged.

**D2. Guest messages widen to bookings.** `guest_messages.lease_id` becomes
nullable; add `booking_id` (nullable); a check constraint requires one of the
two. Portal stays lease-scoped for now.

**D3. Staff sends actually deliver.** `server/lib/adminMessages.ts`:
`sendStaffMessage({ bookingId | leaseId | threadId, subject, body, channels,
actor })` → creates the `guest_messages` STAFF row (thread reply or new
thread), calls `notifyGuest` per selected channel, logs to `message_log`,
returns delivery results. `uoApi.respondToMessage` delegates to it.

**D4. Templates.** New `BOOKING_CONFIRMED` (guest, email + SMS) and
`ADMIN_NEW_BOOKING` (admin) in `LIFECYCLE_TEMPLATES`; new `onBookingConfirmed()`
called from both materialize branches, idempotent via `lifecycle_events`
(add nullable `booking_id`, `lease_id` nullable, check constraint). Guest
auto-sends are gated by `app_settings.guest_auto_notifications` (default
`"true"`; admin toggle). Backfilled bookings are created by script, not by
the webhook, so they never trigger auto-sends.

**D5. Admin UI.** New "Messages" tab: guest picker (active + upcoming bookings
and leases), thread history with per-message delivery badges (email / SMS /
portal), compose with channel checkboxes, and inbound guest messages with
reply. Routes: `GET /api/admin/messages?bookingId|leaseId`, `POST
/api/admin/messages`, `POST /api/admin/messages/:threadId/reply`,
`GET /api/admin/message-log?bookingId|leaseId`. Same under `/api/uo/*`.

### E. Unified Ops management surface

UO keeps reading BNP's DB directly for lists (existing pattern) and calls BNP's
service-token API for anything with side effects. New env in UO:
`BNP_API_URL`, `BNP_API_TOKEN` (= BNP's `UO_BNP_API_TOKEN`). New client
`src/lib/bnp/api-client.ts`. BNP admin pages gain: Messages (list + compose +
reply), Blocks (list + create + delete on the availability page), Calendar
sync status + "Sync now", booking CONFLICT badge with Confirm / Cancel+Refund
actions, and a Notifications log view (reads `message_log`).

## Not in scope
Portal messaging for short-stay guests; admin-editable template text; BNP
outbound iCal (UO already serves it); Stripe API-version upgrade.

## Data / migration
Additive only. One idempotent `scripts/push-deconfliction-messaging.mjs`
(pattern: `push-room-cleaning-fee.mjs`) creating `manual_blocks`,
`message_log`, the new columns, constraints, `btree_gist`, and seeding the two
settings. Export of `bookings`, `guest_messages`, `lifecycle_events` to
`docs/migration-backups/` before running (floor #1), even though nothing is
dropped.

## Operational steps that stay manual (owner)
1. Stripe dashboard: add `payment_intent.succeeded` and
   `payment_intent.payment_failed` to the beniceproperties webhook endpoint.
2. `node scripts/materialize-lost-bookings.mjs --confirm` (dry run verified
   clean on 2026-09-02).
3. Vercel Production env for BNP: `TELEGRAM_BOT_TOKEN`,
   `TELEGRAM_ADMIN_CHAT_ID`, `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`,
   `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`, `ADMIN_NOTIFY_EMAIL`,
   `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`,
   `UO_BNP_API_TOKEN`. UO: `BNP_API_URL`, `BNP_API_TOKEN`.
4. Run the push script, deploy BNP, deploy UO, trigger one calendar sync.

## Testing
Vitest over mocked storage for: manual-block gate inclusion, boundary
semantics, CONFLICT path (no refund call), `notifyAdmin` fan-out and logging,
`sendStaffMessage` delivery + logging, `onBookingConfirmed` idempotency and
the auto-notification setting, host-block honoring in `parseICalData`, and the
UO date formatter. `tsc` + `npm run build` on both repos.

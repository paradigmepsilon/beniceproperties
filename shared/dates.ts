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

/**
 * Whole days from `today` until `date`. Positive = future, negative = past,
 * 0 = same day. Both arguments are YYYY-MM-DD.
 *
 * Lives here rather than in a service module so every scheduled job measures
 * "how many days until X" the same way. Pass `todayIso()` as `today` — NOT
 * `new Date().toISOString()`, which is UTC and can name yesterday's date in ET.
 */
export function daysUntil(date: string, today: string): number {
  const t = new Date(`${today}T00:00:00Z`).getTime();
  const d = new Date(`${date}T00:00:00Z`).getTime();
  return Math.round((d - t) / 86_400_000);
}

/**
 * A friendly date for guest copy: "Friday 2 October". Never an hour count.
 *
 * Anchored at NOON UTC deliberately — a T00:00:00Z anchor renders the previous
 * day in every timezone west of UTC.
 *
 * Lives here rather than in a service module because the client formats the
 * same YYYY-MM-DD strings the server does, and two formatters drift.
 * `server/lib/stayReminders.ts` re-exports it so existing callers are unchanged.
 */
export function friendlyDate(iso: string): string {
  const d = new Date(`${iso}T12:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(d);
}

// ---------------------------------------------------------------------------
// The advance-booking rule
//
// Owner rule (2026-09-27): a guest must always book in advance of their stay.
// Concretely — a move-in of TODAY is fine right up until check-in, and once
// check-in has passed the earliest we can take is TOMORROW. Same-day is not
// banned; arriving after the door opens with no one expecting you is.
//
// 4pm is not a new number: check-in is already 4pm and checkout 11am, which is
// what makes every stay a whole number of billable days (see
// shared/rateSelection.ts's cascade header). This rule reuses that boundary
// rather than inventing a second one.
//
// ONE predicate, called by both the client (to floor the date pickers) and the
// server (to reject the write). Before this existed the only "not in the past"
// checks were client-side calendar decorations, and every booking and lease
// write path accepted a move-in date in the past.
// ---------------------------------------------------------------------------

/** Check-in, as an hour in HOTEL_TZ. The stay-length cascade assumes the same. */
export const CHECK_IN_HOUR_ET = 16;

/**
 * The hotel-local hour of `now`, 0–23.
 *
 * Resolved per-instant via Intl rather than by subtracting a fixed offset, so
 * it is correct on both sides of a DST transition. The `% 24` is load-bearing:
 * under the h24 cycle some ICU builds render midnight as "24", which would make
 * every midnight booking look like check-in had passed.
 */
export function hotelHour(now: Date = new Date()): number {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: HOTEL_TZ,
    hour: "2-digit",
    hour12: false,
  }).format(now);
  return Number(h) % 24;
}

/** The earliest move-in we can accept: today before check-in, else tomorrow. */
export function earliestMoveInIso(now: Date = new Date()): string {
  const today = todayIso(now);
  return hotelHour(now) < CHECK_IN_HOUR_ET ? today : addDaysIso(today, 1);
}

/** True when `iso` (YYYY-MM-DD) is on or after the earliest move-in we can take. */
export function isMoveInAllowed(iso: string, now: Date = new Date()): boolean {
  return iso >= earliestMoveInIso(now);
}

/**
 * The one rejection message, so client and server say the same thing.
 *
 * States a POLICY and names the earliest date we can take. It must never say or
 * imply the dates are unavailable — that would be untrue, and it would send the
 * guest hunting for other dates when the fix is simply a later move-in.
 */
export function moveInTooEarlyMessage(now: Date = new Date()): string {
  return (
    `Check-in is 4pm, so the earliest move-in we can take is ` +
    `${friendlyDate(earliestMoveInIso(now))}. Please pick that date or later.`
  );
}

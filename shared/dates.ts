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

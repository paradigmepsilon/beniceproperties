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

// client/src/lib/format.ts
import { format, parseISO } from "date-fns";

export const money = (v: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    typeof v === "string" ? parseFloat(v) : v,
  );

// Best-effort city from a free-text location. The `location` field is
// inconsistent — a full street address ("5870 Old Bill Cook Rd. Atlanta, GA
// 30349"), a bare city ("Atlanta"), or a "City, Country" ("St. John's,
// Antigua"). Rule: take the segment before the first comma; if it looks like a
// street address (starts with a house number), drop the street part by keeping
// only what follows the last period ("… Rd. Atlanta" → "Atlanta"). Segments
// that don't start with a digit are treated as the city verbatim, so an
// abbreviation inside the city name ("St. John's") is preserved. Falls back to
// the trimmed input. Used to filter listings by city.
export function cityOf(location: string): string {
  const beforeComma = (location ?? "").split(",")[0]?.trim() ?? "";
  const looksLikeStreet = /^\d/.test(beforeComma) && beforeComma.includes(".");
  const city = looksLikeStreet
    ? beforeComma.slice(beforeComma.lastIndexOf(".") + 1).trim()
    : beforeComma;
  return city || (location ?? "").trim();
}

// "2026-08-14" → "Aug 14". For short inline dates like "Next opening · Aug 14".
export const shortDate = (iso: string) => format(parseISO(iso), "MMM d");

// Lowest effective nightly across an STR property's configured rate tiers —
// the "from" price shown on cards and the booking panel. Longer stays
// auto-apply weekly/monthly tiers at checkout. `multiTier` drives whether the
// UI prefixes "from". Null when no positive rate is configured.
export function fromNightly(p: {
  dailyRate?: string | null;
  basePrice?: string | null;
  weeklyRate?: string | null;
  monthlyRate?: string | null;
}): { from: number; multiTier: boolean } | null {
  const cand = [
    p.dailyRate ?? p.basePrice,
    p.weeklyRate ? String(parseFloat(p.weeklyRate) / 7) : null,
    p.monthlyRate ? String(parseFloat(p.monthlyRate) / 28) : null,
  ]
    .map((v) => (v ? parseFloat(v) : NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (!cand.length) return null;
  return { from: Math.min(...cand), multiTier: cand.length > 1 };
}

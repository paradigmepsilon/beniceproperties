// client/src/lib/format.ts
export const money = (v: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    typeof v === "string" ? parseFloat(v) : v,
  );

// Best-effort city from a free-text location. The `location` field is
// inconsistent — a full street address ("5870 Old Bill Cook Rd. Atlanta, GA
// 30349"), a bare city ("Atlanta"), or even a property name ("Antiguan Village
// Retreat"). Rule: take the segment before the first comma; if that segment
// still has a street part (a "Rd."/"Ave." style token ending in "."), keep only
// what follows the last period. Falls back to the trimmed input so name-only
// locations still bucket sensibly. Used to filter listings by city.
export function cityOf(location: string): string {
  const beforeComma = (location ?? "").split(",")[0]?.trim() ?? "";
  const afterStreet = beforeComma.includes(".")
    ? beforeComma.slice(beforeComma.lastIndexOf(".") + 1).trim()
    : beforeComma;
  return afterStreet || (location ?? "").trim();
}

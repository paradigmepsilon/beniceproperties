// shared/placeholder.ts — the single source of truth for "visible but not
// transactable" inventory. Two distinct flags decide two distinct things, and
// conflating them is the bug this module exists to prevent:
//
//   properties.active         -> does the world SEE this listing?
//   properties.isPlaceholder  -> does the business COUNT this listing?
//
// A PLACEHOLDER is a listing we show to measure demand for inventory we don't
// operate yet. It renders on the public site with real prices, but it can never
// be booked, never takes a payment, and never appears in an aggregate, report,
// or rollup. Every aggregate call site imports countsTowardBusiness() from here
// rather than open-coding the negation, so the rule has exactly one definition.
//
// Placeholder is a PROPERTY-level fact; rooms inherit it from their parent.
//
// Not to be confused with server/lib/publicInventory.ts, which answers the
// different question of what the public site may display at all.

export interface PlaceholderFlagged {
  isPlaceholder?: boolean | null;
}

/** True when this listing is a front-end placeholder, not real inventory. */
export function isPlaceholder(property: PlaceholderFlagged | null | undefined): boolean {
  return Boolean(property?.isPlaceholder);
}

/**
 * The aggregate gate. True when this listing's rooms, bookings, payments, and
 * leases belong in occupancy, revenue, reconciliation, and the UO rollup.
 */
export function countsTowardBusiness(property: PlaceholderFlagged | null | undefined): boolean {
  return !isPlaceholder(property);
}

/** Drop placeholders from a list before counting or reporting on it. */
export function excludePlaceholders<T extends PlaceholderFlagged>(properties: T[]): T[] {
  return properties.filter(countsTowardBusiness);
}

/**
 * The PUBLIC contract for "you can look, but you can't book online" — true for
 * LTR listings (inquiry-only by design, priced off-platform) and for
 * placeholders. This is the only form in which placeholder-ness reaches the
 * browser: the client branches on inquiryOnly and is never told which of the
 * two reasons applies. See server/lib/publicProjection.ts.
 */
export function listingIsInquiryOnly(
  property: (PlaceholderFlagged & { type?: string | null }) | null | undefined,
): boolean {
  if (!property) return false;
  return property.type === "LTR" || isPlaceholder(property);
}

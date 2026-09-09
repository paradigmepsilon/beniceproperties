// client/src/lib/nameMatch.ts
// Whether a typed signature name differs from the guest on the booking — the
// substance of an admin's ID review, surfaced as a flag so they do not have to
// eyeball it.
//
// Lifted VERBATIM from the inline comparison in the admin dashboard's
// verification queue, semantics unchanged. Tolerating middle names or suffixes
// would be an improvement, but it would also change behaviour in the live lease
// queue, so it is a deliberate follow-up rather than a silent tweak here.

/**
 * True when the two names genuinely differ. Case- and whitespace-insensitive.
 *
 * A blank on either side is NOT a mismatch: we do not flag what we do not know,
 * and an empty signature is already caught by the "not yet signed" state.
 */
export function nameMismatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return false;
  return x !== y;
}

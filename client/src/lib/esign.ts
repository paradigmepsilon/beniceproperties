// client/src/lib/esign.ts
// The one rule for whether a typed signature may be submitted. Extracted from
// lease-sign.tsx so the short-stay signing page cannot drift from the lease one —
// this gates a legally binding act, and two copies would eventually disagree.

export interface SignGateInput {
  /** The rendered agreement. Nothing may be signed before it has loaded. */
  documentHtml: string | null | undefined;
  signedName: string;
  affirmed: boolean;
  busy: boolean;
}

/** Minimum characters for a plausible legal name. */
export const MIN_SIGNED_NAME_LENGTH = 2;

/**
 * A guest may sign only when they have actually been shown the document, typed a
 * name, ticked the affirmation, and no submission is already in flight.
 */
export function canSign(input: SignGateInput): boolean {
  if (!input.documentHtml) return false;
  if (input.signedName.trim().length < MIN_SIGNED_NAME_LENGTH) return false;
  if (!input.affirmed) return false;
  return !input.busy;
}

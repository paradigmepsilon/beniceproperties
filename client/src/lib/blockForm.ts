// client/src/lib/blockForm.ts
// Pure validation for the admin manual-block form (Task 8's Inventory tab
// panel). Mirrors the server's own checks (createBlockBodySchema + the
// endDate > startDate gate in server/routes.ts) so the form can reject bad
// input before round-tripping to the API — kept here, not inline in JSX, so
// it's unit-testable.

import { MANUAL_BLOCK_KINDS } from "@shared/schema";

export type ManualBlockKind = (typeof MANUAL_BLOCK_KINDS)[number];

export interface BlockFormInput {
  propertyId: string;
  /** Required for a co-living listing; always null for a whole-property (STR) listing. */
  roomId: string | null;
  isColiving: boolean;
  startDate: string;
  /** Exclusive — the first free day. */
  endDate: string;
  kind: string;
}

export interface BlockFormValidation {
  valid: boolean;
  error: string | null;
}

const ok: BlockFormValidation = { valid: true, error: null };
const fail = (error: string): BlockFormValidation => ({ valid: false, error });

export function validateBlockForm(input: BlockFormInput): BlockFormValidation {
  if (!input.propertyId) return fail("Choose a listing.");
  if (input.isColiving && !input.roomId) return fail("Choose a room.");
  if (!input.startDate) return fail("Start date is required.");
  if (!input.endDate) return fail("Free-from date is required.");
  if (input.endDate <= input.startDate) return fail("Free-from date must be after the start date.");
  if (!(MANUAL_BLOCK_KINDS as readonly string[]).includes(input.kind)) return fail("Choose a block type.");
  return ok;
}

// shared/doorCode.ts
// =============================================================================
// Validation for the per-booking door code an admin sets when approving a stay.
// Shared so the admin form and the server route enforce the SAME rule — a
// client-only check is not a check.
//
// SENSITIVE DATA. Per the portfolio-wide rule, property access codes are
// sensitive: a door code must never reach a log line, a Telegram message, an SMS
// body, a PostHog property, an error message, or a test fixture. Only two places
// render a real code — the welcome email and the token-gated stay page.
// This module therefore validates SHAPE ONLY and never echoes the value it
// rejected, so a validation error cannot leak the code into an error log.
//
// The pattern is deliberately GENERIC. No property-specific code format is
// encoded here: adding a property or swapping a lock brand must require zero
// code change, so anything a common keypad accepts is allowed.
// =============================================================================

/** Digits, letters, and the two keys every keypad has. No spaces. */
const DOOR_CODE_PATTERN = /^[0-9A-Za-z#*-]+$/;

export const DOOR_CODE_MIN_LENGTH = 4;
export const DOOR_CODE_MAX_LENGTH = 12;

/**
 * Trimmed code, or null when the input is absent/blank. Use this before storing
 * so a code never lands in the database with surrounding whitespace — an
 * operator who pastes " 4821 " would otherwise create a code the guest cannot
 * type.
 */
export function normalizeDoorCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * True when the code is a plausible keypad code. Deliberately shape-only: we
 * cannot verify a code against a physical lock, so the goal is to catch the
 * mistakes an operator actually makes — an empty field, a stray sentence, a
 * pasted URL — not to be clever.
 */
export function isValidDoorCode(raw: string | null | undefined): boolean {
  const code = normalizeDoorCode(raw);
  if (!code) return false;
  if (code.length < DOOR_CODE_MIN_LENGTH || code.length > DOOR_CODE_MAX_LENGTH) return false;
  return DOOR_CODE_PATTERN.test(code);
}

/**
 * Why a code was rejected, phrased for an operator — and deliberately WITHOUT
 * quoting the offending value, so the message is safe to log or return in an
 * API error. Null when the code is valid.
 */
export function doorCodeError(raw: string | null | undefined): string | null {
  const code = normalizeDoorCode(raw);
  if (!code) return "Enter the door code the guest will use.";
  if (code.length < DOOR_CODE_MIN_LENGTH) {
    return `Door code must be at least ${DOOR_CODE_MIN_LENGTH} characters.`;
  }
  if (code.length > DOOR_CODE_MAX_LENGTH) {
    return `Door code must be at most ${DOOR_CODE_MAX_LENGTH} characters.`;
  }
  if (!DOOR_CODE_PATTERN.test(code)) {
    return "Door code can contain only letters, numbers, #, * and -.";
  }
  return null;
}

/**
 * A code reduced to something safe to display in an audit context: all but the
 * last character replaced. Not reversible and not a security control — it exists
 * so an operator-facing surface can show "a code is set" without reprinting it.
 */
export function maskDoorCode(raw: string | null | undefined): string {
  const code = normalizeDoorCode(raw);
  if (!code) return "(none)";
  return `${"•".repeat(Math.max(0, code.length - 1))}${code.slice(-1)}`;
}

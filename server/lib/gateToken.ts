// server/lib/gateToken.ts
// The credential for a short-stay guest's document page. The token IS the auth —
// there is no account and no password — so it must be unguessable.
//
// 24 characters of base62 is ~143 bits of entropy. The LENGTH is load-bearing in
// the other direction too: "https://www.beniceproperties.com/stay/<24>/extend"
// is 69 characters, which is what lets the extension SMS fit inside a single
// 160-character GSM-7 segment. A 32-char token (what leases use) pushes the
// tightest nudge over that limit and silently splits it in two.

import { customAlphabet } from "nanoid";

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const GATE_TOKEN_LENGTH = 24;

/** Generate an unguessable gate token. */
export const gateTokenGen = customAlphabet(ALPHABET, GATE_TOKEN_LENGTH);

/**
 * How long a guest has to submit their documents before the sweep cancels and
 * refunds. Owner rule: 72 hours of SILENCE, measured from booking or from the
 * last time we asked (a fix request restarts it).
 *
 * NOTE the production cron runs once daily at 08:00 UTC, so the effective
 * deadline lands between 72 and 96 hours. Guest copy therefore says "3 days"
 * and names a date — never "72 hours".
 */
export const GATE_DOCS_DEADLINE_HOURS = 72;
export const GATE_DOCS_DEADLINE_MS = GATE_DOCS_DEADLINE_HOURS * 60 * 60 * 1000;

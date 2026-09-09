// server/lib/formatShared.ts
// =============================================================================
// Presentation helpers shared by every module that composes guest- or
// admin-facing copy: lifecycle templates, the lease document, the short-stay
// agreement, and the stay message templates.
//
// These lived in lifecycle.ts, which is lease-shaped and 488 lines. Pulling them
// out means a new template module can format money and name a room without
// importing the whole lease lifecycle — and, more importantly, without the
// import cycle that would create once lifecycle.ts needs to branch to it.
//
// fmtMoney was ALSO defined privately in leaseDocument.ts. Two identical
// definitions of the string a guest sees on a signed agreement is one too many;
// this is now the only one.
// =============================================================================

import type { Room } from "@shared/schema";

/**
 * USD for humans: 1234.5 → "$1,234.50". Takes a NUMBER, so callers must
 * parseFloat a decimal column first — passing a string silently renders "$NaN".
 */
export const fmtMoney = (v: number): string =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);

/**
 * How a room is named to a guest: "Room 2 — Garden", or just the name when the
 * room has no number. Null for a whole-property (STR) stay, which has no room —
 * callers use that null to omit the room clause entirely.
 */
export function roomDisplayName(room?: Room | null): string | null {
  if (!room) return null;
  return room.roomNumber ? `Room ${room.roomNumber} — ${room.name}` : room.name;
}

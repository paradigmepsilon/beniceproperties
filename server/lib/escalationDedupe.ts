// server/lib/escalationDedupe.ts
// Pure matching rule for storage.raiseEscalationOnce's dedupe query. Kept out
// of storage.ts (which requires a live DB connection at import time) so the
// scoping rule itself is unit-testable without a database.
//
// Scope rules, in priority order:
//   lease-scoped   → an OPEN row for the same leaseId + kind + scheduleSeq
//                     (one per installment).
//   booking-scoped → any OPEN row for the same bookingId + kind (no
//                     installment breakdown).
//   unscoped       → an OPEN row that is ALSO unscoped (no leaseId, no
//                     bookingId) with the same scheduleSeq + kind. Without the
//                     "also unscoped" requirement, an unscoped call would
//                     collapse into whatever lease/booking-scoped escalation
//                     happens to share a scheduleSeq — a false dedupe across
//                     unrelated subjects.
import type { InsertUoEscalation, UoEscalation } from "@shared/schema";

export function escalationDedupeMatch(
  existing: Pick<UoEscalation, "leaseId" | "bookingId" | "scheduleSeq">,
  incoming: Pick<InsertUoEscalation, "leaseId" | "bookingId" | "scheduleSeq">,
): boolean {
  if (incoming.leaseId) {
    return existing.leaseId === incoming.leaseId && (existing.scheduleSeq ?? null) === (incoming.scheduleSeq ?? null);
  }
  if (incoming.bookingId) {
    return existing.bookingId === incoming.bookingId;
  }
  return (
    existing.leaseId == null &&
    existing.bookingId == null &&
    (existing.scheduleSeq ?? null) === (incoming.scheduleSeq ?? null)
  );
}

// server/lib/bookingIntentGuard.ts
// Ownership + state check for POST /api/booking-intent/:id/contact. The route
// rewrites guest metadata on a PaymentIntent by id; this guard limits that to
// an OPEN short-stay intent this app created (BNP or TRAD entity in the shared
// Stripe account, payment_kind BOOKING_DEPOSIT, no lease, carrying a reference).
// Anything paid, canceled, lease-scoped, or foreign is refused.

const OPEN_STATUSES = new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);
const ENTITIES = new Set(["BNP", "TRAD"]);

export function isOpenShortStayIntent(pi: {
  status: string;
  metadata: Record<string, string | undefined> | null | undefined;
}): boolean {
  const m = pi.metadata;
  if (!m) return false;
  if (!OPEN_STATUSES.has(pi.status)) return false;
  if (!ENTITIES.has(m.entity ?? "")) return false;
  if (m.payment_kind !== "BOOKING_DEPOSIT") return false;
  if (m.lease_id && m.lease_id !== "null") return false;
  if (!m.reference || m.reference === "null") return false;
  return true;
}

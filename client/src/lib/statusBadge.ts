// client/src/lib/statusBadge.ts
// One status → Badge colour mapping, shared by every surface that renders a
// domain status. Lived as module-private consts in pages/portal.tsx until the
// admin Payments tree needed the same mapping; duplicating it would have let the
// guest's view of "LATE" and the operator's view of "LATE" drift apart.
//
// Deliberately a denylist/allowlist of the statuses that MEAN something, with a
// neutral fallback: these strings come from six different enums (booking, lease,
// schedule, late fee, deposit, verification) and a future addition should render
// quietly rather than throw or shout.

/** Badge `variant` — destructive for anything that costs money or attention. */
export const statusVariant = (s: string): "destructive" | "secondary" =>
  s === "FAILED" || s === "LATE" || s === "DEFAULTED" || s === "REJECTED"
    ? "destructive"
    : "secondary";

/** Extra classes for the positive statuses (green = status, never brand). */
export const statusClass = (s: string): string | undefined =>
  s === "PAID" || s === "ACTIVE" || s === "RESOLVED" || s === "APPROVED"
    ? "bg-good-bg text-good hover:bg-good-bg"
    : undefined;

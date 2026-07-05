// server/lib/manualPayment.ts
// =============================================================================
// Manual payment (CashApp / Zelle) instructions — the single source of truth for
// the pay-to handle, shared by the short-stay booking route and the co-living
// lease-payment flow so the handle can never drift between them.
//
// Manual payment is a per-payment option on co-living LEASE payments (first
// payment + recurring rent). It carries NO card surcharge, and the payment is
// held pending until an admin settles it via UO "Mark Paid".
// =============================================================================

export type ManualMethod = "CASHAPP" | "ZELLE";

/** The CashApp tag / Zelle handle guests send money to (env-driven, with fallbacks). */
export function manualHandle(method: ManualMethod): string {
  return method === "CASHAPP"
    ? process.env.CASHAPP_TAG ?? "$BeNiceProperties"
    : process.env.ZELLE_HANDLE ?? "pay@beniceproperties.com";
}

export interface ManualInstructions {
  method: ManualMethod;
  handle: string;
  amount: number;
  memo: string;
}

/** Build the full instruction block a guest follows to send a manual payment. */
export function buildManualInstructions(args: {
  method: ManualMethod;
  amount: number;
  memo: string;
}): ManualInstructions {
  return {
    method: args.method,
    handle: manualHandle(args.method),
    amount: args.amount,
    memo: args.memo,
  };
}

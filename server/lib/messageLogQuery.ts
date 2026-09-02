// server/lib/messageLogQuery.ts
// Read policy for `message_log`. Pure, so the two rules that matter are unit
// tested without a database:
//
//   BOUNDED — the table is append-only and grows forever. Every read is capped;
//   a caller-supplied limit is clamped, never trusted.
//
//   SCOPED — a read must name a booking, lease, or guest. An unscoped read
//   returns the newest N rows of EVERY guest's traffic, which is exactly how one
//   guest's messages end up rendered inside another guest's thread. Only a
//   caller that explicitly asks for the firehose (`all: true` — the admin/UO
//   `/message-log` console view with no filters) gets it.

/** Rows returned when a caller does not ask for more. */
export const MESSAGE_LOG_DEFAULT_LIMIT = 200;
/** Hard ceiling a caller can raise the limit to. */
export const MESSAGE_LOG_MAX_LIMIT = 1000;

export interface MessageLogQueryOpts {
  bookingId?: string;
  leaseId?: string;
  guestId?: string;
  limit?: number;
  /** Opt in to the unscoped firehose (console view only). */
  all?: boolean;
}

export interface MessageLogQueryPlan {
  /** True when the query must not run at all — return [] instead. */
  refuse: boolean;
  /** Always set: the clamped row limit. */
  limit: number;
  /** True when a scope filter will be applied. */
  scoped: boolean;
}

/** Clamp a caller-supplied limit into [1, MESSAGE_LOG_MAX_LIMIT]. */
export function boundedMessageLogLimit(limit?: number): number {
  if (limit === undefined || !Number.isFinite(limit)) return MESSAGE_LOG_DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit as number), 1), MESSAGE_LOG_MAX_LIMIT);
}

/** Decide whether a message-log read may run, and with what bound. */
export function planMessageLogQuery(opts: MessageLogQueryOpts): MessageLogQueryPlan {
  const scoped = Boolean(opts.bookingId || opts.leaseId || opts.guestId);
  return {
    refuse: !scoped && !opts.all,
    limit: boundedMessageLogLimit(opts.limit),
    scoped,
  };
}

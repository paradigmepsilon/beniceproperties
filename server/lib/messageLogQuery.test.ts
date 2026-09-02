// server/lib/messageLogQuery.test.ts
// The two rules that keep message_log reads safe: every read is BOUNDED, and an
// unscoped read is refused unless the caller explicitly asks for the firehose.

import { describe, it, expect } from "vitest";
import {
  boundedMessageLogLimit,
  planMessageLogQuery,
  MESSAGE_LOG_DEFAULT_LIMIT,
  MESSAGE_LOG_MAX_LIMIT,
} from "./messageLogQuery";

describe("boundedMessageLogLimit", () => {
  it("defaults when no limit is given", () => {
    expect(boundedMessageLogLimit()).toBe(MESSAGE_LOG_DEFAULT_LIMIT);
    expect(boundedMessageLogLimit(undefined)).toBe(MESSAGE_LOG_DEFAULT_LIMIT);
  });

  it("defaults on a non-finite limit (an unparseable ?limit= query string)", () => {
    expect(boundedMessageLogLimit(NaN)).toBe(MESSAGE_LOG_DEFAULT_LIMIT);
    expect(boundedMessageLogLimit(Infinity)).toBe(MESSAGE_LOG_DEFAULT_LIMIT);
  });

  it("caps at the maximum and floors at 1", () => {
    expect(boundedMessageLogLimit(50_000)).toBe(MESSAGE_LOG_MAX_LIMIT);
    expect(boundedMessageLogLimit(MESSAGE_LOG_MAX_LIMIT)).toBe(MESSAGE_LOG_MAX_LIMIT);
    expect(boundedMessageLogLimit(0)).toBe(1);
    expect(boundedMessageLogLimit(-10)).toBe(1);
  });

  it("passes an in-range limit through, truncating fractions", () => {
    expect(boundedMessageLogLimit(25)).toBe(25);
    expect(boundedMessageLogLimit(25.9)).toBe(25);
  });
});

describe("planMessageLogQuery", () => {
  it.each(["bookingId", "leaseId", "guestId"])("runs a %s-scoped read, always bounded", (key) => {
    const plan = planMessageLogQuery({ [key]: "x" });
    expect(plan).toEqual({ refuse: false, limit: MESSAGE_LOG_DEFAULT_LIMIT, scoped: true });
  });

  it("REFUSES an unscoped read — one guest's trail must never leak into another's", () => {
    expect(planMessageLogQuery({}).refuse).toBe(true);
    expect(planMessageLogQuery({ limit: 10 }).refuse).toBe(true);
  });

  it("allows the unscoped console firehose only when `all` is explicit, still bounded", () => {
    const plan = planMessageLogQuery({ all: true, limit: 99_999 });
    expect(plan.refuse).toBe(false);
    expect(plan.scoped).toBe(false);
    expect(plan.limit).toBe(MESSAGE_LOG_MAX_LIMIT);
  });

  it("bounds a scoped read even when the caller asks for everything", () => {
    expect(planMessageLogQuery({ leaseId: "l1", limit: 100_000 }).limit).toBe(MESSAGE_LOG_MAX_LIMIT);
  });
});

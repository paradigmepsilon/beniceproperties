import { describe, it, expect } from "vitest";
import { overlapsRange } from "./ranges";

const X = (start: string, end: string, endExclusive = true) => ({ start, end, endExclusive });

describe("overlapsRange", () => {
  it("half-open vs half-open: same-day turnover is free", () => {
    expect(overlapsRange(X("2026-09-01", "2026-09-07"), X("2026-09-07", "2026-09-10"))).toBe(false);
    expect(overlapsRange(X("2026-09-01", "2026-09-07"), X("2026-09-06", "2026-09-10"))).toBe(true);
  });
  it("inclusive lease end occupies its end date", () => {
    expect(overlapsRange(X("2026-09-01", "2026-09-07", false), X("2026-09-07", "2026-09-10"))).toBe(true);
    expect(overlapsRange(X("2026-09-01", "2026-09-07", false), X("2026-09-08", "2026-09-10"))).toBe(false);
  });
  it("a stay checking out the day a lease starts is free", () => {
    expect(overlapsRange(X("2026-09-05", "2026-09-12"), X("2026-09-12", "2026-10-10", false))).toBe(false);
  });
});

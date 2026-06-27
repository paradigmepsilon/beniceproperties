// server/lib/serviceAuth.test.ts
// Phase 8 — service-token middleware. Fail-closed when unset; 401 on mismatch;
// next() on a correct Bearer token.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requireServiceToken } from "./serviceAuth";

function mockRes() {
  const res: any = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res;
}

const ORIG = process.env.UO_BNP_API_TOKEN;
beforeEach(() => { process.env.UO_BNP_API_TOKEN = "secret-token-123"; });
afterEach(() => { process.env.UO_BNP_API_TOKEN = ORIG; });

describe("requireServiceToken", () => {
  it("fails closed (503) when no token is configured", () => {
    delete process.env.UO_BNP_API_TOKEN;
    const res = mockRes();
    const next = vi.fn();
    requireServiceToken({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("401s on a missing or wrong token", () => {
    const res = mockRes();
    const next = vi.fn();
    requireServiceToken({ headers: {} } as any, res, next);
    expect(res.status).toHaveBeenCalledWith(401);

    const res2 = mockRes();
    requireServiceToken({ headers: { authorization: "Bearer wrong" } } as any, res2, vi.fn());
    expect(res2.status).toHaveBeenCalledWith(401);
  });

  it("calls next() on the correct token", () => {
    const res = mockRes();
    const next = vi.fn();
    requireServiceToken({ headers: { authorization: "Bearer secret-token-123" } } as any, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

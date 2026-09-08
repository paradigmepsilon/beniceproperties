// server/lib/pricingSettings.test.ts
// Late fee + card surcharge as admin-editable settings (2026-09-08). Locks the
// fallbacks, the write validation ranges, and the per-lease snapshot-first rule.
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getSettingNumber: vi.fn(),
  setSetting: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import {
  getLateFeePerDay,
  getCardSurchargeRate,
  getPricingSettings,
  updatePricingSettings,
  leaseLateFeePerDay,
  leaseCardSurchargeRate,
} from "./pricingSettings";
import { LeaseError } from "./lease";

beforeEach(() => {
  vi.clearAllMocks();
  // storage.getSettingNumber(key, fallback) returns the fallback when unset.
  mockStorage.getSettingNumber.mockImplementation(async (_k: string, fb: number) => fb);
  mockStorage.setSetting.mockResolvedValue(undefined);
});

describe("readers", () => {
  it("fall back to $25/day and 3.5% when nothing is stored", async () => {
    expect(await getLateFeePerDay()).toBe(25);
    expect(await getCardSurchargeRate()).toBe(0.035);
    expect(await getPricingSettings()).toEqual({ lateFeePerDay: 25, cardSurchargeRate: 0.035 });
  });
  it("read the stored value by the shared key", async () => {
    mockStorage.getSettingNumber.mockImplementation(async (k: string, fb: number) =>
      k === "late_fee_per_day" ? 40 : k === "card_surcharge_rate" ? 0.03 : fb,
    );
    expect(await getPricingSettings()).toEqual({ lateFeePerDay: 40, cardSurchargeRate: 0.03 });
  });
});

describe("updatePricingSettings", () => {
  it("writes only the provided fields and returns the refreshed pair", async () => {
    const out = await updatePricingSettings({ lateFeePerDay: 30 }, "alex@example.com");
    expect(mockStorage.setSetting).toHaveBeenCalledTimes(1);
    expect(mockStorage.setSetting).toHaveBeenCalledWith("late_fee_per_day", "30");
    expect(out.cardSurchargeRate).toBe(0.035);
  });
  it("stores the surcharge as a decimal fraction string", async () => {
    await updatePricingSettings({ cardSurchargeRate: 0.029 }, "alex@example.com");
    expect(mockStorage.setSetting).toHaveBeenCalledWith("card_surcharge_rate", "0.029");
  });
  it("rejects out-of-range values and an empty body", async () => {
    await expect(updatePricingSettings({ lateFeePerDay: -1 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({ lateFeePerDay: 501 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({ cardSurchargeRate: 0.2 }, "a")).rejects.toBeInstanceOf(LeaseError);
    await expect(updatePricingSettings({}, "a")).rejects.toBeInstanceOf(LeaseError);
    expect(mockStorage.setSetting).not.toHaveBeenCalled();
  });
  it("requires an actor", async () => {
    await expect(updatePricingSettings({ lateFeePerDay: 30 }, "")).rejects.toBeInstanceOf(LeaseError);
  });
});

describe("per-lease resolvers", () => {
  it("prefer the lease snapshot, else the fallback", () => {
    expect(leaseLateFeePerDay({ lateFeePerDaySnapshot: "20.00" }, 25)).toBe(20);
    expect(leaseLateFeePerDay({ lateFeePerDaySnapshot: null }, 25)).toBe(25);
    expect(leaseCardSurchargeRate({ cardSurchargeRateSnapshot: "0.0300" }, 0.035)).toBe(0.03);
    expect(leaseCardSurchargeRate({ cardSurchargeRateSnapshot: null }, 0.035)).toBe(0.035);
  });
});

// server/lib/pricingSettings.ts
// =============================================================================
// Late fee per day + card surcharge rate as admin-editable settings (2026-09-08).
// Both used to be code constants. They now live in app_settings (BNP is the
// system of record; UO edits them over /api/uo/settings/pricing) with the old
// constants as fallbacks. Every lease snapshots both at creation, so a change
// applies to NEW quotes and leases only — a signed agreement keeps its terms.
// =============================================================================

import { z } from "zod";
import { storage } from "../storage";
import {
  DEFAULT_LATE_FEE_PER_DAY,
  LATE_FEE_PER_DAY_SETTING,
  CARD_SURCHARGE_RATE_SETTING,
} from "@shared/schema";
import { DEFAULT_CREDIT_CARD_RATE } from "@shared/pricing";
import { LeaseError } from "./lease";
import { log } from "../server-log";

export interface PricingSettings {
  /** Dollars per day late, e.g. 25. */
  lateFeePerDay: number;
  /** Fraction, e.g. 0.035. */
  cardSurchargeRate: number;
}

export const pricingSettingsInputSchema = z
  .object({
    lateFeePerDay: z.number().min(0, "lateFeePerDay must be 0–500").max(500, "lateFeePerDay must be 0–500").optional(),
    cardSurchargeRate: z
      .number()
      .min(0, "cardSurchargeRate must be 0–0.10")
      .max(0.1, "cardSurchargeRate must be 0–0.10")
      .optional(),
  })
  .refine((v) => v.lateFeePerDay !== undefined || v.cardSurchargeRate !== undefined, {
    message: "Provide lateFeePerDay and/or cardSurchargeRate",
  });

export async function getLateFeePerDay(): Promise<number> {
  return storage.getSettingNumber(LATE_FEE_PER_DAY_SETTING, DEFAULT_LATE_FEE_PER_DAY);
}

export async function getCardSurchargeRate(): Promise<number> {
  return storage.getSettingNumber(CARD_SURCHARGE_RATE_SETTING, DEFAULT_CREDIT_CARD_RATE);
}

export async function getPricingSettings(): Promise<PricingSettings> {
  const [lateFeePerDay, cardSurchargeRate] = await Promise.all([getLateFeePerDay(), getCardSurchargeRate()]);
  return { lateFeePerDay, cardSurchargeRate };
}

/** Validate + persist; returns the refreshed pair. Logs the actor, never a secret. */
export async function updatePricingSettings(
  input: { lateFeePerDay?: number; cardSurchargeRate?: number },
  actor: string,
): Promise<PricingSettings> {
  if (!actor || !actor.trim()) throw new LeaseError("actor is required", 400);
  const parsed = pricingSettingsInputSchema.safeParse(input);
  if (!parsed.success) throw new LeaseError(parsed.error.errors[0]?.message ?? "Invalid pricing settings", 400);
  if (parsed.data.lateFeePerDay !== undefined) {
    await storage.setSetting(LATE_FEE_PER_DAY_SETTING, String(parsed.data.lateFeePerDay));
  }
  if (parsed.data.cardSurchargeRate !== undefined) {
    await storage.setSetting(CARD_SURCHARGE_RATE_SETTING, String(parsed.data.cardSurchargeRate));
  }
  log(`pricing settings updated by ${actor}: ${Object.keys(parsed.data).join(", ")}`, "uo");
  return getPricingSettings();
}

/** Lease-scoped late fee: the snapshot the lease was created under, else the fallback. */
export function leaseLateFeePerDay(lease: { lateFeePerDaySnapshot: string | null }, fallback: number): number {
  const snap = lease.lateFeePerDaySnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}

/** Lease-scoped card surcharge: the snapshot the lease was created under, else the fallback. */
export function leaseCardSurchargeRate(
  lease: { cardSurchargeRateSnapshot: string | null },
  fallback: number,
): number {
  const snap = lease.cardSurchargeRateSnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}

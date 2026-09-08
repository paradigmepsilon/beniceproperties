// client/src/lib/usePricingConfig.ts
// The live card surcharge for guest-facing copy. Server-side quotes already carry
// the real rate in their line labels; this hook exists for the three places that
// used to hard-code "3.5%" in prose. Falls back to the default until loaded so
// the page never renders an empty percentage.
import { useQuery } from "@tanstack/react-query";
import { DEFAULT_CREDIT_CARD_RATE, formatSurchargePct } from "@shared/pricing";

interface PaymentsConfig {
  stripeEnabled: boolean;
  publishableKey: string | null;
  cardSurchargeRate: number;
}

export function usePricingConfig(): { cardSurchargeRate: number; surchargePct: string } {
  const { data } = useQuery<PaymentsConfig>({
    queryKey: ["/api/payments/config"],
    staleTime: 5 * 60 * 1000,
  });
  const rate = typeof data?.cardSurchargeRate === "number" ? data.cardSurchargeRate : DEFAULT_CREDIT_CARD_RATE;
  return { cardSurchargeRate: rate, surchargePct: formatSurchargePct(rate) };
}

// client/src/pages/lease-pay.tsx
// =============================================================================
// Co-living first payment (Phase 4). After signing, the guest pays the first
// installment AND saves their card for recurring rent. Uses Stripe Elements
// (PaymentElement) with a PaymentIntent created server-side
// (setup_future_usage: off_session). On success the lease becomes ACTIVE
// (server-side, via the webhook); the page polls lease status to confirm.
//
// Card data is entered into Stripe's iframe and never touches our code.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { money } from "@/lib/format";

function cleanError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = /^\d+:\s*(\{.*\})$/.exec(raw);
  if (m) {
    try {
      return JSON.parse(m[1]).message ?? raw;
    } catch {
      /* fall through */
    }
  }
  return raw;
}

interface DepositInit {
  clientSecret: string;
  amount: number;
  publishableKey: string;
  portalToken: string | null;
}

export default function LeasePay() {
  // Wouter v3 useLocation() returns the pathname only; the query lives in useSearch().
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const leaseId = params.get("leaseId") ?? "";

  const [init, setInit] = useState<DepositInit | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Kick off the DEPOSIT PaymentIntent once. Paying the deposit secures the room;
  // the first week's rent is then charged off-session (server-side) on the saved
  // card — the guest only enters their card once.
  useEffect(() => {
    if (!leaseId) {
      setError("Missing lease. Start from your signed lease.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest("POST", `/api/leases/${leaseId}/deposit`, {});
        const data = (await res.json()) as DepositInit;
        if (cancelled) return;
        setInit(data);
        setStripePromise(loadStripe(data.publishableKey));
      } catch (err) {
        if (!cancelled) setError(cleanError(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [leaseId]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Secure your room</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay your refundable deposit to secure the room and save your card. Only the deposit is due
          now. Your first week's rent is charged on your move-in date, on the same card.
        </p>

        {error && (
          <Card className="mt-6">
            <CardContent className="pt-6 text-sm text-destructive" data-testid="text-pay-error">{error}</CardContent>
          </Card>
        )}

        {!error && !init && <p className="mt-6 text-muted-foreground">Preparing secure payment…</p>}

        {init && stripePromise && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">
                Refundable deposit: <span data-testid="text-amount">{money(init.amount)}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Elements stripe={stripePromise} options={{ clientSecret: init.clientSecret }}>
                <PayForm portalToken={init.portalToken} />
              </Elements>
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function PayForm({ portalToken }: { portalToken: string | null }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    setErr(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
    });

    if (error) {
      setErr(error.message ?? "Payment could not be completed.");
      setSubmitting(false);
      return;
    }
    if (paymentIntent && paymentIntent.status === "succeeded") {
      setDone(true);
      // The lease is activated server-side by the webhook; give it a beat, then
      // send the guest to their portal (or the lookup page if no token).
      setTimeout(() => navigate(portalToken ? `/portal/${portalToken}` : "/lookup"), 1500);
      return;
    }
    setErr("Payment is processing. You'll get a confirmation shortly.");
    setSubmitting(false);
  }

  if (done) {
    return (
      <div className="space-y-3 text-sm" data-testid="text-pay-success">
        <p className="font-medium">Room secured ✓</p>
        <p className="text-muted-foreground">
          Your deposit is received and your room is secured. Your lease is active. Your first week's
          rent will be charged on your move-in date. Redirecting to your bookings…
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {err && <p className="text-sm text-destructive">{err}</p>}
      <Button type="submit" disabled={!stripe || submitting} className="w-full" data-testid="button-pay">
        {submitting ? "Processing…" : "Pay deposit & secure room"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your refundable deposit secures the room; your first week's rent is charged next on the same
        card. Your card is securely saved by Stripe. We never see your card number.
      </p>
    </form>
  );
}

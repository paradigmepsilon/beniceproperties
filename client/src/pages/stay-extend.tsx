// client/src/pages/stay-extend.tsx
// =============================================================================
// "I'd like to stay longer." Reached from the 48h/24h checkout reminder, which
// arrives by SMS — so this page is token-authenticated with NO email challenge.
// Asking a guest to type their email on a phone at a bus stop kills the
// conversion this page exists to capture.
//
// The night options come from the server, which walks the real calendar, so the
// page can never offer nights we cannot honour. Payment reuses the same
// PaymentElement pattern as checkout, and — same rule as a new booking — the
// dates do not move until the webhook confirms.
// =============================================================================

import { useEffect, useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { cleanError } from "@/lib/portalFetch";
import { money } from "@/lib/format";

interface ExtensionOption {
  newCheckOut: string;
  addedNights: number;
  dueNow: number;
}

export default function StayExtend() {
  const { token } = useParams();
  const { toast } = useToast();
  const [selected, setSelected] = useState<ExtensionOption | null>(null);
  const [intent, setIntent] = useState<{ clientSecret: string; publishableKey: string } | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [starting, setStarting] = useState(false);

  const { data: stay } = useQuery<{ propertyName: string; roomName: string | null; checkOut: string | null; reference: string }>({
    queryKey: [`/api/stay/${token}`],
    enabled: Boolean(token),
  });

  const { data: options, isLoading } = useQuery<{ maxNewCheckOut: string | null; options: ExtensionOption[] }>({
    queryKey: [`/api/stay/${token}/extension-options`],
    enabled: Boolean(token),
  });

  // Returning from a redirect-based payment method: show the outcome rather than
  // an empty picker.
  const returned = useMemo(
    () => new URLSearchParams(window.location.search).get("paid") === "1",
    [],
  );

  async function start(option: ExtensionOption) {
    setSelected(option);
    setStarting(true);
    try {
      const res = await apiRequest("POST", `/api/stay/${token}/extension-intent`, {
        newCheckOut: option.newCheckOut,
      });
      const data = (await res.json()) as {
        clientSecret: string;
        publishableKey: string;
      };
      setStripePromise(loadStripe(data.publishableKey));
      setIntent({ clientSecret: data.clientSecret, publishableKey: data.publishableKey });
    } catch (err) {
      toast({ title: "Could not start", description: cleanError(err), variant: "destructive" });
      setSelected(null);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Stay a little longer</h1>
        {stay && (
          <p className="mt-1 text-sm text-muted-foreground">
            {stay.propertyName}
            {stay.roomName ? ` · ${stay.roomName}` : ""} — currently ending {stay.checkOut}
          </p>
        )}

        {returned && (
          <Card className="bnp-card mt-6">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              Thanks — we're confirming your payment. Your extension confirmation email will arrive
              shortly with your new dates.
            </CardContent>
          </Card>
        )}

        {!returned && (
          <div className="mt-6 space-y-6">
            {isLoading && <p className="text-sm text-muted-foreground">Checking what's available…</p>}

            {/* Never a dead end: if the room is taken straight after, say so and
                offer the human path rather than an empty page. */}
            {!isLoading && options && options.options.length === 0 && (
              <Card className="bnp-card">
                <CardHeader><CardTitle className="text-base">This room is booked right after you</CardTitle></CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  We can't extend this stay, but reply to any of our emails and we'll happily look
                  for another room for you.
                </CardContent>
              </Card>
            )}

            {!intent && options && options.options.length > 0 && (
              <Card className="bnp-card">
                <CardHeader><CardTitle className="text-base">How many more nights?</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {options.options.map((o) => (
                    <button
                      key={o.newCheckOut}
                      onClick={() => start(o)}
                      disabled={starting}
                      className="flex w-full items-center justify-between rounded-md border p-3 text-left text-sm hover:bg-muted disabled:opacity-60"
                      data-testid={`button-extend-${o.addedNights}`}
                    >
                      <span>
                        <span className="font-medium">
                          +{o.addedNights} night{o.addedNights === 1 ? "" : "s"}
                        </span>
                        <span className="text-muted-foreground"> — until {o.newCheckOut}</span>
                      </span>
                      <span className="font-semibold">{money(o.dueNow)}</span>
                    </button>
                  ))}
                  <p className="pt-2 text-xs text-muted-foreground">
                    Same room, same door code, and nothing new to sign.
                  </p>
                </CardContent>
              </Card>
            )}

            {intent && stripePromise && selected && (
              <Card className="bnp-card">
                <CardHeader>
                  <CardTitle className="text-base">
                    +{selected.addedNights} night{selected.addedNights === 1 ? "" : "s"} — until{" "}
                    {selected.newCheckOut}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Due now</span>
                    <span className="text-lg font-semibold">{money(selected.dueNow)}</span>
                  </div>
                  <Separator />
                  <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
                    <PayExtension token={token!} newCheckOut={selected.newCheckOut} />
                  </Elements>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function PayExtension({ token, newCheckOut }: { token: string; newCheckOut: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Handle a redirect-based method coming back to this page.
  useEffect(() => {
    const secret = new URLSearchParams(window.location.search).get("payment_intent_client_secret");
    if (!secret || !stripe) return;
    void stripe.retrievePaymentIntent(secret).then(({ paymentIntent }) => {
      if (paymentIntent?.status === "succeeded") setDone(true);
    });
  }, [stripe]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        // Required for any redirect-based method; without it Stripe throws an
        // IntegrationError at confirm time.
        return_url: `${window.location.origin}/stay/${token}/extend?paid=1`,
      },
    });
    if (error) {
      toast({ title: "Payment failed", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    if (paymentIntent?.status === "succeeded") {
      setDone(true);
      return;
    }
    toast({ title: "Payment is processing", description: "We'll email you once it clears." });
    setSubmitting(false);
  }

  if (done) {
    return (
      <p className="text-sm" data-testid="text-extend-done">
        Paid — your stay now runs to <strong>{newCheckOut}</strong>. Your confirmation email is on
        its way.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      <Button type="submit" disabled={!stripe || submitting} data-testid="button-pay-extension">
        {submitting ? "Paying…" : "Pay and extend"}
      </Button>
    </form>
  );
}

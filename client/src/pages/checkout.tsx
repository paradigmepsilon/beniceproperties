// client/src/pages/checkout.tsx
// The short-stay booking flow (STR whole-property + short co-living 7–28 nights).
// Reads propertyId/roomId/checkIn/checkOut from the query string, fetches a LIVE
// quote, and pays on-page — PAYMENT-FIRST (mirroring the TRAD reference site):
//
//   • On load, once the quote is ready, we create a Stripe PaymentIntent via
//     POST /api/booking-intent — NO booking row is written. The embedded Payment
//     Element mounts immediately, before any contact is entered.
//   • The guest fills first/last/email/phone alongside the Element.
//   • On "Pay Now" we first attach the contact to the intent
//     (POST /api/booking-intent/:id/contact), then confirm the payment on-page.
//   • The booking is MATERIALIZED server-side by the webhook
//     (payment_intent.succeeded) from the PI metadata — never by the client.
//
// Because nothing is written until payment succeeds, an abandoned checkout leaves
// zero DB footprint and blocks no dates. Manual payment (CashApp/Zelle) is a
// per-payment option on co-living LEASE rent only (see the guest portal).

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import type { QuoteResponse, BookingIntentResponse } from "@shared/api-types";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/format";

// Short stays are card-only (Stripe), mirroring TRAD. The 3.5% card surcharge
// still shows as a line item in the quote below.
const PAYMENT_METHOD = "STRIPE" as const;

interface IntentState {
  clientSecret: string;
  publishableKey: string;
  paymentIntentId: string;
  reference: string;
}

export default function Checkout() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Wouter v3 useLocation() returns the pathname only; the query lives in useSearch().
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const propertyId = params.get("propertyId") ?? "";
  const roomId = params.get("roomId") ?? undefined;
  const checkIn = params.get("checkIn") ?? undefined;
  const checkOut = params.get("checkOut") ?? undefined;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // The payment intent (created on mount) + the loaded Stripe instance.
  const [intent, setIntent] = useState<IntentState | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  // Guards the create-intent effect so it fires exactly once.
  const startedRef = useRef(false);

  const guestName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const detailsValid = Boolean(firstName.trim()) && Boolean(lastName.trim()) && emailValid;

  // Live quote — short stays are always paid by card (Stripe).
  const quoteBody = { propertyId, roomId, checkIn, checkOut, paymentMethod: PAYMENT_METHOD };
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuery<QuoteResponse>({
    queryKey: ["/api/quote", JSON.stringify(quoteBody)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/quote", quoteBody);
      return res.json();
    },
    enabled: Boolean(propertyId),
  });

  // Create the PaymentIntent as soon as the quote is ready — BEFORE any contact —
  // so the Payment Element can mount on load (payment-first). No booking row is
  // written; the intent carries everything the webhook needs. Fires once.
  useEffect(() => {
    if (startedRef.current) return;
    if (!quote || !propertyId) return;
    startedRef.current = true;
    (async () => {
      try {
        const res = await apiRequest("POST", "/api/booking-intent", {
          propertyId,
          roomId,
          checkIn,
          checkOut,
        });
        const data = (await res.json()) as BookingIntentResponse;
        if (!data.clientSecret || !data.publishableKey) {
          throw new Error("Payment could not be initialized.");
        }
        setStripePromise(loadStripe(data.publishableKey));
        setIntent({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          paymentIntentId: data.paymentIntentId,
          reference: data.reference,
        });
      } catch (err) {
        startedRef.current = false; // allow a retry on the next render
        setIntentError((err as Error).message);
        toast({ title: "Could not start checkout", description: (err as Error).message, variant: "destructive" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quote, propertyId]);

  if (!propertyId) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
          Missing booking details. Start from a listing.
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-6 py-12 md:grid-cols-2">
        {/* Left: guest details → payment */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your details and secure card payment.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    data-testid="input-last-name"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  data-testid="input-phone"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment — the card element is visible from the start (payment-first). */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {intentError && <p className="text-destructive" data-testid="text-intent-error">{intentError}</p>}
              {!intent && !intentError && (
                <p className="text-muted-foreground">Loading secure payment…</p>
              )}
              {intent && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
                  <PayForm
                    paymentIntentId={intent.paymentIntentId}
                    reference={intent.reference}
                    detailsValid={Boolean(detailsValid)}
                    guestName={guestName}
                    email={email.trim()}
                    phone={phone.trim()}
                  />
                </Elements>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: live price summary (sticky). */}
        <div>
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="text-base">Price summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {quoteLoading && <p className="text-muted-foreground">Calculating…</p>}
              {quoteError && <p className="text-destructive">{(quoteError as Error).message}</p>}
              {quote && (
                <>
                  {quote.dueNow.lines.map((l, i) => (
                    <div key={i} className="flex justify-between">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span>{money(l.amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total due now</span>
                    <span data-testid="text-total">{money(quote.dueNow.total)}</span>
                  </div>
                  {quote.recurring && (
                    <div className="mt-3 rounded-md bg-muted p-3 text-xs">
                      <div className="font-medium">{quote.recurring.label}</div>
                      <div className="mt-1 flex justify-between">
                        <span>Weekly rent</span>
                        <span>{money(quote.recurring.weeklyRent)}</span>
                      </div>
                      {quote.recurring.surcharge > 0 && (
                        <div className="flex justify-between">
                          <span>Card processing (3.5%)</span>
                          <span>{money(quote.recurring.surcharge)}</span>
                        </div>
                      )}
                      <div className="mt-1 flex justify-between font-medium">
                        <span>Weekly total</span>
                        <span>{money(quote.recurring.weeklyTotal)}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

// The embedded card form. Card data goes straight into Stripe's iframe and never
// touches our code. On "Pay Now" we first attach the guest's contact to the
// PaymentIntent (so the webhook can materialize the booking), then confirm the
// payment. The booking is created server-side by the webhook; the client only
// navigates to the confirmation page. Pay Now is disabled until the guest details
// are valid AND the Stripe card details are complete.
function PayForm({
  paymentIntentId,
  reference,
  detailsValid,
  guestName,
  email,
  phone,
}: {
  paymentIntentId: string;
  reference: string;
  detailsValid: boolean;
  guestName: string;
  email: string;
  phone: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !detailsValid) return;
    setSubmitting(true);
    setErr(null);

    try {
      // Attach final contact to the intent so the webhook can rebuild the booking.
      await apiRequest("POST", `/api/booking-intent/${paymentIntentId}/contact`, {
        name: guestName,
        email,
        phone: phone || undefined,
      });
    } catch (contactErr) {
      setErr((contactErr as Error).message || "Could not save your details.");
      setSubmitting(false);
      return;
    }

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
      // Booking is materialized server-side by the webhook; head to confirmation.
      navigate(`/confirmation/${reference}`);
      return;
    }
    setErr("Payment is processing. You'll get a confirmation shortly.");
    setSubmitting(false);
  }

  const disabled = !stripe || submitting || !complete || !detailsValid;

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement onChange={(e) => setComplete(e.complete)} />
      {!detailsValid && (
        <p className="text-xs text-muted-foreground" data-testid="text-payment-hint">
          Enter your first name, last name, and email above to complete your payment.
        </p>
      )}
      {err && <p className="text-sm text-destructive" data-testid="text-pay-error">{err}</p>}
      <Button type="submit" disabled={disabled} className="w-full" data-testid="button-pay">
        {submitting ? "Processing…" : "Pay Now"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your card is securely processed by Stripe — we never see your card number.
      </p>
    </form>
  );
}

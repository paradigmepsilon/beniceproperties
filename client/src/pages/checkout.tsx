// client/src/pages/checkout.tsx
// The short-stay booking flow (STR whole-property + short co-living 7–28 nights).
// Reads propertyId/roomId/checkIn/checkOut from the query string, fetches a LIVE
// quote from the server, collects guest info, and creates the booking.
//
// Short stays are Stripe-only (mirroring the TRAD reference site): the card is
// paid ON-PAGE with an embedded Payment Element (no redirect off the site),
// mirroring the co-living deposit flow in lease-pay.tsx. The booking is only
// confirmed server-side by the webhook (payment_intent.succeeded); the client
// just confirms the PaymentIntent and then sends the guest to the confirmation
// page. Manual payment (CashApp/Zelle) is NOT offered for short stays — it is a
// per-payment option on co-living LEASE rent only (see the guest portal).
//
// UX: the guest enters first name, last name, and email; the moment those are
// valid the booking + PaymentIntent are created automatically and the Stripe
// Payment Element appears directly under the details (no intermediate button).
// A single "Pay Now" button beneath the card runs the charge, enabled once the
// card details are complete.

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { apiRequest } from "@/lib/queryClient";
import type { QuoteResponse, CreateBookingResponse } from "@shared/api-types";
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

// The Stripe payment step we swap into once a PaymentIntent exists.
interface StripeStep {
  clientSecret: string;
  publishableKey: string;
  reference: string;
  amount: number;
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
  // Once set, the guest pays the card on-page via the embedded Payment Element.
  const [stripeStep, setStripeStep] = useState<StripeStep | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  // Guards the auto-create effect so the booking is created exactly once.
  const startedRef = useRef(false);

  const guestName = `${firstName.trim()} ${lastName.trim()}`.trim();
  const detailsValid =
    Boolean(firstName.trim()) && Boolean(lastName.trim()) && /\S+@\S+\.\S+/.test(email);

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

  const createBooking = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bookings", {
        propertyId,
        roomId,
        checkIn,
        checkOut,
        paymentMethod: PAYMENT_METHOD,
        guest: { name: guestName, email, phone: phone || undefined },
      });
      return (await res.json()) as CreateBookingResponse;
    },
    onSuccess: (data) => {
      if (data.clientSecret && data.publishableKey) {
        // Stripe: mount the embedded Payment Element on-page (no redirect).
        setStripePromise(loadStripe(data.publishableKey));
        setStripeStep({
          clientSecret: data.clientSecret,
          publishableKey: data.publishableKey,
          reference: data.reference,
          amount: data.quote.dueNow.total,
        });
      } else {
        navigate(`/confirmation/${data.reference}`);
      }
    },
    onError: (err: Error) => {
      // Allow another attempt if the guest fixes their details.
      startedRef.current = false;
      toast({ title: "Could not complete booking", description: err.message, variant: "destructive" });
    },
  });

  // Auto-create the booking + PaymentIntent the moment the required details are
  // valid and the quote is ready — so the card fields appear without an extra
  // click. Runs exactly once (startedRef); the identity fields lock afterward so
  // the created PaymentIntent's guest stays consistent with what's charged.
  useEffect(() => {
    if (startedRef.current) return;
    if (!detailsValid || !quote || stripeStep) return;
    startedRef.current = true;
    createBooking.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailsValid, quote, stripeStep]);

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

  const identityLocked = Boolean(stripeStep) || createBooking.isPending;

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
                    disabled={identityLocked}
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={identityLocked}
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
                  disabled={identityLocked}
                  data-testid="input-email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={identityLocked}
                  data-testid="input-phone"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment — appears automatically once the details above are complete. */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {!stripeStep && (
                <p className="text-muted-foreground" data-testid="text-payment-hint">
                  Enter your first name, last name, and email to see your payment options.
                </p>
              )}
              {!stripeStep && createBooking.isPending && (
                <p className="text-muted-foreground">Loading secure payment…</p>
              )}
              {stripeStep && stripePromise && (
                <Elements stripe={stripePromise} options={{ clientSecret: stripeStep.clientSecret }}>
                  <PayForm reference={stripeStep.reference} />
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
// touches our code. On success we send the guest to the confirmation page; the
// booking itself is confirmed server-side by the webhook. Pay Now is disabled
// until the Payment Element reports the card details are complete.
function PayForm({ reference }: { reference: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [, navigate] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [complete, setComplete] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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
      // Booking is confirmed server-side by the webhook; head to confirmation.
      navigate(`/confirmation/${reference}`);
      return;
    }
    setErr("Payment is processing. You'll get a confirmation shortly.");
    setSubmitting(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement onChange={(e) => setComplete(e.complete)} />
      {err && <p className="text-sm text-destructive" data-testid="text-pay-error">{err}</p>}
      <Button type="submit" disabled={!stripe || submitting || !complete} className="w-full" data-testid="button-pay">
        {submitting ? "Processing…" : "Pay Now"}
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Your card is securely processed by Stripe — we never see your card number.
      </p>
    </form>
  );
}

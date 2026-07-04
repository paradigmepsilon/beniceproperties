// client/src/pages/checkout.tsx
// The booking flow. Reads propertyId/roomId/checkIn/checkOut from the query
// string, fetches a LIVE method-aware quote from the server (the surcharge
// appears/disappears as the method changes), collects guest info, and creates
// the booking. Stripe → redirect to Checkout. CashApp/Zelle → instructions.

import { useMemo, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { QuoteResponse, CreateBookingResponse } from "@shared/api-types";
import type { PaymentMethod } from "@shared/pricing";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/format";

const METHODS: { value: PaymentMethod; label: string; note: string }[] = [
  { value: "STRIPE", label: "Card (Stripe)", note: "Secure card payment · 3.5% processing fee" },
  { value: "CASHAPP", label: "CashApp", note: "Manual · no processing fee" },
  { value: "ZELLE", label: "Zelle", note: "Manual · no processing fee" },
];

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

  const [method, setMethod] = useState<PaymentMethod>("STRIPE");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [manual, setManual] = useState<CreateBookingResponse["manualInstructions"] | null>(null);
  const [manualRef, setManualRef] = useState<string | null>(null);

  // Live quote — refetches whenever the payment method changes.
  const quoteBody = { propertyId, roomId, checkIn, checkOut, paymentMethod: method };
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
        paymentMethod: method,
        guest: { name, email, phone: phone || undefined },
      });
      return (await res.json()) as CreateBookingResponse;
    },
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl; // Stripe Checkout
      } else if (data.manualInstructions) {
        setManual(data.manualInstructions);
        setManualRef(data.reference);
      } else {
        navigate(`/confirmation/${data.reference}`);
      }
    },
    onError: (err: Error) => {
      toast({ title: "Could not complete booking", description: err.message, variant: "destructive" });
    },
  });

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

  // Manual payment instructions screen.
  if (manual && manualRef) {
    return (
      <div className="flex min-h-screen flex-col">
        <SiteHeader />
        <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
          <Card className="bnp-card">
            <CardHeader>
              <CardTitle className="font-display text-xl">Almost there — send your payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <p>
                Your booking is reserved as <strong>pending payment</strong>. Send{" "}
                <strong>{money(manual.amount)}</strong> via <strong>{manual.method}</strong> to:
              </p>
              <div className="rounded-md border p-4">
                <div className="text-lg font-semibold">{manual.handle}</div>
                <div className="mt-2 text-muted-foreground">
                  Include this reference in the memo: <strong>{manual.memo}</strong>
                </div>
              </div>
              <p className="text-muted-foreground">
                Once we confirm receipt, your booking is confirmed. Track status anytime under
                "My booking" with your reference and email.
              </p>
              <Button onClick={() => navigate(`/confirmation/${manualRef}`)} data-testid="button-view-booking">
                View my booking
              </Button>
            </CardContent>
          </Card>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const canSubmit = name.trim() && /\S+@\S+\.\S+/.test(email) && quote && !createBooking.isPending;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-4xl flex-1 gap-8 px-6 py-12 md:grid-cols-2">
        {/* Left: guest + method */}
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Checkout</h1>
            <p className="mt-1 text-sm text-muted-foreground">Your details and payment method.</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} data-testid="input-name" />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
              </div>
              <div>
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-phone" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment method</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`flex w-full items-center justify-between rounded-md border p-3 text-left text-sm transition-colors ${
                    method === m.value ? "border-primary bg-accent" : "hover:bg-accent/50"
                  }`}
                  data-testid={`method-${m.value}`}
                >
                  <span>
                    <span className="font-medium">{m.label}</span>
                    <span className="block text-xs text-muted-foreground">{m.note}</span>
                  </span>
                  <span className={`h-4 w-4 rounded-full border ${method === m.value ? "bg-primary" : ""}`} />
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right: live quote */}
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
                  <Button
                    className="mt-4 w-full"
                    disabled={!canSubmit}
                    onClick={() => createBooking.mutate()}
                    data-testid="button-place-booking"
                  >
                    {createBooking.isPending
                      ? "Processing…"
                      : method === "STRIPE"
                        ? "Pay with card"
                        : `Reserve & pay via ${method === "CASHAPP" ? "CashApp" : "Zelle"}`}
                  </Button>
                  {method !== "STRIPE" && (
                    <p className="text-xs text-muted-foreground">
                      No processing fee. You'll get payment instructions next; booking holds as pending until confirmed.
                    </p>
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

// client/src/pages/booking-lookup.tsx
// Lightweight guest lookup: reference + email → booking + payment status.
// No account system in v1.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { money } from "@/lib/format";

interface LookupResult {
  booking: {
    reference: string;
    model: string;
    status: string;
    checkIn: string;
    checkOut: string | null;
    paymentMethod: string;
  };
  property: { name: string; location: string } | null;
  room: { name: string } | null;
  payments: { type: string; method: string; amount: string; surcharge: string; status: string; paidAt: string | null }[];
}

// Positive statuses get the green "good" tint (green = status, never brand);
// failures stay destructive; everything else is neutral.
function StatusBadge({ status }: { status: string }) {
  const positive = status === "CONFIRMED" || status === "ACTIVE" || status === "PAID";
  const negative = status === "CANCELLED" || status === "FAILED";
  return (
    <Badge
      variant={negative ? "destructive" : "secondary"}
      className={positive ? "bg-good-bg text-good hover:bg-good-bg" : undefined}
    >
      {status}
    </Badge>
  );
}

export default function BookingLookup() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");

  const lookup = useMutation({
    mutationFn: async () => {
      const qs = new URLSearchParams({ reference: reference.trim(), email: email.trim() });
      const res = await apiRequest("GET", `/api/lookup?${qs.toString()}`);
      return (await res.json()) as LookupResult;
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-12">
        <h1 className="font-display text-2xl font-semibold tracking-tight">My booking</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter your reference and the email you booked with.
        </p>

        <Card className="bnp-card mt-6">
          <CardContent className="space-y-3 pt-6">
            <div>
              <Label htmlFor="ref">Booking reference</Label>
              <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="BNP-XXXX-XXXX" data-testid="input-reference" />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-lookup-email" />
            </div>
            <Button
              onClick={() => lookup.mutate()}
              disabled={!reference.trim() || !email.trim() || lookup.isPending}
              data-testid="button-lookup"
            >
              {lookup.isPending ? "Looking up…" : "Find my booking"}
            </Button>
            {lookup.isError && (
              <p className="text-sm text-destructive">{(lookup.error as Error).message}</p>
            )}
          </CardContent>
        </Card>

        {lookup.data && (
          <Card className="bnp-card mt-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">{lookup.data.booking.reference}</CardTitle>
                <StatusBadge status={lookup.data.booking.status} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                {lookup.data.property?.name}
                {lookup.data.room ? ` · ${lookup.data.room.name}` : ""}
              </div>
              <div className="text-muted-foreground">
                {lookup.data.property?.location} · {lookup.data.booking.model}
              </div>
              <div className="text-muted-foreground">
                Check-in {lookup.data.booking.checkIn}
                {lookup.data.booking.checkOut ? ` → ${lookup.data.booking.checkOut}` : " (open-ended)"}
              </div>
              <Separator className="my-2" />
              <div className="font-medium">Payments</div>
              {lookup.data.payments.map((p, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {p.type} · {p.method}
                  </span>
                  <span className="flex items-center gap-2">
                    {money(parseFloat(p.amount) + parseFloat(p.surcharge))}
                    <StatusBadge status={p.status} />
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

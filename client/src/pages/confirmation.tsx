// client/src/pages/confirmation.tsx
// Post-booking landing. Shows the reference and points the guest to the lookup
// page (where they enter reference + email to see live payment status). We don't
// auto-load the booking here since this page is reached without the email in hand
// after a Stripe redirect.

import { useParams, Link } from "wouter";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Confirmation() {
  const { reference } = useParams();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
        <Card className="bnp-card">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
              <CheckCircle2 className="h-6 w-6 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl">Booking received</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Your booking reference is:</p>
            <div className="rounded-md border p-4 text-center text-2xl font-semibold tracking-wide" data-testid="text-reference">
              {reference}
            </div>
            <p className="text-muted-foreground">
              Save this reference. You can check your booking and payment status anytime under
              "My booking" using this reference and the email you booked with.
            </p>
            <Link href="/lookup">
              <Button data-testid="button-go-lookup">Check booking status</Button>
            </Link>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

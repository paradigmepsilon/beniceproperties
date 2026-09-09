// client/src/pages/confirmation.tsx
// =============================================================================
// Where a guest lands the moment their card clears.
//
// THE TIMING PROBLEM this page solves: checkout navigates here as soon as
// confirmPayment resolves, which is typically BEFORE the Stripe webhook has
// materialized the booking — on Vercel that is a separate invocation. So on first
// paint there may be no booking at all, let alone a gate token. The page polls
// POST /api/stay/claim, which answers 202 while the webhook is still in flight.
//
// It used to print the reference string and fetch nothing, which meant a gated
// guest was told "you're booked" and never learned they still owed us an ID and a
// signature. That is what this replaces.
//
// The handoff comes from sessionStorage (written by checkout.tsx) so the happy
// path is zero-friction. If it is missing — a refreshed tab, a different device,
// a link forwarded to a partner — the page falls back to the reference + email
// challenge, which is exactly the auth level /lookup already uses.
// =============================================================================

import { useEffect, useState } from "react";
import { useParams, Link } from "wouter";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanError } from "@/lib/portalFetch";

/** Key checkout.tsx writes so this page can claim without asking again. */
export const STAY_HANDOFF_KEY = "bnp:stay-handoff";

type ClaimState =
  | { kind: "claiming" }
  | { kind: "pending" }
  | { kind: "gated"; token: string }
  | { kind: "ungated" }
  | { kind: "challenge"; error?: string };

const POLL_MS = 2000;
const POLL_CEILING_MS = 60_000;

async function claim(reference: string, email: string) {
  const res = await fetch("/api/stay/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ reference, email }),
  });
  if (res.status === 202) return { pending: true as const };
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return (await res.json()) as { gated: boolean; token?: string };
}

export default function Confirmation() {
  const { reference } = useParams();
  const [state, setState] = useState<ClaimState>({ kind: "claiming" });
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Auto-claim from the handoff, polling while the webhook lands.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = sessionStorage.getItem(STAY_HANDOFF_KEY);
    } catch {
      // Private mode or blocked storage — fall through to the challenge.
    }
    if (!stored || !reference) {
      setState({ kind: "challenge" });
      return;
    }
    let parsedEmail = "";
    try {
      parsedEmail = (JSON.parse(stored) as { email?: string }).email ?? "";
    } catch {
      setState({ kind: "challenge" });
      return;
    }
    if (!parsedEmail) {
      setState({ kind: "challenge" });
      return;
    }

    let cancelled = false;
    const startedAt = Date.now();
    const tick = async () => {
      if (cancelled) return;
      try {
        const result = await claim(reference, parsedEmail);
        if (cancelled) return;
        if ("pending" in result) {
          // Give up polling eventually rather than spinning forever — the guest
          // still has the confirmation email and /lookup.
          if (Date.now() - startedAt > POLL_CEILING_MS) return setState({ kind: "pending" });
          setState({ kind: "pending" });
          setTimeout(tick, POLL_MS);
          return;
        }
        setState(result.gated && result.token ? { kind: "gated", token: result.token } : { kind: "ungated" });
      } catch {
        if (!cancelled) setState({ kind: "challenge" });
      }
    };
    void tick();
    return () => {
      cancelled = true;
    };
  }, [reference]);

  async function submitChallenge(e: React.FormEvent) {
    e.preventDefault();
    if (!reference) return;
    setSubmitting(true);
    try {
      const result = await claim(reference, email);
      if ("pending" in result) {
        setState({ kind: "pending" });
      } else {
        setState(result.gated && result.token ? { kind: "gated", token: result.token } : { kind: "ungated" });
      }
    } catch (err) {
      setState({ kind: "challenge", error: cleanError(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl flex-1 px-6 py-16">
        <Card className="bnp-card">
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-good-bg">
              <CheckCircle2 className="h-6 w-6 text-good" />
            </div>
            <CardTitle className="font-display text-2xl">
              {state.kind === "gated" ? "Payment received" : "Booking received"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>Your booking reference is:</p>
            <div
              className="rounded-md border p-4 text-center text-2xl font-semibold tracking-wide"
              data-testid="text-reference"
            >
              {reference}
            </div>

            {state.kind === "claiming" && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Setting up your booking…
              </p>
            )}

            {state.kind === "pending" && (
              <p className="flex items-center gap-2 text-muted-foreground" data-testid="text-pending">
                <Loader2 className="h-4 w-4 animate-spin" /> Payment received. We're still setting
                up your booking — check your email in a minute, or use "My booking" below.
              </p>
            )}

            {/* The whole point of the rewrite: a gated guest is told, here and
                immediately, that they are not finished. */}
            {state.kind === "gated" && (
              <div className="space-y-3">
                <p className="font-medium text-foreground">
                  Two things left to complete your booking
                </p>
                <p className="text-muted-foreground">
                  We need a photo of your driver's licence and your signed rental agreement. It
                  takes about two minutes. Once we have both, we review and confirm — that can
                  take up to 24 hours, and we'll email your door code and directions as soon as
                  it's approved.
                </p>
                <Link href={`/stay/${state.token}`}>
                  <Button data-testid="button-finish-booking">Finish my booking →</Button>
                </Link>
              </div>
            )}

            {state.kind === "ungated" && (
              <div className="space-y-3">
                <p className="text-muted-foreground">
                  You're all set. Your check-in details arrive the day before you arrive.
                </p>
                <Link href="/lookup">
                  <Button variant="outline" data-testid="button-go-lookup">
                    Check booking status
                  </Button>
                </Link>
              </div>
            )}

            {state.kind === "challenge" && (
              <form onSubmit={submitChallenge} className="space-y-3" data-testid="form-claim">
                <p className="text-muted-foreground">
                  Confirm the email you booked with and we'll show you what's left to do.
                </p>
                <div className="space-y-1">
                  <Label htmlFor="claim-email">Email</Label>
                  <Input
                    id="claim-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    data-testid="input-claim-email"
                  />
                </div>
                {state.error && (
                  <p className="flex items-center gap-2 text-destructive" data-testid="text-claim-error">
                    <AlertCircle className="h-4 w-4" /> {state.error}
                  </p>
                )}
                <Button type="submit" disabled={submitting || !email} data-testid="button-claim">
                  {submitting ? "Checking…" : "Continue"}
                </Button>
              </form>
            )}

            <p className="text-muted-foreground">
              Save this reference — you can check your booking any time under "My booking".
            </p>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

// client/src/pages/lease-booking.tsx
// =============================================================================
// Co-living LEASE booking flow (Phase 2). Reaches the "ready to pay" state:
//   pick room(s) (from the query string) → pick term dates (≤ 90 days) →
//   pick cadence (Weekly / Bi-weekly / Monthly) → see the FULL payment-schedule
//   preview (every due date + amount, first payment due today highlighted, total
//   lease value, proration note) → enter guest identity.
//
// The schedule preview comes from POST /api/lease-quote, which the server
// computes with the SAME shared generator it will persist + charge with. No
// payment is taken here — Phase 4 owns money. The CTA hands off to the lease
// signing step (Phase 3) once committed; for now it confirms readiness.
// =============================================================================

import { useMemo, useState } from "react";
import { useLocation, useSearch, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { LeaseQuoteResponse } from "@shared/api-types";
import { PAYMENT_CADENCES } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { money } from "@/lib/format";

type Cadence = (typeof PAYMENT_CADENCES)[number];

const CADENCE_LABELS: Record<Cadence, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Bi-weekly",
  MONTHLY: "Monthly",
};

// apiRequest throws `${status}: ${jsonBody}` — pull out a clean message.
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

export default function LeaseBooking() {
  const [, navigate] = useLocation();
  // Wouter v3 useLocation() returns the pathname only; the query lives in useSearch().
  const search = useSearch();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const propertyId = params.get("propertyId") ?? "";
  // One or more roomId params (?roomId=a&roomId=b).
  const roomIds = useMemo(() => params.getAll("roomId").filter(Boolean), [params]);

  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  // Guest-selected billing cadence. Empty = let the server pick the default
  // (shortest allowed) so the first preview renders before the guest chooses.
  const [cadence, setCadence] = useState<Cadence | "">("");

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  // Cadence is the guest's choice, gated by term length; sent to the quote so the
  // schedule reflects it. Blank until chosen (server defaults to shortest allowed).
  const quoteBody = { propertyId, roomIds, startDate, endDate, ...(cadence ? { cadence } : {}) };

  const {
    data: quote,
    isLoading,
    error,
  } = useQuery<LeaseQuoteResponse>({
    queryKey: ["/api/lease-quote", JSON.stringify(quoteBody)],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/lease-quote", quoteBody);
      return res.json();
    },
    enabled: Boolean(propertyId) && roomIds.length > 0 && datesValid,
  });

  const guestValid = name.trim() !== "" && /\S+@\S+\.\S+/.test(email);
  const canProceed = Boolean(quote) && guestValid;

  function proceedToLease() {
    // Phase 3 wires the lease document + signature. Hand off the committed
    // selection (incl. the chosen cadence) so the next step creates the DRAFT.
    const qs = new URLSearchParams({ propertyId, startDate, endDate, name, email });
    if (phone) qs.set("phone", phone);
    // Use the server-confirmed cadence from the quote (falls back to chosen).
    const chosen = quote?.cadence ?? cadence;
    if (chosen) qs.set("cadence", chosen);
    for (const id of roomIds) qs.append("roomId", id);
    navigate(`/lease/sign?${qs.toString()}`);
  }

  if (!propertyId || roomIds.length === 0) {
    return (
      <Shell>
        <p className="text-muted-foreground">
          Missing room selection. Start from a co-living room listing.
        </p>
      </Shell>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <Link
          href={`/property/${propertyId}`}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to property
        </Link>

        <h1 className="font-display text-2xl font-semibold tracking-tight">Set up your lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your dates. We pick the best rate for your stay length automatically — longer
          stays get the weekly or monthly rate. You'll see every payment before you commit, and you
          won't be charged until you sign.
        </p>

        <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_400px]">
          {/* Left: term + cadence + guest */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Lease term</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="start" className="text-xs">Start date</Label>
                    <Input
                      id="start"
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end" className="text-xs">End date</Label>
                    <Input
                      id="end"
                      type="date"
                      min={startDate || today}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Lease terms run up to 90 days.</p>
              </CardContent>
            </Card>

            {quote && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your rate</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Based on a {quote.termDays}-night stay, you're getting the{" "}
                  <span className="font-medium text-foreground">
                    {CADENCE_LABELS[quote.cadence]?.toLowerCase() ?? quote.cadence.toLowerCase()}
                  </span>{" "}
                  rate, billed {CADENCE_LABELS[quote.cadence]?.toLowerCase() ?? "per period"}.
                </CardContent>
              </Card>
            )}

            {quote && quote.allowedCadences.length > 1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">How often would you like to pay?</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {quote.allowedCadences.map((c) => (
                      <Button
                        key={c}
                        type="button"
                        size="sm"
                        className="rounded-full"
                        variant={quote.cadence === c ? "default" : "outline"}
                        onClick={() => setCadence(c)}
                        data-testid={`button-cadence-${c}`}
                      >
                        {CADENCE_LABELS[c]}
                      </Button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Longer terms unlock more options. Your rate is the same; this only changes how
                    often you're billed.
                  </p>
                </CardContent>
              </Card>
            )}

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
          </div>

          {/* Right: schedule preview */}
          <div>
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Payment schedule</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {!datesValid && (
                  <p className="text-muted-foreground">Pick your start and end dates to preview every payment.</p>
                )}
                {datesValid && isLoading && <p className="text-muted-foreground">Building schedule…</p>}
                {datesValid && error && (
                  <p className="text-destructive" data-testid="text-quote-error">{cleanError(error)}</p>
                )}
                {quote && (
                  <>
                    <div className="text-xs text-muted-foreground">
                      {quote.rooms.map((r) => r.name).join(" + ")} · {CADENCE_LABELS[quote.cadence]} ·{" "}
                      {quote.termDays} days
                    </div>

                    <ol className="space-y-1.5" data-testid="list-schedule">
                      {quote.schedule.map((row) => (
                        <li
                          key={row.seq}
                          className={`flex items-center justify-between rounded-md px-2 py-1.5 ${
                            row.dueOnBooking ? "bg-accent font-medium" : ""
                          }`}
                          data-testid={`schedule-row-${row.seq}`}
                        >
                          <span>
                            <span className="text-muted-foreground">#{row.seq}</span> {row.dueDate}
                            {row.dueOnBooking && (
                              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Due at move-in
                              </span>
                            )}
                            {row.prorated && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (prorated · {row.daysCovered}d)
                              </span>
                            )}
                          </span>
                          <span>{money(row.amount)}</span>
                        </li>
                      ))}
                    </ol>

                    <Separator />
                    {quote.depositTotal > 0 && (
                      <div className="flex justify-between rounded-md bg-accent px-2 py-1.5">
                        <span className="font-medium">Due now — deposit to secure the room</span>
                        <span className="font-semibold" data-testid="text-deposit">{money(quote.depositTotal)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Due at move-in — first week's rent</span>
                      <span className="font-medium" data-testid="text-due-today">{money(quote.dueToday)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total lease value</span>
                      <span data-testid="text-total-lease">{money(quote.totalLeaseValue)}</span>
                    </div>
                    {quote.depositTotal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Only the refundable deposit is due now — it secures your room. Your first
                        week's rent is due on your move-in date ({quote.startDate}), and the rest
                        follows your schedule above.
                      </p>
                    )}

                    <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground" data-testid="text-proration">
                      {quote.prorationNote}
                    </p>

                    <Button
                      className="mt-2 w-full"
                      disabled={!canProceed}
                      onClick={proceedToLease}
                      data-testid="button-review-lease"
                    >
                      Review &amp; sign lease
                    </Button>
                    {!guestValid && (
                      <p className="text-xs text-muted-foreground">Add your name and email to continue.</p>
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                      You won't be charged until you sign.
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">{children}</main>
      <SiteFooter />
    </div>
  );
}

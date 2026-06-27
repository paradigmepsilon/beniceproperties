// client/src/pages/lease-sign.tsx
// =============================================================================
// Lease review + in-app e-signature (Phase 3). Receives the committed selection
// from the lease-booking page (query string), creates the DRAFT lease (which
// persists the schedule and renders the agreement), shows the agreement, and
// captures a typed legal-name signature + affirmation checkbox. On signing, the
// lease moves to PENDING_FIRST_PAYMENT and the guest is told payment comes next
// (Phase 4). No payment is taken here.
// =============================================================================

import { useMemo, useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type {
  CreateDraftLeaseResponse,
  SignLeaseResponse,
} from "@shared/api-types";
import { PAYMENT_CADENCES } from "@shared/schema";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

type Cadence = (typeof PAYMENT_CADENCES)[number];

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

export default function LeaseSign() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] ?? ""), [location]);

  const propertyId = params.get("propertyId") ?? "";
  const roomIds = useMemo(() => params.getAll("roomId").filter(Boolean), [params]);
  const startDate = params.get("startDate") ?? "";
  const endDate = params.get("endDate") ?? "";
  const cadence = (params.get("cadence") as Cadence) ?? "WEEKLY";
  const name = params.get("name") ?? "";
  const email = params.get("email") ?? "";
  const phone = params.get("phone") ?? undefined;

  const [leaseId, setLeaseId] = useState<string | null>(null);
  const [documentHtml, setDocumentHtml] = useState<string>("");
  const [signedName, setSignedName] = useState(name);
  const [affirmed, setAffirmed] = useState(false);
  const [signed, setSigned] = useState<SignLeaseResponse | null>(null);

  // Create the DRAFT lease once on mount (idempotent at the UI level via a guard).
  const draft = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/leases", {
        propertyId,
        roomIds,
        startDate,
        endDate,
        cadence,
        guest: { name, email, phone },
      });
      return (await res.json()) as CreateDraftLeaseResponse;
    },
    onSuccess: (data) => {
      setLeaseId(data.leaseId);
      setDocumentHtml(data.documentHtml);
    },
    onError: (err: Error) =>
      toast({ title: "Could not prepare your lease", description: cleanError(err), variant: "destructive" }),
  });

  const hasSelection = Boolean(propertyId) && roomIds.length > 0 && Boolean(startDate && endDate);
  useEffect(() => {
    if (hasSelection && !leaseId && !draft.isPending) draft.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasSelection]);

  const sign = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/leases/${leaseId}/sign`, {
        signedName,
        affirmed,
      });
      return (await res.json()) as SignLeaseResponse;
    },
    onSuccess: (data) => setSigned(data),
    onError: (err: Error) =>
      toast({ title: "Could not sign the lease", description: cleanError(err), variant: "destructive" }),
  });

  if (!hasSelection) {
    return (
      <Shell>
        <p className="text-muted-foreground">Missing lease details. Start from a co-living room.</p>
      </Shell>
    );
  }

  // Signed confirmation.
  if (signed) {
    return (
      <Shell>
        <Card className="bnp-card">
          <CardHeader>
            <CardTitle className="font-display text-xl">Lease signed ✓</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p>
              Your lease is signed and is now <strong>pending your first payment</strong>. The final
              step is to pay your first installment and save your card — this activates your lease.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate(`/lease/pay?leaseId=${signed.leaseId}`)}
                data-testid="button-continue-payment"
              >
                Continue to payment
              </Button>
              <a href={signed.documentUrl} target="_blank" rel="noreferrer">
                <Button variant="outline" data-testid="link-download-lease">Download signed lease</Button>
              </a>
            </div>
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const canSign = Boolean(leaseId) && signedName.trim().length >= 2 && affirmed && !sign.isPending;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Review &amp; sign your lease</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read the agreement, then type your full legal name to sign. You won't be charged yet.
        </p>

        {draft.isPending && <p className="mt-6 text-muted-foreground">Preparing your agreement…</p>}

        {documentHtml && (
          <>
            {/* The rendered agreement (sandboxed). */}
            <div className="mt-6 overflow-hidden rounded-lg border">
              <iframe
                title="Lease agreement"
                srcDoc={documentHtml}
                sandbox=""
                className="h-[28rem] w-full bg-white"
                data-testid="frame-lease-doc"
              />
            </div>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-base">Sign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="signedName">Type your full legal name</Label>
                  <Input
                    id="signedName"
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    placeholder="Jane Q. Resident"
                    data-testid="input-signed-name"
                  />
                </div>
                <label className="flex items-start gap-2 text-sm" data-testid="checkbox-affirm">
                  <input
                    type="checkbox"
                    checked={affirmed}
                    onChange={(e) => setAffirmed(e.target.checked)}
                    className="mt-1"
                  />
                  <span>
                    I have read and agree to this Room Rental Agreement, and I intend my typed name
                    to be my legally binding electronic signature (E-SIGN / UETA).
                  </span>
                </label>
                <Button onClick={() => sign.mutate()} disabled={!canSign} data-testid="button-sign-lease">
                  {sign.isPending ? "Signing…" : "Sign lease"}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
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

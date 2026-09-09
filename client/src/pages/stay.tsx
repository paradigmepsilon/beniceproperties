// client/src/pages/stay.tsx
// =============================================================================
// A short-stay guest's own page: what is still outstanding, their signed
// agreement, and — once approved — how to actually get in.
//
// Token-authenticated: the gate token in the URL is the credential, so there is
// no login. A SEPARATE page from the lease portal on purpose — that view model is
// cadence/installment/late-fee shaped, and overloading it would put a token-type
// discriminator into the live lease flow.
//
// The arrival details (door code, wifi) render ONLY when the server sends them,
// which it only does once the stay is approved. This page is one of exactly two
// sanctioned places that show a live door code; the other is the welcome email.
// =============================================================================

import { useRef, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, AlertCircle, Upload, FileText, KeyRound } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { uploadFile, cleanError } from "@/lib/portalFetch";
import { canSign } from "@/lib/esign";
import { money } from "@/lib/format";

type Stage = "AWAITING_DOCS" | "AWAITING_APPROVAL" | "FIX_REQUESTED" | "APPROVED";

interface StayView {
  reference: string;
  stage: Stage;
  propertyName: string;
  roomName: string | null;
  checkIn: string;
  checkOut: string | null;
  nights: number | null;
  total: string;
  guestName: string;
  outstanding: string[];
  licence: { status: string; uploadedAt: string | null; rejectionReason: string | null };
  agreement: { signed: boolean; signedAt: string | null; signedName: string | null; documentUrl: string | null };
  fixReason: string | null;
  deadlineAt: string | null;
  houseRulesUrl: string;
  accessInfo: string | null;
}

const STAGE_COPY: Record<Stage, { title: string; blurb: string }> = {
  AWAITING_DOCS: {
    title: "Two things left",
    blurb:
      "Your payment has gone through and your dates are held. Send us these and we'll confirm — that can take up to 24 hours.",
  },
  FIX_REQUESTED: {
    title: "We need one more thing",
    blurb: "Your dates are still held and there's nothing more to pay — just resubmit below.",
  },
  AWAITING_APPROVAL: {
    title: "We're reviewing your booking",
    blurb:
      "We have your ID and your signed agreement. We check these by hand, which can take up to 24 hours — we'll email your door code and directions as soon as it's approved.",
  },
  APPROVED: {
    title: "You're confirmed",
    blurb: "Everything you need for your stay is below.",
  },
};

export default function Stay() {
  const { token } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [signedName, setSignedName] = useState("");
  const [affirmed, setAffirmed] = useState(false);

  const { data, isLoading, error } = useQuery<StayView>({
    queryKey: [`/api/stay/${token}`],
    enabled: Boolean(token),
  });

  const { data: agreementHtml } = useQuery<string>({
    queryKey: [`/api/stay/${token}/agreement/preview`],
    queryFn: async () => {
      const res = await fetch(`/api/stay/${token}/agreement/preview`, { credentials: "include" });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return res.text();
    },
    enabled: Boolean(token) && data?.agreement.signed === false,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => uploadFile(`/api/stay/${token}/license`, file),
    onSuccess: () => {
      toast({ title: "Thanks — we've got your ID" });
      void qc.invalidateQueries({ queryKey: [`/api/stay/${token}`] });
    },
    onError: (err) =>
      toast({ title: "Upload failed", description: cleanError(err), variant: "destructive" }),
  });

  const sign = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/stay/${token}/sign`, { signedName, affirmed });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Agreement signed" });
      void qc.invalidateQueries({ queryKey: [`/api/stay/${token}`] });
    },
    onError: (err) =>
      toast({ title: "Could not sign", description: cleanError(err), variant: "destructive" }),
  });

  if (isLoading) {
    return <Shell><p className="text-muted-foreground">Loading your stay…</p></Shell>;
  }
  if (error || !data) {
    return (
      <Shell>
        <Card className="bnp-card">
          <CardHeader><CardTitle className="font-display text-xl">We couldn't find that stay</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            This link may have expired or been mistyped. Check the link in your confirmation email,
            or look your booking up under "My booking".
          </CardContent>
        </Card>
      </Shell>
    );
  }

  const copy = STAGE_COPY[data.stage];
  const licenceDone = ["PENDING_REVIEW", "APPROVED"].includes(data.licence.status);

  return (
    <Shell>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight" data-testid="text-stage-title">
            {copy.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{copy.blurb}</p>
        </div>

        {/* Stay summary */}
        <Card className="bnp-card">
          <CardHeader><CardTitle className="text-base">Your stay</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">
              {data.propertyName}
              {data.roomName ? ` · ${data.roomName}` : ""}
            </div>
            <div className="text-muted-foreground">
              {data.checkIn}
              {data.checkOut ? ` → ${data.checkOut}` : ""}
              {data.nights ? ` · ${data.nights} night${data.nights === 1 ? "" : "s"}` : ""}
            </div>
            <div className="text-muted-foreground">
              Paid {money(parseFloat(data.total))} · <span className="font-mono">{data.reference}</span>
            </div>
          </CardContent>
        </Card>

        {/* Why we bounced it, if we did */}
        {data.stage === "FIX_REQUESTED" && data.fixReason && (
          <Card className="bnp-card border-destructive/40">
            <CardContent className="flex gap-3 pt-6 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div>
                <p className="font-medium text-destructive">Please fix this</p>
                <p className="text-muted-foreground" data-testid="text-fix-reason">{data.fixReason}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ARRIVAL DETAILS — the server only sends these once approved. */}
        {data.stage === "APPROVED" && data.accessInfo && (
          <Card className="bnp-card border-good/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="h-4 w-4 text-good" /> Getting in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <pre
                className="whitespace-pre-wrap font-sans leading-relaxed"
                data-testid="text-access-info"
              >
                {data.accessInfo}
              </pre>
              <Separator />
              <a className="underline" href={data.houseRulesUrl} data-testid="link-house-rules">
                House rules
              </a>
            </CardContent>
          </Card>
        )}

        {/* Driver's licence */}
        <Card className="bnp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {licenceDone ? <CheckCircle2 className="h-4 w-4 text-good" /> : <Upload className="h-4 w-4" />}
              Photo ID
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.licence.status === "APPROVED" && (
              <p className="text-muted-foreground">Verified — thank you.</p>
            )}
            {data.licence.status === "PENDING_REVIEW" && (
              <p className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> We've got it and we're reviewing it.
              </p>
            )}
            {data.licence.status === "REJECTED" && data.licence.rejectionReason && (
              <p className="text-destructive" data-testid="text-licence-rejected">
                {data.licence.rejectionReason}
              </p>
            )}
            {(!licenceDone || data.licence.status === "REJECTED") && (
              <>
                <p className="text-muted-foreground">
                  A clear photo of your driver's licence or passport. The name has to match the
                  person the room is booked for.
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                  className="block text-sm"
                  data-testid="input-licence"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) upload.mutate(file);
                  }}
                  disabled={upload.isPending}
                />
                {upload.isPending && <p className="text-muted-foreground">Uploading…</p>}
              </>
            )}
          </CardContent>
        </Card>

        {/* Rental agreement */}
        <Card className="bnp-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {data.agreement.signed ? (
                <CheckCircle2 className="h-4 w-4 text-good" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              Rental agreement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {data.agreement.signed ? (
              <>
                <p className="text-muted-foreground">
                  Signed{data.agreement.signedName ? ` by ${data.agreement.signedName}` : ""}
                  {data.agreement.signedAt
                    ? ` on ${new Date(data.agreement.signedAt).toLocaleDateString()}`
                    : ""}
                  .
                </p>
                {data.agreement.documentUrl && (
                  <a
                    className="underline"
                    href={data.agreement.documentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    data-testid="link-signed-agreement"
                  >
                    Download your signed agreement
                  </a>
                )}
              </>
            ) : (
              <>
                {/* sandbox="" disables scripting entirely — the document is
                    self-contained HTML and needs none. */}
                <iframe
                  title="Rental agreement"
                  sandbox=""
                  srcDoc={agreementHtml ?? "<p>Loading…</p>"}
                  className="h-72 w-full rounded-md border"
                  data-testid="iframe-agreement"
                />
                <div className="space-y-1">
                  <Label htmlFor="signed-name">Type your full legal name to sign</Label>
                  <Input
                    id="signed-name"
                    value={signedName}
                    onChange={(e) => setSignedName(e.target.value)}
                    data-testid="input-signed-name"
                  />
                </div>
                <label className="flex items-start gap-2">
                  <Checkbox
                    checked={affirmed}
                    onCheckedChange={(v) => setAffirmed(v === true)}
                    data-testid="checkbox-affirm"
                  />
                  <span className="text-muted-foreground">
                    I have read and agree to this Agreement, and I intend my typed name to be my
                    legally binding electronic signature under the U.S. E-SIGN Act and UETA.
                  </span>
                </label>
                <Button
                  onClick={() => sign.mutate()}
                  disabled={!canSign({ documentHtml: agreementHtml, signedName, affirmed, busy: sign.isPending })}
                  data-testid="button-sign"
                >
                  {sign.isPending ? "Signing…" : "Sign agreement"}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">{children}</main>
      <SiteFooter />
    </div>
  );
}

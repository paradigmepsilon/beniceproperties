// client/src/pages/portal.tsx
// =============================================================================
// Guest portal (Phase 6) — the one-stop self-serve view at /portal/<token>.
// Shows the active lease: term, rooms, full payment schedule with paid/upcoming/
// late status, accrued late fees, and the signed-lease download. Lets the guest
// pay an open/late installment early (saved card), and submit + track questions
// / maintenance requests (threaded).
// =============================================================================

import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { money } from "@/lib/format";

interface PortalView {
  lease: {
    id: string;
    status: string;
    startDate: string;
    endDate: string;
    paymentCadence: string;
    totalLeaseValue: string;
    prorationNote: string | null;
    signedAt: string | null;
    signedPdfUrl: string | null;
    hasSavedCard: boolean;
  };
  property: { name: string; location: string } | null;
  rooms: { name: string; roomNumber: string | null }[];
  schedule: { seq: number; dueDate: string; amount: string; status: string; paidAt: string | null; paymentMethod: string }[];
  lateFees: { accruedTotal: number; rows: { scheduleSeq: number; accrualDate: string; amount: string; status: string }[] };
  threads: { id: string; subject: string | null; category: string; status: string; createdAt: string }[];
}

function cleanError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const m = /^\d+:\s*(\{.*\})$/.exec(raw);
  if (m) {
    try {
      return JSON.parse(m[1]).message ?? raw;
    } catch {
      /* */
    }
  }
  return raw;
}

const statusVariant = (s: string) =>
  s === "PAID" || s === "ACTIVE" || s === "RESOLVED"
    ? "default"
    : s === "FAILED" || s === "LATE" || s === "DEFAULTED"
      ? "destructive"
      : "secondary";

export default function Portal() {
  const { token } = useParams();
  const { toast } = useToast();
  const qc = useQueryClient();
  const key = ["/api/portal", token!];

  const { data, isLoading, error } = useQuery<PortalView>({
    queryKey: key,
    queryFn: async () => (await apiRequest("GET", `/api/portal/${token}`)).json(),
    enabled: Boolean(token),
  });

  const pay = useMutation({
    mutationFn: async (seq: number) =>
      (await apiRequest("POST", `/api/portal/${token}/pay/${seq}`, {})).json(),
    onSuccess: () => {
      toast({ title: "Payment received", description: "Your installment is paid." });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast({ title: "Payment failed", description: cleanError(e), variant: "destructive" }),
  });

  const [msgBody, setMsgBody] = useState("");
  const [msgSubject, setMsgSubject] = useState("");
  const submitMsg = useMutation({
    mutationFn: async () =>
      (await apiRequest("POST", `/api/portal/${token}/messages`, { subject: msgSubject || undefined, body: msgBody })).json(),
    onSuccess: () => {
      setMsgBody("");
      setMsgSubject("");
      toast({ title: "Sent", description: "We'll get back to you here." });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast({ title: "Could not send", description: cleanError(e), variant: "destructive" }),
  });

  const nextDue = useMemo(
    () => data?.schedule.find((s) => s.status !== "PAID" && s.status !== "WAIVED"),
    [data],
  );

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading your portal…</p></Shell>;
  if (error) return <Shell><p className="text-destructive">{cleanError(error)}</p></Shell>;
  if (!data) return <Shell><p>Not found.</p></Shell>;

  const { lease, property, rooms, schedule, lateFees, threads } = data;

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">Your lease</h1>
            <p className="text-sm text-muted-foreground">
              {property?.name} · {rooms.map((r) => r.name).join(" + ")}
            </p>
          </div>
          <Badge variant={statusVariant(lease.status)} data-testid="badge-lease-status">{lease.status}</Badge>
        </div>

        {/* Lease summary */}
        <Card>
          <CardHeader><CardTitle className="text-base">Lease</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="Term" value={`${lease.startDate} → ${lease.endDate}`} />
            <Row label="Cadence" value={lease.paymentCadence} />
            <Row label="Total lease value" value={money(lease.totalLeaseValue)} />
            {lateFees.accruedTotal > 0 && (
              <Row label="Accrued late fees" value={<span className="text-destructive">{money(lateFees.accruedTotal)}</span>} />
            )}
            {lease.signedPdfUrl && (
              <a href={lease.signedPdfUrl} target="_blank" rel="noreferrer" className="inline-block pt-1">
                <Button variant="outline" size="sm" data-testid="link-signed-lease">Download signed lease</Button>
              </a>
            )}
          </CardContent>
        </Card>

        {/* Payment schedule */}
        <Card>
          <CardHeader><CardTitle className="text-base">Payment schedule</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm" data-testid="list-portal-schedule">
            {schedule.map((s) => (
              <div key={s.seq} className="flex items-center justify-between rounded-md px-2 py-1.5">
                <span>
                  <span className="text-muted-foreground">#{s.seq}</span> {s.dueDate}
                  {s.paymentMethod === "MANUAL" && <span className="ml-2 text-xs text-muted-foreground">(manual)</span>}
                </span>
                <span className="flex items-center gap-2">
                  {money(s.amount)}
                  <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  {nextDue?.seq === s.seq && lease.hasSavedCard && s.paymentMethod !== "MANUAL" && (
                    <Button size="sm" disabled={pay.isPending} onClick={() => pay.mutate(s.seq)} data-testid={`button-pay-${s.seq}`}>
                      {pay.isPending ? "Paying…" : "Pay now"}
                    </Button>
                  )}
                </span>
              </div>
            ))}
            {lease.prorationNote && (
              <p className="pt-2 text-xs text-muted-foreground">{lease.prorationNote}</p>
            )}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader><CardTitle className="text-base">Questions &amp; requests</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {threads.length > 0 && (
              <div className="space-y-2 text-sm">
                {threads.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-md border p-2" data-testid={`thread-${t.id}`}>
                    <span>{t.subject || `${t.category} request`}</span>
                    <Badge variant={statusVariant(t.status)}>{t.status}</Badge>
                  </div>
                ))}
              </div>
            )}
            <Separator />
            <div className="space-y-2">
              <div>
                <Label htmlFor="subj">Subject (optional)</Label>
                <Input id="subj" value={msgSubject} onChange={(e) => setMsgSubject(e.target.value)} data-testid="input-msg-subject" />
              </div>
              <div>
                <Label htmlFor="body">Message</Label>
                <Textarea id="body" value={msgBody} onChange={(e) => setMsgBody(e.target.value)} rows={3} data-testid="input-msg-body" />
              </div>
              <Button onClick={() => submitMsg.mutate()} disabled={!msgBody.trim() || submitMsg.isPending} data-testid="button-send-msg">
                {submitMsg.isPending ? "Sending…" : "Send"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
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

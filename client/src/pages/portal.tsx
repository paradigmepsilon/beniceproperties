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
  verification: {
    status: string; // NOT_SUBMITTED | PENDING_REVIEW | APPROVED | REJECTED
    hasLicense: boolean;
    uploadedAt: string | null;
    rejectionReason: string | null;
  };
  vehicle: {
    hasVehicle: boolean;
    make: string | null;
    model: string | null;
    year: number | null;
    color: string | null;
    plate: string | null;
    plateState: string | null;
    hasPhoto: boolean;
  } | null;
  property: { name: string; location: string } | null;
  rooms: { name: string; roomNumber: string | null }[];
  schedule: { seq: number; dueDate: string; amount: string; status: string; paidAt: string | null; paymentMethod: string }[];
  lateFees: { accruedTotal: number; rows: { scheduleSeq: number; accrualDate: string; amount: string; status: string }[] };
  threads: { id: string; subject: string | null; category: string; status: string; createdAt: string }[];
}

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
];

/** Upload a single file field to a portal endpoint (multipart). Mirrors the
 * error shape apiRequest throws so cleanError() renders the server message. */
async function uploadFile(url: string, file: File): Promise<Response> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(url, { method: "POST", body: fd, credentials: "include" });
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
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
  s === "PAID" || s === "ACTIVE" || s === "RESOLVED" || s === "APPROVED"
    ? "default"
    : s === "FAILED" || s === "LATE" || s === "DEFAULTED" || s === "REJECTED"
      ? "destructive"
      : "secondary";

/** Friendly label for a lease status shown to the tenant. */
const leaseStatusLabel = (s: string) =>
  s === "PENDING_VERIFICATION"
    ? "Pending verification"
    : s === "PENDING_FIRST_PAYMENT"
      ? "Pending payment"
      : s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

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

  // --- Verification: license upload ---
  const uploadLicense = useMutation({
    mutationFn: async (file: File) => (await uploadFile(`/api/portal/${token}/license`, file)).json(),
    onSuccess: () => {
      toast({ title: "License uploaded", description: "We're reviewing it — you'll hear from us soon." });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: cleanError(e), variant: "destructive" }),
  });

  // --- Vehicle: info + optional photo ---
  const [vehForm, setVehForm] = useState<{
    hasVehicle: boolean;
    make: string;
    model: string;
    year: string;
    color: string;
    plate: string;
    plateState: string;
  } | null>(null);
  // Seed the form once from server data.
  const veh = vehForm ?? {
    hasVehicle: data?.vehicle?.hasVehicle ?? true,
    make: data?.vehicle?.make ?? "",
    model: data?.vehicle?.model ?? "",
    year: data?.vehicle?.year ? String(data.vehicle.year) : "",
    color: data?.vehicle?.color ?? "",
    plate: data?.vehicle?.plate ?? "",
    plateState: data?.vehicle?.plateState ?? "",
  };
  const setVeh = (patch: Partial<typeof veh>) => setVehForm({ ...veh, ...patch });

  const saveVehicle = useMutation({
    mutationFn: async () =>
      (
        await apiRequest("POST", `/api/portal/${token}/vehicle`, {
          hasVehicle: veh.hasVehicle,
          make: veh.hasVehicle ? veh.make || null : null,
          model: veh.hasVehicle ? veh.model || null : null,
          year: veh.hasVehicle && veh.year ? Number(veh.year) : null,
          color: veh.hasVehicle ? veh.color || null : null,
          plate: veh.hasVehicle ? veh.plate || null : null,
          plateState: veh.hasVehicle && veh.plateState ? veh.plateState : null,
        })
      ).json(),
    onSuccess: () => {
      toast({ title: "Saved", description: "Your vehicle info is on file." });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast({ title: "Could not save", description: cleanError(e), variant: "destructive" }),
  });

  const uploadVehiclePhoto = useMutation({
    mutationFn: async (file: File) => (await uploadFile(`/api/portal/${token}/vehicle-photo`, file)).json(),
    onSuccess: () => {
      toast({ title: "Photo uploaded", description: "Your vehicle photo is on file." });
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: Error) => toast({ title: "Upload failed", description: cleanError(e), variant: "destructive" }),
  });

  const nextDue = useMemo(
    () => data?.schedule.find((s) => s.status !== "PAID" && s.status !== "WAIVED"),
    [data],
  );

  if (isLoading) return <Shell><p className="text-muted-foreground">Loading your portal…</p></Shell>;
  if (error) return <Shell><p className="text-destructive">{cleanError(error)}</p></Shell>;
  if (!data) return <Shell><p>Not found.</p></Shell>;

  const { lease, property, rooms, schedule, lateFees, threads, verification, vehicle } = data;

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
          <Badge variant={statusVariant(lease.status)} data-testid="badge-lease-status">{leaseStatusLabel(lease.status)}</Badge>
        </div>

        {/* Identity verification — gates lease activation */}
        {lease.status !== "COMPLETED" && lease.status !== "TERMINATED" && (
          <Card data-testid="card-verification">
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>Identity verification</span>
                <Badge variant={statusVariant(verification.status)}>
                  {verification.status === "PENDING_REVIEW"
                    ? "In review"
                    : verification.status === "NOT_SUBMITTED"
                      ? "Not started"
                      : verification.status.charAt(0) + verification.status.slice(1).toLowerCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {verification.status === "APPROVED" ? (
                <p className="text-muted-foreground">
                  ✓ Your driver's license is verified. Your lease is active.
                </p>
              ) : verification.status === "PENDING_REVIEW" ? (
                <p className="text-muted-foreground">
                  Thanks — we received your driver's license and we're reviewing it. Your lease
                  activates once it's approved. Your room is held in the meantime.
                </p>
              ) : (
                <>
                  {verification.status === "REJECTED" && verification.rejectionReason && (
                    <p className="text-destructive" data-testid="text-rejection-reason">
                      We couldn't verify your last upload: {verification.rejectionReason} Please
                      upload a clearer photo.
                    </p>
                  )}
                  <p className="text-muted-foreground">
                    Upload a photo of your driver's license so we can verify your identity and
                    activate your lease. We match the name to your signed agreement.
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                      disabled={uploadLicense.isPending}
                      data-testid="input-license"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadLicense.mutate(f);
                      }}
                    />
                    {uploadLicense.isPending && <span className="text-xs text-muted-foreground">Uploading…</span>}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Vehicle — parking identification */}
        {lease.status !== "COMPLETED" && lease.status !== "TERMINATED" && (
          <Card data-testid="card-vehicle">
            <CardHeader><CardTitle className="text-base">Your vehicle</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={veh.hasVehicle}
                  data-testid="checkbox-has-vehicle"
                  onChange={(e) => setVeh({ hasVehicle: e.target.checked })}
                />
                <span>I have a vehicle I'll park here</span>
              </label>
              {veh.hasVehicle && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="veh-make">Make</Label>
                    <Input id="veh-make" value={veh.make} data-testid="input-veh-make"
                      onChange={(e) => setVeh({ make: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="veh-model">Model</Label>
                    <Input id="veh-model" value={veh.model} data-testid="input-veh-model"
                      onChange={(e) => setVeh({ model: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="veh-year">Year</Label>
                    <Input id="veh-year" inputMode="numeric" value={veh.year} data-testid="input-veh-year"
                      onChange={(e) => setVeh({ year: e.target.value.replace(/[^\d]/g, "").slice(0, 4) })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="veh-color">Color</Label>
                    <Input id="veh-color" value={veh.color} data-testid="input-veh-color"
                      onChange={(e) => setVeh({ color: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="veh-plate">Plate</Label>
                    <Input id="veh-plate" value={veh.plate} data-testid="input-veh-plate"
                      onChange={(e) => setVeh({ plate: e.target.value.toUpperCase().slice(0, 15) })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="veh-state">Plate state</Label>
                    <select
                      id="veh-state"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                      value={veh.plateState}
                      data-testid="select-veh-state"
                      onChange={(e) => setVeh({ plateState: e.target.value })}
                    >
                      <option value="">—</option>
                      {US_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 pt-1">
                <Button size="sm" disabled={saveVehicle.isPending} data-testid="button-save-vehicle"
                  onClick={() => saveVehicle.mutate()}>
                  {saveVehicle.isPending ? "Saving…" : "Save vehicle info"}
                </Button>
                {veh.hasVehicle && (
                  <label className="text-xs text-muted-foreground cursor-pointer">
                    <span className="underline">{vehicle?.hasPhoto ? "Replace photo" : "Add photo (optional)"}</span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                      disabled={uploadVehiclePhoto.isPending}
                      data-testid="input-veh-photo"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadVehiclePhoto.mutate(f);
                      }}
                    />
                  </label>
                )}
              </div>
            </CardContent>
          </Card>
        )}

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

// client/src/pages/admin/messages-tab.tsx
// Task 8 — Messages tab. Left column: thread list (status chips + "New
// message" guest picker). Right column: the selected thread's messages, a
// delivery trail for the thread's booking/lease, and a reply box. Consumes
// the Task 6 routes exactly:
//   GET  /api/admin/messages?status=&limit=        -> { threads: [...] }
//   GET  /api/admin/messages/:threadId              -> { root, messages, deliveries }
//   POST /api/admin/messages                        -> { messageId, threadId, delivery }
//   POST /api/admin/messages/:threadId/reply         -> { messageId, threadId, delivery }
//   GET  /api/admin/guests                           -> { bookings, leases }
//
// `deliveries` on a thread are message_log rows (kind MANUAL) for the
// thread's booking/lease as a whole, not per individual message — rendered as
// one "Deliveries for this booking/lease" list beneath the messages.

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { dateTime } from "@/lib/format";

const STATUS_FILTERS = ["OPEN", "ANSWERED", "RESOLVED"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

interface ThreadSummary {
  id: string;
  status: string;
  category: string;
  subject: string | null;
  createdAt: string;
  guestName: string | null;
  guestEmail: string | null;
  propertyName: string | null;
  bookingReference: string | null;
  bookingId: string | null;
  leaseId: string | null;
  lastMessageAt: string;
  messageCount: number;
}

interface ThreadMessage {
  id: string;
  authorRole: "GUEST" | "STAFF";
  body: string;
  subject: string | null;
  createdAt: string;
}

interface DeliveryRow {
  id: string;
  channel: "EMAIL" | "SMS" | "TELEGRAM" | "PORTAL";
  status: "SENT" | "FAILED" | "DRY_RUN" | "SKIPPED";
  toAddress: string | null;
  kind: string;
  sentBy: string;
  error: string | null;
  createdAt: string;
}

interface ThreadDetail {
  root: ThreadSummary;
  messages: ThreadMessage[];
  deliveries: DeliveryRow[];
}

interface SendResult {
  sent: boolean;
  reason?: string;
}

interface SendStaffMessageResult {
  messageId: string;
  threadId: string;
  delivery: { email: SendResult; sms: SendResult };
}

interface GuestPickerBooking {
  bookingId: string;
  guestName: string;
  propertyName: string;
  reference: string;
  status: string;
}

interface GuestPickerLease {
  leaseId: string;
  guestName: string;
  propertyName: string;
  status: string;
}

function deliverySummary(delivery: SendStaffMessageResult["delivery"]): string {
  const part = (label: string, r: SendResult) => `${label} ${r.sent ? "sent" : r.reason ?? "not sent"}`;
  return `${part("Email", delivery.email)} · ${part("SMS", delivery.sms)}`;
}

function deliveryBadge(d: DeliveryRow) {
  if (d.status === "SENT") return <Badge data-testid={`delivery-status-${d.id}`}>✓ Sent</Badge>;
  if (d.status === "FAILED")
    return (
      <Badge variant="destructive" data-testid={`delivery-status-${d.id}`}>
        ✗ Failed
      </Badge>
    );
  return (
    <Badge variant="secondary" data-testid={`delivery-status-${d.id}`}>
      {d.status === "DRY_RUN" ? "Dry run" : "Skipped"}
    </Badge>
  );
}

export default function MessagesTab() {
  const { toast } = useToast();
  const [status, setStatus] = useState<StatusFilter>("OPEN");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");
  const [replyEmail, setReplyEmail] = useState(true);
  const [replySms, setReplySms] = useState(false);

  const threads = useQuery<{ threads: ThreadSummary[] }>({
    queryKey: ["/api/admin/messages", { status }],
    queryFn: async () => (await apiRequest("GET", `/api/admin/messages?status=${status}&limit=100`)).json(),
  });

  const thread = useQuery<ThreadDetail>({
    queryKey: ["/api/admin/messages", selectedThreadId],
    queryFn: async () => (await apiRequest("GET", `/api/admin/messages/${selectedThreadId}`)).json(),
    enabled: !!selectedThreadId,
  });

  const reply = useMutation({
    mutationFn: async (): Promise<SendStaffMessageResult> => {
      if (!selectedThreadId) throw new Error("No thread selected");
      const channels = [...(replyEmail ? ["EMAIL"] : []), ...(replySms ? ["SMS"] : [])];
      const res = await apiRequest("POST", `/api/admin/messages/${selectedThreadId}/reply`, {
        body: replyBody,
        channels,
      });
      return res.json();
    },
    onSuccess: (result) => {
      setReplyBody("");
      toast({ title: "Reply sent", description: deliverySummary(result.delivery) });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
    },
    onError: (e: Error) => toast({ title: "Could not send reply", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Messages</CardTitle>
          <Button size="sm" onClick={() => setPickerOpen(true)} data-testid="button-new-message">
            New message
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            {STATUS_FILTERS.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={status === s ? "default" : "outline"}
                onClick={() => setStatus(s)}
                data-testid={`filter-status-${s.toLowerCase()}`}
              >
                {s}
              </Button>
            ))}
          </div>
          <div className="max-h-[60vh] divide-y overflow-y-auto text-sm">
            {threads.data?.threads.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`w-full py-3 text-left ${selectedThreadId === t.id ? "bg-muted/60" : ""}`}
                onClick={() => setSelectedThreadId(t.id)}
                data-testid={`thread-${t.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{t.guestName ?? "Unknown guest"}</span>
                  <Badge variant={t.status === "OPEN" ? "destructive" : t.status === "ANSWERED" ? "secondary" : "outline"}>
                    {t.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.propertyName ?? "—"}
                  {t.bookingReference ? ` · ${t.bookingReference}` : ""}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t.subject ?? "(no subject)"} · {t.messageCount} msg{t.messageCount === 1 ? "" : "s"}
                </div>
                <div className="text-xs text-muted-foreground">{dateTime(t.lastMessageAt)}</div>
              </button>
            ))}
            {threads.isLoading && <p className="py-4 text-muted-foreground">Loading…</p>}
            {threads.data && !threads.data.threads.length && (
              <p className="py-4 text-muted-foreground">No {status.toLowerCase()} threads.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thread</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedThreadId && <p className="text-sm text-muted-foreground">Select a thread to view it.</p>}
          {selectedThreadId && thread.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {selectedThreadId && thread.data && (
            <div className="space-y-4">
              {thread.data.root.subject && <p className="text-sm font-medium">{thread.data.root.subject}</p>}

              <div className="space-y-3">
                {thread.data.messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-md border p-3 text-sm ${m.authorRole === "STAFF" ? "bg-primary/5" : ""}`}
                    data-testid={`message-${m.id}`}
                  >
                    <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">{m.authorRole === "STAFF" ? "Staff" : "Guest"}</span>
                      <span>{dateTime(m.createdAt)}</span>
                    </div>
                    <p className="whitespace-pre-wrap">{m.body}</p>
                  </div>
                ))}
              </div>

              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Deliveries for this booking/lease</p>
                <div className="space-y-1 text-xs">
                  {thread.data.deliveries.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between gap-2 rounded border px-2 py-1"
                      data-testid={`delivery-${d.id}`}
                    >
                      <span>
                        {d.channel} → {d.toAddress ?? "—"}
                        {d.error ? ` (${d.error})` : ""}
                      </span>
                      {deliveryBadge(d)}
                    </div>
                  ))}
                  {!thread.data.deliveries.length && <p className="text-muted-foreground">No delivery records.</p>}
                </div>
              </div>

              <div className="space-y-2 border-t pt-3">
                <Textarea
                  placeholder="Reply…"
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={3}
                  data-testid="textarea-reply-body"
                />
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={replyEmail}
                      onCheckedChange={(v) => setReplyEmail(v === true)}
                      data-testid="checkbox-channel-email"
                    />
                    Email
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={replySms}
                      onCheckedChange={(v) => setReplySms(v === true)}
                      data-testid="checkbox-channel-sms"
                    />
                    SMS
                  </label>
                  <Button
                    className="ml-auto"
                    size="sm"
                    disabled={!replyBody.trim() || (!replyEmail && !replySms) || reply.isPending}
                    onClick={() => reply.mutate()}
                    data-testid="button-send-reply"
                  >
                    Send reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <NewMessageDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}

function NewMessageDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { toast } = useToast();
  const [target, setTarget] = useState<{ bookingId?: string; leaseId?: string; label: string } | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState(true);
  const [sms, setSms] = useState(false);

  const guests = useQuery<{ bookings: GuestPickerBooking[]; leases: GuestPickerLease[] }>({
    queryKey: ["/api/admin/guests"],
    queryFn: async () => (await apiRequest("GET", "/api/admin/guests")).json(),
    enabled: open,
  });

  function reset() {
    setTarget(null);
    setSubject("");
    setBody("");
    setEmail(true);
    setSms(false);
  }

  const send = useMutation({
    mutationFn: async (): Promise<SendStaffMessageResult> => {
      if (!target) throw new Error("Pick a guest first");
      const channels = [...(email ? ["EMAIL"] : []), ...(sms ? ["SMS"] : [])];
      const payload: Record<string, unknown> = { body, channels };
      if (subject.trim()) payload.subject = subject.trim();
      if (target.bookingId) payload.bookingId = target.bookingId;
      if (target.leaseId) payload.leaseId = target.leaseId;
      const res = await apiRequest("POST", "/api/admin/messages", payload);
      return res.json();
    },
    onSuccess: (result) => {
      toast({ title: "Message sent", description: deliverySummary(result.delivery) });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/messages"] });
      onOpenChange(false);
      reset();
    },
    onError: (e: Error) => toast({ title: "Could not send", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="max-h-[85vh] overflow-y-auto" data-testid="dialog-new-message">
        <DialogHeader>
          <DialogTitle>New message</DialogTitle>
        </DialogHeader>
        {!target ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Pick a guest to message.</p>
            <div className="max-h-64 space-y-1 overflow-y-auto">
              {guests.data?.bookings.map((b) => (
                <button
                  key={b.bookingId}
                  type="button"
                  className="w-full rounded-md border p-2 text-left text-sm hover:bg-muted"
                  onClick={() =>
                    setTarget({
                      bookingId: b.bookingId,
                      label: `${b.guestName} · ${b.propertyName} · ${b.reference}`,
                    })
                  }
                  data-testid={`guest-picker-booking-${b.bookingId}`}
                >
                  <div className="font-medium">{b.guestName}</div>
                  <div className="text-xs text-muted-foreground">
                    {b.propertyName} · {b.reference} · {b.status}
                  </div>
                </button>
              ))}
              {guests.data?.leases.map((l) => (
                <button
                  key={l.leaseId}
                  type="button"
                  className="w-full rounded-md border p-2 text-left text-sm hover:bg-muted"
                  onClick={() => setTarget({ leaseId: l.leaseId, label: `${l.guestName} · ${l.propertyName} · lease` })}
                  data-testid={`guest-picker-lease-${l.leaseId}`}
                >
                  <div className="font-medium">{l.guestName}</div>
                  <div className="text-xs text-muted-foreground">
                    {l.propertyName} · lease · {l.status}
                  </div>
                </button>
              ))}
              {guests.isLoading && <p className="text-xs text-muted-foreground">Loading guests…</p>}
              {guests.data && !guests.data.bookings.length && !guests.data.leases.length && (
                <p className="text-xs text-muted-foreground">No reachable guests.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-md bg-muted/40 p-2 text-sm">
              <span>{target.label}</span>
              <Button size="sm" variant="ghost" onClick={() => setTarget(null)} data-testid="button-change-guest">
                Change
              </Button>
            </div>
            <div>
              <Label className="text-xs">Subject (optional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} data-testid="input-new-message-subject" />
            </div>
            <div>
              <Label className="text-xs">Message</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} data-testid="textarea-new-message-body" />
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={email}
                  onCheckedChange={(v) => setEmail(v === true)}
                  data-testid="checkbox-new-channel-email"
                />
                Email
              </label>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={sms} onCheckedChange={(v) => setSms(v === true)} data-testid="checkbox-new-channel-sms" />
                SMS
              </label>
            </div>
            <DialogFooter>
              <Button
                disabled={!body.trim() || (!email && !sms) || send.isPending}
                onClick={() => send.mutate()}
                data-testid="button-send-message"
              >
                Send
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

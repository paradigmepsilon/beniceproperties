// client/src/pages/admin/stay-approvals-tab.tsx
// =============================================================================
// The approval queue for gated short stays. Its own file, following the existing
// MessagesTab / BlocksPanel extraction precedent, so dashboard.tsx's diff is
// three lines — the right blast radius for a live ~1000-line file.
//
// NOT folded into the existing Verifications tab, deliberately: different subject
// (booking vs lease), different action set, and mixing them invites an operator
// clicking a TERMINAL MONEY action on the wrong row. Each queue also needs its own
// visible count, so neither hides behind the other's number.
//
// Three actions, in ascending order of consequence:
//   Approve       — needs a door code and an explicit name-match affirmation.
//   Request fix   — non-terminal. Dates stay held, no money moves.
//   Decline & refund — TERMINAL. Guarded by a typed-amount dialog, reusing the
//                   exact pattern (and the tested amountMatches helper) that the
//                   conflict-refund action already uses. The server re-checks both
//                   the reference and the amount, because a client guard is not one.
// =============================================================================

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { amountMatches } from "@/lib/adminRefund";
import { cleanError } from "@/lib/portalFetch";
import { isValidDoorCode } from "@shared/doorCode";
import { money } from "@/lib/format";

export interface StayApprovalRow {
  bookingId: string;
  reference: string;
  propertyName: string;
  roomName: string | null;
  checkIn: string;
  checkOut: string | null;
  nights: number | null;
  total: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  signedName: string | null;
  nameMismatch: boolean;
  licenseUploadedAt: string | null;
  agreementSignedAt: string | null;
  docsDeadlineAt: string | null;
  fixRequestCount: number;
  accessInfoMissing: string[];
}

export function useStayApprovalCount(): number {
  const { data } = useQuery<StayApprovalRow[]>({ queryKey: ["/api/admin/stay-approvals"] });
  return data?.length ?? 0;
}

export default function StayApprovalsTab() {
  const { data, isLoading } = useQuery<StayApprovalRow[]>({
    queryKey: ["/api/admin/stay-approvals"],
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Stay approvals</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && <p className="py-4 text-muted-foreground">Loading…</p>}
        {!isLoading && (!data || data.length === 0) && (
          <p className="py-4 text-muted-foreground">No stays awaiting approval.</p>
        )}
        <div className="divide-y text-sm">
          {data?.map((row) => <ApprovalRow key={row.bookingId} row={row} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function ApprovalRow({ row }: { row: StayApprovalRow }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [doorCode, setDoorCode] = useState("");
  const [nameMatches, setNameMatches] = useState(false);
  const [fixReason, setFixReason] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [typedAmount, setTypedAmount] = useState("");

  const refundTotal = parseFloat(row.total);
  const invalidate = () => qc.invalidateQueries({ queryKey: ["/api/admin/stay-approvals"] });
  const fail = (title: string) => (err: unknown) =>
    toast({ title, description: cleanError(err), variant: "destructive" });

  const approve = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/stays/${row.bookingId}/approve`, {
        doorCode, nameMatches: true,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Approved", description: `${row.guestName} has their arrival details.` });
      void invalidate();
    },
    onError: fail("Could not approve"),
  });

  const requestFix = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/stays/${row.bookingId}/request-fix`, {
        reason: fixReason, what: "LICENSE",
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Fix requested", description: "The guest has been asked to resubmit." });
      void invalidate();
    },
    onError: fail("Could not request a fix"),
  });

  const decline = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/stays/${row.bookingId}/decline-refund`, {
        reason: declineReason,
        // The server rejects anything but the exact reference.
        confirm: row.reference,
        expectedRefundAmount: refundTotal,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Declined and refunded", description: `${money(refundTotal)} returned.` });
      setDeclineOpen(false);
      void invalidate();
    },
    onError: fail("Refund did not complete"),
  });

  async function viewFile(kind: "license" | "agreement") {
    try {
      if (kind === "agreement") {
        window.open(`/api/admin/stays/${row.bookingId}/agreement`, "_blank", "noopener,noreferrer");
        return;
      }
      const res = await apiRequest("GET", `/api/admin/stays/${row.bookingId}/license-url`);
      const { url } = (await res.json()) as { url: string };
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      fail("Could not open the file")(err);
    }
  }

  const canApprove = isValidDoorCode(doorCode) && nameMatches && row.accessInfoMissing.length === 0;

  return (
    <div className="space-y-2 py-4" data-testid={`row-approval-${row.bookingId}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono">{row.reference}</span>
        <span className="text-muted-foreground">
          {row.propertyName}
          {row.roomName ? ` · ${row.roomName}` : ""} · {row.checkIn}
          {row.checkOut ? ` → ${row.checkOut}` : ""}
          {row.nights ? ` (${row.nights} nights)` : ""}
        </span>
        <span className="font-semibold">{money(refundTotal)}</span>
      </div>

      {/* The substance of the review, pre-computed so nobody has to eyeball it. */}
      <div>
        Signed as: <strong>{row.signedName ?? "—"}</strong>
        {row.nameMismatch && (
          <span className="text-destructive" data-testid={`text-mismatch-${row.bookingId}`}>
            {" "}
            (guest record: {row.guestName})
          </span>
        )}
      </div>
      <div className="text-muted-foreground">
        {row.guestEmail}
        {row.guestPhone ? ` · ${row.guestPhone}` : ""}
        {row.fixRequestCount > 0 && ` · ${row.fixRequestCount} fix request(s)`}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => viewFile("license")} data-testid={`button-view-licence-${row.bookingId}`}>
          <ExternalLink className="mr-1 h-3 w-3" /> View licence
        </Button>
        <Button variant="outline" size="sm" onClick={() => viewFile("agreement")} data-testid={`button-view-agreement-${row.bookingId}`}>
          <ExternalLink className="mr-1 h-3 w-3" /> View signed agreement
        </Button>
      </div>

      {/* Approval is data-gated: no arrival details means no welcome letter. */}
      {row.accessInfoMissing.length > 0 && (
        <p className="flex items-center gap-2 text-destructive" data-testid={`text-access-missing-${row.bookingId}`}>
          <AlertTriangle className="h-4 w-4" />
          Set up {row.propertyName}'s arrival details first — missing {row.accessInfoMissing.join(", ")}.
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-8 max-w-[10rem]"
          placeholder="Door code *"
          autoComplete="off"
          value={doorCode}
          onChange={(e) => setDoorCode(e.target.value)}
          data-testid={`input-door-code-${row.bookingId}`}
        />
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={nameMatches}
            onChange={(e) => setNameMatches(e.target.checked)}
            data-testid={`checkbox-name-matches-${row.bookingId}`}
          />
          Licence name matches
        </label>
        <Button
          size="sm"
          disabled={!canApprove || approve.isPending}
          onClick={() => approve.mutate()}
          data-testid={`button-approve-${row.bookingId}`}
        >
          {approve.isPending ? "Approving…" : "Approve & send welcome"}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          className="h-8 max-w-xs"
          placeholder="What should the guest fix?"
          value={fixReason}
          onChange={(e) => setFixReason(e.target.value)}
          data-testid={`input-fix-reason-${row.bookingId}`}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={fixReason.trim().length < 5 || requestFix.isPending}
          onClick={() => requestFix.mutate()}
          data-testid={`button-request-fix-${row.bookingId}`}
        >
          Request fix
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => setDeclineOpen(true)}
          data-testid={`button-open-decline-${row.bookingId}`}
        >
          Decline &amp; refund
        </Button>
      </div>

      {/* The only terminal money action. Two independent guards: a typed amount
          and a required reason — and the server re-checks both plus the reference. */}
      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent data-testid={`dialog-decline-${row.bookingId}`}>
          <DialogHeader>
            <DialogTitle>Decline and refund {money(refundTotal)}?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This cancels {row.reference}, releases the dates back on sale, and refunds the guest in
            full. It cannot be undone. Type the exact amount to confirm.
          </p>
          <Input
            placeholder="Why are you declining?"
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            data-testid={`input-decline-reason-${row.bookingId}`}
          />
          <Input
            placeholder={refundTotal.toFixed(2)}
            value={typedAmount}
            onChange={(e) => setTypedAmount(e.target.value)}
            data-testid={`input-decline-amount-${row.bookingId}`}
          />
          <DialogFooter>
            <Button
              variant="destructive"
              disabled={
                !amountMatches(typedAmount, refundTotal) ||
                declineReason.trim().length < 5 ||
                decline.isPending
              }
              onClick={() => decline.mutate()}
              data-testid={`button-confirm-decline-${row.bookingId}`}
            >
              {decline.isPending ? "Refunding…" : "Decline & refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

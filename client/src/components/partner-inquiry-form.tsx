// client/src/components/partner-inquiry-form.tsx
// B2B lead-capture form for the /partner page. Mirrors ltr-inquiry-form.tsx (the
// app's real form convention: useState per field + useMutation via apiRequest +
// shadcn Input/Label/Textarea/Button + client-side name+email gate), with three
// deliberate differences:
//   1. `interest` is a MULTI-SELECT — the offerings a partner cares about. There
//      is no checkbox primitive in the repo, so it's rendered as toggle "chips"
//      (button + aria-pressed) that add/remove values from a string[] state.
//   2. A `company` field (B2B).
//   3. Success shows a confirmation Dialog (popup) instead of the LTR inline
//      banner; closing it resets the form so a second inquiry is possible.
//
// On success it POSTs to /api/partner-inquiries, which writes an append-only row
// (a person may inquire more than once). Only populated optional fields are sent;
// `interest` is omitted when empty. Light-surface styling (renders on the /partner
// body), so default light tokens rather than on-dark utilities.
//
// A module-level setter (`preselectPartnerInterest`) lets the /partner offering
// cards pre-check a chip when their "Get started" link is clicked, without prop-
// drilling through the page.

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// The partnership offerings a partner can express interest in. Values are stored
// verbatim in partner_inquiries.interest (a text[]); labels are the chip text.
export const PARTNER_INTERESTS = [
  { value: "INVEST", label: "Invest with us" },
  { value: "MANAGE", label: "Manage my property" },
  { value: "DESIGN", label: "Design my property" },
  { value: "EVENTS", label: "Curate events" },
  { value: "COMMUNITY", label: "Build community" },
  { value: "OTHER", label: "Something else" },
] as const;

// Simple cross-component channel so an offering card's "Get started" link can
// pre-check its matching interest chip. The form registers a listener on mount;
// the card calls the setter. Kept intentionally tiny (no context/store) — one
// page, one form instance.
let preselectListener: ((value: string) => void) | null = null;
export function preselectPartnerInterest(value: string) {
  preselectListener?.(value);
}

interface Props {
  className?: string;
}

export function PartnerInquiryForm({ className }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [interest, setInterest] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Register the preselect channel so offering cards can toggle a chip on.
  useEffect(() => {
    preselectListener = (value: string) =>
      setInterest((prev) => (prev.includes(value) ? prev : [...prev, value]));
    return () => {
      preselectListener = null;
    };
  }, []);

  const toggleInterest = (value: string) =>
    setInterest((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value],
    );

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/partner-inquiries", {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        company: company.trim() || undefined,
        interest: interest.length > 0 ? interest : undefined,
        message: message.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => setShowConfirm(true),
  });

  const canSubmit =
    name.trim().length > 0 && EMAIL_RE.test(email.trim()) && !submit.isPending;

  // Reset everything when the confirmation dialog closes, so the form is clean
  // for a second inquiry.
  const handleConfirmClose = () => {
    setShowConfirm(false);
    setName("");
    setEmail("");
    setPhone("");
    setCompany("");
    setInterest([]);
    setMessage("");
    submit.reset();
  };

  return (
    <div className={className} data-testid="partner-inquiry-form">
      <h3 className="font-display text-xl font-semibold">Start a conversation</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Tell us a bit about you and what you have in mind. We'll follow up personally to
        talk it through. No obligation, no hard sell.
      </p>

      <div className="mt-5 space-y-4">
        <div>
          <Label htmlFor="partner-name" className="text-xs font-semibold">
            Name
          </Label>
          <Input
            id="partner-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
            data-testid="input-partner-name"
          />
        </div>
        <div>
          <Label htmlFor="partner-email" className="text-xs font-semibold">
            Email
          </Label>
          <Input
            id="partner-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1"
            data-testid="input-partner-email"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="partner-phone" className="text-xs font-semibold">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="partner-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              data-testid="input-partner-phone"
            />
          </div>
          <div>
            <Label htmlFor="partner-company" className="text-xs font-semibold">
              Company{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="partner-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1"
              data-testid="input-partner-company"
            />
          </div>
        </div>

        {/* Multi-select interest chips. aria-pressed reflects membership; the
            selected state uses the primary token to read as "on". */}
        <div>
          <Label className="text-xs font-semibold">
            What are you interested in?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <div className="mt-2 flex flex-wrap gap-2" data-testid="partner-interest-chips">
            {PARTNER_INTERESTS.map(({ value, label }) => {
              const active = interest.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleInterest(value)}
                  aria-pressed={active}
                  data-testid={`chip-partner-${value.toLowerCase()}`}
                  className={
                    "min-h-9 rounded-full border px-4 text-sm font-medium transition-colors " +
                    (active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:bg-muted")
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="partner-message" className="text-xs font-semibold">
            Anything we should know?{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="partner-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1"
            data-testid="input-partner-message"
          />
        </div>

        <Button
          className="w-full"
          disabled={!canSubmit}
          onClick={() => submit.mutate()}
          data-testid="button-partner-submit"
        >
          {submit.isPending ? "Sending…" : "Send inquiry"}
        </Button>
        {submit.isError && (
          <p className="text-sm text-destructive" data-testid="partner-inquiry-error">
            Something went wrong. Please try again.
          </p>
        )}
      </div>

      {/* Confirmation popup — replaces the LTR inline success banner. */}
      <Dialog open={showConfirm} onOpenChange={(open) => !open && handleConfirmClose()}>
        <DialogContent data-testid="partner-inquiry-success">
          <DialogHeader>
            <DialogTitle>Thanks, we've got it.</DialogTitle>
            <DialogDescription>
              Your note is in. We'll be in touch soon to talk it through.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={handleConfirmClose} data-testid="button-partner-confirm-close">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// client/src/components/ltr-inquiry-form.tsx
// Contact/lead form for long-term-rental (LTR) listings, which are inquiry-only
// (no online booking). Mirrors the app's real form convention (newsletter-signup /
// admin/login): useState per field + useMutation via apiRequest + shadcn
// Input/Textarea/Label/Button + inline text. Client-side name+email validation
// gates submit; success shows an inline confirmation (the site's `good` token),
// failure an inline error. On success it POSTs to /api/ltr-inquiries, which writes
// an append-only row (a person may inquire more than once).
//
// Light-surface styling (renders on the detail page / /ltr body, not the dark
// footer), so it uses the default light tokens rather than on-dark utilities.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { track } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  /** The LTR property this inquiry is about. Omit for a general "contact us about
   *  long-term options" inquiry (e.g. the foot of the /ltr index). */
  propertyId?: string;
  /** Optional property name, shown in the heading so the guest sees what they're
   *  asking about. */
  propertyName?: string;
  className?: string;
}

export function LtrInquiryForm({ propertyId, propertyName, className }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [message, setMessage] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ltr-inquiries", {
        propertyId: propertyId || undefined,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        moveIn: moveIn.trim() || undefined,
        message: message.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      track("ltr_inquiry_submitted", {
        has_property: Boolean(propertyId),
        has_move_in: moveIn.trim().length > 0,
      });
    },
  });

  const canSubmit =
    name.trim().length > 0 && EMAIL_RE.test(email.trim()) && !submit.isPending;

  return (
    <div className={className} data-testid="ltr-inquiry-form">
      <h3 className="font-display text-xl font-semibold">
        {propertyName ? `Ask about ${propertyName}` : "Ask about long-term options"}
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Long-term homes are handled personally, not booked online. Send a note and we'll
        reply with availability, terms, and next steps.
      </p>

      {submit.isSuccess ? (
        <div
          className="mt-5 rounded-xl border bg-good-bg p-4 text-sm font-medium text-good"
          data-testid="ltr-inquiry-success"
        >
          Thanks! Your inquiry is in. We'll be in touch shortly.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="ltr-name" className="text-xs font-semibold">
              Name
            </Label>
            <Input
              id="ltr-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              data-testid="input-ltr-name"
            />
          </div>
          <div>
            <Label htmlFor="ltr-email" className="text-xs font-semibold">
              Email
            </Label>
            <Input
              id="ltr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              data-testid="input-ltr-email"
            />
          </div>
          <div>
            <Label htmlFor="ltr-phone" className="text-xs font-semibold">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ltr-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              data-testid="input-ltr-phone"
            />
          </div>
          <div>
            <Label htmlFor="ltr-movein" className="text-xs font-semibold">
              Ideal move-in{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="ltr-movein"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              placeholder="e.g. Sept 1, or flexible"
              className="mt-1"
              data-testid="input-ltr-movein"
            />
          </div>
          <div>
            <Label htmlFor="ltr-message" className="text-xs font-semibold">
              Anything we should know?{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="ltr-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1"
              data-testid="input-ltr-message"
            />
          </div>
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            data-testid="button-ltr-submit"
          >
            {submit.isPending ? "Sending…" : "Send inquiry"}
          </Button>
          {submit.isError && (
            <p className="text-sm text-destructive" data-testid="ltr-inquiry-error">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

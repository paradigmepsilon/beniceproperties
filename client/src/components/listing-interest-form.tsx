// client/src/components/listing-interest-form.tsx
// Interest/waitlist form for a PLACEHOLDER listing — a home we're gauging
// demand for but don't take bookings on. Placeholders render publicly with real
// prices, but the server refuses to quote or charge them (server/lib/booking.ts,
// server/lib/lease.ts), so this form is their only conversion path.
//
// Deliberately a sibling of ltr-inquiry-form.tsx rather than a reuse of it: the
// copy has to be honest about a different situation ("not available yet" vs
// "handled personally"), it carries a roomId, and it posts to a separate table
// so speculative demand never lands in the LTR lead pipeline.
//
// Same form convention as the rest of the app: useState per field + useMutation
// via apiRequest + shadcn Input/Textarea/Label/Button + inline success/error.

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
  /** The placeholder property this interest is about. */
  propertyId?: string;
  /** The specific room, when the guest is looking at one. */
  roomId?: string;
  /** Shown in the heading so the guest sees what they're asking about. */
  listingName?: string;
  className?: string;
}

export function ListingInterestForm({ propertyId, roomId, listingName, className }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [moveIn, setMoveIn] = useState("");
  const [message, setMessage] = useState("");

  const submit = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/listing-interest", {
        propertyId: propertyId || undefined,
        roomId: roomId || undefined,
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        moveIn: moveIn.trim() || undefined,
        message: message.trim() || undefined,
      });
      return res.json();
    },
    onSuccess: () => {
      track("listing_interest_submitted", {
        has_property: Boolean(propertyId),
        has_room: Boolean(roomId),
        has_move_in: moveIn.trim().length > 0,
      });
    },
  });

  const canSubmit = name.trim().length > 0 && EMAIL_RE.test(email.trim()) && !submit.isPending;

  return (
    <div className={className} data-testid="listing-interest-form">
      <h3 className="font-display text-xl font-semibold">
        {listingName ? `Interested in ${listingName}?` : "Tell us what you're looking for"}
      </h3>
      {/* Honest about status: this home is not bookable, and saying so plainly
          is the whole reason this form exists instead of a checkout button. */}
      <p className="mt-1.5 text-sm text-muted-foreground">
        This home isn't available to book yet. Tell us what you're looking for and we'll be
        in touch first if it opens up.
      </p>

      {submit.isSuccess ? (
        <div
          className="mt-5 rounded-xl border bg-good-bg p-4 text-sm font-medium text-good"
          data-testid="listing-interest-success"
        >
          Thanks! You're on the list. We'll reach out if this one opens up.
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <div>
            <Label htmlFor="li-name" className="text-xs font-semibold">
              Name
            </Label>
            <Input
              id="li-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
              data-testid="input-listing-interest-name"
            />
          </div>
          <div>
            <Label htmlFor="li-email" className="text-xs font-semibold">
              Email
            </Label>
            <Input
              id="li-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1"
              data-testid="input-listing-interest-email"
            />
          </div>
          <div>
            <Label htmlFor="li-phone" className="text-xs font-semibold">
              Phone <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="li-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1"
              data-testid="input-listing-interest-phone"
            />
          </div>
          <div>
            <Label htmlFor="li-movein" className="text-xs font-semibold">
              Ideal move-in <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="li-movein"
              value={moveIn}
              onChange={(e) => setMoveIn(e.target.value)}
              placeholder="e.g. Sept 1, or flexible"
              className="mt-1"
              data-testid="input-listing-interest-movein"
            />
          </div>
          <div>
            <Label htmlFor="li-message" className="text-xs font-semibold">
              Anything we should know?{" "}
              <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="li-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="mt-1"
              data-testid="input-listing-interest-message"
            />
          </div>
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => submit.mutate()}
            data-testid="button-listing-interest-submit"
          >
            {submit.isPending ? "Sending…" : "Keep me posted"}
          </Button>
          {submit.isError && (
            <p className="text-sm text-destructive" data-testid="listing-interest-error">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

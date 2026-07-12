// client/src/components/newsletter-signup.tsx
// Email capture for the footer. Mirrors the app's real form convention
// (admin/login.tsx): useState per field + useMutation via apiRequest + shadcn
// Input/Label/Button + inline text. Client-side email validation gates submit;
// success shows an inline confirmation (the site's `good` token), failure an
// inline error. The endpoint is idempotent, so re-submitting an existing email
// still succeeds — the UI treats it as a normal success.
//
// Styled for the dark footer (foreground background), so labels/inputs use
// on-dark utilities rather than the default light-surface tokens.

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSignup({ centered = false }: { centered?: boolean } = {}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const subscribe = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/newsletter", {
        email: email.trim(),
        // Name is optional — only send it when provided; email is the only
        // required field.
        ...(name.trim() ? { name: name.trim() } : {}),
      });
      return res.json();
    },
    onSuccess: () => {
      track("newsletter_signup", { has_name: name.trim().length > 0 });
    },
  });

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && !subscribe.isPending;

  const form = subscribe.isSuccess ? (
    <p className="text-sm font-medium text-good" data-testid="newsletter-success">
      Thanks, you're on the list.
    </p>
  ) : (
    <div className={cn("w-full", !centered && "md:w-auto")}>
      <div
        className={cn(
          "flex flex-col gap-2 sm:flex-row sm:items-center",
          centered && "sm:justify-center",
        )}
      >
        <Label htmlFor="newsletter-name" className="sr-only">
          Name
        </Label>
        <Input
          id="newsletter-name"
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && subscribe.mutate()}
          className="border-white/20 bg-white/10 text-background placeholder:text-white/40 sm:w-44"
          data-testid="input-newsletter-name"
        />
        <Label htmlFor="newsletter-email" className="sr-only">
          Email
        </Label>
        <Input
          id="newsletter-email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && canSubmit && subscribe.mutate()}
          className="border-white/20 bg-white/10 text-background placeholder:text-white/40 sm:w-64"
          data-testid="input-newsletter-email"
        />
        <Button
          disabled={!canSubmit}
          onClick={() => subscribe.mutate()}
          data-testid="button-newsletter-submit"
        >
          {subscribe.isPending ? "Signing up…" : "Sign up"}
        </Button>
      </div>
      {subscribe.isError && (
        <p className={cn("mt-2 text-sm text-destructive", centered && "text-center")} data-testid="newsletter-error">
          Something went wrong. Please try again.
        </p>
      )}
    </div>
  );

  if (centered) {
    // Centered variant — sits at the top of the footer: short copy stacked over
    // a centered email + button row.
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-4 text-center" data-testid="newsletter-signup">
        <div>
          <h4 className="font-display text-xl font-semibold text-background">Stay in the loop</h4>
          <p className="mt-1.5 text-sm text-white/60">
            New homes, openings, and the occasional note. No spam.
          </p>
        </div>
        {form}
      </div>
    );
  }

  return (
    // Compact single-row layout: copy on the left, inline email + button on the
    // right. Collapses to stacked on mobile.
    <div
      className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      data-testid="newsletter-signup"
    >
      <div className="md:max-w-sm">
        <h4 className="font-display text-lg font-semibold text-background">Stay in the loop</h4>
        <p className="mt-1 text-sm text-white/60">
          New homes, openings, and the occasional note. No spam.
        </p>
      </div>
      {form}
    </div>
  );
}

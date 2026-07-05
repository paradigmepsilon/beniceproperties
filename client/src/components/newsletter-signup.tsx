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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterSignup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const subscribe = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/newsletter", {
        name: name.trim() || undefined,
        email: email.trim(),
      });
      return res.json();
    },
  });

  const emailValid = EMAIL_RE.test(email.trim());
  const canSubmit = emailValid && !subscribe.isPending;

  return (
    <div className="max-w-sm" data-testid="newsletter-signup">
      <h4 className="font-display text-lg font-semibold text-background">
        Stay in the loop
      </h4>
      <p className="mt-1.5 text-sm text-white/60">
        New homes, openings, and the occasional note. No spam.
      </p>

      {subscribe.isSuccess ? (
        <p className="mt-4 text-sm font-medium text-good" data-testid="newsletter-success">
          Thanks — you're on the list.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="newsletter-name" className="text-xs text-white/70">
              Name <span className="text-white/40">(optional)</span>
            </Label>
            <Input
              id="newsletter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 border-white/20 bg-white/10 text-background placeholder:text-white/40"
              data-testid="input-newsletter-name"
            />
          </div>
          <div>
            <Label htmlFor="newsletter-email" className="text-xs text-white/70">
              Email
            </Label>
            <Input
              id="newsletter-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && subscribe.mutate()}
              className="mt-1 border-white/20 bg-white/10 text-background placeholder:text-white/40"
              data-testid="input-newsletter-email"
            />
          </div>
          <Button
            className="w-full"
            disabled={!canSubmit}
            onClick={() => subscribe.mutate()}
            data-testid="button-newsletter-submit"
          >
            {subscribe.isPending ? "Signing up…" : "Sign up"}
          </Button>
          {subscribe.isError && (
            <p className="text-sm text-destructive" data-testid="newsletter-error">
              Something went wrong. Please try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

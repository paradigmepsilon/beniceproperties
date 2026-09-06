// client/src/lib/analytics.ts
// Client-side PostHog (posthog-js) for the BNP public site. Server-side capture
// already runs via server/lib/posthog.ts; this covers the frontend half:
// pageviews, anonymous sessions, autocaptured interactions, and named
// conversion events.
//
// Same phc_ project key as the server (VITE_POSTHOG_KEY), so client + server
// events land in the SAME PostHog project. If the key is unset, every function
// here no-ops silently — dev/preview builds without the var never error.
//
// Scope decision (2026-07-27): pageviews + autocapture, NO session replay. The
// site carries lease and payment forms, so recording real visitor screens is a
// privacy-policy question, not a default. Replay is disabled here explicitly
// rather than left to the project-level toggle — the client shouldn't be asking
// for it at all.

import posthog from "posthog-js";

const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ??
  "https://us.i.posthog.com";

// The build-time prerender runs the real app in a headless browser to snapshot
// each route's HTML. We must NOT fire events or record sessions during that
// pass — it isn't a real visitor. Detect it via the prerender user-agent marker
// (Playwright/headless) and disable capture there.
function isPrerender(): boolean {
  if (typeof navigator === "undefined") return true;
  return /HeadlessChrome|Prerender|Playwright/i.test(navigator.userAgent);
}

let started = false;

/**
 * Initialize PostHog once, on app boot. Safe to call when the key is missing
 * (no-op) or during prerender (no-op). Idempotent.
 */
export function initAnalytics(): void {
  if (started || !KEY || isPrerender()) return;
  started = true;

  posthog.init(KEY, {
    api_host: HOST,
    // We fire pageviews ourselves on Wouter route changes (SPA has no full page
    // loads to hook), so turn off the SDK's automatic one to avoid duplicates.
    capture_pageview: false,
    capture_pageleave: true,
    // No session replay — see the scope note at the top of this file. Kept off
    // client-side so it can't start recording if the project toggle is ever
    // flipped on for another reason.
    disable_session_recording: true,
    // Autocapture: clicks on links/buttons, so we can see which CTAs actually
    // move people into a booking without hand-instrumenting every element.
    autocapture: true,
  });
}

/** True once init has run (key present, not prerender). */
export function analyticsReady(): boolean {
  return started;
}

/** Fire a manual pageview for the current path. No-op until initialized. */
export function capturePageview(path: string): void {
  if (!started) return;
  posthog.capture("$pageview", { $current_url: window.location.origin + path });
}

/**
 * Fire a named conversion event with optional non-PII properties. No-op until
 * initialized. Keep properties free of raw names/emails/phones — capture
 * category-level context (property type, source) instead.
 */
export function track(
  event: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
): void {
  if (!started) return;
  posthog.capture(event, properties);
}

/**
 * Tie the anonymous browsing session to the guest once they identify
 * themselves (checkout contact step). Lets the PostHog person timeline show
 * what this guest did on the site before booking. Email only — no name/phone.
 */
export function identify(email: string): void {
  if (!started) return;
  const e = email.trim().toLowerCase();
  if (!e) return;
  posthog.identify(e);
}

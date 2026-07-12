// client/src/lib/analytics.ts
// Client-side PostHog (posthog-js) for the BNP public site. Server-side capture
// already runs via server/lib/posthog.ts; this covers the frontend half:
// pageviews, anonymous sessions, session replay, and named conversion events.
//
// Same phc_ project key as the server (VITE_POSTHOG_KEY), so client + server
// events land in the SAME PostHog project. If the key is unset, every function
// here no-ops silently — dev/preview builds without the var never error.
//
// Session replay is REQUESTED here with input masking, but PostHog only records
// once "Session Replay" is toggled ON in the project's settings (a dashboard
// step). Until then the client just captures events/pageviews.

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
    // Session replay: request it with all inputs masked so no typed PII (names,
    // emails, card fields) is ever recorded. Actual recording still depends on
    // the project-level toggle in PostHog settings.
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
    },
    autocapture: false,
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

// server/lib/posthog.ts
// Singleton PostHog Node.js client for server-side analytics.
// Long-running server: the SDK batches automatically — no custom flushAt/flushInterval.

import { PostHog } from "posthog-node";

export const posthog = new PostHog(process.env.POSTHOG_API_KEY ?? "", {
  host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
  enableExceptionAutocapture: true,
});

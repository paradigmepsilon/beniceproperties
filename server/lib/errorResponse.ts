// server/lib/errorResponse.ts
// What the JSON error handler may tell the client. 4xx messages are authored by
// this app and safe to show. A 5xx message is whatever threw — a Drizzle
// failure carries the full SQL and bound params — so outside dev it is
// replaced with a generic line (the real error is still console.error'd and
// captured to PostHog by the handler).

export function clientErrorMessage(err: { message?: string }, status: number, isDev: boolean): string {
  if (status >= 500 && !isDev) return "Internal Server Error";
  return err.message || "Internal Server Error";
}

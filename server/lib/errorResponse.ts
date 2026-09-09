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

/**
 * An error carrying the HTTP status the route should return. Despite the name
 * it is the app-wide 4xx carrier — leases, bookings, uploads and verification
 * all throw it, and routes map `.status` straight onto the response.
 *
 * It lives HERE, not in lease.ts, because lease.ts imports the storage layer and
 * therefore the database. A pure module that only needs to throw a 400 (such as
 * uploadValidation.ts) must not be forced to open a database connection to do
 * it. lease.ts re-exports it, so every existing importer is unaffected.
 */
export class LeaseError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "LeaseError";
    this.status = status;
  }
}

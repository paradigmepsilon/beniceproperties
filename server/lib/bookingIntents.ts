// server/lib/bookingIntents.ts
// Pure helpers for booking_intents — the site's record of every checkout a
// guest STARTED (payment-first leaves no booking row until Stripe confirms).
// UO reads the table to show a guest's website activity and whether it turned
// into a booking; the booking itself is matched by `reference`.

/** An intent older than this with no booking is treated as abandoned. */
export const ABANDON_AFTER_MS = 24 * 60 * 60 * 1000;

export type BookingIntentStatus = "STARTED" | "CONTACT_ADDED" | "PAID" | "ABANDONED";

export function bookingIntentStatus(
  intent: { guestEmail: string | null; createdAt: Date },
  ctx: { hasBooking: boolean; now: Date },
): BookingIntentStatus {
  if (ctx.hasBooking) return "PAID";
  if (ctx.now.getTime() - intent.createdAt.getTime() > ABANDON_AFTER_MS) return "ABANDONED";
  return intent.guestEmail ? "CONTACT_ADDED" : "STARTED";
}

// shared/api-types.ts
// Request/response contracts shared by client and server for the booking flow.
// Zod schemas so both sides validate identically.

import { z } from "zod";
import { PAYMENT_METHODS, PAYMENT_CADENCES } from "./schema";

// --- Quote ---------------------------------------------------------------
// A quote request asks the server for a method-aware price breakdown. The
// server computes it with the canonical calculateBreakdown() — the client
// never invents totals.

export const quoteRequestSchema = z
  .object({
    propertyId: z.string().min(1),
    roomId: z.string().optional(), // required for COLIVING
    checkIn: z.string().optional(), // YYYY-MM-DD, required for STR
    checkOut: z.string().optional(), // YYYY-MM-DD, required for STR
    paymentMethod: z.enum(PAYMENT_METHODS),
  })
  .refine((d) => d.roomId || (d.checkIn && d.checkOut), {
    message: "STR bookings need checkIn+checkOut; co-living needs a roomId",
  });

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;

export interface QuoteLine {
  label: string;
  amount: number;
}

export interface QuoteResponse {
  model: "STR" | "COLIVING";
  // What is charged NOW (STR total, or co-living deposit).
  dueNow: {
    lines: QuoteLine[];
    subtotal: number;
    tax: number;
    surcharge: number;
    total: number;
  };
  // For co-living only: the recurring weekly charge after move-in.
  recurring?: {
    label: string;
    weeklyRent: number;
    surcharge: number;
    weeklyTotal: number;
  };
  nights?: number;
}

// --- Availability (calendar disabled-date source) ------------------------

/**
 * A busy (unavailable) date range for a listing. `end` is the FIRST FREE day
 * (half-open) — mirrors iCal DTEND. The client converts each range into disabled
 * calendar days: STR disables [start, end) (checkout day selectable as a new
 * check-in); co-living rooms disable [start, end] inclusive (a lease occupies
 * its end date). `source` is for debugging/telemetry only — the client does not
 * branch on it.
 */
export interface BusyRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (exclusive — first free day)
  source: "direct" | "external";
}

export interface AvailabilityResponse {
  busy: BusyRange[];
  /** Server clock's today (YYYY-MM-DD); the calendar's floor. */
  minDate: string;
}

// --- Create booking ------------------------------------------------------

export const createBookingSchema = z
  .object({
    propertyId: z.string().min(1),
    roomId: z.string().optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS),
    guest: z.object({
      name: z.string().min(1, "Name required"),
      email: z.string().email("Valid email required"),
      phone: z.string().optional(),
    }),
  })
  .refine((d) => d.roomId || (d.checkIn && d.checkOut), {
    message: "STR bookings need checkIn+checkOut; co-living needs a roomId",
  });

export type CreateBookingRequest = z.infer<typeof createBookingSchema>;

// Short-stay booking INTENT (payment-first). Guest is OPTIONAL — the intent is
// created on page load before contact, then contact is attached via
// /api/booking-intent/:id/contact before the guest confirms payment.
export const bookingIntentSchema = z
  .object({
    propertyId: z.string().min(1),
    roomId: z.string().optional(),
    checkIn: z.string().optional(),
    checkOut: z.string().optional(),
    guest: z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
      })
      .optional(),
  })
  .refine((d) => d.roomId || (d.checkIn && d.checkOut), {
    message: "STR bookings need checkIn+checkOut; co-living needs a roomId",
  });

export type BookingIntentRequest = z.infer<typeof bookingIntentSchema>;

export interface BookingIntentResponse {
  reference: string;
  clientSecret: string | null;
  publishableKey?: string;
  paymentIntentId: string;
  quote: QuoteResponse;
}

export interface CreateBookingResponse {
  reference: string;
  bookingId: string;
  paymentMethod: "STRIPE" | "CASHAPP" | "ZELLE";
  // Stripe path (on-page embedded): the PaymentIntent client_secret + publishable
  // key the client uses to mount Stripe Elements and confirm the charge on-page.
  // The booking is confirmed server-side by the webhook, never the client.
  clientSecret?: string;
  publishableKey?: string;
  paymentIntentId?: string;
  // Legacy hosted-Checkout redirect URL. No longer populated (kept for
  // backward-compat with any older client build). Manual path: undefined.
  checkoutUrl?: string;
  // Manual path: the instructions to show the guest.
  manualInstructions?: {
    method: "CASHAPP" | "ZELLE";
    handle: string;
    amount: number;
    memo: string;
  };
  quote: QuoteResponse;
}

// --- Co-living lease quote (Phase 2) -------------------------------------
// A lease-quote asks the server for the FULL payment schedule preview for a
// co-living term, computed by the shared canonical generator. No lease is
// created and no payment is taken — this is the "ready to pay" preview. The
// lease itself is created in Phase 3 (after the guest commits), and the first
// payment is taken in Phase 4.

export const leaseQuoteRequestSchema = z.object({
  propertyId: z.string().min(1),
  // One or more rooms in the same property (co-living can rent multiple rooms).
  roomIds: z.array(z.string().min(1)).min(1, "Select at least one room"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  // Deprecated: cadence is auto-derived server-side from stay length. Kept
  // optional for back-compat with callers that still send it (value ignored).
  cadence: z.enum(PAYMENT_CADENCES).optional(),
});

export type LeaseQuoteRequest = z.infer<typeof leaseQuoteRequestSchema>;

export interface LeaseScheduleLine {
  seq: number;
  dueDate: string; // YYYY-MM-DD
  amount: number;
  prorated: boolean;
  daysCovered: number;
  /** True for seq 1 — the installment due on the booking date. */
  dueOnBooking: boolean;
}

export interface LeaseQuoteResponse {
  propertyId: string;
  propertyName: string;
  rooms: { id: string; name: string; roomNumber: string | null; weeklyRent: number }[];
  startDate: string;
  endDate: string;
  /** The billing cadence used to build this schedule (the guest's choice). */
  cadence: (typeof PAYMENT_CADENCES)[number];
  /** Cadences the guest may choose for this term length (gate by stay length). */
  allowedCadences: (typeof PAYMENT_CADENCES)[number][];
  /** Combined weekly rate across all included rooms. */
  weeklyRateTotal: number;
  /** Refundable security deposit that secures the room (sum across rooms). */
  depositTotal: number;
  /**
   * One-time cleaning fee (sum across rooms), due at move-in. Non-refundable and
   * charged as its own PaymentIntent — NOT part of the recurring schedule below.
   */
  cleaningFeeTotal: number;
  termDays: number;
  schedule: LeaseScheduleLine[];
  totalLeaseValue: number;
  prorationNote: string;
  /** The amount due today (schedule_seq 1). Convenience for the UI. */
  dueToday: number;
}

// --- Create draft lease (Phase 3) ----------------------------------------
// Commits the previewed selection into a DRAFT → PENDING_SIGNATURE lease with
// its persisted payment schedule. No payment taken.

export const createDraftLeaseSchema = z.object({
  propertyId: z.string().min(1),
  roomIds: z.array(z.string().min(1)).min(1, "Select at least one room"),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cadence: z.enum(PAYMENT_CADENCES),
  guest: z.object({
    name: z.string().min(1, "Name required"),
    email: z.string().email("Valid email required"),
    phone: z.string().optional(),
  }),
});

export type CreateDraftLeaseRequest = z.infer<typeof createDraftLeaseSchema>;

export interface CreateDraftLeaseResponse {
  leaseId: string;
  status: string;
  documentHtml: string;
}

// --- Sign lease (Phase 3) ------------------------------------------------
// In-app typed e-signature: legal name + affirmation. Timestamp + IP captured
// server-side. Moves the lease to PENDING_FIRST_PAYMENT.

export const signLeaseSchema = z.object({
  leaseId: z.string().min(1),
  signedName: z.string().min(2, "Type your full legal name"),
  affirmed: z.literal(true, {
    errorMap: () => ({ message: "You must affirm the agreement to sign" }),
  }),
});

export type SignLeaseRequest = z.infer<typeof signLeaseSchema>;

export interface SignLeaseResponse {
  leaseId: string;
  status: string;
  documentUrl: string;
}

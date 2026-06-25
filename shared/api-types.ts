// shared/api-types.ts
// Request/response contracts shared by client and server for the booking flow.
// Zod schemas so both sides validate identically.

import { z } from "zod";
import { PAYMENT_METHODS } from "./schema";

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

export interface CreateBookingResponse {
  reference: string;
  bookingId: string;
  paymentMethod: "STRIPE" | "CASHAPP" | "ZELLE";
  // Stripe path: a Checkout URL to redirect to. Manual path: undefined.
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

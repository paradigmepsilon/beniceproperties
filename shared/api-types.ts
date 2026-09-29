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
 * (half-open) — mirrors iCal DTEND. This holds for co-living too: a lease's
 * stored `endDate` is inclusive, but the server normalizes it to exclusive
 * (+1 day) before it reaches this wire type (see server/lib/availability.ts),
 * so every range here is uniformly half-open. The client converts each range
 * into disabled calendar days [start, end) — the checkout/end day stays
 * selectable as a new check-in. `source` is for debugging/telemetry only —
 * the client does not branch on it.
 */
export interface BusyRange {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD (exclusive — first free day)
  source: "direct" | "external" | "manual";
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
  // The guest's billing cadence. Must be one of allowedCadencesForTerm() when
  // sent; omitted means the server uses the shortest allowed cadence so a first
  // preview always renders. Cadence DRIVES THE RATE — it is not cosmetic.
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
  /**
   * Combined weekly LIST rate across all included rooms. This is a room
   * attribute, NOT necessarily what the guest is billed — see installmentAmount.
   */
  weeklyRateTotal: number;
  /** One full installment at `cadence` — the guest's real rate. */
  installmentAmount: number;
  /** Days one installment covers: 7 | 14 | 28. */
  periodDays: number;
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

// --- Admin payments-by-property tree (GET /api/admin/payments/by-property) ---
// The admin Payments tab reads money as Property -> Room -> Stay -> line, so an
// operator can see WHICH room in WHICH home a given dollar belongs to. Two
// disjoint money worlds are unioned here, because neither alone answers that:
//   bookings -> payments          (STR nights + short co-living stays)
//   leases   -> payment_schedule  (recurring co-living rent) + late_fees
// `leases` has no booking_id and `payments` has no lease_id, so the join to a
// room runs through a different path for each and is done server-side once.
//
// PLACEHOLDER properties are absent entirely (shared/placeholder.ts): they are
// front-end demand probes, so they hold no money and must never dilute a report.

/** The one money shape, rendered identically at every level of the tree. */
export interface MoneyTotals {
  /** PAID only. REFUNDED is deliberately NOT collected. */
  collected: number;
  /** SCHEDULED, or DUE whose dueDate has not passed — on a LIVE stay only.
   *  A cancelled booking's unpaid row and a terminated lease's future rent are
   *  never arriving, so they are excluded here (see MoneyLine.counted). */
  scheduled: number;
  /** DUE past its dueDate, plus LATE and FAILED — on a LIVE stay only. */
  overdue: number;
  /** late_fees still owed — ACCRUED or BILLED, never PAID/WAIVED. */
  lateFees: number;
  refunded: number;
  /** collected + scheduled + overdue. Excludes late fees and refunds. */
  expected: number;
}

export type MoneyLineKind =
  | "BOOKING_PAYMENT"
  | "SUBSCRIPTION"
  | "DEPOSIT"
  | "CLEANING_FEE"
  | "RENT"
  | "LATE_FEE"
  /** A live stay with no money row at all — an anomaly, surfaced not hidden. */
  | "MISSING";

export interface MoneyLine {
  /** `payment:<id>` | `sub:<id>` | `sched:<leaseId>:<seq>` | `latefee:<leaseId>:<seq>`
   *  | `deposit:<leaseId>` | `cleaning:<leaseId>` | `missing:<stayId>` */
  id: string;
  kind: MoneyLineKind;
  /** Human label: "Rent", "Deposit", "Late fees (inst. #6 — 6 days)", "ONE_TIME · STRIPE". */
  label: string;
  scheduleSeq: number | null;
  /** YYYY-MM-DD. Schedule dueDate, or a late fee's accrual date. */
  dueDate: string | null;
  /** Dollars. For a booking payment this is amount + surcharge. */
  amount: number;
  /** Booking payments only, so the fee split stays visible. */
  surcharge: number | null;
  /** Raw domain status, rendered verbatim in a Badge. */
  status: string;
  /** STRIPE | CASHAPP | ZELLE | CARD_ON_FILE | MANUAL */
  method: string | null;
  paidAt: string | null;
  /** Reference only — never card data. */
  stripeRef: string | null;
  /** False when this line is shown but deliberately absent from every total:
   *  a WAIVED row, a legacy subscription, or any unpaid row on a CLOSED stay
   *  (cancelled/abandoned booking, completed/terminated lease). Those would
   *  otherwise inflate `scheduled` and `expected` with money that will never
   *  arrive — the exact misreading this whole view exists to prevent. */
  counted: boolean;
}

export interface StayRoomRef {
  roomId: string;
  name: string;
  roomNumber: string | null;
}

/** One booking or one lease, with every money line that belongs to it. */
export interface StayMoney {
  kind: "BOOKING" | "LEASE";
  id: string;
  /** booking.reference. Null for a lease — leases carry no human reference. */
  reference: string | null;
  /** What the UI shows: the reference, or a short lease-id handle. */
  handle: string;
  guestName: string;
  guestEmail: string;
  guestPhone: string | null;
  status: string;
  start: string;
  end: string | null;
  /** "STR" | "COLIVING" for a booking; "LEASE" for a lease. */
  model: string;
  /** Lease only: WEEKLY | BIWEEKLY | MONTHLY. */
  cadence: string | null;
  /** Every room this stay covers (lease_rooms snapshots for a lease). */
  rooms: StayRoomRef[];
  /** True when rooms.length > 1 — this stay is listed under each of them. */
  multiRoom: boolean;
  totals: MoneyTotals;
  /** Pre-sorted by the server so the client only maps. */
  lines: MoneyLine[];
  /** Lease only → /portal/<token>. */
  portalToken: string | null;
}

export interface RoomMoney {
  /** Null identifies the "Whole property" bucket (STR, or a null-room booking). */
  roomId: string | null;
  roomName: string;
  roomNumber: string | null;
  /** rooms.status; null for the whole-property bucket. */
  roomStatus: string | null;
  /** Money from SINGLE-room stays only, so these sum cleanly across rooms. */
  totals: MoneyTotals;
  /** Money from multi-room stays listed here. Kept OUT of `totals` because the
   *  same figure appears under every room the stay covers. */
  sharedTotals: MoneyTotals;
  stays: StayMoney[];
}

export interface PropertyMoney {
  propertyId: string;
  propertyName: string;
  /** From the property row — "BNP" | "TRAD". Never hard-coded. */
  entity: string;
  type: string;
  location: string;
  active: boolean;
  /** Exact: every stay counted once, multi-room leases included. */
  totals: MoneyTotals;
  stayCount: number;
  rooms: RoomMoney[];
}

export interface PaymentsByPropertyView {
  /** Injected by the caller, so the report is deterministic and testable. */
  asOf: string;
  grand: MoneyTotals;
  properties: PropertyMoney[];
  /** Money whose booking/lease lost its guest or property row. The joins that
   *  build the tree drop those rows; this keeps them on the page, because a
   *  money screen that silently understates is worse than one extra query. */
  unattributed: { stays: StayMoney[]; totals: MoneyTotals };
  /** Counted, not listed — so the footer can say how much is hidden and why. */
  excluded: {
    abandonedCheckouts: number;
    draftLeases: number;
    agedOut: number;
    placeholderProperties: number;
  };
}

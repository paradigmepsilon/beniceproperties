// shared/schema.ts
// =============================================================================
// BNP (Be Nice Properties) — single source of truth for the database schema.
// Drizzle tables + drizzle-zod insert schemas, shared by client and server.
//
// Mirrors the TRAD app's idiom exactly:
//   - varchar primary keys defaulted to gen_random_uuid()
//   - snake_case column names
//   - status/enum fields are text columns refined with z.enum() on the insert
//     schema (TRAD avoids pg enums to keep migrations simple)
//   - insertXSchema = createInsertSchema(x).omit({ id, createdAt, updatedAt })
//   - X = typeof x.$inferSelect; InsertX = z.infer<typeof insertXSchema>
//
// PCI DISCIPLINE: there are NO card columns anywhere in this schema. Cardholder
// data lives in Stripe and never touches this database. We store Stripe
// REFERENCES only (payments.stripe_ref, subscriptions.stripe_subscription_id).
// =============================================================================

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  timestamp,
  decimal,
  integer,
  date,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// -----------------------------------------------------------------------------
// Enumerated string values (single source for both DB text columns and Zod)
// -----------------------------------------------------------------------------

export const PROPERTY_TYPES = ["STR", "COLIVING"] as const;
export const ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "HOLD"] as const;
export const BOOKING_MODELS = ["STR", "COLIVING"] as const;
export const BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;
export const PAYMENT_METHODS = ["STRIPE", "CASHAPP", "ZELLE"] as const;
export const PAYMENT_TYPES = ["DEPOSIT", "WEEKLY", "ONE_TIME"] as const;
export const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"] as const;

// --- Entity owning a property. Sources the Stripe metadata `entity` field from
// data, never hard-coded. TRAD is a subset of BNP and shares one Stripe account;
// the entity/property/room breakout lives in this DB + Stripe metadata. ---
export const PROPERTY_ENTITIES = ["TRAD", "BNP"] as const;

// =============================================================================
// LEASE MODEL (Phases 1+) — co-living by-the-room lease, payment schedule, and
// late fees. ADDITIVE to the original booking model: the existing bookings/
// payments/subscriptions tables are untouched and still serve the STR nightly
// path. Co-living moves onto leases + an own scheduler (NOT Stripe Subscriptions)
// per the spec. See docs/build-log.md for the decision record.
// =============================================================================

export const PAYMENT_CADENCES = ["WEEKLY", "BIWEEKLY", "MONTHLY"] as const;
export const LEASE_STATUSES = [
  "DRAFT", // created, not yet signed
  "PENDING_SIGNATURE", // presented to guest for signature
  "PENDING_FIRST_PAYMENT", // signed; awaiting the securing payment (deposit)
  "PENDING_VERIFICATION", // deposit paid + room secured; awaiting ID approval
  "ACTIVE", // verified (ID approved) AND securing payment succeeded
  "COMPLETED", // term finished, fully paid
  "TERMINATED", // ended early
  "DEFAULTED", // unpaid past the default threshold
] as const;
// Tenant identity verification (driver's license review) lifecycle. A signed
// lease whose deposit is paid parks in PENDING_VERIFICATION until an admin
// APPROVES the uploaded license (verifying the tenant's name) — approval is what
// activates the lease. NOT_SUBMITTED → PENDING_REVIEW (on upload) →
// APPROVED | REJECTED. A rejected tenant re-uploads (back to PENDING_REVIEW).
export const VERIFICATION_STATUSES = [
  "NOT_SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED",
] as const;
/** US state/territory codes for a vehicle plate. */
export const US_STATE_CODES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
] as const;
export const SCHEDULE_STATUSES = [
  "SCHEDULED", // future, not yet due
  "DUE", // due today / past due, not yet charged
  "PAID",
  "FAILED", // card-on-file charge declined
  "LATE", // past due with accruing late fees
  "WAIVED", // admin waived this installment
] as const;
export const SCHEDULE_PAYMENT_METHODS = ["CARD_ON_FILE", "MANUAL"] as const;
export const LATE_FEE_STATUSES = ["ACCRUED", "BILLED", "PAID", "WAIVED"] as const;
// Refundable security-deposit lifecycle. PAID secures the room; REFUNDED is the
// move-out return; WAIVED is an admin override (no deposit collected).
export const DEPOSIT_STATUSES = ["PENDING", "PAID", "REFUNDED", "WAIVED"] as const;

// Number of cadence periods that fall in one installment. WEEKLY=1 week,
// BIWEEKLY=2 weeks, MONTHLY=4 weeks. weekly_rate × this × room count = amount.
export const CADENCE_WEEKS: Record<(typeof PAYMENT_CADENCES)[number], number> = {
  WEEKLY: 1,
  BIWEEKLY: 2,
  MONTHLY: 4,
};

/** Days in one cadence period (used to space due dates). */
export const CADENCE_DAYS: Record<(typeof PAYMENT_CADENCES)[number], number> = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 28,
};

/** Hard ceiling on a co-living lease term (spec: ≤ 90 days). */
export const MAX_LEASE_DAYS = 90;

/**
 * Which billing cadences a guest may choose, gated by term length (owner rule).
 * The rate TIER (amount per period) is still chosen by stay length elsewhere;
 * this only governs how OFTEN the guest is billed. One source of truth — imported
 * by the client (to render options) and the server (to validate the submission).
 *
 *   1 week  to < 1 month  (7–27 days):  weekly only
 *   1 month to < 3 months (28–83 days): weekly, or monthly (pay the whole month)
 *   3 months and up       (84–90 days): weekly, biweekly, or monthly
 *
 * Below 7 days a co-living lease isn't offered; callers should reject shorter terms.
 */
export function allowedCadencesForTerm(
  termDays: number,
): (typeof PAYMENT_CADENCES)[number][] {
  if (termDays >= 84) return ["WEEKLY", "BIWEEKLY", "MONTHLY"];
  if (termDays >= 28) return ["WEEKLY", "MONTHLY"];
  return ["WEEKLY"];
}

/** Flat daily late fee, in dollars (spec: $25/day, no cap). */
export const LATE_FEE_PER_DAY = 25.0;

// --- Phase 5: dunning / reminders / escalations ---

/** Notification kinds, used to dedupe sends in notification_log. */
export const NOTIFICATION_KINDS = [
  "REMINDER_7D", // 7 days before due
  "REMINDER_3D", // 3 days before due
  "REMINDER_DUE", // day of
  "PAYMENT_FAILED", // card-on-file decline → fix-card link
  "OVERDUE_1", // day after due, day 1 of 3
  "OVERDUE_2",
  "OVERDUE_3",
  "LATE_FEE_BILLED",
  "DEFAULTED",
] as const;

export const ESCALATION_KINDS = [
  "PAYMENT_FAILED",
  "PAYMENT_OVERDUE",
  "LEASE_DEFAULTED",
  "VERIFICATION_PENDING", // a tenant uploaded a license awaiting admin review
] as const;
export const ESCALATION_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"] as const;
export const ESCALATION_SEVERITIES = ["LOW", "MEDIUM", "HIGH"] as const;

/**
 * Default DEFAULTED threshold (days a payment may sit unpaid past its due date
 * before the lease flips to DEFAULTED). Admin-configurable via app_settings;
 * this constant is only the fallback. Locked default: 7 (Alex, Phase 5).
 */
export const DEFAULT_DEFAULTED_THRESHOLD_DAYS = 7;

/** How many consecutive days to message an overdue guest (spec: 3). */
export const OVERDUE_MESSAGE_DAYS = 3;

// =============================================================================
// properties — whole-property (STR) and co-living parent properties
// =============================================================================

export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // Free-text location label, e.g. "Atlanta" | "Antigua". Kept as text (not an
  // enum) so new markets don't require a migration.
  location: text("location").notNull(),
  // "STR" (book the whole place) | "COLIVING" (book a room within it).
  type: text("type").notNull().default("STR"),
  // Owning entity: "TRAD" | "BNP". Sources the Stripe metadata `entity` field.
  // Defaults to BNP; TRAD properties set it explicitly. Additive column.
  entity: text("entity").notNull().default("BNP"),
  description: text("description"),
  // string[] of photo URLs.
  photos: jsonb("photos").$type<string[]>().default(sql`'[]'::jsonb`),
  // string[] of amenity labels.
  amenities: jsonb("amenities").$type<string[]>().default(sql`'[]'::jsonb`),
  // STR nightly base price. Null/0 for COLIVING parents (priced per-room).
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  cleaningFee: decimal("cleaning_fee", { precision: 10, scale: 2 }).default("0"),
  // Day/week/month rates (added 2026-06-27, live via additive migration). The
  // booking flow auto-selects a tier by stay length (>=28 nights monthly, >=7
  // weekly, else daily) and prorates per night (tierRate / tierDays). Nullable;
  // chooseRate() falls back to the next shorter tier, and dailyRate falls back to
  // basePrice for back-compat. See shared/rateSelection.ts.
  dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
  weeklyRate: decimal("weekly_rate", { precision: 10, scale: 2 }),
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
  // Per-night-by-weekday prices (added 2026-06-30, additive nullable). When a stay
  // resolves to the DAILY tier (<7 nights), each night is priced by the weekday it
  // falls on and the stay total = SUM of those nightly prices. A missing weekday
  // price falls back to dailyRate ?? basePrice for that night. WEEKLY/MONTHLY tiers
  // ignore these (they use the scalar rate). See shared/rateSelection.ts
  // weekdayStayTotal(). STR (whole-property) only — co-living has no nightly path.
  monPrice: decimal("mon_price", { precision: 10, scale: 2 }),
  tuePrice: decimal("tue_price", { precision: 10, scale: 2 }),
  wedPrice: decimal("wed_price", { precision: 10, scale: 2 }),
  thuPrice: decimal("thu_price", { precision: 10, scale: 2 }),
  friPrice: decimal("fri_price", { precision: 10, scale: 2 }),
  satPrice: decimal("sat_price", { precision: 10, scale: 2 }),
  sunPrice: decimal("sun_price", { precision: 10, scale: 2 }),
  // Street address (structured beyond the free-text `location` market label).
  // Added 2026-06-28 for the Unified-Ops Inventory manager. Additive, nullable.
  address: text("address"),
  // Prior Airbnb listing names this property has carried (Alex re-lists when a
  // rating drops). Populated when duplicate Airbnb listings are merged onto this
  // property. string[] of past names. Additive.
  priorNames: jsonb("prior_names").$type<string[]>().default(sql`'[]'::jsonb`),
  // The Airbnb listing_room_id this STR property maps to (entire-home listing).
  // Links live inventory to the airbnb_reservations staging data. Additive.
  airbnbListingRoomId: text("airbnb_listing_room_id"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropertySchema = createInsertSchema(properties, {
  type: z.enum(PROPERTY_TYPES),
  entity: z.enum(PROPERTY_ENTITIES).optional(),
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Property = typeof properties.$inferSelect;
export type InsertProperty = z.infer<typeof insertPropertySchema>;

// Property as returned by the public list endpoint (/api/properties). For
// co-living, fromWeeklyRent is the lowest weeklyRent among AVAILABLE rooms so
// the card can show "from $X / week"; null when no room is bookable. STR
// properties leave it null (they price from their own nightly tiers).
export type PropertyListItem = Property & { fromWeeklyRent: string | null };

// =============================================================================
// rooms — bookable rooms inside a COLIVING property
// =============================================================================

export const rooms = pgTable(
  "rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id),
    name: text("name").notNull(),
    // Human room number/label used in the Stripe metadata contract (room_number),
    // e.g. "2". Optional so STR conversions and legacy rows don't break. Additive.
    roomNumber: text("room_number"),
    description: text("description"),
    photos: jsonb("photos").$type<string[]>().default(sql`'[]'::jsonb`),
    weeklyRent: decimal("weekly_rent", { precision: 10, scale: 2 }).notNull(),
    depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
    // Day/month rates (added 2026-06-27). weekly_rent is the weekly value used by
    // chooseRate(); these add the daily + monthly tiers. Nullable; fallback to the
    // next shorter tier. See shared/rateSelection.ts.
    dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
    monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
    // "AVAILABLE" | "OCCUPIED" | "HOLD"
    status: text("status").notNull().default("AVAILABLE"),
    // Street address for this specific room (when it differs from / refines the
    // parent property's). Added 2026-06-28 for the Inventory manager. Additive.
    address: text("address"),
    // Prior Airbnb listing names this room has carried (populated on merge of
    // duplicate Airbnb listings). string[]. Additive.
    priorNames: jsonb("prior_names").$type<string[]>().default(sql`'[]'::jsonb`),
    // The Airbnb listing_room_id this room maps to (private-room listing). Links
    // live inventory to airbnb_reservations staging data. Additive.
    airbnbListingRoomId: text("airbnb_listing_room_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("rooms_property_idx").on(table.propertyId),
    statusIdx: index("rooms_status_idx").on(table.status),
    airbnbIdx: index("rooms_airbnb_listing_idx").on(table.airbnbListingRoomId),
  }),
);

export const insertRoomSchema = createInsertSchema(rooms, {
  status: z.enum(ROOM_STATUSES),
  photos: z.array(z.string()).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

// =============================================================================
// guests — minimal PII. NEVER pushed to Unified Ops.
// =============================================================================

export const guests = pgTable(
  "guests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("guests_email_idx").on(table.email),
  }),
);

export const insertGuestSchema = createInsertSchema(guests, {
  email: z.string().email(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Guest = typeof guests.$inferSelect;
export type InsertGuest = z.infer<typeof insertGuestSchema>;

// =============================================================================
// bookings — both models. roomId null for STR; checkOut null for open-ended
// co-living stays.
// =============================================================================

export const bookings = pgTable(
  "bookings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id),
    // Null for whole-property (STR) bookings.
    roomId: varchar("room_id").references(() => rooms.id),
    guestId: varchar("guest_id")
      .notNull()
      .references(() => guests.id),
    // "STR" | "COLIVING"
    model: text("model").notNull(),
    checkIn: date("check_in").notNull(),
    // Null for open-ended co-living stays.
    checkOut: date("check_out"),
    // "PENDING_PAYMENT" | "CONFIRMED" | "ACTIVE" | "COMPLETED" | "CANCELLED"
    status: text("status").notNull().default("PENDING_PAYMENT"),
    // "STRIPE" | "CASHAPP" | "ZELLE"
    paymentMethod: text("payment_method").notNull(),
    // Short human-friendly code the guest uses to look up the booking (and to
    // include in a CashApp/Zelle memo). Unique.
    reference: text("reference").notNull().unique(),
    // The total the guest was quoted at checkout (must equal what was charged).
    quotedTotal: decimal("quoted_total", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("bookings_property_idx").on(table.propertyId),
    roomIdx: index("bookings_room_idx").on(table.roomId),
    guestIdx: index("bookings_guest_idx").on(table.guestId),
    statusIdx: index("bookings_status_idx").on(table.status),
    referenceIdx: index("bookings_reference_idx").on(table.reference),
  }),
);

export const insertBookingSchema = createInsertSchema(bookings, {
  model: z.enum(BOOKING_MODELS),
  status: z.enum(BOOKING_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = z.infer<typeof insertBookingSchema>;

// =============================================================================
// payments — every money movement. stripe_ref is a REFERENCE only (no card data).
// =============================================================================

export const payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id")
      .notNull()
      .references(() => bookings.id),
    // "DEPOSIT" | "WEEKLY" | "ONE_TIME"
    type: text("type").notNull(),
    // "STRIPE" | "CASHAPP" | "ZELLE"
    method: text("method").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    // The visible surcharge line (0 for CashApp/Zelle).
    surcharge: decimal("surcharge", { precision: 10, scale: 2 }).notNull().default("0"),
    // "PENDING" | "PAID" | "FAILED"
    status: text("status").notNull().default("PENDING"),
    // Stripe payment_intent / checkout_session id. Null for manual methods.
    // NEVER a card number — reference only.
    stripeRef: text("stripe_ref"),
    // Admin user id who confirmed a manual (CashApp/Zelle) payment. Null otherwise.
    confirmedBy: text("confirmed_by"),
    paidAt: timestamp("paid_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index("payments_booking_idx").on(table.bookingId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripeRefIdx: index("payments_stripe_ref_idx").on(table.stripeRef),
  }),
);

export const insertPaymentSchema = createInsertSchema(payments, {
  type: z.enum(PAYMENT_TYPES),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;

// =============================================================================
// subscriptions — Stripe Subscriptions backing co-living weekly rent.
// Holds a Stripe REFERENCE only.
// =============================================================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id")
      .notNull()
      .references(() => bookings.id),
    // Stripe subscription id — reference only.
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    weeklyAmount: decimal("weekly_amount", { precision: 10, scale: 2 }).notNull(),
    // Mirrors Stripe's subscription status string (active, past_due, canceled, …).
    status: text("status").notNull(),
    nextChargeAt: timestamp("next_charge_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    bookingIdx: index("subscriptions_booking_idx").on(table.bookingId),
    stripeSubIdx: index("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId),
  }),
);

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;

// =============================================================================
// kpi_snapshots — LOCAL rollup cache before the sanitized push to Unified Ops.
// AGGREGATES ONLY. No PII, no card data, no raw rows ever live here.
// =============================================================================

export const kpiSnapshots = pgTable(
  "kpi_snapshots",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    snapshotDate: date("snapshot_date").notNull(),
    bookingCount: integer("booking_count").notNull().default(0),
    occupancyPct: decimal("occupancy_pct", { precision: 5, scale: 2 }).notNull().default("0"),
    revenueTotal: decimal("revenue_total", { precision: 12, scale: 2 }).notNull().default("0"),
    roomsOccupied: integer("rooms_occupied").notNull().default(0),
    upcomingCheckIns: integer("upcoming_check_ins").notNull().default(0),
    // Whether this snapshot has been pushed up to Unified Ops yet.
    pushedToUo: boolean("pushed_to_uo").notNull().default(false),
    pushedAt: timestamp("pushed_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    snapshotDateIdx: index("kpi_snapshots_date_idx").on(table.snapshotDate),
    pushedIdx: index("kpi_snapshots_pushed_idx").on(table.pushedToUo),
  }),
);

export const insertKpiSnapshotSchema = createInsertSchema(kpiSnapshots).omit({
  id: true,
  createdAt: true,
});

export type KpiSnapshot = typeof kpiSnapshots.$inferSelect;
export type InsertKpiSnapshot = z.infer<typeof insertKpiSnapshotSchema>;

// =============================================================================
// admin_users — passport-local admin credentials (session-based auth).
// Sessions themselves are stored by connect-pg-simple in its own table
// (createTableIfMissing), not declared here.
// =============================================================================

export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  // Hashed password (never plaintext). Hashing happens in the auth layer.
  password: text("password").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;

// =============================================================================
// leases — a co-living guest's fixed-term, recurring-payment agreement for one
// or more rooms. STR nightly stays do NOT generate a lease (they use bookings).
//
// Lifecycle: DRAFT → PENDING_SIGNATURE → (signed) PENDING_FIRST_PAYMENT →
// (first payment succeeds) ACTIVE → COMPLETED. TERMINATED / DEFAULTED are
// off-ramps. A lease cannot reach ACTIVE until signature complete AND first
// payment succeeded (enforced in Phase 3/4 transitions).
//
// weeklyRateSnapshot freezes the rate at booking so a later room re-price never
// changes an existing lease. totalLeaseValue is the sum of all scheduled
// installments (rent only; late fees are separate).
// =============================================================================

export const leases = pgTable(
  "leases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id")
      .notNull()
      .references(() => properties.id),
    guestId: varchar("guest_id")
      .notNull()
      .references(() => guests.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(), // term ≤ 90 days, enforced in storage
    // "WEEKLY" | "BIWEEKLY" | "MONTHLY" — locked at booking, immutable for the term.
    paymentCadence: text("payment_cadence").notNull(),
    // Frozen weekly rate (sum across included rooms) at booking time.
    weeklyRateSnapshot: decimal("weekly_rate_snapshot", { precision: 10, scale: 2 }).notNull(),
    // Sum of all scheduled rent installments (rent only; excludes late fees).
    totalLeaseValue: decimal("total_lease_value", { precision: 12, scale: 2 }).notNull(),
    // Human-friendly note describing the final-installment proration, if any.
    prorationNote: text("proration_note"),
    // "DRAFT" | "PENDING_SIGNATURE" | "PENDING_FIRST_PAYMENT" | "ACTIVE" |
    // "COMPLETED" | "TERMINATED" | "DEFAULTED"
    status: text("status").notNull().default("DRAFT"),
    // --- E-signature capture (Phase 3) ---
    signedName: text("signed_name"),
    signedAt: timestamp("signed_at"),
    signedIp: text("signed_ip"),
    // URL the guest re-downloads their signed agreement from (the serve route).
    signedPdfUrl: text("signed_pdf_url"),
    // The rendered signed agreement (self-contained, print-to-PDF HTML), frozen
    // at signing time with the signature block, timestamp, and IP. Stored inline
    // (no external blob store wired yet). Reference-only; contains no card data.
    signedDocumentHtml: text("signed_document_html"),
    // --- Refundable security deposit (secures the room). Snapshotted at lease
    // creation from the included room(s) so a later re-price never changes a
    // signed lease. The deposit is the SECURING payment: paying it flips the
    // room(s) to OCCUPIED. It is held separately and never counted as rent. ---
    depositAmountSnapshot: decimal("deposit_amount_snapshot", { precision: 10, scale: 2 }),
    // "PENDING" | "PAID" | "REFUNDED" | "WAIVED"
    depositStatus: text("deposit_status").notNull().default("PENDING"),
    depositStripePaymentIntentId: text("deposit_stripe_payment_intent_id"),
    depositPaidAt: timestamp("deposit_paid_at"),
    // --- Tenant identity verification (driver's license review). The tenant
    // uploads a license from the portal; an admin reviews it against signedName
    // and APPROVES to activate the lease. The license image lives in R2 (private);
    // only the object key is stored here — no image bytes, no PII beyond the key. ---
    // One of VERIFICATION_STATUSES.
    verificationStatus: text("verification_status").notNull().default("NOT_SUBMITTED"),
    // R2 object key for the uploaded license (bnp/licenses/<leaseId>/<uuid>.<ext>).
    licenseR2Key: text("license_r2_key"),
    licenseUploadedAt: timestamp("license_uploaded_at"),
    verificationReviewedAt: timestamp("verification_reviewed_at"),
    // Admin id/email who approved or rejected.
    verificationReviewedBy: text("verification_reviewed_by"),
    // Reason surfaced to the tenant on rejection (why to re-upload).
    verificationRejectionReason: text("verification_rejection_reason"),
    // --- Saved payment method (Phase 4). Stripe REFERENCES only, never card data. ---
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
    // --- Guest portal access token (Phase 6). Random, unguessable; the guest's
    // self-serve link is /portal/<token>. Mirrors TRAD's tokenized preference
    // links — no full account needed. Additive. ---
    portalToken: text("portal_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("leases_property_idx").on(table.propertyId),
    guestIdx: index("leases_guest_idx").on(table.guestId),
    statusIdx: index("leases_status_idx").on(table.status),
  }),
);

export const insertLeaseSchema = createInsertSchema(leases, {
  paymentCadence: z.enum(PAYMENT_CADENCES),
  status: z.enum(LEASE_STATUSES).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Lease = typeof leases.$inferSelect;
export type InsertLease = z.infer<typeof insertLeaseSchema>;

// =============================================================================
// lease_rooms — join: a lease includes one or more rooms. Snapshots preserve the
// room number/name as they were at booking even if the room is later renamed.
// =============================================================================

export const leaseRooms = pgTable(
  "lease_rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id")
      .notNull()
      .references(() => leases.id),
    roomId: varchar("room_id")
      .notNull()
      .references(() => rooms.id),
    roomNumberSnapshot: text("room_number_snapshot"),
    roomNameSnapshot: text("room_name_snapshot").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("lease_rooms_lease_idx").on(table.leaseId),
    roomIdx: index("lease_rooms_room_idx").on(table.roomId),
  }),
);

export const insertLeaseRoomSchema = createInsertSchema(leaseRooms).omit({
  id: true,
  createdAt: true,
});

export type LeaseRoom = typeof leaseRooms.$inferSelect;
export type InsertLeaseRoom = z.infer<typeof insertLeaseRoomSchema>;

// =============================================================================
// vehicles — a tenant's vehicle for a lease (parking identification in a shared
// house). One row per lease (upsert by lease_id). hasVehicle=false means the
// tenant declared no vehicle and the car fields stay null. The optional vehicle
// photo lives in R2 (private); only the object key is stored here.
// =============================================================================

export const vehicles = pgTable(
  "vehicles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id")
      .notNull()
      .references(() => leases.id),
    // False when the tenant declares they have no vehicle (car fields null).
    hasVehicle: boolean("has_vehicle").notNull().default(true),
    make: text("make"),
    model: text("model"),
    year: integer("year"),
    color: text("color"),
    plate: text("plate"),
    // Two-letter US state/territory code (US_STATE_CODES).
    plateState: text("plate_state"),
    // R2 object key for an optional vehicle photo (bnp/vehicles/<leaseId>/<uuid>.<ext>).
    photoR2Key: text("photo_r2_key"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("vehicles_lease_idx").on(table.leaseId),
  }),
);

export const insertVehicleSchema = createInsertSchema(vehicles, {
  plateState: z.enum(US_STATE_CODES).nullish(),
  // Reasonable bounds; a plausible vehicle year range. Nullable (cleared when the
  // tenant declares no vehicle).
  year: z.number().int().min(1900).max(2100).nullish(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type Vehicle = typeof vehicles.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;

// =============================================================================
// payment_schedule — the installment plan generated from a lease's term +
// cadence. schedule_seq is 1-based; row 1 is always due on the booking date
// (first payment due on booking). Generated by shared/leaseSchedule.ts so the
// guest's preview and the persisted schedule are computed identically.
// =============================================================================

export const paymentSchedule = pgTable(
  "payment_schedule",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id")
      .notNull()
      .references(() => leases.id),
    scheduleSeq: integer("schedule_seq").notNull(), // 1-based
    dueDate: date("due_date").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    // "SCHEDULED" | "DUE" | "PAID" | "FAILED" | "LATE" | "WAIVED"
    status: text("status").notNull().default("SCHEDULED"),
    paidAt: timestamp("paid_at"),
    // "CARD_ON_FILE" | "MANUAL". CARD_ON_FILE rows are auto-charged by the
    // scheduler (Phase 4); MANUAL rows are settled by an admin "Mark Paid".
    paymentMethod: text("payment_method").notNull().default("CARD_ON_FILE"),
    // Stripe PaymentIntent id for this installment. Reference only, never a card.
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    // Free-text note for manual reconciliation (Zelle/CashApp/cash settlement).
    manualNote: text("manual_note"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("payment_schedule_lease_idx").on(table.leaseId),
    statusIdx: index("payment_schedule_status_idx").on(table.status),
    dueDateIdx: index("payment_schedule_due_date_idx").on(table.dueDate),
  }),
);

export const insertPaymentScheduleSchema = createInsertSchema(paymentSchedule, {
  status: z.enum(SCHEDULE_STATUSES).optional(),
  paymentMethod: z.enum(SCHEDULE_PAYMENT_METHODS).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type PaymentScheduleRow = typeof paymentSchedule.$inferSelect;
export type InsertPaymentScheduleRow = z.infer<typeof insertPaymentScheduleSchema>;

// =============================================================================
// late_fees — one row per day late, $25/day, accruing indefinitely (spec: no
// cap). Attaches to the payment_schedule installment it accrues against. When
// the installment is finally paid, accrued fees are billed as a SEPARATE
// line-item charge (payment_kind = LATE_FEE), never folded into rent (Phase 5).
// =============================================================================

export const lateFees = pgTable(
  "late_fees",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id")
      .notNull()
      .references(() => leases.id),
    scheduleSeq: integer("schedule_seq").notNull(), // the installment it attaches to
    accrualDate: date("accrual_date").notNull(), // the day this fee accrued for
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("25.00"),
    // "ACCRUED" | "BILLED" | "PAID" | "WAIVED"
    status: text("status").notNull().default("ACCRUED"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("late_fees_lease_idx").on(table.leaseId),
    statusIdx: index("late_fees_status_idx").on(table.status),
    // One late-fee row per (lease, installment, day) — guards the scheduler
    // against double-accruing on re-runs (idempotency, Phase 5/9).
    uniqueAccrual: index("late_fees_unique_accrual_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.accrualDate,
    ),
  }),
);

export const insertLateFeeSchema = createInsertSchema(lateFees, {
  status: z.enum(LATE_FEE_STATUSES).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type LateFee = typeof lateFees.$inferSelect;
export type InsertLateFee = z.infer<typeof insertLateFeeSchema>;

// =============================================================================
// notification_log — one row per notification SENT, keyed so the dunning
// scheduler is idempotent: a (lease, schedule_seq, kind, send_date) is sent at
// most once. Re-running the sweep on the same day never double-messages a guest.
// =============================================================================

export const notificationLog = pgTable(
  "notification_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull(),
    scheduleSeq: integer("schedule_seq"), // null for lease-level (e.g. DEFAULTED)
    // One of NOTIFICATION_KINDS.
    kind: text("kind").notNull(),
    // The calendar day (YYYY-MM-DD) this notification was sent for — part of the
    // dedupe key so daily messages send once per day but can repeat across days.
    sendDate: date("send_date").notNull(),
    emailSent: boolean("email_sent").notNull().default(false),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("notification_log_lease_idx").on(table.leaseId),
    dedupeIdx: index("notification_log_dedupe_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.kind,
      table.sendDate,
    ),
  }),
);

export const insertNotificationLogSchema = createInsertSchema(notificationLog).omit({
  id: true,
  createdAt: true,
});

export type NotificationLogRow = typeof notificationLog.$inferSelect;
export type InsertNotificationLogRow = z.infer<typeof insertNotificationLogSchema>;

// =============================================================================
// app_settings — small key/value store for admin-configurable values (e.g. the
// DEFAULTED threshold, manual-payment handles). Avoids magic numbers in code.
// =============================================================================

export const appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertAppSettingSchema = createInsertSchema(appSettings).omit({ updatedAt: true });

export type AppSetting = typeof appSettings.$inferSelect;
export type InsertAppSetting = z.infer<typeof insertAppSettingSchema>;

// =============================================================================
// uo_escalations — operational issues this app raises (failed payment, overdue,
// lease default) for Unified Ops to surface + resolve (Phase 8 write-backs). BNP
// owns the row; UO reads it and posts resolutions back over the API. No PII
// beyond the lease/guest linkage already in this DB.
// =============================================================================

export const uoEscalations = pgTable(
  "uo_escalations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull(),
    scheduleSeq: integer("schedule_seq"),
    // One of ESCALATION_KINDS.
    kind: text("kind").notNull(),
    // LOW | MEDIUM | HIGH
    severity: text("severity").notNull().default("MEDIUM"),
    // OPEN | ACKNOWLEDGED | RESOLVED
    status: text("status").notNull().default("OPEN"),
    detail: text("detail"),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: text("resolved_by"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("uo_escalations_lease_idx").on(table.leaseId),
    statusIdx: index("uo_escalations_status_idx").on(table.status),
    // Dedupe open escalations of the same kind for the same installment.
    openKindIdx: index("uo_escalations_open_kind_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.kind,
      table.status,
    ),
  }),
);

export const insertUoEscalationSchema = createInsertSchema(uoEscalations, {
  kind: z.enum(ESCALATION_KINDS),
  severity: z.enum(ESCALATION_SEVERITIES).optional(),
  status: z.enum(ESCALATION_STATUSES).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type UoEscalation = typeof uoEscalations.$inferSelect;
export type InsertUoEscalation = z.infer<typeof insertUoEscalationSchema>;

// =============================================================================
// guest_messages — threaded guest questions / maintenance requests (Phase 6).
// A thread is a root message (threadId = its own id) plus replies. authorRole
// distinguishes the guest from a staff/UO responder (Phase 8 write-back). status
// tracks the thread's lifecycle on the root row.
// =============================================================================

export const MESSAGE_AUTHOR_ROLES = ["GUEST", "STAFF"] as const;
export const MESSAGE_STATUSES = ["OPEN", "ANSWERED", "RESOLVED"] as const;
export const MESSAGE_CATEGORIES = ["QUESTION", "MAINTENANCE", "OTHER"] as const;

export const guestMessages = pgTable(
  "guest_messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull(),
    guestId: varchar("guest_id").notNull(),
    // The root message id of this thread (a root row points to itself).
    threadId: varchar("thread_id").notNull(),
    // "GUEST" | "STAFF"
    authorRole: text("author_role").notNull().default("GUEST"),
    // "QUESTION" | "MAINTENANCE" | "OTHER" (set on the root)
    category: text("category").notNull().default("QUESTION"),
    subject: text("subject"),
    body: text("body").notNull(),
    // Thread lifecycle, maintained on the root row: OPEN | ANSWERED | RESOLVED
    status: text("status").notNull().default("OPEN"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("guest_messages_lease_idx").on(table.leaseId),
    threadIdx: index("guest_messages_thread_idx").on(table.threadId),
    statusIdx: index("guest_messages_status_idx").on(table.status),
  }),
);

export const insertGuestMessageSchema = createInsertSchema(guestMessages, {
  authorRole: z.enum(MESSAGE_AUTHOR_ROLES).optional(),
  category: z.enum(MESSAGE_CATEGORIES).optional(),
  status: z.enum(MESSAGE_STATUSES).optional(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export type GuestMessage = typeof guestMessages.$inferSelect;
export type InsertGuestMessage = z.infer<typeof insertGuestMessageSchema>;

// =============================================================================
// lifecycle_events — the email_sends-equivalent spine (Phase 7). One row per
// lifecycle email per lease (+ schedule_seq for per-installment receipts), making
// every send idempotent: a given (lease, event_type, ref) is sent at most once.
// Mirrors TRAD's bookingEmailCoordinator record-keeping.
// =============================================================================

export const LIFECYCLE_EVENT_TYPES = [
  "DEPOSIT_RECEIPT", // on deposit paid — room secured (guest)
  "COLIVING_WELCOME", // on lease activation (guest)
  "COLIVING_SCHEDULE_RECAP", // on activation (guest) — full schedule
  "COLIVING_ADMIN_NEW_LEASE", // on activation (admin)
  "PAYMENT_RECEIPT", // per successful rent charge (uses schedule_seq)
  "LEASE_ENDING_SOON", // ~14 days before end_date
] as const;

export const LIFECYCLE_SEND_STATUSES = ["SENT", "SKIPPED", "FAILED"] as const;

/** Days before end_date to send the lease-ending notice (spec: ~14). */
export const LEASE_ENDING_NOTICE_DAYS = 14;

export const lifecycleEvents = pgTable(
  "lifecycle_events",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull(),
    // One of LIFECYCLE_EVENT_TYPES.
    eventType: text("event_type").notNull(),
    // For per-installment events (PAYMENT_RECEIPT); null otherwise.
    scheduleSeq: integer("schedule_seq"),
    // SENT | SKIPPED | FAILED
    status: text("status").notNull().default("SENT"),
    emailSent: boolean("email_sent").notNull().default(false),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    leaseIdx: index("lifecycle_events_lease_idx").on(table.leaseId),
    dedupeIdx: index("lifecycle_events_dedupe_idx").on(
      table.leaseId,
      table.eventType,
      table.scheduleSeq,
    ),
  }),
);

export const insertLifecycleEventSchema = createInsertSchema(lifecycleEvents).omit({
  id: true,
  createdAt: true,
});

export type LifecycleEvent = typeof lifecycleEvents.$inferSelect;
export type InsertLifecycleEvent = z.infer<typeof insertLifecycleEventSchema>;

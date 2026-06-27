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
  "PENDING_FIRST_PAYMENT", // signed; awaiting schedule_seq 1
  "ACTIVE", // signed AND first payment succeeded
  "COMPLETED", // term finished, fully paid
  "TERMINATED", // ended early
  "DEFAULTED", // unpaid past the default threshold
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

/** Flat daily late fee, in dollars (spec: $25/day, no cap). */
export const LATE_FEE_PER_DAY = 25.0;

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
    // "AVAILABLE" | "OCCUPIED" | "HOLD"
    status: text("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    propertyIdx: index("rooms_property_idx").on(table.propertyId),
    statusIdx: index("rooms_status_idx").on(table.status),
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
    // --- Saved payment method (Phase 4). Stripe REFERENCES only, never card data. ---
    stripeCustomerId: text("stripe_customer_id"),
    stripePaymentMethodId: text("stripe_payment_method_id"),
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

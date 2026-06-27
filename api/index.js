var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/index.ts
import "dotenv/config";

// server/app.ts
import express2 from "express";
import compression from "compression";
import helmet from "helmet";

// server/routes.ts
import express from "express";
import { z as z3 } from "zod";

// server/auth.ts
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// server/storage.ts
import { and, asc, desc, eq, inArray } from "drizzle-orm";

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  BOOKING_MODELS: () => BOOKING_MODELS,
  BOOKING_STATUSES: () => BOOKING_STATUSES,
  CADENCE_DAYS: () => CADENCE_DAYS,
  CADENCE_WEEKS: () => CADENCE_WEEKS,
  DEFAULT_DEFAULTED_THRESHOLD_DAYS: () => DEFAULT_DEFAULTED_THRESHOLD_DAYS,
  ESCALATION_KINDS: () => ESCALATION_KINDS,
  ESCALATION_SEVERITIES: () => ESCALATION_SEVERITIES,
  ESCALATION_STATUSES: () => ESCALATION_STATUSES,
  LATE_FEE_PER_DAY: () => LATE_FEE_PER_DAY,
  LATE_FEE_STATUSES: () => LATE_FEE_STATUSES,
  LEASE_STATUSES: () => LEASE_STATUSES,
  MAX_LEASE_DAYS: () => MAX_LEASE_DAYS,
  NOTIFICATION_KINDS: () => NOTIFICATION_KINDS,
  OVERDUE_MESSAGE_DAYS: () => OVERDUE_MESSAGE_DAYS,
  PAYMENT_CADENCES: () => PAYMENT_CADENCES,
  PAYMENT_METHODS: () => PAYMENT_METHODS,
  PAYMENT_STATUSES: () => PAYMENT_STATUSES,
  PAYMENT_TYPES: () => PAYMENT_TYPES,
  PROPERTY_ENTITIES: () => PROPERTY_ENTITIES,
  PROPERTY_TYPES: () => PROPERTY_TYPES,
  ROOM_STATUSES: () => ROOM_STATUSES,
  SCHEDULE_PAYMENT_METHODS: () => SCHEDULE_PAYMENT_METHODS,
  SCHEDULE_STATUSES: () => SCHEDULE_STATUSES,
  adminUsers: () => adminUsers,
  appSettings: () => appSettings,
  bookings: () => bookings,
  guests: () => guests,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertAppSettingSchema: () => insertAppSettingSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertGuestSchema: () => insertGuestSchema,
  insertKpiSnapshotSchema: () => insertKpiSnapshotSchema,
  insertLateFeeSchema: () => insertLateFeeSchema,
  insertLeaseRoomSchema: () => insertLeaseRoomSchema,
  insertLeaseSchema: () => insertLeaseSchema,
  insertNotificationLogSchema: () => insertNotificationLogSchema,
  insertPaymentScheduleSchema: () => insertPaymentScheduleSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertUoEscalationSchema: () => insertUoEscalationSchema,
  kpiSnapshots: () => kpiSnapshots,
  lateFees: () => lateFees,
  leaseRooms: () => leaseRooms,
  leases: () => leases,
  notificationLog: () => notificationLog,
  paymentSchedule: () => paymentSchedule,
  payments: () => payments,
  properties: () => properties,
  rooms: () => rooms,
  subscriptions: () => subscriptions,
  uoEscalations: () => uoEscalations
});
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
  index
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
var PROPERTY_TYPES = ["STR", "COLIVING"];
var ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "HOLD"];
var BOOKING_MODELS = ["STR", "COLIVING"];
var BOOKING_STATUSES = [
  "PENDING_PAYMENT",
  "CONFIRMED",
  "ACTIVE",
  "COMPLETED",
  "CANCELLED"
];
var PAYMENT_METHODS = ["STRIPE", "CASHAPP", "ZELLE"];
var PAYMENT_TYPES = ["DEPOSIT", "WEEKLY", "ONE_TIME"];
var PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED"];
var PROPERTY_ENTITIES = ["TRAD", "BNP"];
var PAYMENT_CADENCES = ["WEEKLY", "BIWEEKLY", "MONTHLY"];
var LEASE_STATUSES = [
  "DRAFT",
  // created, not yet signed
  "PENDING_SIGNATURE",
  // presented to guest for signature
  "PENDING_FIRST_PAYMENT",
  // signed; awaiting schedule_seq 1
  "ACTIVE",
  // signed AND first payment succeeded
  "COMPLETED",
  // term finished, fully paid
  "TERMINATED",
  // ended early
  "DEFAULTED"
  // unpaid past the default threshold
];
var SCHEDULE_STATUSES = [
  "SCHEDULED",
  // future, not yet due
  "DUE",
  // due today / past due, not yet charged
  "PAID",
  "FAILED",
  // card-on-file charge declined
  "LATE",
  // past due with accruing late fees
  "WAIVED"
  // admin waived this installment
];
var SCHEDULE_PAYMENT_METHODS = ["CARD_ON_FILE", "MANUAL"];
var LATE_FEE_STATUSES = ["ACCRUED", "BILLED", "PAID", "WAIVED"];
var CADENCE_WEEKS = {
  WEEKLY: 1,
  BIWEEKLY: 2,
  MONTHLY: 4
};
var CADENCE_DAYS = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 28
};
var MAX_LEASE_DAYS = 90;
var LATE_FEE_PER_DAY = 25;
var NOTIFICATION_KINDS = [
  "REMINDER_7D",
  // 7 days before due
  "REMINDER_3D",
  // 3 days before due
  "REMINDER_DUE",
  // day of
  "PAYMENT_FAILED",
  // card-on-file decline → fix-card link
  "OVERDUE_1",
  // day after due, day 1 of 3
  "OVERDUE_2",
  "OVERDUE_3",
  "LATE_FEE_BILLED",
  "DEFAULTED"
];
var ESCALATION_KINDS = ["PAYMENT_FAILED", "PAYMENT_OVERDUE", "LEASE_DEFAULTED"];
var ESCALATION_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];
var ESCALATION_SEVERITIES = ["LOW", "MEDIUM", "HIGH"];
var DEFAULT_DEFAULTED_THRESHOLD_DAYS = 7;
var OVERDUE_MESSAGE_DAYS = 3;
var properties = pgTable("properties", {
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
  photos: jsonb("photos").$type().default(sql`'[]'::jsonb`),
  // string[] of amenity labels.
  amenities: jsonb("amenities").$type().default(sql`'[]'::jsonb`),
  // STR nightly base price. Null/0 for COLIVING parents (priced per-room).
  basePrice: decimal("base_price", { precision: 10, scale: 2 }),
  cleaningFee: decimal("cleaning_fee", { precision: 10, scale: 2 }).default("0"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertPropertySchema = createInsertSchema(properties, {
  type: z.enum(PROPERTY_TYPES),
  entity: z.enum(PROPERTY_ENTITIES).optional(),
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var rooms = pgTable(
  "rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(),
    // Human room number/label used in the Stripe metadata contract (room_number),
    // e.g. "2". Optional so STR conversions and legacy rows don't break. Additive.
    roomNumber: text("room_number"),
    description: text("description"),
    photos: jsonb("photos").$type().default(sql`'[]'::jsonb`),
    weeklyRent: decimal("weekly_rent", { precision: 10, scale: 2 }).notNull(),
    depositAmount: decimal("deposit_amount", { precision: 10, scale: 2 }).notNull(),
    // "AVAILABLE" | "OCCUPIED" | "HOLD"
    status: text("status").notNull().default("AVAILABLE"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    propertyIdx: index("rooms_property_idx").on(table.propertyId),
    statusIdx: index("rooms_status_idx").on(table.status)
  })
);
var insertRoomSchema = createInsertSchema(rooms, {
  status: z.enum(ROOM_STATUSES),
  photos: z.array(z.string()).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var guests = pgTable(
  "guests",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    emailIdx: index("guests_email_idx").on(table.email)
  })
);
var insertGuestSchema = createInsertSchema(guests, {
  email: z.string().email()
}).omit({ id: true, createdAt: true, updatedAt: true });
var bookings = pgTable(
  "bookings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id").notNull().references(() => properties.id),
    // Null for whole-property (STR) bookings.
    roomId: varchar("room_id").references(() => rooms.id),
    guestId: varchar("guest_id").notNull().references(() => guests.id),
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    propertyIdx: index("bookings_property_idx").on(table.propertyId),
    roomIdx: index("bookings_room_idx").on(table.roomId),
    guestIdx: index("bookings_guest_idx").on(table.guestId),
    statusIdx: index("bookings_status_idx").on(table.status),
    referenceIdx: index("bookings_reference_idx").on(table.reference)
  })
);
var insertBookingSchema = createInsertSchema(bookings, {
  model: z.enum(BOOKING_MODELS),
  status: z.enum(BOOKING_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS)
}).omit({ id: true, createdAt: true, updatedAt: true });
var payments = pgTable(
  "payments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").notNull().references(() => bookings.id),
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    bookingIdx: index("payments_booking_idx").on(table.bookingId),
    statusIdx: index("payments_status_idx").on(table.status),
    stripeRefIdx: index("payments_stripe_ref_idx").on(table.stripeRef)
  })
);
var insertPaymentSchema = createInsertSchema(payments, {
  type: z.enum(PAYMENT_TYPES),
  method: z.enum(PAYMENT_METHODS),
  status: z.enum(PAYMENT_STATUSES)
}).omit({ id: true, createdAt: true, updatedAt: true });
var subscriptions = pgTable(
  "subscriptions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    bookingId: varchar("booking_id").notNull().references(() => bookings.id),
    // Stripe subscription id — reference only.
    stripeSubscriptionId: text("stripe_subscription_id").notNull(),
    weeklyAmount: decimal("weekly_amount", { precision: 10, scale: 2 }).notNull(),
    // Mirrors Stripe's subscription status string (active, past_due, canceled, …).
    status: text("status").notNull(),
    nextChargeAt: timestamp("next_charge_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    bookingIdx: index("subscriptions_booking_idx").on(table.bookingId),
    stripeSubIdx: index("subscriptions_stripe_sub_idx").on(table.stripeSubscriptionId)
  })
);
var insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var kpiSnapshots = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    snapshotDateIdx: index("kpi_snapshots_date_idx").on(table.snapshotDate),
    pushedIdx: index("kpi_snapshots_pushed_idx").on(table.pushedToUo)
  })
);
var insertKpiSnapshotSchema = createInsertSchema(kpiSnapshots).omit({
  id: true,
  createdAt: true
});
var adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  // Hashed password (never plaintext). Hashing happens in the auth layer.
  password: text("password").notNull(),
  name: text("name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertAdminUserSchema = createInsertSchema(adminUsers, {
  email: z.string().email()
}).omit({ id: true, createdAt: true, updatedAt: true });
var leases = pgTable(
  "leases",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id").notNull().references(() => properties.id),
    guestId: varchar("guest_id").notNull().references(() => guests.id),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    // term ≤ 90 days, enforced in storage
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    propertyIdx: index("leases_property_idx").on(table.propertyId),
    guestIdx: index("leases_guest_idx").on(table.guestId),
    statusIdx: index("leases_status_idx").on(table.status)
  })
);
var insertLeaseSchema = createInsertSchema(leases, {
  paymentCadence: z.enum(PAYMENT_CADENCES),
  status: z.enum(LEASE_STATUSES).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var leaseRooms = pgTable(
  "lease_rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull().references(() => leases.id),
    roomId: varchar("room_id").notNull().references(() => rooms.id),
    roomNumberSnapshot: text("room_number_snapshot"),
    roomNameSnapshot: text("room_name_snapshot").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("lease_rooms_lease_idx").on(table.leaseId),
    roomIdx: index("lease_rooms_room_idx").on(table.roomId)
  })
);
var insertLeaseRoomSchema = createInsertSchema(leaseRooms).omit({
  id: true,
  createdAt: true
});
var paymentSchedule = pgTable(
  "payment_schedule",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull().references(() => leases.id),
    scheduleSeq: integer("schedule_seq").notNull(),
    // 1-based
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("payment_schedule_lease_idx").on(table.leaseId),
    statusIdx: index("payment_schedule_status_idx").on(table.status),
    dueDateIdx: index("payment_schedule_due_date_idx").on(table.dueDate)
  })
);
var insertPaymentScheduleSchema = createInsertSchema(paymentSchedule, {
  status: z.enum(SCHEDULE_STATUSES).optional(),
  paymentMethod: z.enum(SCHEDULE_PAYMENT_METHODS).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var lateFees = pgTable(
  "late_fees",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull().references(() => leases.id),
    scheduleSeq: integer("schedule_seq").notNull(),
    // the installment it attaches to
    accrualDate: date("accrual_date").notNull(),
    // the day this fee accrued for
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("25.00"),
    // "ACCRUED" | "BILLED" | "PAID" | "WAIVED"
    status: text("status").notNull().default("ACCRUED"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("late_fees_lease_idx").on(table.leaseId),
    statusIdx: index("late_fees_status_idx").on(table.status),
    // One late-fee row per (lease, installment, day) — guards the scheduler
    // against double-accruing on re-runs (idempotency, Phase 5/9).
    uniqueAccrual: index("late_fees_unique_accrual_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.accrualDate
    )
  })
);
var insertLateFeeSchema = createInsertSchema(lateFees, {
  status: z.enum(LATE_FEE_STATUSES).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var notificationLog = pgTable(
  "notification_log",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull(),
    scheduleSeq: integer("schedule_seq"),
    // null for lease-level (e.g. DEFAULTED)
    // One of NOTIFICATION_KINDS.
    kind: text("kind").notNull(),
    // The calendar day (YYYY-MM-DD) this notification was sent for — part of the
    // dedupe key so daily messages send once per day but can repeat across days.
    sendDate: date("send_date").notNull(),
    emailSent: boolean("email_sent").notNull().default(false),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("notification_log_lease_idx").on(table.leaseId),
    dedupeIdx: index("notification_log_dedupe_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.kind,
      table.sendDate
    )
  })
);
var insertNotificationLogSchema = createInsertSchema(notificationLog).omit({
  id: true,
  createdAt: true
});
var appSettings = pgTable("app_settings", {
  key: varchar("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var insertAppSettingSchema = createInsertSchema(appSettings).omit({ updatedAt: true });
var uoEscalations = pgTable(
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("uo_escalations_lease_idx").on(table.leaseId),
    statusIdx: index("uo_escalations_status_idx").on(table.status),
    // Dedupe open escalations of the same kind for the same installment.
    openKindIdx: index("uo_escalations_open_kind_idx").on(
      table.leaseId,
      table.scheduleSeq,
      table.kind,
      table.status
    )
  })
);
var insertUoEscalationSchema = createInsertSchema(uoEscalations, {
  kind: z.enum(ESCALATION_KINDS),
  severity: z.enum(ESCALATION_SEVERITIES).optional(),
  status: z.enum(ESCALATION_STATUSES).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });

// server/db.ts
var databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Point it at a Neon test branch (see .env.example)."
  );
}
var sql2 = neon(databaseUrl);
var db = drizzle({ client: sql2, schema: schema_exports });

// shared/leaseSchedule.ts
var ScheduleError = class extends Error {
};
var roundCurrency = (v) => Math.round(v * 100) / 100;
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
function parseYmd(ymd2) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd2);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd2}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
function toYmd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(ymd2, days) {
  return toYmd(new Date(parseYmd(ymd2).getTime() + days * MS_PER_DAY));
}
function inclusiveDays(startDate, endDate) {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
}
function generateSchedule(input) {
  const { startDate, endDate, cadence, weeklyRate, roomCount } = input;
  if (!(roomCount >= 1)) throw new ScheduleError("roomCount must be at least 1");
  if (!(weeklyRate > 0)) throw new ScheduleError("weeklyRate must be positive");
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end.getTime() < start.getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }
  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }
  const periodDays = CADENCE_DAYS[cadence];
  const fullPeriodAmount = roundCurrency(weeklyRate * CADENCE_WEEKS[cadence] * roomCount);
  const perDayRate = weeklyRate * roomCount / 7;
  const installments = [];
  let seq = 1;
  let cursor = startDate;
  let remainingDays = totalDays;
  while (remainingDays > 0) {
    if (remainingDays >= periodDays) {
      installments.push({
        seq,
        dueDate: cursor,
        amount: fullPeriodAmount,
        prorated: false,
        daysCovered: periodDays
      });
      remainingDays -= periodDays;
      cursor = addDays(cursor, periodDays);
    } else {
      installments.push({
        seq,
        dueDate: cursor,
        amount: roundCurrency(perDayRate * remainingDays),
        prorated: true,
        daysCovered: remainingDays
      });
      remainingDays = 0;
    }
    seq += 1;
  }
  const totalLeaseValue = roundCurrency(
    installments.reduce((sum, i) => sum + i.amount, 0)
  );
  const fullCount = installments.filter((i) => !i.prorated).length;
  const finalProrated = installments.find((i) => i.prorated);
  const prorationNote = finalProrated ? `${fullCount} full ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, plus a final prorated installment of $${finalProrated.amount.toFixed(2)} covering ${finalProrated.daysCovered} day(s). First payment due on the booking date.` : `${fullCount} ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, no proration. First payment due on the booking date.`;
  return { installments, totalLeaseValue, prorationNote, totalDays };
}

// server/storage.ts
var ROOM_BLOCKING_LEASE_STATUSES = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "PENDING_FIRST_PAYMENT",
  "ACTIVE"
];
var StorageError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
var Storage = class {
  // --- Properties ---
  async getProperties(opts) {
    if (opts?.activeOnly) {
      return db.select().from(properties).where(eq(properties.active, true));
    }
    return db.select().from(properties);
  }
  async getProperty(id) {
    const [row] = await db.select().from(properties).where(eq(properties.id, id));
    return row;
  }
  async createProperty(data) {
    const [row] = await db.insert(properties).values(data).returning();
    return row;
  }
  async updateProperty(id, updates) {
    const [row] = await db.update(properties).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(properties.id, id)).returning();
    return row;
  }
  // --- Rooms ---
  async getRoomsByProperty(propertyId) {
    return db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }
  async getRoom(id) {
    const [row] = await db.select().from(rooms).where(eq(rooms.id, id));
    return row;
  }
  async createRoom(data) {
    const [row] = await db.insert(rooms).values(data).returning();
    return row;
  }
  async updateRoom(id, updates) {
    const [row] = await db.update(rooms).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(rooms.id, id)).returning();
    return row;
  }
  // --- Guests ---
  async getGuest(id) {
    const [row] = await db.select().from(guests).where(eq(guests.id, id));
    return row;
  }
  async getGuestByEmail(email) {
    const [row] = await db.select().from(guests).where(eq(guests.email, email));
    return row;
  }
  async upsertGuestByEmail(data) {
    const existing = await this.getGuestByEmail(data.email);
    if (existing) {
      const [row2] = await db.update(guests).set({ ...data, updatedAt: /* @__PURE__ */ new Date() }).where(eq(guests.id, existing.id)).returning();
      return row2;
    }
    const [row] = await db.insert(guests).values(data).returning();
    return row;
  }
  // --- Bookings ---
  async getBooking(id) {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
    return row;
  }
  async getBookingByReference(reference) {
    const [row] = await db.select().from(bookings).where(eq(bookings.reference, reference));
    return row;
  }
  async getBookings(opts) {
    if (opts?.status) {
      return db.select().from(bookings).where(eq(bookings.status, opts.status)).orderBy(desc(bookings.createdAt));
    }
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }
  async createBooking(data) {
    const [row] = await db.insert(bookings).values(data).returning();
    return row;
  }
  async updateBooking(id, updates) {
    const [row] = await db.update(bookings).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookings.id, id)).returning();
    return row;
  }
  // --- Payments ---
  async getPayment(id) {
    const [row] = await db.select().from(payments).where(eq(payments.id, id));
    return row;
  }
  async getPaymentsByBooking(bookingId) {
    return db.select().from(payments).where(eq(payments.bookingId, bookingId)).orderBy(desc(payments.createdAt));
  }
  async getPaymentByStripeRef(stripeRef) {
    const [row] = await db.select().from(payments).where(eq(payments.stripeRef, stripeRef));
    return row;
  }
  async getPendingManualPayments() {
    return db.select().from(payments).where(eq(payments.status, "PENDING")).orderBy(desc(payments.createdAt));
  }
  async createPayment(data) {
    const [row] = await db.insert(payments).values(data).returning();
    return row;
  }
  async updatePayment(id, updates) {
    const [row] = await db.update(payments).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(payments.id, id)).returning();
    return row;
  }
  // --- Subscriptions ---
  async getSubscriptionByBooking(bookingId) {
    const [row] = await db.select().from(subscriptions).where(eq(subscriptions.bookingId, bookingId));
    return row;
  }
  async getSubscriptionByStripeId(stripeSubscriptionId) {
    const [row] = await db.select().from(subscriptions).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return row;
  }
  async createSubscription(data) {
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
  }
  async updateSubscription(id, updates) {
    const [row] = await db.update(subscriptions).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(subscriptions.id, id)).returning();
    return row;
  }
  // --- KPI snapshots ---
  async getUnpushedSnapshots() {
    return db.select().from(kpiSnapshots).where(eq(kpiSnapshots.pushedToUo, false));
  }
  async createSnapshot(data) {
    const [row] = await db.insert(kpiSnapshots).values(data).returning();
    return row;
  }
  async markSnapshotPushed(id, pushedAt) {
    await db.update(kpiSnapshots).set({ pushedToUo: true, pushedAt }).where(eq(kpiSnapshots.id, id));
  }
  // --- Admin users ---
  async getAdminByEmail(email) {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return row;
  }
  async getAdmin(id) {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return row;
  }
  async createAdmin(data) {
    const [row] = await db.insert(adminUsers).values(data).returning();
    return row;
  }
  // --- Leases ---
  async getLease(id) {
    const [row] = await db.select().from(leases).where(eq(leases.id, id));
    return row;
  }
  async getLeases(opts) {
    const filters = [];
    if (opts?.status) filters.push(eq(leases.status, opts.status));
    if (opts?.guestId) filters.push(eq(leases.guestId, opts.guestId));
    if (opts?.propertyId) filters.push(eq(leases.propertyId, opts.propertyId));
    const q = db.select().from(leases).orderBy(desc(leases.createdAt));
    return filters.length ? q.where(and(...filters)) : q;
  }
  async createLeaseWithSchedule(args) {
    if (args.rooms.length < 1) {
      throw new StorageError("A lease must include at least one room");
    }
    const days = inclusiveDays(args.lease.startDate, args.lease.endDate);
    if (days > MAX_LEASE_DAYS) {
      throw new StorageError(
        `Lease term ${days} days exceeds the ${MAX_LEASE_DAYS}-day maximum`,
        422
      );
    }
    for (const lr of args.rooms) {
      const free = await this.isRoomAvailableForRange({
        roomId: lr.roomId,
        startDate: args.lease.startDate,
        endDate: args.lease.endDate
      });
      if (!free) {
        throw new StorageError(
          `Room ${lr.roomNameSnapshot} is already booked for an overlapping date range`,
          409
        );
      }
    }
    const [lease] = await db.insert(leases).values(args.lease).returning();
    if (args.rooms.length) {
      await db.insert(leaseRooms).values(args.rooms.map((r) => ({ ...r, leaseId: lease.id })));
    }
    if (args.schedule.length) {
      await db.insert(paymentSchedule).values(args.schedule.map((s) => ({ ...s, leaseId: lease.id })));
    }
    return lease;
  }
  async updateLease(id, updates) {
    const [row] = await db.update(leases).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(leases.id, id)).returning();
    return row;
  }
  async getLeaseRooms(leaseId) {
    return db.select().from(leaseRooms).where(eq(leaseRooms.leaseId, leaseId));
  }
  // --- Payment schedule ---
  async getScheduleByLease(leaseId) {
    return db.select().from(paymentSchedule).where(eq(paymentSchedule.leaseId, leaseId)).orderBy(asc(paymentSchedule.scheduleSeq));
  }
  async getScheduleRow(id) {
    const [row] = await db.select().from(paymentSchedule).where(eq(paymentSchedule.id, id));
    return row;
  }
  async updateScheduleRow(id, updates) {
    const [row] = await db.update(paymentSchedule).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(paymentSchedule.id, id)).returning();
    return row;
  }
  // --- Late fees ---
  async getLateFeesByLease(leaseId) {
    return db.select().from(lateFees).where(eq(lateFees.leaseId, leaseId)).orderBy(asc(lateFees.accrualDate));
  }
  async createLateFee(data) {
    const [row] = await db.insert(lateFees).values(data).returning();
    return row;
  }
  async updateLateFee(id, updates) {
    const [row] = await db.update(lateFees).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(lateFees.id, id)).returning();
    return row;
  }
  async accrueLateFeeOnce(args) {
    const [existing] = await db.select().from(lateFees).where(
      and(
        eq(lateFees.leaseId, args.leaseId),
        eq(lateFees.scheduleSeq, args.scheduleSeq),
        eq(lateFees.accrualDate, args.accrualDate)
      )
    );
    if (existing) return null;
    const [row] = await db.insert(lateFees).values({
      leaseId: args.leaseId,
      scheduleSeq: args.scheduleSeq,
      accrualDate: args.accrualDate,
      amount: String(args.amount),
      status: "ACCRUED"
    }).returning();
    return row;
  }
  async getAccruedLateFeesForSchedule(leaseId, scheduleSeq) {
    return db.select().from(lateFees).where(
      and(
        eq(lateFees.leaseId, leaseId),
        eq(lateFees.scheduleSeq, scheduleSeq),
        eq(lateFees.status, "ACCRUED")
      )
    );
  }
  // --- Notification log ---
  async hasNotification(args) {
    const conds = [
      eq(notificationLog.leaseId, args.leaseId),
      eq(notificationLog.kind, args.kind),
      eq(notificationLog.sendDate, args.sendDate)
    ];
    if (args.scheduleSeq === null) {
      const rows2 = await db.select().from(notificationLog).where(and(...conds));
      return rows2.some((r) => r.scheduleSeq === null);
    }
    conds.push(eq(notificationLog.scheduleSeq, args.scheduleSeq));
    const rows = await db.select().from(notificationLog).where(and(...conds));
    return rows.length > 0;
  }
  async recordNotification(data) {
    const [row] = await db.insert(notificationLog).values(data).returning();
    return row;
  }
  // --- App settings ---
  async getSetting(key) {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row;
  }
  async getSettingNumber(key, fallback) {
    const row = await this.getSetting(key);
    if (!row) return fallback;
    const n = parseInt(row.value, 10);
    return Number.isFinite(n) ? n : fallback;
  }
  async setSetting(key, value) {
    const existing = await this.getSetting(key);
    if (existing) {
      const [row2] = await db.update(appSettings).set({ value, updatedAt: /* @__PURE__ */ new Date() }).where(eq(appSettings.key, key)).returning();
      return row2;
    }
    const [row] = await db.insert(appSettings).values({ key, value }).returning();
    return row;
  }
  // --- UO escalations ---
  async getEscalations(opts) {
    const filters = [];
    if (opts?.status) filters.push(eq(uoEscalations.status, opts.status));
    if (opts?.leaseId) filters.push(eq(uoEscalations.leaseId, opts.leaseId));
    const q = db.select().from(uoEscalations).orderBy(desc(uoEscalations.createdAt));
    return filters.length ? q.where(and(...filters)) : q;
  }
  async raiseEscalationOnce(data) {
    const conds = [
      eq(uoEscalations.leaseId, data.leaseId),
      eq(uoEscalations.kind, data.kind),
      eq(uoEscalations.status, "OPEN")
    ];
    const open = await db.select().from(uoEscalations).where(and(...conds));
    const seq = data.scheduleSeq ?? null;
    if (open.some((e) => (e.scheduleSeq ?? null) === seq)) return null;
    const [row] = await db.insert(uoEscalations).values(data).returning();
    return row;
  }
  async updateEscalation(id, updates) {
    const [row] = await db.update(uoEscalations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(uoEscalations.id, id)).returning();
    return row;
  }
  async isRoomAvailableForRange(args) {
    const links = await db.select({ leaseId: leaseRooms.leaseId }).from(leaseRooms).where(eq(leaseRooms.roomId, args.roomId));
    const leaseIds = links.map((l) => l.leaseId).filter((id) => id !== args.excludeLeaseId);
    if (leaseIds.length === 0) return true;
    const blocking = await db.select().from(leases).where(
      and(
        inArray(leases.id, leaseIds),
        inArray(leases.status, [...ROOM_BLOCKING_LEASE_STATUSES])
      )
    );
    return !blocking.some(
      (l) => args.startDate <= l.endDate && l.startDate <= args.endDate
    );
  }
  // --- Aggregates ---
  async getKpiAggregates() {
    const allBookings = await db.select().from(bookings);
    const allRooms = await db.select().from(rooms);
    const paidPayments = await db.select().from(payments).where(eq(payments.status, "PAID"));
    const liveStatuses = /* @__PURE__ */ new Set(["CONFIRMED", "ACTIVE"]);
    const bookingCount = allBookings.filter((b) => b.status !== "CANCELLED").length;
    const roomsOccupied = allRooms.filter((r) => r.status === "OCCUPIED").length;
    const occupancyPct = allRooms.length > 0 ? Math.round(roomsOccupied / allRooms.length * 1e4) / 100 : 0;
    const revenueTotal = Math.round(
      paidPayments.reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge), 0) * 100
    ) / 100;
    const todayMs = Date.now();
    const weekMs = todayMs + 7 * 24 * 60 * 60 * 1e3;
    const upcomingCheckIns = allBookings.filter((b) => {
      if (!liveStatuses.has(b.status)) return false;
      const ci = new Date(b.checkIn).getTime();
      return ci >= todayMs && ci <= weekMs;
    }).length;
    return { bookingCount, occupancyPct, revenueTotal, roomsOccupied, upcomingCheckIns };
  }
};
var storage = new Storage();

// server/auth.ts
var scryptAsync = promisify(scrypt);
async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}
async function verifyPassword(password, stored) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = await scryptAsync(password, salt, 64);
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}
async function ensureBootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await storage.getAdminByEmail(email);
  if (existing) return;
  await storage.createAdmin({
    email,
    password: await hashPassword(password),
    name: "BNP Admin"
  });
}
async function setupAuth(app) {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "admin_sessions"
  });
  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bnp-dev-only-secret",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1e3
        // 24h
      }
    })
  );
  app.use(passport.initialize());
  app.use(passport.session());
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const admin = await storage.getAdminByEmail(email);
          if (!admin) return done(null, false);
          const ok = await verifyPassword(password, admin.password);
          if (!ok) return done(null, false);
          return done(null, { id: admin.id, email: admin.email, name: admin.name });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const admin = await storage.getAdmin(id);
      if (!admin) return done(null, false);
      done(null, { id: admin.id, email: admin.email, name: admin.name });
    } catch (err) {
      done(err);
    }
  });
  ensureBootstrapAdmin().catch(
    (err) => console.warn("[auth] bootstrap admin skipped:", err?.message ?? err)
  );
  app.post("/api/admin/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });
  app.post("/api/admin/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ ok: true });
    });
  });
  app.get("/api/admin/me", (req, res) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: req.user });
  });
}
var requireAdmin = (req, res, next) => {
  if (req.isAuthenticated?.()) return next();
  res.status(401).json({ message: "Admin authentication required" });
};

// shared/api-types.ts
import { z as z2 } from "zod";
var quoteRequestSchema = z2.object({
  propertyId: z2.string().min(1),
  roomId: z2.string().optional(),
  // required for COLIVING
  checkIn: z2.string().optional(),
  // YYYY-MM-DD, required for STR
  checkOut: z2.string().optional(),
  // YYYY-MM-DD, required for STR
  paymentMethod: z2.enum(PAYMENT_METHODS)
}).refine((d) => d.roomId || d.checkIn && d.checkOut, {
  message: "STR bookings need checkIn+checkOut; co-living needs a roomId"
});
var createBookingSchema = z2.object({
  propertyId: z2.string().min(1),
  roomId: z2.string().optional(),
  checkIn: z2.string().optional(),
  checkOut: z2.string().optional(),
  paymentMethod: z2.enum(PAYMENT_METHODS),
  guest: z2.object({
    name: z2.string().min(1, "Name required"),
    email: z2.string().email("Valid email required"),
    phone: z2.string().optional()
  })
}).refine((d) => d.roomId || d.checkIn && d.checkOut, {
  message: "STR bookings need checkIn+checkOut; co-living needs a roomId"
});
var leaseQuoteRequestSchema = z2.object({
  propertyId: z2.string().min(1),
  // One or more rooms in the same property (co-living can rent multiple rooms).
  roomIds: z2.array(z2.string().min(1)).min(1, "Select at least one room"),
  startDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  endDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  cadence: z2.enum(PAYMENT_CADENCES)
});
var createDraftLeaseSchema = z2.object({
  propertyId: z2.string().min(1),
  roomIds: z2.array(z2.string().min(1)).min(1, "Select at least one room"),
  startDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cadence: z2.enum(PAYMENT_CADENCES),
  guest: z2.object({
    name: z2.string().min(1, "Name required"),
    email: z2.string().email("Valid email required"),
    phone: z2.string().optional()
  })
});
var signLeaseSchema = z2.object({
  leaseId: z2.string().min(1),
  signedName: z2.string().min(2, "Type your full legal name"),
  affirmed: z2.literal(true, {
    errorMap: () => ({ message: "You must affirm the agreement to sign" })
  })
});

// server/lib/booking.ts
import { customAlphabet } from "nanoid";
import { differenceInCalendarDays, parseISO } from "date-fns";

// shared/pricing.ts
var CREDIT_CARD_RATE = 0.035;
var TAX_RATE = 0;
var DEFAULT_CLEANING_FEE = 0;
var roundCurrency2 = (v) => Math.round(v * 100) / 100;
var calculateBreakdown = ({
  baseAmount,
  cleaningFee = DEFAULT_CLEANING_FEE,
  extrasTotal = 0,
  promoDiscount = 0,
  paymentMethod
}) => {
  const cf = roundCurrency2(cleaningFee);
  const extras = roundCurrency2(extrasTotal);
  const discount = roundCurrency2(Math.max(0, promoDiscount));
  const subtotal = roundCurrency2(Math.max(0, baseAmount + cf + extras - discount));
  const tax = roundCurrency2(subtotal * TAX_RATE);
  const surcharge = paymentMethod === "STRIPE" ? roundCurrency2((subtotal + tax) * CREDIT_CARD_RATE) : 0;
  const total = roundCurrency2(subtotal + tax + surcharge);
  return {
    baseAmount: roundCurrency2(baseAmount),
    cleaningFee: cf,
    extrasTotal: extras,
    discount,
    subtotal,
    tax,
    surcharge,
    total
  };
};
var calculateWeeklyCharge = (weeklyRent, paymentMethod) => calculateBreakdown({ baseAmount: weeklyRent, paymentMethod });

// server/lib/booking.ts
var nanoref = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);
function generateReference() {
  const raw = nanoref();
  return `BNP-${raw.slice(0, 4)}-${raw.slice(4)}`;
}
function nights(checkIn, checkOut) {
  const n = differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
  return Math.max(0, n);
}
function strBaseTotal(property, n) {
  const nightly = property.basePrice ? parseFloat(property.basePrice) : 0;
  return nightly * n;
}
var BookingError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function strHasConflict(propertyId, checkIn, checkOut) {
  const existing = await storage.getBookings();
  const inMs = parseISO(checkIn).getTime();
  const outMs = parseISO(checkOut).getTime();
  return existing.some((b) => {
    if (b.propertyId !== propertyId || b.model !== "STR") return false;
    if (b.status === "CANCELLED") return false;
    if (!b.checkOut) return false;
    const bIn = parseISO(b.checkIn).getTime();
    const bOut = parseISO(b.checkOut).getTime();
    return inMs < bOut && bIn < outMs;
  });
}
async function resolveBooking(input) {
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new BookingError("Property not found", 404);
  if (!property.active) throw new BookingError("Property is not available", 409);
  if (property.type === "COLIVING") {
    if (!input.roomId) throw new BookingError("Select a room to reserve");
    const room = await storage.getRoom(input.roomId);
    if (!room || room.propertyId !== property.id) {
      throw new BookingError("Room not found", 404);
    }
    if (room.status !== "AVAILABLE") {
      throw new BookingError("That room is no longer available", 409);
    }
    return {
      model: "COLIVING",
      property,
      room,
      checkIn: input.checkIn ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      checkOut: null,
      // open-ended
      baseAmount: parseFloat(room.depositAmount),
      cleaningFee: 0
    };
  }
  if (!input.checkIn || !input.checkOut) {
    throw new BookingError("Select check-in and check-out dates");
  }
  const n = nights(input.checkIn, input.checkOut);
  if (n < 1) throw new BookingError("Check-out must be after check-in");
  if (await strHasConflict(property.id, input.checkIn, input.checkOut)) {
    throw new BookingError("Those dates are not available", 409);
  }
  return {
    model: "STR",
    property,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    baseAmount: strBaseTotal(property, n),
    cleaningFee: property.cleaningFee ? parseFloat(property.cleaningFee) : 0,
    nights: n
  };
}
function buildQuote(resolved, paymentMethod) {
  if (resolved.model === "STR") {
    const b = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod
    });
    const lines = [
      { label: `Stay (${resolved.nights} night${resolved.nights === 1 ? "" : "s"})`, amount: resolved.baseAmount }
    ];
    if (resolved.cleaningFee > 0) lines.push({ label: "Cleaning fee", amount: resolved.cleaningFee });
    if (b.tax > 0) lines.push({ label: "Tax", amount: b.tax });
    if (b.surcharge > 0) lines.push({ label: "Card processing (3.5%)", amount: b.surcharge });
    return {
      model: "STR",
      nights: resolved.nights,
      dueNow: { lines, subtotal: b.subtotal, tax: b.tax, surcharge: b.surcharge, total: b.total }
    };
  }
  const deposit = calculateBreakdown({ baseAmount: resolved.baseAmount, paymentMethod });
  const weeklyRent = parseFloat(resolved.room.weeklyRent);
  const weekly = calculateWeeklyCharge(weeklyRent, paymentMethod);
  const depositLines = [{ label: "Move-in deposit", amount: resolved.baseAmount }];
  if (deposit.surcharge > 0) depositLines.push({ label: "Card processing (3.5%)", amount: deposit.surcharge });
  return {
    model: "COLIVING",
    dueNow: {
      lines: depositLines,
      subtotal: deposit.subtotal,
      tax: deposit.tax,
      surcharge: deposit.surcharge,
      total: deposit.total
    },
    recurring: {
      label: "Weekly rent (billed weekly after move-in)",
      weeklyRent,
      surcharge: weekly.surcharge,
      weeklyTotal: weekly.total
    }
  };
}

// server/lib/lease.ts
var LeaseError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function buildLeaseQuote(input) {
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);
  if (!property.active) throw new LeaseError("Property is not available", 409);
  if (property.type !== "COLIVING") {
    throw new LeaseError("Leases are for co-living properties; use the nightly flow for this stay", 400);
  }
  const roomIds = Array.from(new Set(input.roomIds));
  if (roomIds.length === 0) throw new LeaseError("Select at least one room");
  const rooms2 = [];
  for (const id of roomIds) {
    const room = await storage.getRoom(id);
    if (!room || room.propertyId !== property.id) {
      throw new LeaseError("One of the selected rooms was not found in this property", 404);
    }
    if (room.status !== "AVAILABLE") {
      throw new LeaseError(`Room ${room.name} is no longer available`, 409);
    }
    rooms2.push(room);
  }
  const termDays = inclusiveDays(input.startDate, input.endDate);
  if (termDays > MAX_LEASE_DAYS) {
    throw new LeaseError(`Lease term cannot exceed ${MAX_LEASE_DAYS} days`, 422);
  }
  for (const room of rooms2) {
    const free = await storage.isRoomAvailableForRange({
      roomId: room.id,
      startDate: input.startDate,
      endDate: input.endDate
    });
    if (!free) {
      throw new LeaseError(`Room ${room.name} is already booked for an overlapping range`, 409);
    }
  }
  const weeklyRateTotal = Math.round(rooms2.reduce((sum, r) => sum + parseFloat(r.weeklyRent), 0) * 100) / 100;
  let generated;
  try {
    generated = generateSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence: input.cadence,
      weeklyRate: weeklyRateTotal,
      roomCount: 1
      // weeklyRateTotal already sums all rooms
    });
  } catch (err) {
    if (err instanceof ScheduleError) throw new LeaseError(err.message, 422);
    throw err;
  }
  const schedule = generated.installments.map((i) => ({
    seq: i.seq,
    dueDate: i.dueDate,
    amount: i.amount,
    prorated: i.prorated,
    daysCovered: i.daysCovered,
    dueOnBooking: i.seq === 1
  }));
  return {
    propertyId: property.id,
    propertyName: property.name,
    rooms: rooms2.map((r) => ({
      id: r.id,
      name: r.name,
      roomNumber: r.roomNumber ?? null,
      weeklyRent: parseFloat(r.weeklyRent)
    })),
    startDate: input.startDate,
    endDate: input.endDate,
    cadence: input.cadence,
    weeklyRateTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0
  };
}

// server/lib/paymentMetadata.ts
var NULL = "null";
var str = (v) => v === null || v === void 0 || v === "" ? NULL : String(v);
function buildLeaseChargeMetadata(args) {
  const roomIds = args.rooms.map((r) => r.roomId).join(",");
  const roomNames = args.rooms.map((r) => r.roomNameSnapshot).join(",");
  const roomNumbers = args.rooms.map((r) => r.roomNumberSnapshot ?? "").join(",");
  return {
    entity: str(args.entity),
    product_type: "COLIVING_ROOM",
    property_id: str(args.property.id),
    property_name: str(args.property.name),
    room_id: str(roomIds),
    room_name: str(roomNames),
    room_number: str(roomNumbers),
    lease_id: str(args.lease.id),
    payment_kind: args.paymentKind,
    schedule_seq: str(args.scheduleSeq)
  };
}
function buildStrChargeMetadata(args) {
  return {
    entity: str(args.entity),
    product_type: "STR_WHOLE",
    property_id: str(args.property.id),
    property_name: str(args.property.name),
    room_id: NULL,
    room_name: NULL,
    room_number: NULL,
    lease_id: NULL,
    payment_kind: args.paymentKind,
    schedule_seq: NULL
  };
}
var REQUIRED_METADATA_KEYS = [
  "entity",
  "product_type",
  "property_id",
  "property_name",
  "room_id",
  "room_name",
  "room_number",
  "lease_id",
  "payment_kind",
  "schedule_seq"
];
function assertCompleteMetadata(meta) {
  const missing = REQUIRED_METADATA_KEYS.filter(
    (k) => meta[k] === void 0 || meta[k] === ""
  );
  if (missing.length > 0) {
    throw new Error(
      `Stripe metadata contract incomplete \u2014 missing/empty: ${missing.join(", ")}`
    );
  }
}

// server/lib/leaseDocument.ts
var CADENCE_LABEL = {
  WEEKLY: "weekly",
  BIWEEKLY: "bi-weekly",
  MONTHLY: "monthly (every 4 weeks)"
};
var DEFAULT_LEASE_TEMPLATE = {
  title: "Room Rental Agreement",
  intro: "This Room Rental Agreement (the \u201CAgreement\u201D) is entered into between Be Nice Properties (\u201CLandlord\u201D) and {{guestName}} (\u201CResident\u201D) for the room(s) and term described below at {{propertyName}}, {{propertyLocation}}.",
  sections: [
    {
      heading: "1. Premises",
      body: "The Landlord rents to the Resident the following room(s) at {{propertyName}}: {{roomList}}. The Resident has the non-exclusive right to use shared common areas of the property in common with other residents."
    },
    {
      heading: "2. Term",
      body: "The lease term runs from {{startDate}} through {{endDate}} ({{termDays}} days). This is a fixed-term arrangement and does not exceed 90 days."
    },
    {
      heading: "3. Rent & Payment Schedule",
      body: "Rent is billed on a {{cadenceLabel}} basis at a combined rate of {{weeklyRateLabel}} per week across all rented room(s). The first payment is due on the start date. The complete schedule of payments and amounts appears below; the total value of this lease is {{totalLeaseValue}}. {{prorationNote}}"
    },
    {
      heading: "4. Late Fees",
      body: "If a scheduled payment is not received by its due date, a late fee of {{lateFeePerDay}} per day accrues beginning the day after the due date and continues to accrue daily until the balance is paid. Accrued late fees are billed as a separate charge from rent."
    },
    {
      heading: "5. House Rules",
      body: "The Resident agrees to: keep shared spaces clean; respect quiet hours and other residents; not sublet or assign the room; not engage in illegal activity on the premises; and follow any posted property-specific house rules. Repeated or serious violations may result in termination of this Agreement."
    },
    {
      heading: "6. Payment Authorization",
      body: "The Resident authorizes Be Nice Properties to charge the saved payment method on file for each scheduled payment and for any accrued late fees, on or after each due date."
    }
  ],
  signatureStatement: "By typing my full legal name below and submitting this Agreement, I acknowledge that I have read and agree to its terms, and I intend my typed name to be my legally binding electronic signature under the U.S. E-SIGN Act and UETA."
};
var fmtMoney = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function inclusiveDays2(startDate, endDate) {
  const ms = 24 * 60 * 60 * 1e3;
  const s = (/* @__PURE__ */ new Date(`${startDate}T00:00:00Z`)).getTime();
  const e = (/* @__PURE__ */ new Date(`${endDate}T00:00:00Z`)).getTime();
  return Math.round((e - s) / ms) + 1;
}
function tokenMap(data) {
  const roomList = data.rooms.map((r) => r.roomNumber ? `${r.name} (#${r.roomNumber})` : r.name).join(", ");
  return {
    guestName: data.guestName,
    propertyName: data.propertyName,
    propertyLocation: data.propertyLocation,
    roomList,
    startDate: data.startDate,
    endDate: data.endDate,
    termDays: String(inclusiveDays2(data.startDate, data.endDate)),
    cadenceLabel: CADENCE_LABEL[data.cadence],
    weeklyRateLabel: fmtMoney(data.weeklyRateTotal),
    totalLeaseValue: fmtMoney(data.totalLeaseValue),
    prorationNote: data.prorationNote,
    lateFeePerDay: fmtMoney(LATE_FEE_PER_DAY)
  };
}
function fill(text2, tokens) {
  return text2.replace(
    /\{\{(\w+)\}\}/g,
    (_m, key) => key in tokens ? tokens[key] : `{{${key}}}`
  );
}
function scheduleTableHtml(schedule) {
  const rows = schedule.map(
    (r) => `<tr><td>${r.seq}</td><td>${esc(r.dueDate)}${r.seq === 1 ? " <strong>(due on start)</strong>" : ""}${r.prorated ? " <em>(prorated)</em>" : ""}</td><td style="text-align:right">${fmtMoney(
      r.amount
    )}</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse" cellpadding="6"><thead><tr style="border-bottom:1px solid #ccc;text-align:left"><th>#</th><th>Due date</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function bodyHtml(data, template) {
  const tokens = tokenMap(data);
  const sections = template.sections.map(
    (s) => `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc(s.heading)}</h2><p style="margin:0;line-height:1.5">${esc(fill(s.body, tokens))}</p></section>`
  ).join("");
  return `<h1 style="font-size:20px;margin:0 0 4px">${esc(template.title)}</h1><p style="color:#555;margin:0 0 16px;line-height:1.5">${esc(fill(template.intro, tokens))}</p>` + sections + `<section><h2 style="font-size:15px;margin:18px 0 6px">Payment Schedule</h2>` + scheduleTableHtml(data.schedule) + `</section>`;
}
var PAGE = (inner) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room Rental Agreement</title><style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1a1a1a}@media print{body{margin:0}}</style></head><body>${inner}</body></html>`;
function renderLeaseHtml(data, template = DEFAULT_LEASE_TEMPLATE) {
  const unsigned = bodyHtml(data, template) + `<section style="margin-top:24px"><p style="line-height:1.5">${esc(
    template.signatureStatement
  )}</p><p style="color:#777">\u2014 Awaiting signature \u2014</p></section>`;
  return PAGE(unsigned);
}
function renderSignedLeaseHtml(data, signature, template = DEFAULT_LEASE_TEMPLATE) {
  const signed = bodyHtml(data, template) + `<section style="margin-top:24px;border-top:2px solid #1a1a1a;padding-top:16px"><p style="line-height:1.5">${esc(template.signatureStatement)}</p><div style="margin-top:12px;font-size:14px"><div><strong>Signed by:</strong> ${esc(signature.signedName)}</div><div><strong>Date &amp; time:</strong> ${esc(signature.signedAt.toISOString())}</div><div><strong>IP address:</strong> ${esc(signature.signedIp)}</div><div style="margin-top:8px;color:#555">Electronically signed under the E-SIGN Act / UETA.</div></div></section>`;
  return PAGE(signed);
}

// server/lib/leaseFlow.ts
function docDataFrom(leaseId, quote, guest, location) {
  return {
    leaseId,
    guestName: guest.name,
    guestEmail: guest.email,
    propertyName: quote.propertyName,
    propertyLocation: location,
    rooms: quote.rooms.map((r) => ({
      name: r.name,
      roomNumber: r.roomNumber,
      weeklyRent: r.weeklyRent
    })),
    startDate: quote.startDate,
    endDate: quote.endDate,
    cadence: quote.cadence,
    weeklyRateTotal: quote.weeklyRateTotal,
    totalLeaseValue: quote.totalLeaseValue,
    prorationNote: quote.prorationNote,
    schedule: quote.schedule.map((s) => ({
      seq: s.seq,
      dueDate: s.dueDate,
      amount: s.amount,
      prorated: s.prorated
    }))
  };
}
async function createDraftLease(input) {
  const quote = await buildLeaseQuote({
    propertyId: input.propertyId,
    roomIds: input.roomIds,
    startDate: input.startDate,
    endDate: input.endDate,
    cadence: input.cadence
  });
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);
  const guest = await storage.upsertGuestByEmail({
    name: input.guest.name,
    email: input.guest.email,
    phone: input.guest.phone ?? null
  });
  const lease = await storage.createLeaseWithSchedule({
    lease: {
      propertyId: property.id,
      guestId: guest.id,
      startDate: quote.startDate,
      endDate: quote.endDate,
      paymentCadence: quote.cadence,
      weeklyRateSnapshot: String(quote.weeklyRateTotal),
      totalLeaseValue: String(quote.totalLeaseValue),
      prorationNote: quote.prorationNote,
      status: "PENDING_SIGNATURE"
    },
    rooms: quote.rooms.map((r) => ({
      // leaseId is filled in by storage.createLeaseWithSchedule.
      leaseId: "",
      roomId: r.id,
      roomNumberSnapshot: r.roomNumber,
      roomNameSnapshot: r.name
    })),
    schedule: quote.schedule.map((s) => ({
      leaseId: "",
      scheduleSeq: s.seq,
      dueDate: s.dueDate,
      amount: String(s.amount),
      status: "SCHEDULED",
      // Default to card-on-file; a guest who chooses manual flips this in Phase 4.
      paymentMethod: "CARD_ON_FILE"
    }))
  });
  const documentHtml = renderLeaseHtml(
    docDataFrom(lease.id, quote, input.guest, property.location)
  );
  return { lease, documentHtml };
}
async function signLease(input) {
  const lease = await storage.getLease(input.leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.signedAt) {
    return { lease, documentUrl: lease.signedPdfUrl ?? `/api/leases/${lease.id}/document` };
  }
  if (lease.status !== "PENDING_SIGNATURE" && lease.status !== "DRAFT") {
    throw new LeaseError(`Lease cannot be signed from status ${lease.status}`, 409);
  }
  const name = input.signedName.trim();
  if (name.length < 2) throw new LeaseError("A full legal name is required to sign");
  if (!input.affirmed) throw new LeaseError("You must affirm the agreement to sign");
  const property = await storage.getProperty(lease.propertyId);
  const guest = await storage.getGuest(lease.guestId);
  const leaseRooms2 = await storage.getLeaseRooms(lease.id);
  const schedule = await storage.getScheduleByLease(lease.id);
  if (!property || !guest) throw new LeaseError("Lease data incomplete", 500);
  const docData = {
    leaseId: lease.id,
    guestName: guest.name,
    guestEmail: guest.email,
    propertyName: property.name,
    propertyLocation: property.location,
    rooms: leaseRooms2.map((lr) => ({
      name: lr.roomNameSnapshot,
      roomNumber: lr.roomNumberSnapshot,
      weeklyRent: 0
      // not shown per-room in the doc body; rate total is on the lease
    })),
    startDate: lease.startDate,
    endDate: lease.endDate,
    cadence: lease.paymentCadence,
    weeklyRateTotal: parseFloat(lease.weeklyRateSnapshot),
    totalLeaseValue: parseFloat(lease.totalLeaseValue),
    prorationNote: lease.prorationNote ?? "",
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: parseFloat(s.amount),
      prorated: false
    }))
  };
  const signedAt = input.signedAt ?? /* @__PURE__ */ new Date();
  const signedDocumentHtml = renderSignedLeaseHtml(docData, {
    signedName: name,
    signedAt,
    signedIp: input.ip
  });
  const documentUrl = `/api/leases/${lease.id}/document`;
  const updated = await storage.updateLease(lease.id, {
    signedName: name,
    signedAt,
    signedIp: input.ip,
    signedPdfUrl: documentUrl,
    signedDocumentHtml,
    // Signed, but NOT active — first payment (Phase 4) gates ACTIVE.
    status: "PENDING_FIRST_PAYMENT"
  });
  return { lease: updated ?? lease, documentUrl };
}

// server/lib/stripe.ts
import Stripe from "stripe";
var secret = process.env.STRIPE_SECRET_KEY;
function isStripeConfigured() {
  return Boolean(secret && secret.startsWith("sk_") && !secret.includes("placeholder"));
}
var stripe = isStripeConfigured() ? new Stripe(secret, { apiVersion: "2025-08-27.basil" }) : null;
function requireStripe() {
  if (!stripe) {
    throw Object.assign(
      new Error("Stripe is not configured \u2014 set a test secret key (sk_test_\u2026) in STRIPE_SECRET_KEY"),
      { status: 503 }
    );
  }
  return stripe;
}
var toCents = (dollars) => Math.round(dollars * 100);
async function createCheckoutSession(opts) {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  const sessionMetadata = { ...opts.metadata, reference: opts.reference, kind: "one_time" };
  return s.checkout.sessions.create({
    mode: "payment",
    customer_email: opts.guestEmail,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: toCents(opts.amount),
          product_data: { name: opts.description }
        }
      }
    ],
    client_reference_id: opts.reference,
    metadata: sessionMetadata,
    // The contract must live on the PaymentIntent itself (the charge), not only
    // the session, so reconciliation by metadata works against the charge.
    payment_intent_data: { metadata: opts.metadata },
    success_url: opts.successUrl,
    cancel_url: opts.cancelUrl
  });
}
function constructWebhookEvent(rawBody, signature) {
  const s = requireStripe();
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!whSecret || whSecret.includes("placeholder")) {
    throw Object.assign(new Error("STRIPE_WEBHOOK_SECRET not configured"), { status: 503 });
  }
  return s.webhooks.constructEvent(rawBody, signature, whSecret);
}
async function ensureCustomer(opts) {
  const s = requireStripe();
  if (opts.existingCustomerId) return opts.existingCustomerId;
  const customer = await s.customers.create({ email: opts.email, name: opts.name });
  return customer.id;
}
async function createFirstPaymentIntent(opts) {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  return s.paymentIntents.create(
    {
      amount: toCents(opts.amount),
      currency: "usd",
      customer: opts.customerId,
      // Save the card for later off-session scheduled rent.
      setup_future_usage: "off_session",
      automatic_payment_methods: { enabled: true },
      metadata: opts.metadata
    },
    { idempotencyKey: opts.idempotencyKey }
  );
}
async function chargeSavedCard(opts) {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  return s.paymentIntents.create(
    {
      amount: toCents(opts.amount),
      currency: "usd",
      customer: opts.customerId,
      payment_method: opts.paymentMethodId,
      off_session: true,
      confirm: true,
      // charge immediately
      metadata: opts.metadata
    },
    { idempotencyKey: opts.idempotencyKey }
  );
}
async function retrievePaymentIntent(id) {
  return requireStripe().paymentIntents.retrieve(id);
}
var stripePublishableConfigured = () => Boolean(process.env.VITE_STRIPE_PUBLIC_KEY?.startsWith("pk_"));

// server/server-log.ts
function log(message, source = "express") {
  const time = (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true
  });
  console.log(`${time} [${source}] ${message}`);
}

// server/lib/notifications.ts
function isEmailConfigured() {
  return Boolean(
    process.env.SENDGRID_API_KEY || process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
  );
}
function isSmsConfigured() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
  );
}
var mailFrom = () => process.env.MAIL_FROM || process.env.ADMIN_EMAIL || "no-reply@beniceproperties.com";
var transportPromise = null;
async function getTransport() {
  if (!transportPromise) {
    transportPromise = (async () => {
      const nodemailer = (await import("nodemailer")).default;
      if (process.env.SENDGRID_API_KEY) {
        return nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY }
        });
      }
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      });
    })();
  }
  return transportPromise;
}
async function sendEmail(opts) {
  if (!isEmailConfigured()) {
    log(`[dry-run email] to=${opts.to} subject="${opts.subject}" (email not configured)`, "notify");
    return { sent: false, channel: "email", reason: "not-configured" };
  }
  try {
    const transport = await getTransport();
    await transport.sendMail({
      from: mailFrom(),
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? `<p>${opts.text}</p>`
    });
    log(`email sent to=${opts.to} subject="${opts.subject}"`, "notify");
    return { sent: true, channel: "email" };
  } catch (err) {
    log(`email FAILED to=${opts.to}: ${err.message}`, "notify");
    return { sent: false, channel: "email", reason: err.message };
  }
}
var twilioClientPromise = null;
async function getTwilio() {
  if (!twilioClientPromise) {
    twilioClientPromise = (async () => {
      const twilio = (await import("twilio")).default;
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    })();
  }
  return twilioClientPromise;
}
async function sendSms(opts) {
  if (!opts.to) {
    return { sent: false, channel: "sms", reason: "no-phone" };
  }
  if (!isSmsConfigured()) {
    log(`[dry-run sms] to=${opts.to} body="${opts.body.slice(0, 40)}\u2026" (sms not configured)`, "notify");
    return { sent: false, channel: "sms", reason: "not-configured" };
  }
  try {
    const client = await getTwilio();
    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: opts.to,
      body: opts.body
    });
    log(`sms sent to=${opts.to}`, "notify");
    return { sent: true, channel: "sms" };
  } catch (err) {
    log(`sms FAILED to=${opts.to}: ${err.message}`, "notify");
    return { sent: false, channel: "sms", reason: err.message };
  }
}
async function notifyGuest(opts) {
  const [email, sms] = await Promise.all([
    sendEmail({ to: opts.email, subject: opts.subject, text: opts.body, html: opts.html }),
    opts.phone ? sendSms({ to: opts.phone, body: opts.body }) : Promise.resolve({ sent: false, channel: "sms", reason: "no-phone" })
  ]);
  return { email, sms };
}

// server/lib/dunning.ts
var MS_PER_DAY2 = 24 * 60 * 60 * 1e3;
var ymd = (d) => d.toISOString().slice(0, 10);
async function handleChargeFailure(args) {
  const today = args.today ?? ymd(/* @__PURE__ */ new Date());
  if (args.scheduleRow.status !== "FAILED") {
    await storage.updateScheduleRow(args.scheduleRow.id, { status: "FAILED" });
  }
  await storage.raiseEscalationOnce({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    severity: "HIGH",
    detail: `Card-on-file charge FAILED for installment #${args.scheduleRow.scheduleSeq} ($${args.scheduleRow.amount})${args.reason ? `: ${args.reason}` : ""}.`
  });
  const already = await storage.hasNotification({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    sendDate: today
  });
  if (!already) {
    const fixUrl = `${publicBaseUrl()}/lease/pay?leaseId=${args.lease.id}`;
    const sent = await notifyGuest({
      email: args.guest.email,
      phone: args.guest.phone,
      subject: "Action needed \u2014 your rent payment failed",
      body: `Hi ${args.guest.name}, we couldn't process your rent payment for installment #${args.scheduleRow.scheduleSeq}. Please update your card / retry here: ${fixUrl}`
    });
    await storage.recordNotification({
      leaseId: args.lease.id,
      scheduleSeq: args.scheduleRow.scheduleSeq,
      kind: "PAYMENT_FAILED",
      sendDate: today,
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
  }
}
async function billAccruedLateFees(args) {
  const fees = await storage.getAccruedLateFeesForSchedule(args.lease.id, args.scheduleSeq);
  if (fees.length === 0) return { billed: false, amount: 0 };
  const total = Math.round(fees.reduce((s, f) => s + parseFloat(f.amount), 0) * 100) / 100;
  if (total <= 0) return { billed: false, amount: 0 };
  if (!args.lease.stripeCustomerId || !args.lease.stripePaymentMethodId) {
    return { billed: false, amount: total };
  }
  const metadata = buildLeaseChargeMetadata({
    entity: args.property.entity,
    property: args.property,
    lease: args.lease,
    rooms: args.rooms,
    paymentKind: "LATE_FEE",
    scheduleSeq: args.scheduleSeq
  });
  const pi = await chargeSavedCard({
    amount: total,
    customerId: args.lease.stripeCustomerId,
    paymentMethodId: args.lease.stripePaymentMethodId,
    metadata,
    idempotencyKey: `lease-latefee-${args.lease.id}-seq-${args.scheduleSeq}`
  });
  for (const fee of fees) {
    await storage.updateLateFee(fee.id, { status: "BILLED", stripePaymentIntentId: pi.id });
  }
  log(`billed $${total} late fees for lease ${args.lease.id} seq ${args.scheduleSeq} (${pi.id})`, "scheduler");
  return { billed: true, amount: total, paymentIntentId: pi.id };
}
function publicBaseUrl() {
  return process.env.PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beniceproperties.vercel.app");
}

// server/lib/leasePayments.ts
async function loadLeaseContext(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property not found", 500);
  const rooms2 = await storage.getLeaseRooms(lease.id);
  return { lease, property, rooms: rooms2 };
}
function chargeTotalFor(rentAmount) {
  return calculateBreakdown({ baseAmount: rentAmount, paymentMethod: "STRIPE" }).total;
}
async function startFirstPayment(leaseId) {
  const { lease, property, rooms: rooms2 } = await loadLeaseContext(leaseId);
  if (lease.status !== "PENDING_FIRST_PAYMENT") {
    throw new LeaseError(
      `First payment can only be taken once the lease is signed (status is ${lease.status})`,
      409
    );
  }
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) throw new LeaseError("Lease has no first installment", 500);
  if (first.status === "PAID") throw new LeaseError("First payment is already paid", 409);
  const guest = await storage.getGuest(lease.guestId);
  if (!guest) throw new LeaseError("Lease guest not found", 500);
  const customerId = await ensureCustomer({
    existingCustomerId: lease.stripeCustomerId,
    email: guest.email,
    name: guest.name
  });
  if (customerId !== lease.stripeCustomerId) {
    await storage.updateLease(lease.id, { stripeCustomerId: customerId });
  }
  const amount = chargeTotalFor(parseFloat(first.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "FIRST_PAYMENT",
    scheduleSeq: 1
  });
  const pi = await createFirstPaymentIntent({
    amount,
    customerId,
    metadata,
    // Stable per-lease first-payment key: retrying startFirstPayment reuses the
    // same PI instead of creating duplicates.
    idempotencyKey: `lease-first-${lease.id}`
  });
  await storage.updateScheduleRow(first.id, { stripePaymentIntentId: pi.id });
  if (!pi.client_secret) throw new LeaseError("Stripe did not return a client secret", 502);
  return { clientSecret: pi.client_secret, paymentIntentId: pi.id, amount };
}
async function finalizeFirstPayment(paymentIntentId) {
  const lease = await findLeaseByFirstPaymentIntent(paymentIntentId);
  if (!lease) return;
  if (lease.status === "ACTIVE") return;
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) return;
  let savedPaymentMethodId = lease.stripePaymentMethodId ?? null;
  try {
    const pi = await retrievePaymentIntent(paymentIntentId);
    if (typeof pi.payment_method === "string") savedPaymentMethodId = pi.payment_method;
    else if (pi.payment_method && "id" in pi.payment_method) savedPaymentMethodId = pi.payment_method.id;
  } catch (err) {
    log(`could not read saved payment method for ${paymentIntentId}: ${err.message}`, "stripe");
  }
  if (first.status !== "PAID") {
    await storage.updateScheduleRow(first.id, {
      status: "PAID",
      paidAt: /* @__PURE__ */ new Date(),
      stripePaymentIntentId: paymentIntentId
    });
  }
  await storage.updateLease(lease.id, {
    status: "ACTIVE",
    stripePaymentMethodId: savedPaymentMethodId ?? void 0
  });
  const rooms2 = await storage.getLeaseRooms(lease.id);
  for (const lr of rooms2) {
    await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
  }
  log(`lease ${lease.id} ACTIVE via first payment ${paymentIntentId}`, "stripe");
}
async function findLeaseByFirstPaymentIntent(piId) {
  const leases2 = await storage.getLeases();
  for (const lease of leases2) {
    const schedule = await storage.getScheduleByLease(lease.id);
    const first = schedule.find((s) => s.scheduleSeq === 1);
    if (first?.stripePaymentIntentId === piId) return lease;
  }
  return void 0;
}

// server/integrations/unifiedOps.ts
var FORBIDDEN_KEYS = [
  "name",
  "email",
  "phone",
  "guest",
  "guestId",
  "card",
  "stripeRef",
  "stripeCustomerId",
  "stripeSubscriptionId",
  "paymentIntentId"
];
function assertSanitized(payload) {
  const bad = Object.keys(payload).filter(
    (k) => FORBIDDEN_KEYS.some((f) => k.toLowerCase().includes(f.toLowerCase()))
  );
  if (bad.length > 0) {
    throw new Error(
      `[unifiedOps] refusing to push \u2014 payload contains forbidden field(s): ${bad.join(", ")}`
    );
  }
}
async function pushSnapshot(snapshot) {
  assertSanitized(snapshot);
  const enabled = process.env.UO_PUSH_ENABLED === "true";
  const endpoint = process.env.UO_ENDPOINT;
  const token = process.env.UO_SERVICE_TOKEN;
  if (!enabled || !endpoint || !token) {
    log(
      `[dry-run] would POST snapshot ${JSON.stringify(snapshot)} (set UO_PUSH_ENABLED=true + UO_ENDPOINT + UO_SERVICE_TOKEN to send)`,
      "unifiedOps"
    );
    return true;
  }
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(snapshot)
    });
    if (!res.ok) {
      log(`push failed: ${res.status} ${await res.text()}`, "unifiedOps");
      return false;
    }
    log(`pushed snapshot for ${snapshot.snapshotDate}`, "unifiedOps");
    return true;
  } catch (err) {
    log(`push error: ${err.message}`, "unifiedOps");
    return false;
  }
}

// server/integrations/kpiRollup.ts
async function buildAndPushSnapshot() {
  const agg = await storage.getKpiAggregates();
  const snapshotDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const cached = await storage.createSnapshot({
    snapshotDate,
    bookingCount: agg.bookingCount,
    occupancyPct: String(agg.occupancyPct),
    revenueTotal: String(agg.revenueTotal),
    roomsOccupied: agg.roomsOccupied,
    upcomingCheckIns: agg.upcomingCheckIns,
    pushedToUo: false,
    pushedAt: null
  });
  const snapshot = {
    businessCode: "BNP",
    snapshotDate,
    bookingCount: agg.bookingCount,
    occupancyPct: agg.occupancyPct,
    revenueTotal: agg.revenueTotal,
    roomsOccupied: agg.roomsOccupied,
    upcomingCheckIns: agg.upcomingCheckIns
  };
  const ok = await pushSnapshot(snapshot);
  if (ok) {
    await storage.markSnapshotPushed(cached.id, /* @__PURE__ */ new Date());
    log(`KPI snapshot ${snapshotDate} cached + pushed (dry-run unless enabled)`, "kpiRollup");
  }
  return snapshot;
}

// server/routes.ts
function appUrl(req, path) {
  const proto = req.protocol;
  const host = req.get("host");
  return `${proto}://${host}${path}`;
}
async function registerRoutes(app) {
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const sig = req.headers["stripe-signature"];
      if (!sig || typeof sig !== "string") {
        return res.status(400).json({ message: "Missing stripe-signature" });
      }
      let event;
      try {
        event = constructWebhookEvent(req.body, sig);
      } catch (err) {
        log(`webhook verify failed: ${err.message}`, "stripe");
        return res.status(400).json({ message: "Invalid signature" });
      }
      try {
        await handleStripeEvent(event);
      } catch (err) {
        log(`webhook handler error: ${err.message}`, "stripe");
      }
      res.json({ received: true });
    }
  );
  await setupAuth(app);
  app.get("/api/health", (_req, res) => {
    res.json({
      ok: true,
      service: "bnp",
      stripe: isStripeConfigured() ? "configured" : "test-placeholder",
      time: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app.get("/api/properties", async (_req, res, next) => {
    try {
      res.json(await storage.getProperties({ activeOnly: true }));
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/properties/:id", async (req, res, next) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || !property.active) {
        return res.status(404).json({ message: "Property not found" });
      }
      const rooms2 = property.type === "COLIVING" ? await storage.getRoomsByProperty(property.id) : [];
      res.json({ property, rooms: rooms2 });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/rooms/:id", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });
      const property = await storage.getProperty(room.propertyId);
      res.json({ room, property });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/quote", async (req, res, next) => {
    try {
      const parsed = quoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid quote request" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      res.json(buildQuote(resolved, paymentMethod));
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/lease-quote", async (req, res, next) => {
    try {
      const parsed = leaseQuoteRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease quote request" });
      }
      res.json(await buildLeaseQuote(parsed.data));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/leases", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { lease, documentHtml } = await createDraftLease(parsed.data);
      res.status(201).json({ leaseId: lease.id, status: lease.status, documentHtml });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/leases/:id", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      const leaseRooms2 = await storage.getLeaseRooms(lease.id);
      const schedule = await storage.getScheduleByLease(lease.id);
      const guest = await storage.getGuest(lease.guestId);
      res.json({
        lease: {
          id: lease.id,
          status: lease.status,
          startDate: lease.startDate,
          endDate: lease.endDate,
          paymentCadence: lease.paymentCadence,
          weeklyRateSnapshot: lease.weeklyRateSnapshot,
          totalLeaseValue: lease.totalLeaseValue,
          prorationNote: lease.prorationNote,
          signedAt: lease.signedAt,
          signedName: lease.signedName,
          signedPdfUrl: lease.signedPdfUrl
        },
        rooms: leaseRooms2.map((lr) => ({ name: lr.roomNameSnapshot, roomNumber: lr.roomNumberSnapshot })),
        schedule: schedule.map((s) => ({
          seq: s.scheduleSeq,
          dueDate: s.dueDate,
          amount: s.amount,
          status: s.status
        })),
        guest: guest ? { name: guest.name, email: guest.email } : null
      });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/leases/:id/sign", async (req, res, next) => {
    try {
      const parsed = signLeaseSchema.safeParse({ ...req.body, leaseId: req.params.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid signature" });
      }
      const fwd = req.headers["x-forwarded-for"];
      const ip = (typeof fwd === "string" ? fwd.split(",")[0]?.trim() : void 0) || req.socket.remoteAddress || "unknown";
      const { lease, documentUrl } = await signLease({
        leaseId: parsed.data.leaseId,
        signedName: parsed.data.signedName,
        affirmed: parsed.data.affirmed,
        ip
      });
      res.json({ leaseId: lease.id, status: lease.status, documentUrl });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/leases/:id/document", async (req, res, next) => {
    try {
      const lease = await storage.getLease(req.params.id);
      if (!lease) return res.status(404).json({ message: "Lease not found" });
      if (!lease.signedDocumentHtml) {
        return res.status(409).json({ message: "Lease has not been signed yet" });
      }
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(lease.signedDocumentHtml);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/leases/:id/first-payment", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startFirstPayment(req.params.id);
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/payments/config", (_req, res) => {
    res.json({
      stripeEnabled: isStripeConfigured() && stripePublishableConfigured(),
      publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY ?? null
    });
  });
  app.get("/api/admin/settings/default-threshold", requireAdmin, async (_req, res, next) => {
    try {
      const days = await storage.getSettingNumber("defaulted_threshold_days", 7);
      res.json({ defaultedThresholdDays: days });
    } catch (err) {
      next(err);
    }
  });
  app.put("/api/admin/settings/default-threshold", requireAdmin, async (req, res, next) => {
    try {
      const schema = z3.object({ days: z3.number().int().min(1).max(120) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "days must be an integer 1\u2013120" });
      await storage.setSetting("defaulted_threshold_days", String(parsed.data.days));
      res.json({ defaultedThresholdDays: parsed.data.days });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/escalations", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : "OPEN";
      res.json(await storage.getEscalations({ status }));
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/bookings", async (req, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid booking" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod, guest } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      const quote = buildQuote(resolved, paymentMethod);
      const reference = generateReference();
      const guestRow = await storage.upsertGuestByEmail(guest);
      const booking = await storage.createBooking({
        propertyId: resolved.property.id,
        roomId: resolved.room?.id ?? null,
        guestId: guestRow.id,
        model: resolved.model,
        checkIn: resolved.checkIn,
        checkOut: resolved.checkOut,
        status: "PENDING_PAYMENT",
        paymentMethod,
        reference,
        quotedTotal: String(quote.dueNow.total)
      });
      const dueNow = quote.dueNow.total;
      const surcharge = quote.dueNow.surcharge;
      const paymentType = resolved.model === "COLIVING" ? "DEPOSIT" : "ONE_TIME";
      const response = {
        reference,
        bookingId: booking.id,
        paymentMethod,
        quote
      };
      if (paymentMethod === "STRIPE") {
        if (!isStripeConfigured()) {
          return res.status(503).json({
            message: "Card payments aren't enabled yet (Stripe test key not set). Use CashApp or Zelle."
          });
        }
        const payment = await storage.createPayment({
          bookingId: booking.id,
          type: paymentType,
          method: "STRIPE",
          amount: String(dueNow - surcharge),
          surcharge: String(surcharge),
          status: "PENDING",
          stripeRef: null,
          confirmedBy: null,
          paidAt: null
        });
        const chargeMetadata = resolved.model === "COLIVING" && resolved.room ? buildLeaseChargeMetadata({
          entity: resolved.property.entity,
          property: resolved.property,
          lease: { id: "" },
          // legacy deposit path has no lease row
          rooms: [
            {
              roomId: resolved.room.id,
              roomNameSnapshot: resolved.room.name,
              roomNumberSnapshot: resolved.room.roomNumber ?? null
            }
          ],
          paymentKind: "BOOKING_DEPOSIT",
          scheduleSeq: null
        }) : buildStrChargeMetadata({
          entity: resolved.property.entity,
          property: resolved.property,
          paymentKind: "BOOKING_DEPOSIT"
        });
        const session2 = await createCheckoutSession({
          amount: dueNow,
          description: resolved.model === "COLIVING" ? `Deposit \u2014 ${resolved.room.name} @ ${resolved.property.name}` : `Stay \u2014 ${resolved.property.name}`,
          reference,
          guestEmail: guest.email,
          successUrl: appUrl(req, `/confirmation/${reference}`),
          cancelUrl: appUrl(req, `/property/${resolved.property.id}`),
          metadata: chargeMetadata
        });
        await storage.updatePayment(payment.id, { stripeRef: session2.id });
        response.checkoutUrl = session2.url ?? void 0;
      } else {
        await storage.createPayment({
          bookingId: booking.id,
          type: paymentType,
          method: paymentMethod,
          amount: String(dueNow),
          surcharge: "0",
          status: "PENDING",
          stripeRef: null,
          confirmedBy: null,
          paidAt: null
        });
        const handle = paymentMethod === "CASHAPP" ? process.env.CASHAPP_TAG ?? "$BeNiceProperties" : process.env.ZELLE_HANDLE ?? "pay@beniceproperties.com";
        response.manualInstructions = {
          method: paymentMethod,
          handle,
          amount: dueNow,
          memo: reference
        };
      }
      res.status(201).json(response);
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/lookup", async (req, res, next) => {
    try {
      const schema = z3.object({ reference: z3.string().min(1), email: z3.string().email() });
      const parsed = schema.safeParse(req.query);
      if (!parsed.success) return res.status(400).json({ message: "Provide reference and email" });
      const booking = await storage.getBookingByReference(parsed.data.reference);
      if (!booking) return res.status(404).json({ message: "Booking not found" });
      const guest = await storage.getGuest(booking.guestId);
      if (!guest || guest.email.toLowerCase() !== parsed.data.email.toLowerCase()) {
        return res.status(404).json({ message: "Booking not found" });
      }
      const property = await storage.getProperty(booking.propertyId);
      const payments2 = await storage.getPaymentsByBooking(booking.id);
      const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
      res.json({
        booking,
        property: property ? { name: property.name, location: property.location } : null,
        room: room ? { name: room.name } : null,
        // Only payment status/amounts — no stripe refs to the public.
        payments: payments2.map((p) => ({
          type: p.type,
          method: p.method,
          amount: p.amount,
          surcharge: p.surcharge,
          status: p.status,
          paidAt: p.paidAt
        }))
      });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/dashboard", requireAdmin, async (_req, res, next) => {
    try {
      const agg = await storage.getKpiAggregates();
      const bookings2 = await storage.getBookings();
      const pending = await storage.getPendingManualPayments();
      res.json({ aggregates: agg, recentBookings: bookings2.slice(0, 20), pendingCount: pending.length });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/bookings", requireAdmin, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      res.json(await storage.getBookings(status ? { status } : void 0));
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/reconciliation", requireAdmin, async (_req, res, next) => {
    try {
      const pending = await storage.getPendingManualPayments();
      const enriched = await Promise.all(
        pending.filter((p) => p.method !== "STRIPE").map(async (p) => {
          const booking = await storage.getBooking(p.bookingId);
          const guest = booking ? await storage.getGuest(booking.guestId) : null;
          return {
            payment: p,
            booking,
            guest: guest ? { name: guest.name, email: guest.email } : null
          };
        })
      );
      res.json(enriched);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/payments/:id/mark-paid", requireAdmin, async (req, res, next) => {
    try {
      const payment = await storage.getPayment(req.params.id);
      if (!payment) return res.status(404).json({ message: "Payment not found" });
      if (payment.method === "STRIPE") {
        return res.status(400).json({ message: "Stripe payments are confirmed by webhook, not manually" });
      }
      const adminId = req.user.id;
      const updated = await storage.updatePayment(payment.id, {
        status: "PAID",
        confirmedBy: adminId,
        paidAt: /* @__PURE__ */ new Date()
      });
      const booking = await storage.getBooking(payment.bookingId);
      if (booking) {
        await storage.updateBooking(booking.id, {
          status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED"
        });
        if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
      }
      res.json({ payment: updated });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/payments", requireAdmin, async (_req, res, next) => {
    try {
      const bookings2 = await storage.getBookings();
      const rows = await Promise.all(
        bookings2.map(async (b) => ({
          booking: b,
          payments: await storage.getPaymentsByBooking(b.id),
          subscription: await storage.getSubscriptionByBooking(b.id)
        }))
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/properties", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createProperty(parsed.data));
    } catch (err) {
      next(err);
    }
  });
  app.patch("/api/admin/properties/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertPropertySchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateProperty(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Property not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/properties", requireAdmin, async (_req, res, next) => {
    try {
      res.json(await storage.getProperties());
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/rooms", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await storage.createRoom(parsed.data));
    } catch (err) {
      next(err);
    }
  });
  app.patch("/api/admin/rooms/:id", requireAdmin, async (req, res, next) => {
    try {
      const parsed = insertRoomSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateRoom(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Room not found" });
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/kpi/push", requireAdmin, async (_req, res, next) => {
    try {
      res.json({ snapshot: await buildAndPushSnapshot() });
    } catch (err) {
      next(err);
    }
  });
}
function subIdFromInvoice(invoice) {
  const anyInv = invoice;
  const direct = anyInv.subscription;
  if (typeof direct === "string") return direct;
  if (direct && typeof direct === "object") return direct.id;
  const parentSub = anyInv.parent?.subscription_details?.subscription;
  if (typeof parentSub === "string") return parentSub;
  if (parentSub && typeof parentSub === "object") return parentSub.id;
  const lineSub = anyInv.lines?.data?.find((l) => l.parent?.subscription_item_details?.subscription)?.parent?.subscription_item_details?.subscription;
  return lineSub;
}
async function handleStripeEvent(event) {
  switch (event.type) {
    case "checkout.session.completed": {
      const session2 = event.data.object;
      const reference = session2.metadata?.reference || session2.client_reference_id || void 0;
      if (!reference) break;
      const booking = await storage.getBookingByReference(reference);
      if (!booking) break;
      const payment = await storage.getPaymentByStripeRef(session2.id);
      if (payment) {
        await storage.updatePayment(payment.id, { status: "PAID", paidAt: /* @__PURE__ */ new Date() });
      }
      await storage.updateBooking(booking.id, {
        status: booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED"
      });
      if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
      if (session2.mode === "subscription" && session2.subscription) {
        const subId = typeof session2.subscription === "string" ? session2.subscription : session2.subscription.id;
        const existing = await storage.getSubscriptionByStripeId(subId);
        if (!existing) {
          const room = booking.roomId ? await storage.getRoom(booking.roomId) : null;
          await storage.createSubscription({
            bookingId: booking.id,
            stripeSubscriptionId: subId,
            weeklyAmount: room ? room.weeklyRent : "0",
            status: "active",
            nextChargeAt: null
          });
        }
      }
      log(`booking ${reference} confirmed via checkout.session.completed`, "stripe");
      break;
    }
    case "invoice.paid": {
      const invoice = event.data.object;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (!sub) break;
      await storage.createPayment({
        bookingId: sub.bookingId,
        type: "WEEKLY",
        method: "STRIPE",
        amount: String((invoice.amount_paid ?? 0) / 100),
        surcharge: "0",
        status: "PAID",
        stripeRef: invoice.id ?? null,
        confirmedBy: null,
        paidAt: /* @__PURE__ */ new Date()
      });
      await storage.updateSubscription(sub.id, { status: "active" });
      log(`weekly invoice paid for subscription ${subId}`, "stripe");
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object;
      const subId = subIdFromInvoice(invoice);
      if (!subId) break;
      const sub = await storage.getSubscriptionByStripeId(subId);
      if (sub) await storage.updateSubscription(sub.id, { status: "past_due" });
      log(`weekly invoice FAILED for subscription ${subId}`, "stripe");
      break;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const local = await storage.getSubscriptionByStripeId(sub.id);
      if (local) await storage.updateSubscription(local.id, { status: sub.status });
      break;
    }
    // --- Phase 4: co-living lease PaymentIntents (saved-card model) ---
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const kind = pi.metadata?.payment_kind;
      if (kind === "FIRST_PAYMENT") {
        await finalizeFirstPayment(pi.id);
      } else if (kind === "SCHEDULED_RENT") {
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          if (row && row.status !== "PAID") {
            await storage.updateScheduleRow(row.id, {
              status: "PAID",
              paidAt: /* @__PURE__ */ new Date(),
              stripePaymentIntentId: pi.id
            });
            const lease = await storage.getLease(leaseId);
            const property = lease ? await storage.getProperty(lease.propertyId) : null;
            if (lease && property) {
              const leaseRooms2 = await storage.getLeaseRooms(lease.id);
              try {
                await billAccruedLateFees({ lease, property, rooms: leaseRooms2, scheduleSeq: seq });
              } catch (feeErr) {
                log(`webhook late-fee billing failed ${leaseId} seq ${seq}: ${feeErr.message}`, "stripe");
              }
            }
          }
        }
      }
      log(`payment_intent.succeeded (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const kind = pi.metadata?.payment_kind;
      if (kind === "SCHEDULED_RENT") {
        const leaseId = pi.metadata?.lease_id;
        const seq = parseInt(pi.metadata?.schedule_seq ?? "", 10);
        if (leaseId && Number.isFinite(seq)) {
          const rows = await storage.getScheduleByLease(leaseId);
          const row = rows.find((r) => r.scheduleSeq === seq);
          if (row && row.status !== "PAID" && row.status !== "WAIVED") {
            const failed = await storage.updateScheduleRow(row.id, { status: "FAILED", stripePaymentIntentId: pi.id }) ?? row;
            const lease = await storage.getLease(leaseId);
            const guest = lease ? await storage.getGuest(lease.guestId) : null;
            if (lease && guest) {
              try {
                await handleChargeFailure({ lease, guest, scheduleRow: failed, reason: pi.last_payment_error?.message });
              } catch (dErr) {
                log(`webhook failure-path error ${leaseId} seq ${seq}: ${dErr.message}`, "stripe");
              }
            }
          }
        }
      }
      log(`payment_intent.payment_failed (${kind ?? "untagged"}) ${pi.id}`, "stripe");
      break;
    }
    default:
      break;
  }
}

// server/app.ts
var isDev = process.env.NODE_ENV !== "production";
function applyBaseMiddleware(app) {
  app.set("trust proxy", 1);
  app.use(compression());
  app.use(
    helmet({
      contentSecurityPolicy: isDev ? false : {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com"],
          frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );
  app.use(express2.json({ limit: "10mb" }));
  app.use(express2.urlencoded({ extended: false, limit: "10mb" }));
  app.use((req, res, next) => {
    const start = Date.now();
    res.on("finish", () => {
      if (!req.path.startsWith("/api")) return;
      let line = `${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`;
      if (line.length > 80) line = line.slice(0, 79) + "\u2026";
      log(line);
    });
    next();
  });
}
function applyErrorHandler(app) {
  app.use((err, _req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    console.error(err);
  });
}
async function createApp() {
  const app = express2();
  applyBaseMiddleware(app);
  await registerRoutes(app);
  applyErrorHandler(app);
  return app;
}

// api-src/index.ts
var appPromise = null;
function getApp() {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}
async function handler(req, res) {
  const app = await getApp();
  return app(req, res);
}
export {
  handler as default
};

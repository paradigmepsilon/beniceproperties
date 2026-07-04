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
import multer from "multer";
import { z as z3 } from "zod";

// server/auth.ts
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// server/storage.ts
import { and, asc, desc, eq, gte, inArray, ne, sql as sql3 } from "drizzle-orm";

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
  DEPOSIT_STATUSES: () => DEPOSIT_STATUSES,
  ESCALATION_KINDS: () => ESCALATION_KINDS,
  ESCALATION_SEVERITIES: () => ESCALATION_SEVERITIES,
  ESCALATION_STATUSES: () => ESCALATION_STATUSES,
  LATE_FEE_PER_DAY: () => LATE_FEE_PER_DAY,
  LATE_FEE_STATUSES: () => LATE_FEE_STATUSES,
  LEASE_ENDING_NOTICE_DAYS: () => LEASE_ENDING_NOTICE_DAYS,
  LEASE_STATUSES: () => LEASE_STATUSES,
  LIFECYCLE_EVENT_TYPES: () => LIFECYCLE_EVENT_TYPES,
  LIFECYCLE_SEND_STATUSES: () => LIFECYCLE_SEND_STATUSES,
  MAX_LEASE_DAYS: () => MAX_LEASE_DAYS,
  MESSAGE_AUTHOR_ROLES: () => MESSAGE_AUTHOR_ROLES,
  MESSAGE_CATEGORIES: () => MESSAGE_CATEGORIES,
  MESSAGE_STATUSES: () => MESSAGE_STATUSES,
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
  US_STATE_CODES: () => US_STATE_CODES,
  VERIFICATION_STATUSES: () => VERIFICATION_STATUSES,
  adminUsers: () => adminUsers,
  allowedCadencesForTerm: () => allowedCadencesForTerm,
  appSettings: () => appSettings,
  bookings: () => bookings,
  externalBookings: () => externalBookings,
  guestMessages: () => guestMessages,
  guests: () => guests,
  heroImages: () => heroImages,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertAppSettingSchema: () => insertAppSettingSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertExternalBookingSchema: () => insertExternalBookingSchema,
  insertGuestMessageSchema: () => insertGuestMessageSchema,
  insertGuestSchema: () => insertGuestSchema,
  insertHeroImageSchema: () => insertHeroImageSchema,
  insertKpiSnapshotSchema: () => insertKpiSnapshotSchema,
  insertLateFeeSchema: () => insertLateFeeSchema,
  insertLeaseRoomSchema: () => insertLeaseRoomSchema,
  insertLeaseSchema: () => insertLeaseSchema,
  insertLifecycleEventSchema: () => insertLifecycleEventSchema,
  insertNotificationLogSchema: () => insertNotificationLogSchema,
  insertPaymentScheduleSchema: () => insertPaymentScheduleSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertUoEscalationSchema: () => insertUoEscalationSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  kpiSnapshots: () => kpiSnapshots,
  lateFees: () => lateFees,
  leaseRooms: () => leaseRooms,
  leases: () => leases,
  lifecycleEvents: () => lifecycleEvents,
  listingContentSchema: () => listingContentSchema,
  notificationLog: () => notificationLog,
  paymentSchedule: () => paymentSchedule,
  payments: () => payments,
  properties: () => properties,
  rooms: () => rooms,
  subscriptions: () => subscriptions,
  uoEscalations: () => uoEscalations,
  vehicles: () => vehicles
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
  // signed; awaiting the securing payment (deposit)
  "PENDING_VERIFICATION",
  // deposit paid + room secured; awaiting ID approval
  "ACTIVE",
  // verified (ID approved) AND securing payment succeeded
  "COMPLETED",
  // term finished, fully paid
  "TERMINATED",
  // ended early
  "DEFAULTED"
  // unpaid past the default threshold
];
var VERIFICATION_STATUSES = [
  "NOT_SUBMITTED",
  "PENDING_REVIEW",
  "APPROVED",
  "REJECTED"
];
var US_STATE_CODES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
  "DC"
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
var DEPOSIT_STATUSES = ["PENDING", "PAID", "REFUNDED", "WAIVED"];
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
function allowedCadencesForTerm(termDays) {
  if (termDays >= 84) return ["WEEKLY", "BIWEEKLY", "MONTHLY"];
  if (termDays >= 28) return ["WEEKLY", "MONTHLY"];
  return ["WEEKLY"];
}
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
var ESCALATION_KINDS = [
  "PAYMENT_FAILED",
  "PAYMENT_OVERDUE",
  "LEASE_DEFAULTED",
  "VERIFICATION_PENDING"
  // a tenant uploaded a license awaiting admin review
];
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
  // Structured presentation content for the detail page (hook, essentials,
  // getting-around, who-for). Additive, nullable; falls back to `description`.
  listingContent: jsonb("listing_content").$type(),
  // string[] of photo URLs.
  photos: jsonb("photos").$type().default(sql`'[]'::jsonb`),
  // string[] of amenity labels.
  amenities: jsonb("amenities").$type().default(sql`'[]'::jsonb`),
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
  priorNames: jsonb("prior_names").$type().default(sql`'[]'::jsonb`),
  // The Airbnb listing_room_id this STR property maps to (entire-home listing).
  // Links live inventory to the airbnb_reservations staging data. Additive.
  airbnbListingRoomId: text("airbnb_listing_room_id"),
  // The Airbnb hosting-calendar iCal (.ics) export URL for this listing — the
  // single source of truth for its inbound calendar sync (server/lib/icalSync.ts
  // fetches it into external_bookings). Managed from Unified-Ops. Tokenized;
  // treat as secret-ish (DB only, never logged/committed). Nullable. Additive.
  airbnbIcalUrl: text("airbnb_ical_url"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
});
var listingContentSchema = z.object({
  hook: z.string().optional(),
  essentials: z.array(z.object({ icon: z.string().optional(), label: z.string() })).optional(),
  gettingAround: z.array(z.object({ place: z.string(), time: z.string() })).optional(),
  whoFor: z.string().optional()
});
var insertPropertySchema = createInsertSchema(properties, {
  type: z.enum(PROPERTY_TYPES),
  entity: z.enum(PROPERTY_ENTITIES).optional(),
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional(),
  listingContent: listingContentSchema.nullish()
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
    // Structured presentation content for the detail page (hook, essentials,
    // getting-around, who-for). Additive, nullable; falls back to `description`.
    listingContent: jsonb("listing_content").$type(),
    photos: jsonb("photos").$type().default(sql`'[]'::jsonb`),
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
    priorNames: jsonb("prior_names").$type().default(sql`'[]'::jsonb`),
    // The Airbnb listing_room_id this room maps to (private-room listing). Links
    // live inventory to airbnb_reservations staging data. Additive.
    airbnbListingRoomId: text("airbnb_listing_room_id"),
    // The Airbnb hosting-calendar iCal (.ics) export URL for this room listing —
    // single source of truth for its inbound calendar sync. Managed from
    // Unified-Ops. Tokenized; secret-ish. Nullable. Additive. See
    // properties.airbnbIcalUrl.
    airbnbIcalUrl: text("airbnb_ical_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    propertyIdx: index("rooms_property_idx").on(table.propertyId),
    statusIdx: index("rooms_status_idx").on(table.status),
    airbnbIdx: index("rooms_airbnb_listing_idx").on(table.airbnbListingRoomId)
  })
);
var insertRoomSchema = createInsertSchema(rooms, {
  status: z.enum(ROOM_STATUSES),
  photos: z.array(z.string()).optional(),
  listingContent: listingContentSchema.nullish()
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
  status: z.enum(LEASE_STATUSES).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional()
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
var vehicles = pgTable(
  "vehicles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    leaseId: varchar("lease_id").notNull().references(() => leases.id),
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("vehicles_lease_idx").on(table.leaseId)
  })
);
var insertVehicleSchema = createInsertSchema(vehicles, {
  plateState: z.enum(US_STATE_CODES).nullish(),
  // Reasonable bounds; a plausible vehicle year range. Nullable (cleared when the
  // tenant declares no vehicle).
  year: z.number().int().min(1900).max(2100).nullish()
}).omit({ id: true, createdAt: true, updatedAt: true });
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
var MESSAGE_AUTHOR_ROLES = ["GUEST", "STAFF"];
var MESSAGE_STATUSES = ["OPEN", "ANSWERED", "RESOLVED"];
var MESSAGE_CATEGORIES = ["QUESTION", "MAINTENANCE", "OTHER"];
var guestMessages = pgTable(
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
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("guest_messages_lease_idx").on(table.leaseId),
    threadIdx: index("guest_messages_thread_idx").on(table.threadId),
    statusIdx: index("guest_messages_status_idx").on(table.status)
  })
);
var insertGuestMessageSchema = createInsertSchema(guestMessages, {
  authorRole: z.enum(MESSAGE_AUTHOR_ROLES).optional(),
  category: z.enum(MESSAGE_CATEGORIES).optional(),
  status: z.enum(MESSAGE_STATUSES).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var LIFECYCLE_EVENT_TYPES = [
  "DEPOSIT_RECEIPT",
  // on deposit paid — room secured (guest)
  "COLIVING_WELCOME",
  // on lease activation (guest)
  "COLIVING_SCHEDULE_RECAP",
  // on activation (guest) — full schedule
  "COLIVING_ADMIN_NEW_LEASE",
  // on activation (admin)
  "PAYMENT_RECEIPT",
  // per successful rent charge (uses schedule_seq)
  "LEASE_ENDING_SOON"
  // ~14 days before end_date
];
var LIFECYCLE_SEND_STATUSES = ["SENT", "SKIPPED", "FAILED"];
var LEASE_ENDING_NOTICE_DAYS = 14;
var lifecycleEvents = pgTable(
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
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    leaseIdx: index("lifecycle_events_lease_idx").on(table.leaseId),
    dedupeIdx: index("lifecycle_events_dedupe_idx").on(
      table.leaseId,
      table.eventType,
      table.scheduleSeq
    )
  })
);
var insertLifecycleEventSchema = createInsertSchema(lifecycleEvents).omit({
  id: true,
  createdAt: true
});
var heroImages = pgTable(
  "hero_images",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    s3Url: text("s3_url").notNull(),
    // Overlay/accessibility label; nullable.
    altText: text("alt_text"),
    // Rotation order (ascending). New images append to the end.
    displayOrder: integer("display_order").notNull().default(0),
    // Whether this slide shows on the public homepage.
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    activeOrderIdx: index("hero_images_active_order_idx").on(table.isActive, table.displayOrder)
  })
);
var insertHeroImageSchema = createInsertSchema(heroImages).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});
var externalBookings = pgTable(
  "external_bookings",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    // The listing this block belongs to. STR: property set, room null.
    // Co-living: room set + property set (property denormalized for query).
    propertyId: varchar("property_id"),
    roomId: varchar("room_id"),
    // iCal UID (or component key fallback) — the idempotency key within a listing.
    externalId: text("external_id").notNull(),
    startDate: date("start_date").notNull(),
    // iCal DTEND is EXCLUSIVE (checkout morning) — stored as-is; STR overlap is
    // half-open, co-living normalizes to inclusive at read time.
    endDate: date("end_date").notNull(),
    summary: text("summary"),
    lastSynced: timestamp("last_synced"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    // Hot path — STR availability: property + date range.
    propertyRangeIdx: index("ext_bookings_property_range_idx").on(
      table.propertyId,
      table.startDate,
      table.endDate
    ),
    // Hot path — co-living availability: room + date range.
    roomRangeIdx: index("ext_bookings_room_range_idx").on(
      table.roomId,
      table.startDate,
      table.endDate
    ),
    // Idempotency / safe-delete keys (upsert on the listing + iCal UID).
    propertyExternalIdx: index("ext_bookings_property_external_idx").on(
      table.propertyId,
      table.externalId
    ),
    roomExternalIdx: index("ext_bookings_room_external_idx").on(table.roomId, table.externalId)
  })
);
var insertExternalBookingSchema = createInsertSchema(externalBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

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
function parseYmd(ymd3) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd3);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd3}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
function toYmd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays(ymd3, days) {
  return toYmd(new Date(parseYmd(ymd3).getTime() + days * MS_PER_DAY));
}
function inclusiveDays(startDate, endDate) {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
}
function generateTierSchedule(input) {
  if (!(input.effectiveNightly > 0)) throw new ScheduleError("effectiveNightly must be positive");
  if (!(input.periodDays >= 1)) throw new ScheduleError("periodDays must be at least 1");
  return buildSchedule(input);
}
function buildSchedule(input) {
  const { startDate, endDate, cadence, effectiveNightly, periodDays } = input;
  const start = parseYmd(startDate);
  const end = parseYmd(endDate);
  if (end.getTime() < start.getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }
  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }
  const fullPeriodAmount = roundCurrency(effectiveNightly * periodDays);
  const perDayRate = effectiveNightly;
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
  const prorationNote = finalProrated ? `${fullCount} full ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, plus a final prorated installment of $${finalProrated.amount.toFixed(2)} covering ${finalProrated.daysCovered} day(s). First payment due on the move-in date.` : `${fullCount} ${cadence.toLowerCase()} installment(s) of $${fullPeriodAmount.toFixed(2)}, no proration. First payment due on the move-in date.`;
  return { installments, totalLeaseValue, prorationNote, totalDays };
}

// server/storage.ts
var ROOM_BLOCKING_LEASE_STATUSES = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "PENDING_FIRST_PAYMENT",
  "PENDING_VERIFICATION",
  // deposit paid, room secured, awaiting ID approval
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
  // --- Hero images (BT-22) ---
  async getActiveHeroImages() {
    return db.select().from(heroImages).where(eq(heroImages.isActive, true)).orderBy(asc(heroImages.displayOrder), asc(heroImages.createdAt));
  }
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
  async getStrBookingsEndingOnOrAfter(propertyIds, date2) {
    if (propertyIds.length === 0) return [];
    return db.select().from(bookings).where(
      and(
        inArray(bookings.propertyId, propertyIds),
        eq(bookings.model, "STR"),
        ne(bookings.status, "CANCELLED"),
        // SQL null comparison also drops open-ended stays (null checkOut).
        gte(bookings.checkOut, date2)
      )
    ).orderBy(asc(bookings.checkIn));
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
  async getSoonestOccupyingLeaseEndByProperty(propertyIds, onOrAfter) {
    if (propertyIds.length === 0) return {};
    const rows = await db.select({
      propertyId: leases.propertyId,
      minEnd: sql3`min(${leases.endDate})`
    }).from(leases).where(
      and(
        inArray(leases.propertyId, propertyIds),
        inArray(leases.status, ["PENDING_VERIFICATION", "ACTIVE"]),
        gte(leases.endDate, onOrAfter)
      )
    ).groupBy(leases.propertyId);
    return Object.fromEntries(rows.map((r) => [r.propertyId, r.minEnd]));
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
  async getLeaseByPortalToken(token) {
    const [row] = await db.select().from(leases).where(eq(leases.portalToken, token));
    return row;
  }
  async getLeaseRooms(leaseId) {
    return db.select().from(leaseRooms).where(eq(leaseRooms.leaseId, leaseId));
  }
  // --- Vehicles (one row per lease; upsert keyed on lease_id) ---
  async getVehicleByLease(leaseId) {
    const [row] = await db.select().from(vehicles).where(eq(vehicles.leaseId, leaseId));
    return row;
  }
  async upsertVehicleByLease(leaseId, data) {
    const existing = await this.getVehicleByLease(leaseId);
    if (existing) {
      const [row2] = await db.update(vehicles).set({ ...data, leaseId, updatedAt: /* @__PURE__ */ new Date() }).where(eq(vehicles.id, existing.id)).returning();
      return row2;
    }
    const [row] = await db.insert(vehicles).values({ ...data, leaseId }).returning();
    return row;
  }
  // --- Guest messages ---
  async getMessageThreadsByLease(leaseId) {
    const all = await db.select().from(guestMessages).where(eq(guestMessages.leaseId, leaseId)).orderBy(desc(guestMessages.createdAt));
    return all.filter((m) => m.id === m.threadId);
  }
  async getMessagesByThread(threadId) {
    return db.select().from(guestMessages).where(eq(guestMessages.threadId, threadId)).orderBy(asc(guestMessages.createdAt));
  }
  async getMessage(id) {
    const [row] = await db.select().from(guestMessages).where(eq(guestMessages.id, id));
    return row;
  }
  async createMessage(data) {
    if (data.threadId) {
      const [row2] = await db.insert(guestMessages).values(data).returning();
      return row2;
    }
    const [row] = await db.insert(guestMessages).values({ ...data, threadId: sql3`gen_random_uuid()` }).returning();
    const [fixed] = await db.update(guestMessages).set({ threadId: row.id }).where(eq(guestMessages.id, row.id)).returning();
    return fixed;
  }
  async updateMessage(id, updates) {
    const [row] = await db.update(guestMessages).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(guestMessages.id, id)).returning();
    return row;
  }
  // --- Lifecycle events ---
  async hasLifecycleEvent(leaseId, eventType, scheduleSeq) {
    const rows = await db.select().from(lifecycleEvents).where(and(eq(lifecycleEvents.leaseId, leaseId), eq(lifecycleEvents.eventType, eventType)));
    return rows.some((r) => (r.scheduleSeq ?? null) === scheduleSeq);
  }
  async recordLifecycleEvent(data) {
    const [row] = await db.insert(lifecycleEvents).values(data).returning();
    return row;
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
    const blocking = (await this.getRoomBlockingLeasesForRoom(args.roomId)).filter(
      (l) => l.id !== args.excludeLeaseId
    );
    if (blocking.some((l) => args.startDate <= l.endDate && l.startDate <= args.endDate)) {
      return false;
    }
    const blocks = await this.getExternalBlocksForRoom(args.roomId);
    return !blocks.some((b) => args.startDate < b.endDate && b.startDate <= args.endDate);
  }
  // ---------------------------------------------------------------------------
  // Airbnb iCal listings (URL on properties/rooms) + synced date blocks
  // ---------------------------------------------------------------------------
  async getListingsWithIcalUrl() {
    const propRows = await db.select({ id: properties.id, name: properties.name, url: properties.airbnbIcalUrl }).from(properties).where(and(eq(properties.active, true), sql3`${properties.airbnbIcalUrl} IS NOT NULL`));
    const roomRows = await db.select({
      id: rooms.id,
      propertyId: rooms.propertyId,
      name: rooms.name,
      url: rooms.airbnbIcalUrl
    }).from(rooms).where(sql3`${rooms.airbnbIcalUrl} IS NOT NULL`);
    const listings = [];
    for (const p of propRows) {
      if (!p.url) continue;
      listings.push({ kind: "property", propertyId: p.id, roomId: null, url: p.url, label: p.name });
    }
    for (const r of roomRows) {
      if (!r.url) continue;
      listings.push({ kind: "room", propertyId: r.propertyId, roomId: r.id, url: r.url, label: r.name });
    }
    return listings;
  }
  async getExternalBlocksForProperty(propertyId) {
    return db.select().from(externalBookings).where(
      and(eq(externalBookings.propertyId, propertyId), sql3`${externalBookings.roomId} IS NULL`)
    );
  }
  async getExternalBlocksForRoom(roomId) {
    return db.select().from(externalBookings).where(eq(externalBookings.roomId, roomId));
  }
  async upsertExternalBooking(data) {
    const listingMatch = data.roomId ? eq(externalBookings.roomId, data.roomId) : and(
      eq(externalBookings.propertyId, data.propertyId),
      sql3`${externalBookings.roomId} IS NULL`
    );
    const [existing] = await db.select({ id: externalBookings.id }).from(externalBookings).where(and(listingMatch, eq(externalBookings.externalId, data.externalId))).limit(1);
    if (existing) {
      const [row2] = await db.update(externalBookings).set({
        propertyId: data.propertyId ?? null,
        roomId: data.roomId ?? null,
        startDate: data.startDate,
        endDate: data.endDate,
        summary: data.summary ?? null,
        lastSynced: data.lastSynced ?? /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(externalBookings.id, existing.id)).returning();
      return row2;
    }
    const [row] = await db.insert(externalBookings).values({ ...data, lastSynced: data.lastSynced ?? /* @__PURE__ */ new Date() }).returning();
    return row;
  }
  async deleteExternalBooking(id) {
    await db.delete(externalBookings).where(eq(externalBookings.id, id));
  }
  async getStrBookingsForProperty(propertyId) {
    return db.select().from(bookings).where(
      and(
        eq(bookings.propertyId, propertyId),
        eq(bookings.model, "STR"),
        ne(bookings.status, "CANCELLED")
      )
    ).orderBy(asc(bookings.checkIn));
  }
  async getRoomBlockingLeasesForRoom(roomId) {
    const links = await db.select({ leaseId: leaseRooms.leaseId }).from(leaseRooms).where(eq(leaseRooms.roomId, roomId));
    const leaseIds = links.map((l) => l.leaseId);
    if (leaseIds.length === 0) return [];
    return db.select().from(leases).where(
      and(
        inArray(leases.id, leaseIds),
        inArray(leases.status, [...ROOM_BLOCKING_LEASE_STATUSES])
      )
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
  // Deprecated: cadence is auto-derived server-side from stay length. Kept
  // optional for back-compat with callers that still send it (value ignored).
  cadence: z2.enum(PAYMENT_CADENCES).optional()
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
import { differenceInCalendarDays, parseISO as parseISO2 } from "date-fns";

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

// shared/rateSelection.ts
import { addDays as addDays2, getDay, parseISO } from "date-fns";
var TIER_DAYS = {
  DAILY: 1,
  WEEKLY: 7,
  MONTHLY: 28
};
var MONTHLY_MIN_NIGHTS = 28;
var WEEKLY_MIN_NIGHTS = 7;
var RateError = class extends Error {
};
var roundCurrency3 = (v) => Math.round(v * 100) / 100;
function parseRate(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function tierForNights(nights2) {
  if (nights2 >= MONTHLY_MIN_NIGHTS) return "MONTHLY";
  if (nights2 >= WEEKLY_MIN_NIGHTS) return "WEEKLY";
  return "DAILY";
}
function chooseRate(input) {
  const { nights: nights2 } = input;
  if (!(nights2 >= 1)) throw new RateError("Stay must be at least 1 night");
  const rates = {
    DAILY: parseRate(input.daily),
    WEEKLY: parseRate(input.weekly),
    MONTHLY: parseRate(input.monthly)
  };
  const requestedTier = tierForNights(nights2);
  const order = requestedTier === "MONTHLY" ? ["MONTHLY", "WEEKLY", "DAILY"] : requestedTier === "WEEKLY" ? ["WEEKLY", "DAILY"] : ["DAILY"];
  for (const tier of order) {
    const tierRate = rates[tier];
    if (tierRate !== null) {
      const tierDays = TIER_DAYS[tier];
      return {
        tier,
        requestedTier,
        tierRate,
        tierDays,
        effectiveNightly: tierRate / tierDays,
        fellBack: tier !== requestedTier
      };
    }
  }
  throw new RateError(
    "No rate configured for this listing \u2014 set a daily, weekly, or monthly rate."
  );
}
var WEEKDAY_FIELDS = [
  "sunPrice",
  // 0
  "monPrice",
  // 1
  "tuePrice",
  // 2
  "wedPrice",
  // 3
  "thuPrice",
  // 4
  "friPrice",
  // 5
  "satPrice"
  // 6
];
function hasAnyWeekdayRate(rates) {
  return WEEKDAY_FIELDS.some((f) => parseRate(rates[f]) !== null);
}
function weekdayStayTotal(input) {
  const { checkIn, nights: nights2, weekdayRates, fallbackNightly } = input;
  if (!(nights2 >= 1)) throw new RateError("Stay must be at least 1 night");
  const start = parseISO(checkIn);
  let total = 0;
  for (let k = 0; k < nights2; k++) {
    const day = getDay(addDays2(start, k));
    const wkPrice = parseRate(weekdayRates[WEEKDAY_FIELDS[day]]);
    const nightly = wkPrice ?? fallbackNightly;
    if (nightly === null) {
      throw new RateError("No price for one or more nights of this stay.");
    }
    total += nightly;
  }
  return roundCurrency3(total);
}

// server/lib/booking.ts
var nanoref = customAlphabet("23456789ABCDEFGHJKLMNPQRSTUVWXYZ", 8);
function generateReference() {
  const raw = nanoref();
  return `BNP-${raw.slice(0, 4)}-${raw.slice(4)}`;
}
function nights(checkIn, checkOut) {
  const n = differenceInCalendarDays(parseISO2(checkOut), parseISO2(checkIn));
  return Math.max(0, n);
}
function strBaseTotal(property, n, checkIn) {
  const chosen = chooseRate({
    nights: n,
    // base_price is the legacy nightly; treat it as the daily-tier rate so a
    // property with only base_price set keeps billing nightly × n.
    daily: property.dailyRate ?? property.basePrice,
    weekly: property.weeklyRate,
    monthly: property.monthlyRate
  });
  if (chosen.tier === "DAILY") {
    const weekdayRates = {
      monPrice: property.monPrice,
      tuePrice: property.tuePrice,
      wedPrice: property.wedPrice,
      thuPrice: property.thuPrice,
      friPrice: property.friPrice,
      satPrice: property.satPrice,
      sunPrice: property.sunPrice
    };
    if (hasAnyWeekdayRate(weekdayRates)) {
      const baseAmount = weekdayStayTotal({
        checkIn,
        nights: n,
        weekdayRates,
        // chosen.effectiveNightly for DAILY == dailyRate ?? basePrice (tierDays 1).
        fallbackNightly: chosen.effectiveNightly
      });
      return {
        baseAmount,
        tier: "DAILY",
        // Nightly prices vary across the stay, so there is no single nightly rate.
        // effectiveNightly is a DISPLAY average only — baseAmount is authoritative
        // and is the value that flows to the charge. (Verified: nothing downstream
        // uses effectiveNightly for STR money math.)
        effectiveNightly: Math.round(baseAmount / n * 100) / 100
      };
    }
  }
  return {
    baseAmount: Math.round(chosen.effectiveNightly * n * 100) / 100,
    tier: chosen.tier,
    effectiveNightly: chosen.effectiveNightly
  };
}
var BookingError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function strHasConflict(propertyId, checkIn, checkOut) {
  const inMs = parseISO2(checkIn).getTime();
  const outMs = parseISO2(checkOut).getTime();
  const overlaps = (bIn, bOut) => inMs < parseISO2(bOut).getTime() && parseISO2(bIn).getTime() < outMs;
  const existing = await storage.getBookings();
  const directHit = existing.some((b) => {
    if (b.propertyId !== propertyId || b.model !== "STR") return false;
    if (b.status === "CANCELLED") return false;
    if (!b.checkOut) return false;
    return overlaps(b.checkIn, b.checkOut);
  });
  if (directHit) return true;
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  return blocks.some((b) => overlaps(b.startDate, b.endDate));
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
  const str2 = strBaseTotal(property, n, input.checkIn);
  return {
    model: "STR",
    property,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    baseAmount: str2.baseAmount,
    cleaningFee: property.cleaningFee ? parseFloat(property.cleaningFee) : 0,
    nights: n,
    rateTier: str2.tier,
    effectiveNightly: str2.effectiveNightly
  };
}
function buildQuote(resolved, paymentMethod) {
  if (resolved.model === "STR") {
    const b = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod
    });
    const tierLabel = resolved.rateTier === "MONTHLY" ? " @ monthly rate" : resolved.rateTier === "WEEKLY" ? " @ weekly rate" : "";
    const lines = [
      {
        label: `Stay (${resolved.nights} night${resolved.nights === 1 ? "" : "s"}${tierLabel})`,
        amount: resolved.baseAmount
      }
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
var CADENCE_PERIOD_DAYS = {
  WEEKLY: 7,
  BIWEEKLY: 14,
  MONTHLY: 28
};
function sumRate(rooms2, pick) {
  let total = 0;
  let any = false;
  for (const r of rooms2) {
    const v = pick(r);
    const n = v == null ? NaN : parseFloat(v);
    if (Number.isFinite(n) && n > 0) {
      total += n;
      any = true;
    }
  }
  return any ? Math.round(total * 100) / 100 : null;
}
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
  const weeklyRateTotal = sumRate(rooms2, (r) => r.weeklyRent) ?? 0;
  const dailyTotal = sumRate(rooms2, (r) => r.dailyRate);
  const monthlyTotal = sumRate(rooms2, (r) => r.monthlyRate);
  const depositTotal = sumRate(rooms2, (r) => r.depositAmount) ?? 0;
  let chosen;
  try {
    chosen = chooseRate({
      nights: termDays,
      daily: dailyTotal,
      weekly: weeklyRateTotal,
      monthly: monthlyTotal
    });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    throw err;
  }
  const allowed = allowedCadencesForTerm(termDays);
  const cadence = input.cadence && allowed.includes(input.cadence) ? input.cadence : allowed[0];
  if (input.cadence && !allowed.includes(input.cadence)) {
    throw new LeaseError(
      `A ${input.cadence.toLowerCase()} schedule isn't available for a ${termDays}-day term`,
      422
    );
  }
  let generated;
  try {
    generated = generateTierSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence,
      effectiveNightly: chosen.effectiveNightly,
      periodDays: CADENCE_PERIOD_DAYS[cadence]
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
    cadence,
    allowedCadences: allowed,
    weeklyRateTotal,
    depositTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0
  };
}

// server/lib/availability.ts
import { addDays as addDays3, format, parseISO as parseISO3 } from "date-fns";
function todayIso() {
  return format(/* @__PURE__ */ new Date(), "yyyy-MM-dd");
}
function exclusiveEnd(inclusiveEnd) {
  return format(addDays3(parseISO3(inclusiveEnd), 1), "yyyy-MM-dd");
}
function sortByStart(ranges) {
  return [...ranges].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
}
async function buildStrAvailability(propertyId) {
  const today = todayIso();
  const bookings2 = await storage.getStrBookingsForProperty(propertyId);
  const directRanges = bookings2.filter((b) => b.checkOut && b.checkOut >= today).map((b) => ({ start: b.checkIn, end: b.checkOut, source: "direct" }));
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  const externalRanges = blocks.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "external" }));
  return { busy: sortByStart([...directRanges, ...externalRanges]), minDate: today };
}
async function buildRoomAvailability(roomId) {
  const today = todayIso();
  const leases2 = await storage.getRoomBlockingLeasesForRoom(roomId);
  const leaseRanges = leases2.filter((l) => l.endDate >= today).map((l) => ({ start: l.startDate, end: exclusiveEnd(l.endDate), source: "direct" }));
  const blocks = await storage.getExternalBlocksForRoom(roomId);
  const externalRanges = blocks.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "external" }));
  return { busy: sortByStart([...leaseRanges, ...externalRanges]), minDate: today };
}

// server/lib/nextOpening.ts
import { addDays as addDays4, parseISO as parseISO4 } from "date-fns";
var ymd = (d) => d.toISOString().slice(0, 10);
function dayAfter(isoDate) {
  return ymd(addDays4(parseISO4(isoDate), 1));
}
function strNextOpening(stays, today) {
  const spans = stays.filter((s) => s.checkOut != null).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
  let open = null;
  for (const s of spans) {
    if (open == null) {
      if (s.checkIn <= today && today < s.checkOut) open = s.checkOut;
    } else if (s.checkIn <= open && s.checkOut > open) {
      open = s.checkOut;
    }
  }
  return open;
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
    schedule_seq: str(args.scheduleSeq),
    rate_cadence: str(args.rateCadence ?? null)
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
    schedule_seq: NULL,
    rate_cadence: str(args.rateCadence ?? null)
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

// server/lib/leaseFlow.ts
import { customAlphabet as customAlphabet2 } from "nanoid";

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
var portalTokenGen = customAlphabet2(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  32
);
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
async function previewLease(input) {
  const quote = await buildLeaseQuote({
    propertyId: input.propertyId,
    roomIds: input.roomIds,
    startDate: input.startDate,
    endDate: input.endDate,
    cadence: input.cadence
  });
  const property = await storage.getProperty(input.propertyId);
  if (!property) throw new LeaseError("Property not found", 404);
  const documentHtml = renderLeaseHtml(
    docDataFrom("PREVIEW", quote, input.guest, property.location)
  );
  return { documentHtml };
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
      // Freeze the refundable deposit at booking so a later room re-price never
      // changes a signed lease. This is the amount that secures the room.
      depositAmountSnapshot: String(quote.depositTotal),
      depositStatus: "PENDING",
      status: "PENDING_SIGNATURE",
      portalToken: portalTokenGen()
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
async function refundPaymentIntent(opts) {
  return requireStripe().refunds.create(
    { payment_intent: opts.paymentIntentId },
    { idempotencyKey: opts.idempotencyKey }
  );
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
    const client2 = await getTwilio();
    await client2.messages.create({
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
var ymd2 = (d) => d.toISOString().slice(0, 10);
async function handleChargeFailure(args) {
  const today = args.today ?? ymd2(/* @__PURE__ */ new Date());
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

// server/lib/lifecycle.ts
var MS_PER_DAY3 = 24 * 60 * 60 * 1e3;
var fmtMoney2 = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
var LIFECYCLE_TEMPLATES = {
  welcome: (v) => ({
    subject: `Welcome to ${v.property} \u{1F389}`,
    body: `Hi ${v.name}, welcome! Your lease at ${v.property} is active and your move-in date is ${v.start}. We're glad to have you. Your full payment schedule and signed lease are in your guest portal. Reach out anytime through the portal with questions or maintenance requests.`
  }),
  scheduleRecap: (v) => ({
    subject: "Your lease payment schedule",
    body: `Hi ${v.name}, here is your full payment schedule (total ${v.total}):

${v.rows}

Payments on a saved card are charged automatically on each due date. Manage everything in your portal: ${v.portalUrl}`
  }),
  adminNewLease: (v) => ({
    subject: `New co-living lease \u2014 ${v.property}`,
    body: `New lease activated at ${v.property}. Guest: ${v.guest}. Term: ${v.start} \u2192 ${v.end}. Total lease value: ${v.total}.`
  }),
  paymentReceipt: (v) => ({
    subject: `Payment received \u2014 ${v.property}`,
    body: `Hi ${v.name}, we received your rent payment of ${v.amount} (installment #${v.seq}) for ${v.property}. Thank you! A record is available in your portal.`
  }),
  depositReceipt: (v) => ({
    subject: `Your room is secured \u2014 ${v.property} \u{1F512}`,
    body: `Hi ${v.name}, we received your refundable security deposit of ${v.amount} \u2014 your room (${v.room}) at ${v.property} is now secured and held for you. The deposit is returned at the end of your lease per the agreement.

One last step to activate your lease: upload a photo of your driver's license from your portal so we can verify your identity. Once we approve it, your lease goes active and your first week's rent is charged. Upload here: ${v.portalUrl}`
  }),
  leaseEnding: (v) => ({
    subject: `Your lease ends in ${v.days} days`,
    body: `Hi ${v.name}, your lease at ${v.property} ends on ${v.end} (${v.days} days away). If you'd like to renew or extend, reply or reach out through your portal: ${v.portalUrl}. We'd love to have you stay.`
  })
};
function portalUrl(lease) {
  return lease.portalToken ? `${publicBaseUrl2()}/portal/${lease.portalToken}` : `${publicBaseUrl2()}/lookup`;
}
async function onLeaseActivated(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) return;
  const [property, guest, schedule] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getScheduleByLease(lease.id)
  ]);
  if (!property || !guest) return;
  if (!await storage.hasLifecycleEvent(lease.id, "COLIVING_WELCOME", null)) {
    const tpl = LIFECYCLE_TEMPLATES.welcome({ name: guest.name, property: property.name, start: lease.startDate });
    const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_WELCOME",
      scheduleSeq: null,
      status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
  }
  if (!await storage.hasLifecycleEvent(lease.id, "COLIVING_SCHEDULE_RECAP", null)) {
    const rows = schedule.map((s) => `  #${s.scheduleSeq}  ${s.dueDate}  ${fmtMoney2(parseFloat(s.amount))}`).join("\n");
    const tpl = LIFECYCLE_TEMPLATES.scheduleRecap({
      name: guest.name,
      total: fmtMoney2(parseFloat(lease.totalLeaseValue)),
      rows,
      portalUrl: portalUrl(lease)
    });
    const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_SCHEDULE_RECAP",
      scheduleSeq: null,
      status: sent.email.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
  }
  if (!await storage.hasLifecycleEvent(lease.id, "COLIVING_ADMIN_NEW_LEASE", null)) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewLease({
      property: property.name,
      guest: guest.name,
      start: lease.startDate,
      end: lease.endDate,
      total: fmtMoney2(parseFloat(lease.totalLeaseValue))
    });
    const adminEmail = process.env.ADMIN_EMAIL;
    const res = adminEmail ? await sendEmail({ to: adminEmail, subject: tpl.subject, text: tpl.body }) : { sent: false };
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_ADMIN_NEW_LEASE",
      scheduleSeq: null,
      status: res.sent ? "SENT" : "SKIPPED",
      emailSent: res.sent,
      smsSent: false
    });
  }
  log(`lifecycle: activation emails processed for lease ${lease.id}`, "lifecycle");
}
async function onPaymentReceived(args) {
  const { lease, property, guest, scheduleRow } = args;
  if (await storage.hasLifecycleEvent(lease.id, "PAYMENT_RECEIPT", scheduleRow.scheduleSeq)) return;
  const tpl = LIFECYCLE_TEMPLATES.paymentReceipt({
    name: guest.name,
    amount: fmtMoney2(parseFloat(scheduleRow.amount)),
    seq: scheduleRow.scheduleSeq,
    property: property.name
  });
  const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "PAYMENT_RECEIPT",
    scheduleSeq: scheduleRow.scheduleSeq,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
}
async function onDepositReceived(args) {
  const { lease, property, guest } = args;
  if (await storage.hasLifecycleEvent(lease.id, "DEPOSIT_RECEIPT", null)) return;
  const rooms2 = await storage.getLeaseRooms(lease.id);
  const roomNames = rooms2.map((r) => r.roomNameSnapshot).join(", ") || "your room";
  const tpl = LIFECYCLE_TEMPLATES.depositReceipt({
    name: guest.name,
    amount: fmtMoney2(parseFloat(lease.depositAmountSnapshot ?? "0")),
    property: property.name,
    room: roomNames,
    portalUrl: portalUrl(lease)
  });
  const sent = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "DEPOSIT_RECEIPT",
    scheduleSeq: null,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
}
function publicBaseUrl2() {
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
  return {
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    amount,
    portalToken: lease.portalToken ?? null
  };
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
    const room = await storage.getRoom(lr.roomId);
    if (room && room.status !== "OCCUPIED") {
      await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
    }
  }
  log(`lease ${lease.id} ACTIVE via first payment ${paymentIntentId}`, "stripe");
  try {
    await onLeaseActivated(lease.id);
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (property && guest) {
      await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: 1, amount: first.amount } });
    }
  } catch (err) {
    log(`lifecycle activation error lease ${lease.id}: ${err.message}`, "stripe");
  }
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
async function startDepositPayment(leaseId) {
  const { lease, property, rooms: rooms2 } = await loadLeaseContext(leaseId);
  if (lease.status !== "PENDING_FIRST_PAYMENT") {
    throw new LeaseError(
      `The deposit can only be taken once the lease is signed (status is ${lease.status})`,
      409
    );
  }
  if (lease.depositStatus === "PAID") throw new LeaseError("The deposit is already paid", 409);
  const depositAmount = parseFloat(lease.depositAmountSnapshot ?? "0");
  if (!(depositAmount > 0)) {
    throw new LeaseError(
      "No deposit is set for this room. Set a deposit amount before taking a booking.",
      409
    );
  }
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
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "BOOKING_DEPOSIT",
    scheduleSeq: null
  });
  const pi = await createFirstPaymentIntent({
    amount: depositAmount,
    customerId,
    metadata,
    // Stable per-lease deposit key: retrying reuses the same PI, no duplicates.
    idempotencyKey: `lease-deposit-${lease.id}`
  });
  await storage.updateLease(lease.id, { depositStripePaymentIntentId: pi.id });
  if (!pi.client_secret) throw new LeaseError("Stripe did not return a client secret", 502);
  return {
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    amount: depositAmount,
    portalToken: lease.portalToken ?? null
  };
}
async function finalizeDepositPayment(paymentIntentId) {
  const lease = await findLeaseByDepositPaymentIntent(paymentIntentId);
  if (!lease) return;
  if (lease.depositStatus === "PAID") return;
  let savedPaymentMethodId = lease.stripePaymentMethodId ?? null;
  try {
    const pi = await retrievePaymentIntent(paymentIntentId);
    if (typeof pi.payment_method === "string") savedPaymentMethodId = pi.payment_method;
    else if (pi.payment_method && "id" in pi.payment_method) savedPaymentMethodId = pi.payment_method.id;
  } catch (err) {
    log(`could not read saved payment method for deposit ${paymentIntentId}: ${err.message}`, "stripe");
  }
  await storage.updateLease(lease.id, {
    depositStatus: "PAID",
    depositPaidAt: /* @__PURE__ */ new Date(),
    depositStripePaymentIntentId: paymentIntentId,
    stripePaymentMethodId: savedPaymentMethodId ?? void 0,
    status: "PENDING_VERIFICATION"
  });
  const leaseRooms2 = await storage.getLeaseRooms(lease.id);
  for (const lr of leaseRooms2) {
    await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
  }
  log(
    `lease ${lease.id} PENDING_VERIFICATION \u2014 deposit PAID via ${paymentIntentId}; room(s) secured, awaiting ID approval`,
    "stripe"
  );
  try {
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (property && guest) await onDepositReceived({ lease, property, guest });
  } catch (err) {
    log(`deposit lifecycle error lease ${lease.id}: ${err.message}`, "stripe");
  }
}
async function activateVerifiedLease(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.status === "ACTIVE") return;
  if (lease.status !== "PENDING_VERIFICATION") {
    throw new LeaseError(
      `Lease can't be activated from status ${lease.status} (must be PENDING_VERIFICATION)`,
      409
    );
  }
  if (lease.verificationStatus !== "APPROVED") {
    throw new LeaseError("Lease identity verification is not approved yet", 409);
  }
  if (lease.depositStatus !== "PAID") {
    throw new LeaseError("Lease deposit is not paid", 409);
  }
  await storage.updateLease(lease.id, { status: "ACTIVE" });
  const leaseRooms2 = await storage.getLeaseRooms(lease.id);
  for (const lr of leaseRooms2) {
    await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
  }
  log(`lease ${lease.id} ACTIVE \u2014 identity verified/approved`, "stripe");
  try {
    await onLeaseActivated(lease.id);
  } catch (err) {
    log(`activation lifecycle error lease ${lease.id}: ${err.message}`, "stripe");
  }
  const savedPaymentMethodId = lease.stripePaymentMethodId ?? null;
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  const dueNow = first && first.status !== "PAID" && first.dueDate <= todayYmd();
  if (dueNow && savedPaymentMethodId) {
    await chargeFirstWeekOffSession(lease.id, savedPaymentMethodId).catch((err) => {
      log(`first-week charge on activation failed lease ${lease.id}: ${err.message}`, "stripe");
    });
  } else if (first && !dueNow) {
    log(`lease ${lease.id} first week (${first.dueDate}) deferred to move-in; rent sweep will charge it`, "stripe");
  }
}
async function findLeaseByDepositPaymentIntent(piId) {
  const leases2 = await storage.getLeases();
  return leases2.find((l) => l.depositStripePaymentIntentId === piId);
}
async function refundDeposit(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.depositStatus === "REFUNDED") return;
  if (lease.depositStatus !== "PAID" || !lease.depositStripePaymentIntentId) {
    throw new LeaseError("This lease has no paid deposit to refund", 409);
  }
  await refundPaymentIntent({
    paymentIntentId: lease.depositStripePaymentIntentId,
    idempotencyKey: `lease-deposit-refund-${lease.id}`
  });
  await storage.updateLease(lease.id, { depositStatus: "REFUNDED" });
  log(`lease ${lease.id} deposit REFUNDED`, "stripe");
}
async function chargeFirstWeekOffSession(leaseId, paymentMethodId) {
  const { lease, property, rooms: rooms2 } = await loadLeaseContext(leaseId);
  if (!lease.stripeCustomerId) throw new LeaseError("Lease has no Stripe customer", 500);
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first) throw new LeaseError("Lease has no first installment", 500);
  if (first.status === "PAID") return;
  const amount = chargeTotalFor(parseFloat(first.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "FIRST_PAYMENT",
    scheduleSeq: 1
  });
  const pi = await chargeSavedCard({
    amount,
    customerId: lease.stripeCustomerId,
    paymentMethodId,
    metadata,
    idempotencyKey: `lease-first-${lease.id}`
  });
  await storage.updateScheduleRow(first.id, {
    status: "PAID",
    paidAt: /* @__PURE__ */ new Date(),
    stripePaymentIntentId: pi.id
  });
  log(`lease ${lease.id} first week charged off-session ${pi.id}`, "stripe");
  try {
    const guest = await storage.getGuest(lease.guestId);
    if (guest) {
      await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: 1, amount: first.amount } });
    }
  } catch (err) {
    log(`first-week receipt error lease ${lease.id}: ${err.message}`, "stripe");
  }
}
function todayYmd() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}

// server/lib/portal.ts
var OPEN_FOR_PAY = /* @__PURE__ */ new Set(["SCHEDULED", "DUE", "LATE", "FAILED"]);
async function resolvePortalLease(token) {
  if (!token || token.length < 16) throw new LeaseError("Invalid portal link", 404);
  const lease = await storage.getLeaseByPortalToken(token);
  if (!lease) throw new LeaseError("Portal link not found", 404);
  return lease;
}
async function getPortalView(token) {
  const lease = await resolvePortalLease(token);
  const [property, guest, rooms2, schedule, lateFees2, threads, vehicle] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getLeaseRooms(lease.id),
    storage.getScheduleByLease(lease.id),
    storage.getLateFeesByLease(lease.id),
    storage.getMessageThreadsByLease(lease.id),
    storage.getVehicleByLease(lease.id)
  ]);
  const accruedLateFeeTotal = Math.round(
    lateFees2.filter((f) => f.status === "ACCRUED").reduce((s, f) => s + parseFloat(f.amount), 0) * 100
  ) / 100;
  return {
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
      signedPdfUrl: lease.signedPdfUrl,
      hasSavedCard: Boolean(lease.stripeCustomerId && lease.stripePaymentMethodId)
    },
    // Identity verification (driver's license review) state. The image itself is
    // never exposed here — only whether one is on file and the review status.
    verification: {
      status: lease.verificationStatus,
      // NOT_SUBMITTED | PENDING_REVIEW | APPROVED | REJECTED
      hasLicense: Boolean(lease.licenseR2Key),
      uploadedAt: lease.licenseUploadedAt,
      rejectionReason: lease.verificationRejectionReason
    },
    vehicle: vehicle ? {
      hasVehicle: vehicle.hasVehicle,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      plate: vehicle.plate,
      plateState: vehicle.plateState,
      hasPhoto: Boolean(vehicle.photoR2Key)
    } : null,
    property: property ? { name: property.name, location: property.location } : null,
    guest: guest ? { name: guest.name, email: guest.email } : null,
    rooms: rooms2.map((r) => ({ name: r.roomNameSnapshot, roomNumber: r.roomNumberSnapshot })),
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: s.amount,
      status: s.status,
      paidAt: s.paidAt,
      paymentMethod: s.paymentMethod
    })),
    lateFees: {
      accruedTotal: accruedLateFeeTotal,
      rows: lateFees2.map((f) => ({
        scheduleSeq: f.scheduleSeq,
        accrualDate: f.accrualDate,
        amount: f.amount,
        status: f.status
      }))
    },
    threads: threads.map((t) => ({
      id: t.id,
      subject: t.subject,
      category: t.category,
      status: t.status,
      createdAt: t.createdAt
    }))
  };
}
function chargeTotalFor2(rent) {
  return calculateBreakdown({ baseAmount: rent, paymentMethod: "STRIPE" }).total;
}
async function payInstallmentNow(token, scheduleSeq) {
  const lease = await resolvePortalLease(token);
  if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) {
    throw new LeaseError("No saved card on this lease; pay via your arranged method", 409);
  }
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property missing", 500);
  const rooms2 = await storage.getLeaseRooms(lease.id);
  const schedule = await storage.getScheduleByLease(lease.id);
  const row = schedule.find((s) => s.scheduleSeq === scheduleSeq);
  if (!row) throw new LeaseError("Installment not found", 404);
  if (row.status === "PAID") throw new LeaseError("That installment is already paid", 409);
  if (row.status === "WAIVED") throw new LeaseError("That installment was waived", 409);
  if (!OPEN_FOR_PAY.has(row.status)) throw new LeaseError("That installment can't be paid now", 409);
  const amount = chargeTotalFor2(parseFloat(row.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "SCHEDULED_RENT",
    scheduleSeq: row.scheduleSeq
  });
  const pi = await chargeSavedCard({
    amount,
    customerId: lease.stripeCustomerId,
    paymentMethodId: lease.stripePaymentMethodId,
    metadata,
    // Same key as the scheduler so a portal pay + a sweep can't double-charge.
    idempotencyKey: `lease-rent-${lease.id}-seq-${row.scheduleSeq}`
  });
  if (pi.status !== "succeeded") {
    throw new LeaseError("Payment did not complete; please try again", 402);
  }
  await storage.updateScheduleRow(row.id, {
    status: "PAID",
    paidAt: /* @__PURE__ */ new Date(),
    stripePaymentIntentId: pi.id
  });
  try {
    await billAccruedLateFees({ lease, property, rooms: rooms2, scheduleSeq: row.scheduleSeq });
  } catch {
  }
  return { paid: true, amount, paymentIntentId: pi.id };
}
async function submitMessage(token, input) {
  const lease = await resolvePortalLease(token);
  const root = await storage.createMessage({
    leaseId: lease.id,
    guestId: lease.guestId,
    threadId: "",
    // storage assigns a self-referential root id
    authorRole: "GUEST",
    category: input.category ?? "QUESTION",
    subject: input.subject ?? null,
    body: input.body,
    status: "OPEN"
  });
  return root;
}
async function replyToThread(token, threadId, body) {
  const lease = await resolvePortalLease(token);
  const thread = await storage.getMessagesByThread(threadId);
  const root = thread.find((m) => m.id === threadId);
  if (!root || root.leaseId !== lease.id) throw new LeaseError("Thread not found", 404);
  const reply = await storage.createMessage({
    leaseId: lease.id,
    guestId: lease.guestId,
    threadId,
    authorRole: "GUEST",
    category: root.category,
    body,
    status: "OPEN"
  });
  if (root.status === "ANSWERED") await storage.updateMessage(root.id, { status: "OPEN" });
  return reply;
}
async function getThread(token, threadId) {
  const lease = await resolvePortalLease(token);
  const messages = await storage.getMessagesByThread(threadId);
  const root = messages.find((m) => m.id === threadId);
  if (!root || root.leaseId !== lease.id) throw new LeaseError("Thread not found", 404);
  return {
    thread: { id: root.id, subject: root.subject, category: root.category, status: root.status },
    messages: messages.map((m) => ({
      id: m.id,
      authorRole: m.authorRole,
      body: m.body,
      createdAt: m.createdAt
    }))
  };
}

// server/lib/verification.ts
import { randomUUID } from "node:crypto";

// server/lib/storage-r2.ts
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
function isR2Configured() {
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET_NAME
  );
}
function requireR2Config() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME;
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "R2 is not configured (need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME)"
    );
  }
  return { accountId, accessKeyId, secretAccessKey, bucket };
}
var _client = null;
function client() {
  if (_client) return _client;
  const { accountId, accessKeyId, secretAccessKey } = requireR2Config();
  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey }
  });
  return _client;
}
async function uploadBuffer(key, buffer, contentType) {
  const { bucket } = requireR2Config();
  await client().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType
    })
  );
  return { key, size: buffer.length };
}
async function getPresignedDownloadUrl(key, expiresInSec = 600) {
  const { bucket } = requireR2Config();
  return getSignedUrl(client(), new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: expiresInSec
  });
}
async function deleteObject(key) {
  const { bucket } = requireR2Config();
  await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// server/lib/verification.ts
function publicBaseUrl3() {
  return process.env.PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beniceproperties.vercel.app");
}
var EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf"
};
var MAX_BYTES = 12 * 1024 * 1024;
function assertR2() {
  if (!isR2Configured()) {
    throw new LeaseError("File uploads aren't enabled yet (storage not configured).", 503);
  }
}
function validateFile(file) {
  if (!file || !file.buffer?.length) throw new LeaseError("No file was uploaded.", 400);
  if (file.size > MAX_BYTES) throw new LeaseError("File too large (max 12 MB).", 400);
  const ext = EXT_BY_TYPE[file.mimetype];
  if (!ext) {
    throw new LeaseError("Unsupported file type \u2014 upload a JPG, PNG, WEBP, HEIC, or PDF.", 400);
  }
  return ext;
}
async function uploadLicense(token, file) {
  assertR2();
  const lease = await resolvePortalLease(token);
  const ext = validateFile(file);
  if (lease.status === "ACTIVE") {
    throw new LeaseError("This lease is already active; no verification needed.", 409);
  }
  if (["COMPLETED", "TERMINATED", "DEFAULTED"].includes(lease.status)) {
    throw new LeaseError("This lease is closed.", 409);
  }
  const key = `bnp/licenses/${lease.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file.buffer, file.mimetype);
  const priorKey = lease.licenseR2Key;
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch(
      (err) => log(`could not delete prior license ${priorKey}: ${err.message}`, "verify")
    );
  }
  const now = /* @__PURE__ */ new Date();
  await storage.updateLease(lease.id, {
    licenseR2Key: key,
    licenseUploadedAt: now,
    verificationStatus: "PENDING_REVIEW",
    verificationRejectionReason: null,
    verificationReviewedAt: null,
    verificationReviewedBy: null
  });
  await storage.raiseEscalationOnce({
    leaseId: lease.id,
    kind: "VERIFICATION_PENDING",
    severity: "LOW",
    detail: `Driver's license uploaded for review (guest ${lease.guestId}).`
  });
  log(`license uploaded for lease ${lease.id} \u2192 PENDING_REVIEW`, "verify");
  return { verificationStatus: "PENDING_REVIEW", licenseUploadedAt: now };
}
async function saveVehicle(token, input) {
  const lease = await resolvePortalLease(token);
  if (input.plateState && !US_STATE_CODES.includes(input.plateState)) {
    throw new LeaseError("Invalid plate state.", 400);
  }
  const data = input.hasVehicle ? {
    hasVehicle: true,
    make: input.make ?? null,
    model: input.model ?? null,
    year: input.year ?? null,
    color: input.color ?? null,
    plate: input.plate ?? null,
    plateState: input.plateState ?? null
  } : {
    hasVehicle: false,
    make: null,
    model: null,
    year: null,
    color: null,
    plate: null,
    plateState: null
  };
  const vehicle = await storage.upsertVehicleByLease(lease.id, data);
  log(`vehicle saved for lease ${lease.id} (hasVehicle=${input.hasVehicle})`, "verify");
  return vehicle;
}
async function uploadVehiclePhoto(token, file) {
  assertR2();
  const lease = await resolvePortalLease(token);
  const ext = validateFile(file);
  const key = `bnp/vehicles/${lease.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file.buffer, file.mimetype);
  const existing = await storage.getVehicleByLease(lease.id);
  const priorKey = existing?.photoR2Key;
  await storage.upsertVehicleByLease(lease.id, { photoR2Key: key });
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch(
      (err) => log(`could not delete prior vehicle photo ${priorKey}: ${err.message}`, "verify")
    );
  }
  log(`vehicle photo saved for lease ${lease.id}`, "verify");
  return { saved: true };
}
async function getLicenseViewUrl(leaseId) {
  assertR2();
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (!lease.licenseR2Key) throw new LeaseError("No license has been uploaded for this lease.", 404);
  const expiresInSec = 600;
  const url = await getPresignedDownloadUrl(lease.licenseR2Key, expiresInSec);
  return { url, expiresInSec };
}
async function approveVerification(leaseId, actor) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.verificationStatus !== "APPROVED") {
    if (lease.verificationStatus !== "PENDING_REVIEW") {
      throw new LeaseError(
        `Nothing to approve \u2014 verification status is ${lease.verificationStatus} (expected PENDING_REVIEW).`,
        409
      );
    }
    await storage.updateLease(lease.id, {
      verificationStatus: "APPROVED",
      verificationReviewedAt: /* @__PURE__ */ new Date(),
      verificationReviewedBy: actor,
      verificationRejectionReason: null
    });
  }
  try {
    const open = await storage.getEscalations({ status: "OPEN", leaseId: lease.id });
    for (const e of open.filter((x) => x.kind === "VERIFICATION_PENDING")) {
      await storage.updateEscalation(e.id, {
        status: "RESOLVED",
        resolvedAt: /* @__PURE__ */ new Date(),
        resolvedBy: actor
      });
    }
  } catch (err) {
    log(`could not resolve verification escalation for lease ${lease.id}: ${err.message}`, "verify");
  }
  await activateVerifiedLease(lease.id);
  log(`lease ${lease.id} verification APPROVED by ${actor} \u2192 activated`, "verify");
  return { status: "APPROVED" };
}
async function rejectVerification(leaseId, reason, actor) {
  const trimmed = (reason ?? "").trim();
  if (!trimmed) throw new LeaseError("A rejection reason is required.", 400);
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.status === "ACTIVE") {
    throw new LeaseError("This lease is already active and can't be rejected.", 409);
  }
  await storage.updateLease(lease.id, {
    verificationStatus: "REJECTED",
    verificationReviewedAt: /* @__PURE__ */ new Date(),
    verificationReviewedBy: actor,
    verificationRejectionReason: trimmed
  });
  try {
    const guest = await storage.getGuest(lease.guestId);
    if (guest) {
      const link = lease.portalToken ? `${publicBaseUrl3()}/portal/${lease.portalToken}` : `${publicBaseUrl3()}/lookup`;
      await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: "Action needed: re-upload your driver's license",
        body: `Hi ${guest.name || "there"}, we couldn't verify your driver's license for the reason below. Your room is still held. Please upload a new photo from your portal to finish activating your lease.

Reason: ${trimmed}

Your portal: ${link}`
      });
    }
  } catch (err) {
    log(`could not notify guest of verification rejection for lease ${lease.id}: ${err.message}`, "verify");
  }
  log(`lease ${lease.id} verification REJECTED by ${actor}: ${trimmed}`, "verify");
  return { status: "REJECTED" };
}

// server/lib/serviceAuth.ts
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function requireServiceToken(req, res, next) {
  const expected = process.env.UO_BNP_API_TOKEN;
  if (!expected) {
    res.status(503).json({ message: "UO integration is not configured" });
    return;
  }
  const header = req.headers.authorization;
  const provided = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided || !safeEqual(provided, expected)) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }
  next();
}

// server/lib/uoApi.ts
async function listPropertiesWithRooms() {
  const properties2 = await storage.getProperties();
  const out = [];
  for (const p of properties2) {
    const rooms2 = p.type === "COLIVING" ? await storage.getRoomsByProperty(p.id) : [];
    out.push({
      id: p.id,
      name: p.name,
      entity: p.entity,
      type: p.type,
      location: p.location,
      active: p.active,
      rooms: rooms2.map((r) => ({
        id: r.id,
        name: r.name,
        roomNumber: r.roomNumber,
        weeklyRent: r.weeklyRent,
        status: r.status
      }))
    });
  }
  return out;
}
async function getLeaseDetail(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const [property, guest, rooms2, schedule, lateFees2] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getLeaseRooms(lease.id),
    storage.getScheduleByLease(lease.id),
    storage.getLateFeesByLease(lease.id)
  ]);
  return {
    id: lease.id,
    entity: property?.entity ?? null,
    propertyId: lease.propertyId,
    propertyName: property?.name ?? null,
    guest: guest ? { id: guest.id, name: guest.name, email: guest.email, phone: guest.phone } : null,
    rooms: rooms2.map((r) => ({ roomId: r.roomId, name: r.roomNameSnapshot, roomNumber: r.roomNumberSnapshot })),
    term: { start: lease.startDate, end: lease.endDate, cadence: lease.paymentCadence },
    totalLeaseValue: lease.totalLeaseValue,
    status: lease.status,
    signature: {
      signed: Boolean(lease.signedAt),
      signedName: lease.signedName,
      signedAt: lease.signedAt,
      signedPdfUrl: lease.signedPdfUrl
    },
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: s.amount,
      status: s.status,
      paymentMethod: s.paymentMethod,
      paidAt: s.paidAt,
      stripePaymentIntentId: s.stripePaymentIntentId
    })),
    lateFees: lateFees2.map((f) => ({
      scheduleSeq: f.scheduleSeq,
      accrualDate: f.accrualDate,
      amount: f.amount,
      status: f.status
    }))
  };
}
async function listLeases(status) {
  const leases2 = await storage.getLeases(status ? { status } : void 0);
  return Promise.all(leases2.map((l) => getLeaseDetail(l.id)));
}
async function listPaymentsWithMetadata(opts) {
  const leases2 = opts?.leaseId ? [await storage.getLease(opts.leaseId)].filter(Boolean) : await storage.getLeases();
  const out = [];
  for (const lease of leases2) {
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms2 = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    const lateFees2 = await storage.getLateFeesByLease(lease.id);
    for (const row of schedule) {
      out.push({
        kind: "RENT",
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        amount: row.amount,
        status: row.status,
        paymentMethod: row.paymentMethod,
        paidAt: row.paidAt,
        stripePaymentIntentId: row.stripePaymentIntentId,
        metadata: buildLeaseChargeMetadata({
          entity: property.entity,
          property,
          lease,
          rooms: rooms2,
          paymentKind: row.scheduleSeq === 1 ? "FIRST_PAYMENT" : "SCHEDULED_RENT",
          scheduleSeq: row.scheduleSeq
        })
      });
    }
    for (const fee of lateFees2) {
      out.push({
        kind: "LATE_FEE",
        leaseId: lease.id,
        scheduleSeq: fee.scheduleSeq,
        amount: fee.amount,
        status: fee.status,
        stripePaymentIntentId: fee.stripePaymentIntentId,
        metadata: buildLeaseChargeMetadata({
          entity: property.entity,
          property,
          lease,
          rooms: rooms2,
          paymentKind: "LATE_FEE",
          scheduleSeq: fee.scheduleSeq
        })
      });
    }
  }
  return out;
}
async function listGuestMessageThreads(status) {
  const leases2 = await storage.getLeases();
  const threads = [];
  for (const lease of leases2) {
    const roots = await storage.getMessageThreadsByLease(lease.id);
    for (const r of roots) {
      if (status && r.status !== status) continue;
      threads.push({
        id: r.id,
        leaseId: r.leaseId,
        category: r.category,
        subject: r.subject,
        status: r.status,
        body: r.body,
        createdAt: r.createdAt
      });
    }
  }
  return threads;
}
async function listEscalations(status) {
  return storage.getEscalations(status ? { status } : void 0);
}
async function leaseCtx(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property missing", 500);
  const rooms2 = await storage.getLeaseRooms(lease.id);
  return { lease, property, rooms: rooms2 };
}
async function markPaid(args) {
  const { lease, property, rooms: rooms2 } = await leaseCtx(args.leaseId);
  const schedule = await storage.getScheduleByLease(lease.id);
  const row = schedule.find((s) => s.scheduleSeq === args.scheduleSeq);
  if (!row) throw new LeaseError("Installment not found", 404);
  if (row.status === "PAID") return { alreadyPaid: true, scheduleSeq: row.scheduleSeq };
  if (row.paymentMethod !== "MANUAL") {
    throw new LeaseError("Only MANUAL installments are settled via Mark Paid; card rows settle via Stripe", 400);
  }
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "MANUAL_RECONCILE",
    scheduleSeq: row.scheduleSeq
  });
  const note = `[MANUAL_RECONCILE by ${args.actor}] ${args.note} :: ${JSON.stringify(metadata)}`;
  await storage.updateScheduleRow(row.id, {
    status: "PAID",
    paidAt: /* @__PURE__ */ new Date(),
    manualNote: note
  });
  const escalations = await storage.getEscalations({ status: "OPEN", leaseId: lease.id });
  for (const e of escalations) {
    if ((e.scheduleSeq ?? null) === row.scheduleSeq) {
      await storage.updateEscalation(e.id, { status: "RESOLVED", resolvedAt: /* @__PURE__ */ new Date(), resolvedBy: args.actor });
    }
  }
  return { alreadyPaid: false, scheduleSeq: row.scheduleSeq };
}
async function approveLease(leaseId, actor) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  if (lease.status === "DRAFT") {
    await storage.updateLease(lease.id, { status: "PENDING_SIGNATURE" });
    return { status: "PENDING_SIGNATURE", actor };
  }
  return { status: lease.status, actor, noop: true };
}
async function respondToMessage(args) {
  const messages = await storage.getMessagesByThread(args.threadId);
  const root = messages.find((m) => m.id === args.threadId);
  if (!root) throw new LeaseError("Thread not found", 404);
  const reply = await storage.createMessage({
    leaseId: root.leaseId,
    guestId: root.guestId,
    threadId: args.threadId,
    authorRole: "STAFF",
    category: root.category,
    body: args.body,
    status: "ANSWERED"
  });
  await storage.updateMessage(root.id, { status: "ANSWERED" });
  return { id: reply.id, threadStatus: "ANSWERED" };
}
async function resolveEscalation(args) {
  const escalations = await storage.getEscalations();
  const esc2 = escalations.find((e) => e.id === args.escalationId);
  if (!esc2) throw new LeaseError("Escalation not found", 404);
  const target = args.status ?? "RESOLVED";
  if (esc2.status === target) return { status: target, noop: true };
  await storage.updateEscalation(esc2.id, {
    status: target,
    resolvedAt: target === "RESOLVED" ? /* @__PURE__ */ new Date() : esc2.resolvedAt ?? null,
    resolvedBy: args.actor
  });
  return { status: target };
}
async function waiveLateFees(args) {
  const fees = await storage.getLateFeesByLease(args.leaseId);
  const target = fees.filter((f) => f.scheduleSeq === args.scheduleSeq && f.status === "ACCRUED");
  for (const fee of target) {
    await storage.updateLateFee(fee.id, { status: "WAIVED" });
  }
  const schedule = await storage.getScheduleByLease(args.leaseId);
  const row = schedule.find((s) => s.scheduleSeq === args.scheduleSeq);
  if (row) {
    const note = `${row.manualNote ? row.manualNote + " | " : ""}[LATE_FEE_WAIVED by ${args.actor}] ${args.reason}`;
    await storage.updateScheduleRow(row.id, { manualNote: note });
  }
  return { waivedCount: target.length };
}

// server/lib/reconciliation.ts
var round = (v) => Math.round(v * 100) / 100;
var inRange = (d, from, to) => {
  if (!d) return false;
  const day = (typeof d === "string" ? d : d.toISOString()).slice(0, 10);
  return day >= from && day <= to;
};
async function buildReconciliationReport(from, to, generatedAt) {
  const leases2 = await storage.getLeases();
  const entities = /* @__PURE__ */ new Map();
  function entityBucket(entity) {
    let e = entities.get(entity);
    if (!e) {
      e = { entity, rentCard: 0, rentManual: 0, lateFees: 0, total: 0, properties: [] };
      entities.set(entity, e);
    }
    return e;
  }
  function propertyBucket(e, id, name) {
    let p = e.properties.find((x) => x.propertyId === id);
    if (!p) {
      p = { propertyId: id, propertyName: name, rentCard: 0, rentManual: 0, lateFees: 0, total: 0, rooms: [] };
      e.properties.push(p);
    }
    return p;
  }
  function roomBucket(p, room) {
    let r = p.rooms.find((x) => x.roomId === room.id);
    if (!r) {
      r = { roomId: room.id, roomName: room.name, roomNumber: room.number, rentCard: 0, rentManual: 0, lateFees: 0, total: 0 };
      p.rooms.push(r);
    }
    return r;
  }
  for (const lease of leases2) {
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms2 = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    const lateFees2 = await storage.getLateFeesByLease(lease.id);
    const e = entityBucket(property.entity);
    const p = propertyBucket(e, property.id, property.name);
    const primaryRoom = rooms2[0] ? { id: rooms2[0].roomId, name: rooms2[0].roomNameSnapshot, number: rooms2[0].roomNumberSnapshot } : { id: `${lease.id}:whole`, name: property.name, number: null };
    const r = roomBucket(p, primaryRoom);
    for (const row of schedule) {
      if (row.status !== "PAID") continue;
      if (!inRange(row.paidAt, from, to)) continue;
      const amt = round(parseFloat(row.amount));
      if (row.paymentMethod === "MANUAL") {
        r.rentManual += amt;
        p.rentManual += amt;
        e.rentManual += amt;
      } else {
        r.rentCard += amt;
        p.rentCard += amt;
        e.rentCard += amt;
      }
    }
    for (const fee of lateFees2) {
      if (fee.status !== "BILLED" && fee.status !== "PAID") continue;
      if (!inRange(fee.accrualDate, from, to)) continue;
      const amt = round(parseFloat(fee.amount));
      r.lateFees += amt;
      p.lateFees += amt;
      e.lateFees += amt;
    }
  }
  const grand = { rentCard: 0, rentManual: 0, lateFees: 0, total: 0 };
  const entityList = Array.from(entities.values());
  for (const e of entityList) {
    for (const p of e.properties) {
      for (const r of p.rooms) {
        r.rentCard = round(r.rentCard);
        r.rentManual = round(r.rentManual);
        r.lateFees = round(r.lateFees);
        r.total = round(r.rentCard + r.rentManual + r.lateFees);
      }
      p.rentCard = round(p.rentCard);
      p.rentManual = round(p.rentManual);
      p.lateFees = round(p.lateFees);
      p.total = round(p.rentCard + p.rentManual + p.lateFees);
    }
    e.rentCard = round(e.rentCard);
    e.rentManual = round(e.rentManual);
    e.lateFees = round(e.lateFees);
    e.total = round(e.rentCard + e.rentManual + e.lateFees);
    grand.rentCard += e.rentCard;
    grand.rentManual += e.rentManual;
    grand.lateFees += e.lateFees;
  }
  grand.rentCard = round(grand.rentCard);
  grand.rentManual = round(grand.rentManual);
  grand.lateFees = round(grand.lateFees);
  grand.total = round(grand.rentCard + grand.rentManual + grand.lateFees);
  return { from, to, generatedAt, grand, entities: entityList };
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
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});
function toUploadedFile(f) {
  if (!f) return void 0;
  return { buffer: f.buffer, mimetype: f.mimetype, size: f.size };
}
async function reconciliationHandler(req, res, next) {
  try {
    const schema = z3.object({
      from: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z3.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    });
    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ message: "from and to (YYYY-MM-DD) required" });
      return;
    }
    const report = await buildReconciliationReport(parsed.data.from, parsed.data.to, (/* @__PURE__ */ new Date()).toISOString());
    res.json(report);
  } catch (err) {
    next(err);
  }
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
  app.get("/api/hero-images", async (_req, res, next) => {
    try {
      const imgs = await storage.getActiveHeroImages();
      res.json(
        imgs.map((h) => ({ id: h.id, url: h.s3Url, alt: h.altText ?? "" }))
      );
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/properties", async (_req, res, next) => {
    try {
      const props = await storage.getProperties({ activeOnly: true });
      const withRent = await Promise.all(
        props.map(async (p) => {
          let fromWeeklyRent = null;
          if (p.type === "COLIVING") {
            const rooms2 = await storage.getRoomsByProperty(p.id);
            const rates = rooms2.filter((r) => r.status === "AVAILABLE").map((r) => parseFloat(r.weeklyRent)).filter((n) => Number.isFinite(n) && n > 0);
            if (rates.length) fromWeeklyRent = String(Math.min(...rates));
          }
          return { ...p, fromWeeklyRent };
        })
      );
      const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const bookedColivingIds = withRent.filter((p) => p.type === "COLIVING" && p.fromWeeklyRent === null).map((p) => p.id);
      const strIds = withRent.filter((p) => p.type === "STR").map((p) => p.id);
      const [leaseEnds, strBookings] = await Promise.all([
        storage.getSoonestOccupyingLeaseEndByProperty(bookedColivingIds, today),
        storage.getStrBookingsEndingOnOrAfter(strIds, today)
      ]);
      const list = withRent.map((p) => {
        let nextOpening = null;
        if (p.type === "COLIVING" && p.fromWeeklyRent === null) {
          nextOpening = leaseEnds[p.id] ? dayAfter(leaseEnds[p.id]) : null;
        } else if (p.type === "STR") {
          nextOpening = strNextOpening(
            strBookings.filter((b) => b.propertyId === p.id),
            today
          );
        }
        return { ...p, nextOpening };
      });
      res.json(list);
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
  app.get("/api/properties/:id/availability", async (req, res, next) => {
    try {
      const property = await storage.getProperty(req.params.id);
      if (!property || !property.active) {
        return res.status(404).json({ message: "Property not found" });
      }
      if (property.type !== "STR") {
        return res.json({ busy: [], minDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) });
      }
      res.json(await buildStrAvailability(property.id));
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/rooms/:id/availability", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      if (!room) return res.status(404).json({ message: "Room not found" });
      res.json(await buildRoomAvailability(room.id));
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
  app.post("/api/leases/preview", async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { documentHtml } = await previewLease(parsed.data);
      res.json({ documentHtml });
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
  app.get("/api/portal/:token", async (req, res, next) => {
    try {
      res.json(await getPortalView(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/pay/:seq", async (req, res, next) => {
    try {
      const seq = parseInt(req.params.seq, 10);
      if (!Number.isFinite(seq)) return res.status(400).json({ message: "Invalid installment" });
      res.json(await payInstallmentNow(req.params.token, seq));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/messages", async (req, res, next) => {
    try {
      const schema = z3.object({
        category: z3.enum(["QUESTION", "MAINTENANCE", "OTHER"]).optional(),
        subject: z3.string().max(200).optional(),
        body: z3.string().min(1, "Message can't be empty").max(5e3)
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const msg = await submitMessage(req.params.token, parsed.data);
      res.status(201).json({ threadId: msg.id, status: msg.status });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/portal/:token/messages/:threadId", async (req, res, next) => {
    try {
      res.json(await getThread(req.params.token, req.params.threadId));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/messages/:threadId/reply", async (req, res, next) => {
    try {
      const schema = z3.object({ body: z3.string().min(1).max(5e3) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const reply = await replyToThread(req.params.token, req.params.threadId, parsed.data.body);
      res.status(201).json({ id: reply.id });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/license", upload.single("file"), async (req, res, next) => {
    try {
      const result = await uploadLicense(req.params.token, toUploadedFile(req.file));
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/vehicle", async (req, res, next) => {
    try {
      const schema = z3.object({
        hasVehicle: z3.boolean(),
        make: z3.string().max(60).nullish(),
        model: z3.string().max(60).nullish(),
        year: z3.number().int().min(1900).max(2100).nullish(),
        color: z3.string().max(40).nullish(),
        plate: z3.string().max(15).nullish(),
        plateState: z3.enum(US_STATE_CODES).nullish()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const vehicle = await saveVehicle(req.params.token, parsed.data);
      res.status(200).json({ id: vehicle.id, hasVehicle: vehicle.hasVehicle });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/vehicle-photo", upload.single("file"), async (req, res, next) => {
    try {
      const result = await uploadVehiclePhoto(req.params.token, toUploadedFile(req.file));
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
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
        portalToken: result.portalToken,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/leases/:id/deposit", async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe test key not set)." });
      }
      const result = await startDepositPayment(req.params.id);
      res.json({
        clientSecret: result.clientSecret,
        amount: result.amount,
        portalToken: result.portalToken,
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
  app.post("/api/admin/leases/:id/refund-deposit", requireAdmin, async (req, res, next) => {
    try {
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled (Stripe key not set)." });
      }
      await refundDeposit(req.params.id);
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  function adminActor(req) {
    const u = req.user;
    return u?.email || u?.id || "admin";
  }
  app.get("/api/admin/verifications", requireAdmin, async (_req, res, next) => {
    try {
      const leases2 = await storage.getLeases({ status: "PENDING_VERIFICATION" });
      const pending = leases2.filter((l) => l.verificationStatus === "PENDING_REVIEW");
      const rows = await Promise.all(
        pending.map(async (l) => {
          const [guest, property, leaseRooms2] = await Promise.all([
            storage.getGuest(l.guestId),
            storage.getProperty(l.propertyId),
            storage.getLeaseRooms(l.id)
          ]);
          return {
            leaseId: l.id,
            signedName: l.signedName,
            // the name the tenant signed with
            guestName: guest?.name ?? null,
            guestEmail: guest?.email ?? null,
            propertyName: property?.name ?? null,
            rooms: leaseRooms2.map((r) => r.roomNameSnapshot),
            licenseUploadedAt: l.licenseUploadedAt,
            startDate: l.startDate
          };
        })
      );
      res.json({ verifications: rows });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/admin/leases/:id/license-url", requireAdmin, async (req, res, next) => {
    try {
      res.json(await getLicenseViewUrl(req.params.id));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/leases/:id/approve-verification", requireAdmin, async (req, res, next) => {
    try {
      res.json(await approveVerification(req.params.id, adminActor(req)));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/leases/:id/reject-verification", requireAdmin, async (req, res, next) => {
    try {
      const schema = z3.object({ reason: z3.string().min(1, "A reason is required").max(500) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await rejectVerification(req.params.id, parsed.data.reason, adminActor(req)));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
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
  app.get("/api/admin/reconciliation-report", requireAdmin, reconciliationHandler);
  app.post("/api/bookings", async (req, res, next) => {
    try {
      const parsed = createBookingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid booking" });
      }
      const { propertyId, roomId, checkIn, checkOut, paymentMethod, guest } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      if (resolved.model === "COLIVING") {
        return res.status(409).json({
          message: "Co-living rooms are booked through the lease flow. Start from the room page."
        });
      }
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
      const paymentType = "ONE_TIME";
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
        const chargeMetadata = buildStrChargeMetadata({
          entity: resolved.property.entity,
          property: resolved.property,
          paymentKind: "BOOKING_DEPOSIT",
          rateCadence: resolved.rateTier ?? null
        });
        const session2 = await createCheckoutSession({
          amount: dueNow,
          description: `Stay \u2014 ${resolved.property.name}`,
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
  const uoErr = (err, res, next) => {
    if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
    next(err);
  };
  app.get("/api/uo/properties", requireServiceToken, async (_req, res, next) => {
    try {
      res.json(await listPropertiesWithRooms());
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/leases", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      res.json(await listLeases(status));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/leases/:id", requireServiceToken, async (req, res, next) => {
    try {
      res.json(await getLeaseDetail(req.params.id));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/payments", requireServiceToken, async (req, res, next) => {
    try {
      const leaseId = typeof req.query.leaseId === "string" ? req.query.leaseId : void 0;
      res.json(await listPaymentsWithMetadata({ leaseId }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/messages", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      res.json(await listGuestMessageThreads(status));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/escalations", requireServiceToken, async (req, res, next) => {
    try {
      const status = typeof req.query.status === "string" ? req.query.status : void 0;
      res.json(await listEscalations(status));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.get("/api/uo/reconciliation", requireServiceToken, reconciliationHandler);
  app.post("/api/uo/leases/:id/mark-paid", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z3.object({ scheduleSeq: z3.number().int(), note: z3.string().min(1), actor: z3.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await markPaid({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/leases/:id/approve", requireServiceToken, async (req, res, next) => {
    try {
      const actor = typeof req.body?.actor === "string" ? req.body.actor : "uo";
      res.json(await approveLease(req.params.id, actor));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/messages/:threadId/respond", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z3.object({ body: z3.string().min(1), actor: z3.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await respondToMessage({ threadId: req.params.threadId, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/escalations/:id/resolve", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z3.object({ actor: z3.string().min(1), status: z3.enum(["ACKNOWLEDGED", "RESOLVED"]).optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await resolveEscalation({ escalationId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/leases/:id/waive-late-fee", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z3.object({ scheduleSeq: z3.number().int(), reason: z3.string().min(1), actor: z3.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await waiveLateFees({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
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
  app.get("/api/admin/properties/:id/rooms", requireAdmin, async (req, res, next) => {
    try {
      res.json(await storage.getRoomsByProperty(req.params.id));
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
      if (kind === "BOOKING_DEPOSIT" && pi.metadata?.lease_id) {
        await finalizeDepositPayment(pi.id);
      } else if (kind === "FIRST_PAYMENT") {
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

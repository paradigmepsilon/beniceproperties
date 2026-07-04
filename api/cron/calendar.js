var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/cron/calendar.ts
import "dotenv/config";

// server/lib/icalSync.ts
import { promises as dns } from "node:dns";
import net from "node:net";

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
var MS_PER_DAY = 24 * 60 * 60 * 1e3;
function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
function inclusiveDays(startDate, endDate) {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
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

// server/lib/icalSync.ts
var ALLOWED_PROTOCOLS = ["https:"];
var ALLOWED_CONTENT_TYPES = ["text/calendar", "application/calendar", "text/plain"];
var MAX_RESPONSE_SIZE = 10 * 1024 * 1024;
var FETCH_TIMEOUT_MS = 3e4;
var MAX_REDIRECTS = 3;
var SAFE_DELETE_DAYS = 0;
var BLOCKED_IPS = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^::1$/,
  /^localhost$/i,
  /^169\.254\./,
  /^fe80:/i,
  /^224\./,
  /^ff00:/i,
  /^0\./,
  // 0.0.0.0/8
  /^100\.(6[4-9]|[7-9][0-9]|1[01][0-9]|12[0-7])\./,
  // CGNAT 100.64/10
  /^198\.1[8-9]\./,
  // benchmarking 198.18/15
  /^fc00:/i
  // IPv6 ULA fc00::/7
];
function isBlockedIP(ip) {
  return BLOCKED_IPS.some((p) => p.test(ip));
}
function validateUrl(urlString) {
  let url;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(`Invalid URL format: ${urlString}`);
  }
  if (!ALLOWED_PROTOCOLS.includes(url.protocol)) {
    throw new Error(`Protocol not allowed: ${url.protocol}. Only HTTPS is permitted.`);
  }
  const port = url.port ? parseInt(url.port, 10) : 443;
  if (port < 80 || port > 65535 || port >= 1 && port <= 1023 && ![80, 443].includes(port)) {
    throw new Error(`Port not allowed: ${port}`);
  }
  return url;
}
async function validateIP(hostname) {
  if (net.isIP(hostname)) {
    if (isBlockedIP(hostname)) throw new Error(`IP address not allowed: ${hostname}`);
    return;
  }
  let addresses = [];
  try {
    addresses = await dns.resolve4(hostname);
  } catch {
    try {
      addresses = await dns.resolve6(hostname);
    } catch {
      throw new Error(`Failed to resolve hostname: ${hostname}`);
    }
  }
  for (const addr of addresses) {
    if (isBlockedIP(addr)) {
      throw new Error(`IP address not allowed: ${addr} (resolved from ${hostname})`);
    }
  }
}
async function secureFetch(urlString, redirectCount = 0) {
  if (redirectCount > MAX_REDIRECTS) {
    throw new Error(`Too many redirects (max ${MAX_REDIRECTS})`);
  }
  const url = validateUrl(urlString);
  await validateIP(url.hostname);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(urlString, {
      headers: {
        "User-Agent": "BeNiceProperties Calendar Sync/1.0",
        Accept: ALLOWED_CONTENT_TYPES.join(", ")
      },
      signal: controller.signal,
      redirect: "manual"
    });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      if (!loc) throw new Error("Redirect with no Location header");
      const nextUrl = new URL(loc, urlString).toString();
      return secureFetch(nextUrl, redirectCount + 1);
    }
    if (!res.ok) {
      throw new Error(`Feed fetch failed: HTTP ${res.status}`);
    }
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    if (contentType && !ALLOWED_CONTENT_TYPES.some((t) => contentType.includes(t))) {
      throw new Error(`Disallowed content-type: ${contentType}`);
    }
    const text2 = await res.text();
    if (text2.length > MAX_RESPONSE_SIZE) {
      throw new Error(`Feed too large (> ${MAX_RESPONSE_SIZE} bytes)`);
    }
    if (!text2.includes("BEGIN:VCALENDAR")) {
      throw new Error("Response is not a valid iCalendar document");
    }
    return text2;
  } finally {
    clearTimeout(timeout);
  }
}
function fmtDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function todayIso() {
  return fmtDate(/* @__PURE__ */ new Date());
}
async function parseICalData(icalData, today = todayIso()) {
  const events = [];
  const ical = (await import("node-ical")).default;
  const parsed = ical.parseICS(icalData);
  for (const [key, component] of Object.entries(parsed)) {
    if (!component || component.type !== "VEVENT") continue;
    const event = component;
    if (!(event.start instanceof Date) || !(event.end instanceof Date)) continue;
    const startDate = fmtDate(event.start);
    const endDate = fmtDate(event.end);
    if (endDate < today) continue;
    const rawSummary = (event.summary || "").toString();
    if (/not available/i.test(rawSummary)) continue;
    events.push({
      externalId: event.uid || key,
      summary: event.summary ? String(event.summary) : "External Event",
      startDate,
      endDate
    });
  }
  return events;
}
var GENERIC_TERMS = [
  "not available",
  "blocked",
  "unavailable",
  "reserved",
  "booked",
  "occupied",
  "closed period",
  "maintenance",
  "block"
];
function isGenericPlaceholder(summary) {
  const s = summary.toLowerCase().trim();
  return GENERIC_TERMS.some((t) => s.includes(t));
}
async function isStrDirectDuplicate(event, propertyId) {
  const bookings2 = await storage.getStrBookingsForProperty(propertyId);
  for (const b of bookings2) {
    if (!b.checkOut) continue;
    if (event.startDate < b.checkOut && b.checkIn < event.endDate) {
      if (isGenericPlaceholder(event.summary)) return true;
    }
  }
  return false;
}
async function isColivingDirectDuplicate(event, roomId) {
  const leases2 = await storage.getRoomBlockingLeasesForRoom(roomId);
  for (const l of leases2) {
    if (event.startDate <= l.endDate && l.startDate < event.endDate) {
      if (isGenericPlaceholder(event.summary)) return true;
    }
  }
  return false;
}
async function isDirectDuplicate(event, listing) {
  if (listing.roomId) return isColivingDirectDuplicate(event, listing.roomId);
  return isStrDirectDuplicate(event, listing.propertyId);
}
async function syncListing(listing, dryRun = false) {
  const base = {
    key: listing.roomId ? `room:${listing.roomId}` : `property:${listing.propertyId}`,
    label: listing.label,
    kind: listing.kind,
    ok: false,
    parsed: 0,
    created: 0,
    updated: 0,
    skippedDuplicates: 0,
    removed: 0
  };
  let parsedEvents;
  try {
    const icalData = await secureFetch(listing.url);
    parsedEvents = await parseICalData(icalData);
  } catch (err) {
    return { ...base, error: err instanceof Error ? err.message : String(err) };
  }
  base.parsed = parsedEvents.length;
  const existing = listing.roomId ? await storage.getExternalBlocksForRoom(listing.roomId) : await storage.getExternalBlocksForProperty(listing.propertyId);
  const existingByExternalId = new Map(existing.map((b) => [b.externalId, b]));
  const currentIds = new Set(parsedEvents.map((e) => e.externalId));
  const now = /* @__PURE__ */ new Date();
  for (const event of parsedEvents) {
    try {
      const dup = await isDirectDuplicate(event, listing);
      const prior = existingByExternalId.get(event.externalId);
      if (dup) {
        if (prior && !dryRun) await storage.deleteExternalBooking(prior.id);
        base.skippedDuplicates++;
        continue;
      }
      if (!dryRun) {
        await storage.upsertExternalBooking({
          propertyId: listing.propertyId,
          roomId: listing.roomId,
          externalId: event.externalId,
          startDate: event.startDate,
          endDate: event.endDate,
          summary: event.summary,
          lastSynced: now
        });
      }
      if (prior) base.updated++;
      else base.created++;
    } catch {
    }
  }
  const threshold = /* @__PURE__ */ new Date();
  threshold.setDate(threshold.getDate() - SAFE_DELETE_DAYS);
  for (const prior of existing) {
    if (currentIds.has(prior.externalId)) continue;
    const lastSeen = prior.lastSynced ?? prior.updatedAt ?? prior.createdAt;
    if (!lastSeen) continue;
    if (lastSeen < threshold) {
      if (!dryRun) await storage.deleteExternalBooking(prior.id);
      base.removed++;
    }
  }
  base.ok = true;
  return base;
}
async function syncAllListings(dryRun = false) {
  const listings = await storage.getListingsWithIcalUrl();
  const results = [];
  for (const l of listings) {
    results.push(await syncListing(l, dryRun));
  }
  return { totalListings: listings.length, listings: results };
}
async function refreshExternalCalendars() {
  return syncAllListings(false);
}

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

// api-src/cron/calendar.ts
async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const result = await refreshExternalCalendars();
    const created = result.listings.reduce((n, l) => n + l.created, 0);
    const removed = result.listings.reduce((n, l) => n + l.removed, 0);
    const failed = result.listings.filter((l) => !l.ok).length;
    if (result.totalListings > 0) {
      log(
        `calendar cron: ${result.totalListings} listing(s), ${created} new, ${removed} removed, ${failed} failed`,
        "cron"
      );
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    log(`calendar cron error: ${err.message}`, "cron");
    return res.status(500).json({ ok: false, message: err.message });
  }
}
export {
  handler as default
};

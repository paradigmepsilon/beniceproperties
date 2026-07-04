var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/cron/sweep.ts
import "dotenv/config";

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
  COLIVING_MIN_DAYS: () => COLIVING_MIN_DAYS,
  DEFAULT_DEFAULTED_THRESHOLD_DAYS: () => DEFAULT_DEFAULTED_THRESHOLD_DAYS,
  DEPOSIT_STATUSES: () => DEPOSIT_STATUSES,
  ESCALATION_KINDS: () => ESCALATION_KINDS,
  ESCALATION_SEVERITIES: () => ESCALATION_SEVERITIES,
  ESCALATION_STATUSES: () => ESCALATION_STATUSES,
  LATE_FEE_PER_DAY: () => LATE_FEE_PER_DAY,
  LATE_FEE_STATUSES: () => LATE_FEE_STATUSES,
  LEASE_ENDING_NOTICE_DAYS: () => LEASE_ENDING_NOTICE_DAYS,
  LEASE_REQUIRED_ABOVE_DAYS: () => LEASE_REQUIRED_ABOVE_DAYS,
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
  isDirectCoLivingStay: () => isDirectCoLivingStay,
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
  requiresLease: () => requiresLease,
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
var COLIVING_MIN_DAYS = 7;
var LEASE_REQUIRED_ABOVE_DAYS = 28;
function requiresLease(termDays) {
  return termDays > LEASE_REQUIRED_ABOVE_DAYS;
}
function isDirectCoLivingStay(termDays) {
  return termDays >= COLIVING_MIN_DAYS && termDays <= LEASE_REQUIRED_ABOVE_DAYS;
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
function parseYmd(ymd3) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd3);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd3}`);
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
    const roomBookings = await this.getColivingBookingsForRoom(args.roomId);
    if (roomBookings.some(
      (b) => b.checkOut !== null && args.startDate < b.checkOut && b.checkIn <= args.endDate
    )) {
      return false;
    }
    const blocks = await this.getExternalBlocksForRoom(args.roomId);
    return !blocks.some((b) => args.startDate < b.endDate && b.startDate <= args.endDate);
  }
  async getColivingBookingsForRoom(roomId) {
    return db.select().from(bookings).where(
      and(
        eq(bookings.roomId, roomId),
        eq(bookings.model, "COLIVING"),
        ne(bookings.status, "CANCELLED")
      )
    ).orderBy(asc(bookings.checkIn));
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

// server/lib/stripe.ts
import Stripe from "stripe";

// shared/pricing.ts
var CREDIT_CARD_RATE = 0.035;
var TAX_RATE = 0;
var DEFAULT_CLEANING_FEE = 0;
var roundCurrency = (v) => Math.round(v * 100) / 100;
var calculateBreakdown = ({
  baseAmount,
  cleaningFee = DEFAULT_CLEANING_FEE,
  extrasTotal = 0,
  promoDiscount = 0,
  paymentMethod
}) => {
  const cf = roundCurrency(cleaningFee);
  const extras = roundCurrency(extrasTotal);
  const discount = roundCurrency(Math.max(0, promoDiscount));
  const subtotal = roundCurrency(Math.max(0, baseAmount + cf + extras - discount));
  const tax = roundCurrency(subtotal * TAX_RATE);
  const surcharge = paymentMethod === "STRIPE" ? roundCurrency((subtotal + tax) * CREDIT_CARD_RATE) : 0;
  const total = roundCurrency(subtotal + tax + surcharge);
  return {
    baseAmount: roundCurrency(baseAmount),
    cleaningFee: cf,
    extrasTotal: extras,
    discount,
    subtotal,
    tax,
    surcharge,
    total
  };
};

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

// server/lib/stripe.ts
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

// shared/rateSelection.ts
import { addDays, getDay, parseISO } from "date-fns";

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
var SETTING_DEFAULT_THRESHOLD = "defaulted_threshold_days";
var MS_PER_DAY2 = 24 * 60 * 60 * 1e3;
var ymd = (d) => d.toISOString().slice(0, 10);
function daysPastDue(dueDate, today) {
  const due = (/* @__PURE__ */ new Date(`${dueDate}T00:00:00Z`)).getTime();
  const now = (/* @__PURE__ */ new Date(`${today}T00:00:00Z`)).getTime();
  return Math.round((now - due) / MS_PER_DAY2);
}
var OPEN_INSTALLMENT_STATUSES = /* @__PURE__ */ new Set(["SCHEDULED", "DUE", "FAILED", "LATE"]);
async function runDunningSweep(today = ymd(/* @__PURE__ */ new Date())) {
  const result = {
    remindersSent: 0,
    overdueMessages: 0,
    lateFeesAccrued: 0,
    defaultsRaised: 0
  };
  const thresholdDays = await storage.getSettingNumber(
    SETTING_DEFAULT_THRESHOLD,
    DEFAULT_DEFAULTED_THRESHOLD_DAYS
  );
  const leases2 = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases2) {
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (!property || !guest) continue;
    const rooms2 = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    for (const row of schedule) {
      if (row.status === "PAID" || row.status === "WAIVED") continue;
      if (!OPEN_INSTALLMENT_STATUSES.has(row.status)) continue;
      const past = daysPastDue(row.dueDate, today);
      if (past <= 0) {
        await maybeSendReminder(lease, guest, row, past, today, result);
      } else {
        await handleOverdue(lease, property, guest, rooms2, row, past, today, thresholdDays, result);
      }
    }
  }
  if (result.remindersSent || result.overdueMessages || result.lateFeesAccrued || result.defaultsRaised) {
    log(
      `dunning: ${result.remindersSent} reminders, ${result.overdueMessages} overdue msgs, ${result.lateFeesAccrued} late fees, ${result.defaultsRaised} defaults`,
      "scheduler"
    );
  }
  return result;
}
async function maybeSendReminder(lease, guest, row, past, today, result) {
  const daysUntil2 = -past;
  let kind = null;
  if (daysUntil2 === 7) kind = "REMINDER_7D";
  else if (daysUntil2 === 3) kind = "REMINDER_3D";
  else if (daysUntil2 === 0) kind = "REMINDER_DUE";
  if (!kind) return;
  const already = await storage.hasNotification({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    kind,
    sendDate: today
  });
  if (already) return;
  const when = daysUntil2 === 0 ? "today" : `in ${daysUntil2} day${daysUntil2 === 1 ? "" : "s"}`;
  const sent = await notifyGuest({
    email: guest.email,
    phone: guest.phone,
    subject: `Rent reminder \u2014 payment due ${when}`,
    body: `Hi ${guest.name}, your rent payment of $${row.amount} for installment #${row.scheduleSeq} is due ${when} (${row.dueDate}). ` + (row.paymentMethod === "CARD_ON_FILE" ? "It will be charged automatically to your card on file." : "Please send your payment by the due date.")
  });
  await storage.recordNotification({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    kind,
    sendDate: today,
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
  result.remindersSent += 1;
}
async function handleOverdue(lease, property, guest, rooms2, row, past, today, thresholdDays, result) {
  if (past < 1) return;
  if (row.status !== "LATE" && row.status !== "FAILED") {
    await storage.updateScheduleRow(row.id, { status: "LATE" });
  }
  const fee = await storage.accrueLateFeeOnce({
    leaseId: lease.id,
    scheduleSeq: row.scheduleSeq,
    accrualDate: today,
    amount: LATE_FEE_PER_DAY
  });
  if (fee) result.lateFeesAccrued += 1;
  if (past <= OVERDUE_MESSAGE_DAYS) {
    const kind = `OVERDUE_${past}`;
    const already = await storage.hasNotification({
      leaseId: lease.id,
      scheduleSeq: row.scheduleSeq,
      kind,
      sendDate: today
    });
    if (!already) {
      const sent = await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: `Payment overdue \u2014 installment #${row.scheduleSeq}`,
        body: `Hi ${guest.name}, your rent payment of $${row.amount} (installment #${row.scheduleSeq}, due ${row.dueDate}) is ${past} day${past === 1 ? "" : "s"} overdue. A late fee of $${LATE_FEE_PER_DAY.toFixed(2)}/day is accruing. Please pay as soon as possible to stop further fees.`
      });
      await storage.recordNotification({
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        kind,
        sendDate: today,
        emailSent: sent.email.sent,
        smsSent: sent.sms.sent
      });
      await storage.raiseEscalationOnce({
        leaseId: lease.id,
        scheduleSeq: row.scheduleSeq,
        kind: "PAYMENT_OVERDUE",
        severity: "MEDIUM",
        detail: `Installment #${row.scheduleSeq} ($${row.amount}) overdue since ${row.dueDate}.`
      });
      result.overdueMessages += 1;
    }
  }
  if (past >= thresholdDays && lease.status === "ACTIVE") {
    await storage.updateLease(lease.id, { status: "DEFAULTED" });
    const raised = await storage.raiseEscalationOnce({
      leaseId: lease.id,
      scheduleSeq: row.scheduleSeq,
      kind: "LEASE_DEFAULTED",
      severity: "HIGH",
      detail: `Lease defaulted: installment #${row.scheduleSeq} unpaid ${past} days (threshold ${thresholdDays}).`
    });
    if (raised) {
      const already = await storage.hasNotification({
        leaseId: lease.id,
        scheduleSeq: null,
        kind: "DEFAULTED",
        sendDate: today
      });
      if (!already) {
        const sent = await notifyGuest({
          email: guest.email,
          phone: guest.phone,
          subject: "Your lease is in default",
          body: `Hi ${guest.name}, your lease at ${property.name} is now in default due to an unpaid balance past ${thresholdDays} days. Please contact us immediately to resolve this.`
        });
        await storage.recordNotification({
          leaseId: lease.id,
          scheduleSeq: null,
          kind: "DEFAULTED",
          sendDate: today,
          emailSent: sent.email.sent,
          smsSent: sent.sms.sent
        });
      }
      result.defaultsRaised += 1;
    }
  }
}
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

// server/lib/lifecycle.ts
var MS_PER_DAY3 = 24 * 60 * 60 * 1e3;
var ymd2 = (d) => d.toISOString().slice(0, 10);
var fmtMoney = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
function daysUntil(date2, today) {
  const t = (/* @__PURE__ */ new Date(`${today}T00:00:00Z`)).getTime();
  const d = (/* @__PURE__ */ new Date(`${date2}T00:00:00Z`)).getTime();
  return Math.round((d - t) / MS_PER_DAY3);
}
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
async function onPaymentReceived(args) {
  const { lease, property, guest, scheduleRow } = args;
  if (await storage.hasLifecycleEvent(lease.id, "PAYMENT_RECEIPT", scheduleRow.scheduleSeq)) return;
  const tpl = LIFECYCLE_TEMPLATES.paymentReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(scheduleRow.amount)),
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
async function runLeaseEndingNotices(today = ymd2(/* @__PURE__ */ new Date())) {
  let sent = 0;
  const leases2 = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases2) {
    const until = daysUntil(lease.endDate, today);
    if (until > LEASE_ENDING_NOTICE_DAYS || until < 0) continue;
    if (await storage.hasLifecycleEvent(lease.id, "LEASE_ENDING_SOON", null)) continue;
    const [property, guest] = await Promise.all([
      storage.getProperty(lease.propertyId),
      storage.getGuest(lease.guestId)
    ]);
    if (!property || !guest) continue;
    const tpl = LIFECYCLE_TEMPLATES.leaseEnding({
      name: guest.name,
      property: property.name,
      end: lease.endDate,
      days: until,
      portalUrl: portalUrl(lease)
    });
    const res = await notifyGuest({ email: guest.email, phone: guest.phone, subject: tpl.subject, body: tpl.body });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "LEASE_ENDING_SOON",
      scheduleSeq: null,
      status: res.email.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
      smsSent: res.sms.sent
    });
    sent += 1;
  }
  if (sent > 0) log(`lifecycle: ${sent} lease-ending notice(s) sent`, "scheduler");
  return sent;
}
function publicBaseUrl2() {
  return process.env.PUBLIC_BASE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://beniceproperties.vercel.app");
}

// server/lib/leasePayments.ts
var CHARGEABLE_STATUSES = /* @__PURE__ */ new Set(["SCHEDULED", "DUE"]);
function chargeTotalFor(rentAmount) {
  return calculateBreakdown({ baseAmount: rentAmount, paymentMethod: "STRIPE" }).total;
}
async function runScheduledRentSweep(today = todayYmd()) {
  const result = { considered: 0, charged: 0, failed: 0, skipped: 0 };
  const leases2 = await storage.getLeases({ status: "ACTIVE" });
  for (const lease of leases2) {
    if (!lease.stripeCustomerId || !lease.stripePaymentMethodId) {
      continue;
    }
    const property = await storage.getProperty(lease.propertyId);
    if (!property) continue;
    const rooms2 = await storage.getLeaseRooms(lease.id);
    const schedule = await storage.getScheduleByLease(lease.id);
    for (const row of schedule) {
      if (row.paymentMethod !== "CARD_ON_FILE") continue;
      if (row.dueDate > today) continue;
      if (!CHARGEABLE_STATUSES.has(row.status)) {
        continue;
      }
      if (row.stripePaymentIntentId) {
        result.skipped += 1;
        continue;
      }
      result.considered += 1;
      await chargeInstallment(lease, property, rooms2, row, result);
    }
  }
  if (result.considered > 0) {
    log(
      `rent sweep: ${result.charged} charged, ${result.failed} failed, ${result.skipped} skipped`,
      "scheduler"
    );
  }
  return result;
}
async function chargeInstallment(lease, property, rooms2, row, result) {
  const amount = chargeTotalFor(parseFloat(row.amount));
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "SCHEDULED_RENT",
    scheduleSeq: row.scheduleSeq
  });
  try {
    const pi = await chargeSavedCard({
      amount,
      customerId: lease.stripeCustomerId,
      paymentMethodId: lease.stripePaymentMethodId,
      metadata,
      // One charge per (lease, installment) — re-runs hit the same key.
      idempotencyKey: `lease-rent-${lease.id}-seq-${row.scheduleSeq}`
    });
    if (pi.status === "succeeded") {
      await storage.updateScheduleRow(row.id, {
        status: "PAID",
        paidAt: /* @__PURE__ */ new Date(),
        stripePaymentIntentId: pi.id
      });
      result.charged += 1;
      try {
        await billAccruedLateFees({ lease, property, rooms: rooms2, scheduleSeq: row.scheduleSeq });
      } catch (feeErr) {
        log(`late-fee billing failed lease ${lease.id} seq ${row.scheduleSeq}: ${feeErr.message}`, "scheduler");
      }
      try {
        const guest = await storage.getGuest(lease.guestId);
        if (guest) {
          await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: row.scheduleSeq, amount: row.amount } });
        }
      } catch (rcptErr) {
        log(`receipt error lease ${lease.id} seq ${row.scheduleSeq}: ${rcptErr.message}`, "scheduler");
      }
    } else {
      await storage.updateScheduleRow(row.id, {
        status: "DUE",
        stripePaymentIntentId: pi.id
      });
      result.skipped += 1;
    }
  } catch (err) {
    const piId = err?.raw?.payment_intent?.id;
    const failedRow = await storage.updateScheduleRow(row.id, {
      status: "FAILED",
      stripePaymentIntentId: piId ?? row.stripePaymentIntentId ?? null
    }) ?? row;
    result.failed += 1;
    log(`rent charge FAILED lease ${lease.id} seq ${row.scheduleSeq}: ${err.message}`, "scheduler");
    try {
      const guest = await storage.getGuest(lease.guestId);
      if (guest) {
        await handleChargeFailure({
          lease,
          guest,
          scheduleRow: failedRow,
          reason: err.message
        });
      }
    } catch (notifyErr) {
      log(`failure-path error lease ${lease.id} seq ${row.scheduleSeq}: ${notifyErr.message}`, "scheduler");
    }
  }
}
function todayYmd() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}

// server/lib/icalSync.ts
import { promises as dns } from "node:dns";
import net from "node:net";
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

// api-src/cron/sweep.ts
async function handler(req, res) {
  const secret2 = process.env.CRON_SECRET;
  if (secret2 && req.headers.authorization !== `Bearer ${secret2}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const calendar = await refreshExternalCalendars();
    const rent = await runScheduledRentSweep();
    const dunning = await runDunningSweep();
    const endingNotices = await runLeaseEndingNotices();
    const active = (await storage.getBookings({ status: "ACTIVE" })).length;
    if (active > 0) log(`weeklyRentRun: ${active} active co-living booking(s) checked`, "cron");
    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "cron");
    }
    const snapshot = await buildAndPushSnapshot();
    return res.json({ ok: true, calendar, rent, dunning, endingNotices, active, pending: pending.length, snapshot });
  } catch (err) {
    log(`sweep error: ${err.message}`, "cron");
    return res.status(500).json({ ok: false, message: err.message });
  }
}
export {
  handler as default
};

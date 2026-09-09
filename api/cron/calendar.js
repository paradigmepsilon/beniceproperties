var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  BOOKING_MODELS: () => BOOKING_MODELS,
  BOOKING_STATUSES: () => BOOKING_STATUSES,
  CADENCE_DAYS: () => CADENCE_DAYS,
  CADENCE_WEEKS: () => CADENCE_WEEKS,
  CARD_SURCHARGE_RATE_SETTING: () => CARD_SURCHARGE_RATE_SETTING,
  CHECKOUT_HOLD_LEASE_STATUSES: () => CHECKOUT_HOLD_LEASE_STATUSES,
  CHECKOUT_HOLD_MINUTES: () => CHECKOUT_HOLD_MINUTES,
  COLIVING_MIN_DAYS: () => COLIVING_MIN_DAYS,
  DEFAULT_DEFAULTED_THRESHOLD_DAYS: () => DEFAULT_DEFAULTED_THRESHOLD_DAYS,
  DEFAULT_LATE_FEE_PER_DAY: () => DEFAULT_LATE_FEE_PER_DAY,
  DEPOSIT_HELD_LEASE_STATUSES: () => DEPOSIT_HELD_LEASE_STATUSES,
  DEPOSIT_STATUSES: () => DEPOSIT_STATUSES,
  ESCALATION_KINDS: () => ESCALATION_KINDS,
  ESCALATION_SEVERITIES: () => ESCALATION_SEVERITIES,
  ESCALATION_STATUSES: () => ESCALATION_STATUSES,
  GUEST_AUTO_NOTIFICATIONS_SETTING: () => GUEST_AUTO_NOTIFICATIONS_SETTING,
  LATE_FEE_PER_DAY_SETTING: () => LATE_FEE_PER_DAY_SETTING,
  LATE_FEE_STATUSES: () => LATE_FEE_STATUSES,
  LEASE_ENDING_NOTICE_DAYS: () => LEASE_ENDING_NOTICE_DAYS,
  LEASE_REQUIRED_ABOVE_DAYS: () => LEASE_REQUIRED_ABOVE_DAYS,
  LEASE_STATUSES: () => LEASE_STATUSES,
  LIFECYCLE_EVENT_TYPES: () => LIFECYCLE_EVENT_TYPES,
  LIFECYCLE_SEND_STATUSES: () => LIFECYCLE_SEND_STATUSES,
  MANUAL_BLOCK_KINDS: () => MANUAL_BLOCK_KINDS,
  MANUAL_BLOCK_SOURCES: () => MANUAL_BLOCK_SOURCES,
  MAX_LEASE_DAYS: () => MAX_LEASE_DAYS,
  MESSAGE_AUDIENCES: () => MESSAGE_AUDIENCES,
  MESSAGE_AUTHOR_ROLES: () => MESSAGE_AUTHOR_ROLES,
  MESSAGE_CATEGORIES: () => MESSAGE_CATEGORIES,
  MESSAGE_CHANNELS: () => MESSAGE_CHANNELS,
  MESSAGE_DIRECTIONS: () => MESSAGE_DIRECTIONS,
  MESSAGE_LOG_STATUSES: () => MESSAGE_LOG_STATUSES,
  MESSAGE_STATUSES: () => MESSAGE_STATUSES,
  NON_BLOCKING_BOOKING_STATUSES: () => NON_BLOCKING_BOOKING_STATUSES,
  NOTIFICATION_KINDS: () => NOTIFICATION_KINDS,
  OVERDUE_MESSAGE_DAYS: () => OVERDUE_MESSAGE_DAYS,
  PAYMENT_CADENCES: () => PAYMENT_CADENCES,
  PAYMENT_METHODS: () => PAYMENT_METHODS,
  PAYMENT_STATUSES: () => PAYMENT_STATUSES,
  PAYMENT_TYPES: () => PAYMENT_TYPES,
  PROPERTY_ENTITIES: () => PROPERTY_ENTITIES,
  PROPERTY_TYPES: () => PROPERTY_TYPES,
  REFUND_KINDS: () => REFUND_KINDS,
  ROOM_STATUSES: () => ROOM_STATUSES,
  ROOM_UNBOOKABLE_STATUSES: () => ROOM_UNBOOKABLE_STATUSES,
  SCHEDULE_PAYMENT_METHODS: () => SCHEDULE_PAYMENT_METHODS,
  SCHEDULE_STATUSES: () => SCHEDULE_STATUSES,
  SENSITIVE_ACCESS_FIELDS: () => SENSITIVE_ACCESS_FIELDS,
  US_STATE_CODES: () => US_STATE_CODES,
  VERIFICATION_STATUSES: () => VERIFICATION_STATUSES,
  adminUsers: () => adminUsers,
  allowedCadencesForTerm: () => allowedCadencesForTerm,
  appSettings: () => appSettings,
  bookingGate: () => bookingGate,
  bookingIntents: () => bookingIntents,
  bookings: () => bookings,
  externalBookings: () => externalBookings,
  guestMessages: () => guestMessages,
  guests: () => guests,
  heroImages: () => heroImages,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertAppSettingSchema: () => insertAppSettingSchema,
  insertBookingIntentSchema: () => insertBookingIntentSchema,
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
  insertLtrInquirySchema: () => insertLtrInquirySchema,
  insertManualBlockSchema: () => insertManualBlockSchema,
  insertMessageLogSchema: () => insertMessageLogSchema,
  insertNewsletterSubscriberSchema: () => insertNewsletterSubscriberSchema,
  insertNotificationLogSchema: () => insertNotificationLogSchema,
  insertPartnerInquirySchema: () => insertPartnerInquirySchema,
  insertPaymentScheduleSchema: () => insertPaymentScheduleSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  insertUoEscalationSchema: () => insertUoEscalationSchema,
  insertVehicleSchema: () => insertVehicleSchema,
  isDirectCoLivingStay: () => isDirectCoLivingStay,
  journalPosts: () => journalPosts,
  kpiSnapshots: () => kpiSnapshots,
  lateFees: () => lateFees,
  leaseHoldsRoom: () => leaseHoldsRoom,
  leaseRooms: () => leaseRooms,
  leases: () => leases,
  lifecycleEvents: () => lifecycleEvents,
  listingContentSchema: () => listingContentSchema,
  ltrInquiries: () => ltrInquiries,
  manualBlocks: () => manualBlocks,
  messageLog: () => messageLog,
  newsletterSubscribers: () => newsletterSubscribers,
  notificationLog: () => notificationLog,
  partnerInquiries: () => partnerInquiries,
  paymentRefunds: () => paymentRefunds,
  paymentSchedule: () => paymentSchedule,
  payments: () => payments,
  properties: () => properties,
  propertyAccessInfo: () => propertyAccessInfo,
  propertyAccessInfoSchema: () => propertyAccessInfoSchema,
  requiresLease: () => requiresLease,
  roomAccessInfo: () => roomAccessInfo,
  roomAccessInfoSchema: () => roomAccessInfoSchema,
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
  index,
  uniqueIndex
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
function leaseHoldsRoom(lease, now = /* @__PURE__ */ new Date()) {
  if (lease.depositStatus === "PAID" && DEPOSIT_HELD_LEASE_STATUSES.includes(lease.status)) {
    return true;
  }
  if (!CHECKOUT_HOLD_LEASE_STATUSES.includes(lease.status)) return false;
  if (!lease.createdAt) return false;
  const created = lease.createdAt instanceof Date ? lease.createdAt : new Date(lease.createdAt);
  return now.getTime() - created.getTime() < CHECKOUT_HOLD_MINUTES * 6e4;
}
function allowedCadencesForTerm(termDays) {
  if (termDays >= 28) return ["WEEKLY", "BIWEEKLY", "MONTHLY"];
  return ["WEEKLY"];
}
function requiresLease(termDays) {
  return termDays > LEASE_REQUIRED_ABOVE_DAYS;
}
function isDirectCoLivingStay(termDays) {
  return termDays >= COLIVING_MIN_DAYS && termDays <= LEASE_REQUIRED_ABOVE_DAYS;
}
var PROPERTY_TYPES, ROOM_STATUSES, ROOM_UNBOOKABLE_STATUSES, BOOKING_MODELS, BOOKING_STATUSES, NON_BLOCKING_BOOKING_STATUSES, PAYMENT_METHODS, PAYMENT_TYPES, PAYMENT_STATUSES, PROPERTY_ENTITIES, PAYMENT_CADENCES, LEASE_STATUSES, VERIFICATION_STATUSES, US_STATE_CODES, SCHEDULE_STATUSES, SCHEDULE_PAYMENT_METHODS, LATE_FEE_STATUSES, DEPOSIT_STATUSES, CADENCE_WEEKS, CADENCE_DAYS, MAX_LEASE_DAYS, DEPOSIT_HELD_LEASE_STATUSES, CHECKOUT_HOLD_LEASE_STATUSES, CHECKOUT_HOLD_MINUTES, COLIVING_MIN_DAYS, LEASE_REQUIRED_ABOVE_DAYS, DEFAULT_LATE_FEE_PER_DAY, NOTIFICATION_KINDS, ESCALATION_KINDS, ESCALATION_STATUSES, ESCALATION_SEVERITIES, DEFAULT_DEFAULTED_THRESHOLD_DAYS, OVERDUE_MESSAGE_DAYS, properties, listingContentSchema, insertPropertySchema, rooms, insertRoomSchema, guests, insertGuestSchema, bookings, insertBookingSchema, payments, insertPaymentSchema, subscriptions, insertSubscriptionSchema, kpiSnapshots, insertKpiSnapshotSchema, adminUsers, insertAdminUserSchema, newsletterSubscribers, insertNewsletterSubscriberSchema, ltrInquiries, insertLtrInquirySchema, partnerInquiries, insertPartnerInquirySchema, leases, insertLeaseSchema, leaseRooms, insertLeaseRoomSchema, vehicles, insertVehicleSchema, bookingGate, REFUND_KINDS, paymentRefunds, SENSITIVE_ACCESS_FIELDS, propertyAccessInfoSchema, roomAccessInfoSchema, propertyAccessInfo, roomAccessInfo, paymentSchedule, insertPaymentScheduleSchema, lateFees, insertLateFeeSchema, notificationLog, insertNotificationLogSchema, appSettings, insertAppSettingSchema, GUEST_AUTO_NOTIFICATIONS_SETTING, LATE_FEE_PER_DAY_SETTING, CARD_SURCHARGE_RATE_SETTING, uoEscalations, insertUoEscalationSchema, MESSAGE_AUTHOR_ROLES, MESSAGE_STATUSES, MESSAGE_CATEGORIES, guestMessages, insertGuestMessageSchema, LIFECYCLE_EVENT_TYPES, LIFECYCLE_SEND_STATUSES, LEASE_ENDING_NOTICE_DAYS, lifecycleEvents, insertLifecycleEventSchema, heroImages, insertHeroImageSchema, journalPosts, externalBookings, insertExternalBookingSchema, MANUAL_BLOCK_KINDS, MANUAL_BLOCK_SOURCES, manualBlocks, insertManualBlockSchema, MESSAGE_DIRECTIONS, MESSAGE_AUDIENCES, MESSAGE_CHANNELS, MESSAGE_LOG_STATUSES, messageLog, insertMessageLogSchema, bookingIntents, insertBookingIntentSchema;
var init_schema = __esm({
  "shared/schema.ts"() {
    "use strict";
    PROPERTY_TYPES = ["STR", "COLIVING", "LTR"];
    ROOM_STATUSES = ["AVAILABLE", "OCCUPIED", "HOLD", "MAINTENANCE", "INACTIVE"];
    ROOM_UNBOOKABLE_STATUSES = ["HOLD", "MAINTENANCE", "INACTIVE"];
    BOOKING_MODELS = ["STR", "COLIVING"];
    BOOKING_STATUSES = [
      "PENDING_PAYMENT",
      // Paid IN FULL, but held for human approval: a co-living stay of 7–28 nights
      // whose guest must upload a driver's license and sign a rental agreement, and
      // whose admin must check the name and set a door code, before it goes live.
      // BLOCKS DATES — the guest's money is in hand, so the room is theirs while the
      // review happens. Deliberately absent from NON_BLOCKING_BOOKING_STATUSES; see
      // shared/bookingGate.ts and its test for the ratchet on that.
      "PENDING_APPROVAL",
      "CONFIRMED",
      "ACTIVE",
      "COMPLETED",
      "CANCELLED",
      // Paid, but the dates were taken (race / OTA block / constraint). Does NOT block
      // dates and never auto-notifies the guest. Admin resolves: confirm or cancel+refund.
      "CONFLICT"
    ];
    NON_BLOCKING_BOOKING_STATUSES = ["CANCELLED", "CONFLICT"];
    PAYMENT_METHODS = ["STRIPE", "CASHAPP", "ZELLE"];
    PAYMENT_TYPES = ["DEPOSIT", "WEEKLY", "ONE_TIME"];
    PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED"];
    PROPERTY_ENTITIES = ["TRAD", "BNP"];
    PAYMENT_CADENCES = ["WEEKLY", "BIWEEKLY", "MONTHLY"];
    LEASE_STATUSES = [
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
    VERIFICATION_STATUSES = [
      "NOT_SUBMITTED",
      "PENDING_REVIEW",
      "APPROVED",
      "REJECTED"
    ];
    US_STATE_CODES = [
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
    SCHEDULE_STATUSES = [
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
    SCHEDULE_PAYMENT_METHODS = ["CARD_ON_FILE", "MANUAL"];
    LATE_FEE_STATUSES = ["ACCRUED", "BILLED", "PAID", "WAIVED"];
    DEPOSIT_STATUSES = ["PENDING", "PAID", "REFUNDED", "WAIVED"];
    CADENCE_WEEKS = {
      WEEKLY: 1,
      BIWEEKLY: 2,
      MONTHLY: 4
    };
    CADENCE_DAYS = {
      WEEKLY: 7,
      BIWEEKLY: 14,
      MONTHLY: 28
    };
    MAX_LEASE_DAYS = 90;
    DEPOSIT_HELD_LEASE_STATUSES = ["PENDING_VERIFICATION", "ACTIVE"];
    CHECKOUT_HOLD_LEASE_STATUSES = [
      "DRAFT",
      "PENDING_SIGNATURE",
      "PENDING_FIRST_PAYMENT"
    ];
    CHECKOUT_HOLD_MINUTES = 30;
    COLIVING_MIN_DAYS = 7;
    LEASE_REQUIRED_ABOVE_DAYS = 28;
    DEFAULT_LATE_FEE_PER_DAY = 25;
    NOTIFICATION_KINDS = [
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
    ESCALATION_KINDS = [
      "PAYMENT_FAILED",
      "PAYMENT_OVERDUE",
      "LEASE_DEFAULTED",
      "VERIFICATION_PENDING",
      // a tenant uploaded a license awaiting admin review
      "BOOKING_CONFLICT",
      // a paid booking landed on dates that were taken
      "CALENDAR_SYNC_FAILED",
      // iCal sync couldn't refresh a listing's external calendar
      // --- Short-stay approval gate ---
      "GATE_AWAITING_APPROVAL",
      // LOW: guest submitted ID + signature; a human must review
      // HIGH: check-in has arrived and the docs are STILL incomplete. Raised instead
      // of auto-declining — a guest arriving today must never have their booking
      // cancelled and refunded out from under them by a scheduled job.
      "GATE_INCOMPLETE_AT_CHECKIN",
      "REFUND_FAILED",
      // HIGH: a decline cancelled the booking but Stripe refused the refund
      "ACCESS_INFO_MISSING",
      // HIGH: a guest arrives tomorrow and the property has no door code/wifi
      // HIGH: an extension was PAID but the nights were taken before it applied. The
      // charge STANDS and is never auto-refunded — a human resolves it.
      "EXTENSION_CONFLICT"
    ];
    ESCALATION_STATUSES = ["OPEN", "ACKNOWLEDGED", "RESOLVED"];
    ESCALATION_SEVERITIES = ["LOW", "MEDIUM", "HIGH"];
    DEFAULT_DEFAULTED_THRESHOLD_DAYS = 7;
    OVERDUE_MESSAGE_DAYS = 3;
    properties = pgTable("properties", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      // Free-text location label, e.g. "Atlanta" | "Antigua". Kept as text (not an
      // enum) so new markets don't require a migration.
      location: text("location").notNull(),
      // "STR" (book the whole place) | "COLIVING" (book a room within it) | "LTR"
      // (long-term rental — inquiry-only, no online booking; priced off-platform).
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
      // Added 2026-09-08: biweekly is a priced tier in its own right, not 2 x weekly.
      biweeklyRate: decimal("biweekly_rate", { precision: 10, scale: 2 }),
      monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
      // Per-night-by-weekday prices (added 2026-06-30, additive nullable). When a stay
      // resolves to the DAILY tier (<7 nights), each night is priced by the weekday it
      // falls on and the stay total = SUM of those nightly prices. A missing weekday
      // price falls back to dailyRate ?? basePrice for that night. WEEKLY/MONTHLY tiers
      // ignore these (they use the scalar rate). See shared/rateSelection.ts
      // weekdayStayTotal(). STR (whole-property) only — co-living has no nightly path.
      // LTR pricing (added 2026-07-06, additive nullable). LTR properties are
      // inquiry-only (never booked/charged online) — these two numbers are the ONLY
      // prices an LTR listing carries: the recurring monthly payment reuses
      // monthlyRate above; downPayment is the one-time move-in amount. Managed from
      // Unified-Ops; ignored by STR/COLIVING billing math entirely.
      downPayment: decimal("down_payment", { precision: 10, scale: 2 }),
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
    listingContentSchema = z.object({
      hook: z.string().optional(),
      essentials: z.array(z.object({ icon: z.string().optional(), label: z.string() })).optional(),
      gettingAround: z.array(z.object({ place: z.string(), time: z.string() })).optional(),
      whoFor: z.string().optional()
    });
    insertPropertySchema = createInsertSchema(properties, {
      type: z.enum(PROPERTY_TYPES),
      entity: z.enum(PROPERTY_ENTITIES).optional(),
      photos: z.array(z.string()).optional(),
      amenities: z.array(z.string()).optional(),
      listingContent: listingContentSchema.nullish()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    rooms = pgTable(
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
        // Per-room cleaning fee (added 2026-07-04). Mirrors properties.cleaningFee for
        // STR: a one-time fee collected at booking. On a short stay it folds into the
        // upfront charge via calculateBreakdown; on a lease it is charged as its own
        // CLEANING_FEE PaymentIntent at move-in (non-refundable). Nullable, "0" default.
        cleaningFee: decimal("cleaning_fee", { precision: 10, scale: 2 }).default("0"),
        // Day/month rates (added 2026-06-27). weekly_rent is the weekly value used by
        // chooseRate(); these add the daily + monthly tiers. Nullable; fallback to the
        // next shorter tier. See shared/rateSelection.ts.
        dailyRate: decimal("daily_rate", { precision: 10, scale: 2 }),
        // Added 2026-09-08: a priced tier in its own right, not 2 x weekly_rent.
        biweeklyRate: decimal("biweekly_rate", { precision: 10, scale: 2 }),
        monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
        // "AVAILABLE" | "OCCUPIED" | "HOLD" | "MAINTENANCE" | "INACTIVE"
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
    insertRoomSchema = createInsertSchema(rooms, {
      status: z.enum(ROOM_STATUSES),
      photos: z.array(z.string()).optional(),
      listingContent: listingContentSchema.nullish()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    guests = pgTable(
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
    insertGuestSchema = createInsertSchema(guests, {
      email: z.string().email()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    bookings = pgTable(
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
    insertBookingSchema = createInsertSchema(bookings, {
      model: z.enum(BOOKING_MODELS),
      status: z.enum(BOOKING_STATUSES),
      paymentMethod: z.enum(PAYMENT_METHODS)
    }).omit({ id: true, createdAt: true, updatedAt: true });
    payments = pgTable(
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
    insertPaymentSchema = createInsertSchema(payments, {
      type: z.enum(PAYMENT_TYPES),
      method: z.enum(PAYMENT_METHODS),
      status: z.enum(PAYMENT_STATUSES)
    }).omit({ id: true, createdAt: true, updatedAt: true });
    subscriptions = pgTable(
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
    insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    kpiSnapshots = pgTable(
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
    insertKpiSnapshotSchema = createInsertSchema(kpiSnapshots).omit({
      id: true,
      createdAt: true
    });
    adminUsers = pgTable("admin_users", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      // Hashed password (never plaintext). Hashing happens in the auth layer.
      password: text("password").notNull(),
      name: text("name"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertAdminUserSchema = createInsertSchema(adminUsers, {
      email: z.string().email()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    newsletterSubscribers = pgTable("newsletter_subscribers", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      email: text("email").notNull().unique(),
      name: text("name"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertNewsletterSubscriberSchema = createInsertSchema(newsletterSubscribers, {
      email: z.string().email()
    }).omit({ id: true, createdAt: true });
    ltrInquiries = pgTable("ltr_inquiries", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      // The LTR property this inquiry is about. Nullable: a general "contact us about
      // long-term options" inquiry (e.g. from the /ltr index) carries no property.
      propertyId: text("property_id"),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      // Desired move-in, free text (e.g. "Sept 1" / "flexible") — not a date column,
      // since inquiries are casual and we don't parse/validate it.
      moveIn: text("move_in"),
      message: text("message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertLtrInquirySchema = createInsertSchema(ltrInquiries, {
      email: z.string().email(),
      name: z.string().min(1)
    }).omit({ id: true, createdAt: true });
    partnerInquiries = pgTable("partner_inquiries", {
      id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
      name: text("name").notNull(),
      email: text("email").notNull(),
      phone: text("phone"),
      company: text("company"),
      // Which offerings the partner is interested in (INVEST | MANAGE | DESIGN |
      // EVENTS | COMMUNITY | OTHER). Multi-select → array; empty when none picked.
      interest: text("interest").array().notNull().default(sql`ARRAY[]::text[]`),
      message: text("message"),
      createdAt: timestamp("created_at").defaultNow().notNull()
    });
    insertPartnerInquirySchema = createInsertSchema(partnerInquiries, {
      email: z.string().email(),
      name: z.string().min(1),
      interest: z.array(z.string()).optional()
    }).omit({ id: true, createdAt: true });
    leases = pgTable(
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
        // --- One-time cleaning fee (added 2026-07-04). Snapshotted at lease creation
        // from the included room(s) (sum of rooms.cleaningFee) so a later re-price never
        // changes a signed lease. Unlike the deposit it is NOT refundable — it is a real
        // cost, charged as its own CLEANING_FEE PaymentIntent at move-in alongside the
        // deposit, and never counted as rent. "0" default; charge skipped when 0. ---
        cleaningFeeSnapshot: decimal("cleaning_fee_snapshot", { precision: 10, scale: 2 }).default("0"),
        // "PENDING" | "PAID" | "WAIVED" (no REFUNDED — the fee is non-refundable).
        cleaningFeeStatus: text("cleaning_fee_status").notNull().default("PENDING"),
        cleaningFeeStripePaymentIntentId: text("cleaning_fee_stripe_payment_intent_id"),
        cleaningFeePaidAt: timestamp("cleaning_fee_paid_at"),
        // --- Pricing terms frozen at creation (added 2026-09-08). The late fee and
        // card surcharge are admin-editable settings now; these snapshots keep every
        // signed lease on the terms its agreement states. Null on pre-2026-09-08
        // leases → resolvers fall back to the current setting (== the old constants
        // until someone changes them). Additive, nullable. ---
        lateFeePerDaySnapshot: decimal("late_fee_per_day_snapshot", { precision: 10, scale: 2 }),
        cardSurchargeRateSnapshot: decimal("card_surcharge_rate_snapshot", { precision: 6, scale: 4 }),
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
    insertLeaseSchema = createInsertSchema(leases, {
      paymentCadence: z.enum(PAYMENT_CADENCES),
      status: z.enum(LEASE_STATUSES).optional(),
      verificationStatus: z.enum(VERIFICATION_STATUSES).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    leaseRooms = pgTable(
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
    insertLeaseRoomSchema = createInsertSchema(leaseRooms).omit({
      id: true,
      createdAt: true
    });
    vehicles = pgTable(
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
    insertVehicleSchema = createInsertSchema(vehicles, {
      plateState: z.enum(US_STATE_CODES).nullish(),
      // Reasonable bounds; a plausible vehicle year range. Nullable (cleared when the
      // tenant declares no vehicle).
      year: z.number().int().min(1900).max(2100).nullish()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    bookingGate = pgTable("booking_gate", {
      bookingId: varchar("booking_id").primaryKey().references(() => bookings.id),
      // Unguessable credential for the guest's document page — the token IS the
      // auth, mirroring leases.portal_token. 24 chars of base62 (~143 bits): long
      // enough to be unguessable, short enough that
      // "…/stay/<token>/extend" fits a single 160-char GSM-7 SMS segment.
      gateToken: text("gate_token").notNull(),
      // When the 72h silence clock expires. STORED, not derived, so the sweep is one
      // indexable comparison, the rule is auditable after the fact, and an admin can
      // grant an extension with no code change. Rewritten on every fix-request, so
      // "silence" means since WE last asked, not since booking.
      docsDeadlineAt: timestamp("docs_deadline_at"),
      // --- Rental agreement (typed e-signature, E-SIGN/UETA) ---
      agreementSignedName: text("agreement_signed_name"),
      agreementSignedAt: timestamp("agreement_signed_at"),
      agreementSignedIp: text("agreement_signed_ip"),
      // Route string, e.g. /api/stay/<token>/agreement. Named honestly, unlike
      // leases.signed_pdf_url — there is no PDF library in this app.
      agreementDocumentUrl: text("agreement_document_url"),
      // The frozen artifact, self-contained HTML stored inline (no blob store).
      agreementDocumentHtml: text("agreement_document_html"),
      // --- Driver's license (VERIFICATION_STATUSES; mirrors the lease columns) ---
      verificationStatus: text("verification_status").notNull().default("NOT_SUBMITTED"),
      // R2 object key only — the IMAGE never touches this database.
      licenseR2Key: text("license_r2_key"),
      licenseUploadedAt: timestamp("license_uploaded_at"),
      verificationReviewedAt: timestamp("verification_reviewed_at"),
      verificationReviewedBy: text("verification_reviewed_by"),
      verificationRejectionReason: text("verification_rejection_reason"),
      // --- Admin decision ---
      approvedAt: timestamp("approved_at"),
      approvedBy: text("approved_by"),
      // The admin affirms the licence name matches the renter. Recorded because it
      // is the substance of the review, not a UI nicety.
      nameMatchesAck: boolean("name_matches_ack").notNull().default(false),
      // SENSITIVE — a property access code. Never log it, never send it to Telegram,
      // never put it in an SMS, an error message, an escalation detail, or a test
      // fixture. Only two surfaces render it: the welcome email and the token-gated
      // stay page. See shared/doorCode.ts.
      doorCode: text("door_code"),
      // --- Non-terminal bounce-back ---
      fixRequestedAt: timestamp("fix_requested_at"),
      fixRequestedBy: text("fix_requested_by"),
      fixRequestedReason: text("fix_requested_reason"),
      // Round counter. Used as lifecycle_events.schedule_seq so a SECOND fix request
      // can send a fresh nudge instead of being deduped against the first.
      fixRequestCount: integer("fix_request_count").notNull().default(0),
      // --- Terminal decline (the booking itself becomes CANCELLED) ---
      cancelReason: text("cancel_reason"),
      // "system:gate-sweep" for an auto-decline, otherwise an admin email.
      cancelledBy: text("cancelled_by"),
      // --- Extension audit ---
      // The check_out this stay was originally sold with, set the first time the
      // booking is extended so the original term is never lost.
      originalCheckOut: date("original_check_out"),
      // Monotonic extension ordinal. Used as lifecycle_events.schedule_seq for the
      // checkout reminders, so extending a stay RE-ARMS them — lifecycle_events has
      // no date in its key, so without this an extended stay would silently never
      // be reminded again, and therefore never offered another extension.
      extensionCount: integer("extension_count").notNull().default(0),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    REFUND_KINDS = [
      "GATE_DECLINE",
      // an admin declined a gated stay
      "GATE_AUTO_DECLINE",
      // the 72h sweep declined it with no human in the loop
      "CONFLICT",
      // admin cancelled a paid CONFLICT booking
      "DEPOSIT_RETURN",
      // refundable lease deposit returned at move-out
      "ADMIN"
      // any other deliberate admin refund
    ];
    paymentRefunds = pgTable(
      "payment_refunds",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        paymentId: varchar("payment_id").notNull().references(() => payments.id),
        bookingId: varchar("booking_id").references(() => bookings.id),
        // Not an FK: lease refunds are recorded here too, and the column exists so
        // reconciliation can group by lease without a second table.
        leaseId: varchar("lease_id"),
        stripeRefundId: text("stripe_refund_id").notNull(),
        stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
        amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
        // REFUND_KINDS
        kind: text("kind").notNull(),
        // Operator-supplied. Must never contain guest contact details or a door code.
        reason: text("reason"),
        // Admin email, or "system:gate-sweep" when no human was involved.
        actor: text("actor").notNull(),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        stripeRefundIdx: uniqueIndex("payment_refunds_stripe_uidx").on(table.stripeRefundId),
        paymentIdx: index("payment_refunds_payment_idx").on(table.paymentId),
        bookingIdx: index("payment_refunds_booking_idx").on(table.bookingId)
      })
    );
    SENSITIVE_ACCESS_FIELDS = ["wifiPassword", "buildingEntry"];
    propertyAccessInfoSchema = z.object({
      wifiSsid: z.string().max(200).optional(),
      wifiPassword: z.string().max(200).optional(),
      buildingEntry: z.string().max(200).optional(),
      directions: z.string().max(4e3).optional(),
      parking: z.string().max(2e3).optional(),
      checkInFrom: z.string().max(50).optional(),
      checkOutBy: z.string().max(50).optional(),
      notes: z.string().max(4e3).optional()
    }).strict();
    roomAccessInfoSchema = z.object({
      findingNotes: z.string().max(2e3).optional(),
      floor: z.string().max(50).optional(),
      doorLabel: z.string().max(100).optional(),
      notes: z.string().max(2e3).optional()
    }).strict();
    propertyAccessInfo = pgTable("property_access_info", {
      propertyId: varchar("property_id").primaryKey().references(() => properties.id),
      info: jsonb("info").$type().notNull().default({}),
      updatedBy: text("updated_by"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    roomAccessInfo = pgTable("room_access_info", {
      roomId: varchar("room_id").primaryKey().references(() => rooms.id),
      info: jsonb("info").$type().notNull().default({}),
      updatedBy: text("updated_by"),
      createdAt: timestamp("created_at").defaultNow().notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    paymentSchedule = pgTable(
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
    insertPaymentScheduleSchema = createInsertSchema(paymentSchedule, {
      status: z.enum(SCHEDULE_STATUSES).optional(),
      paymentMethod: z.enum(SCHEDULE_PAYMENT_METHODS).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    lateFees = pgTable(
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
    insertLateFeeSchema = createInsertSchema(lateFees, {
      status: z.enum(LATE_FEE_STATUSES).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    notificationLog = pgTable(
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
    insertNotificationLogSchema = createInsertSchema(notificationLog).omit({
      id: true,
      createdAt: true
    });
    appSettings = pgTable("app_settings", {
      key: varchar("key").primaryKey(),
      value: text("value").notNull(),
      updatedAt: timestamp("updated_at").defaultNow().notNull()
    });
    insertAppSettingSchema = createInsertSchema(appSettings).omit({ updatedAt: true });
    GUEST_AUTO_NOTIFICATIONS_SETTING = "guest_auto_notifications";
    LATE_FEE_PER_DAY_SETTING = "late_fee_per_day";
    CARD_SURCHARGE_RATE_SETTING = "card_surcharge_rate";
    uoEscalations = pgTable(
      "uo_escalations",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        leaseId: varchar("lease_id"),
        bookingId: varchar("booking_id"),
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
        bookingIdx: index("uo_escalations_booking_idx").on(table.bookingId),
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
    insertUoEscalationSchema = createInsertSchema(uoEscalations, {
      kind: z.enum(ESCALATION_KINDS),
      severity: z.enum(ESCALATION_SEVERITIES).optional(),
      status: z.enum(ESCALATION_STATUSES).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    MESSAGE_AUTHOR_ROLES = ["GUEST", "STAFF"];
    MESSAGE_STATUSES = ["OPEN", "ANSWERED", "RESOLVED"];
    MESSAGE_CATEGORIES = ["QUESTION", "MAINTENANCE", "OTHER"];
    guestMessages = pgTable(
      "guest_messages",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        leaseId: varchar("lease_id"),
        bookingId: varchar("booking_id"),
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
        bookingIdx: index("guest_messages_booking_idx").on(table.bookingId),
        threadIdx: index("guest_messages_thread_idx").on(table.threadId),
        statusIdx: index("guest_messages_status_idx").on(table.status)
      })
    );
    insertGuestMessageSchema = createInsertSchema(guestMessages, {
      authorRole: z.enum(MESSAGE_AUTHOR_ROLES).optional(),
      category: z.enum(MESSAGE_CATEGORIES).optional(),
      status: z.enum(MESSAGE_STATUSES).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    LIFECYCLE_EVENT_TYPES = [
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
      "LEASE_ENDING_SOON",
      // ~14 days before end_date
      "BOOKING_CONFIRMED",
      // short-stay booking materialized (guest)
      "ADMIN_NEW_BOOKING",
      // short-stay booking materialized (admin)
      "LEASE_HOLD_RELEASED",
      // hold expired — room released back to inventory
      "FIRST_PAYMENT_REMINDER",
      // signed, deposit unpaid — nudge before the hold lapses
      // --- Short-stay approval gate (booking-scoped; scheduleSeq carries a ROUND
      // number, not an installment — see the note on lifecycleEvents.scheduleSeq).
      "STAY_DOCS_REQUIRED",
      // paid, gated — here is what is still outstanding (guest)
      "STAY_DOCS_COMPLETE",
      // both docs in, under review (guest)
      "STAY_ADMIN_AWAITING_APPROVAL",
      // both docs in (admin: email + Telegram)
      "STAY_FIX_REQUESTED",
      // admin bounced a document; non-terminal (guest)
      "STAY_APPROVED_WELCOME",
      // approved — dates, door code, wifi, directions (guest)
      "STAY_GHOST_NUDGE_1",
      // day 1 of silence (guest)
      "STAY_GHOST_NUDGE_2",
      // day 2 of silence — "cancelled tomorrow" (guest)
      "STAY_DECLINED_REFUNDED",
      // terminal: cancelled and refunded in full (guest)
      "STAY_ADMIN_AUTO_DECLINED",
      // the sweep refunded without a human (admin)
      "STAY_CHECKOUT_48H",
      // 2 days out, carries the extension offer (guest)
      "STAY_CHECKOUT_24H",
      // 1 day out, checkout time (guest)
      "STAY_EXTENDED",
      // extension paid and applied (guest)
      "STAY_ADMIN_EXTENDED",
      // extension paid and applied (admin)
      "STAY_ADMIN_EXTENSION_CONFLICT",
      // extension PAID but the dates were taken (admin)
      "STR_PRE_ARRIVAL"
      // day-before check-in details (guest) — closes the promise
    ];
    LIFECYCLE_SEND_STATUSES = ["SENT", "SKIPPED", "FAILED"];
    LEASE_ENDING_NOTICE_DAYS = 14;
    lifecycleEvents = pgTable(
      "lifecycle_events",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        leaseId: varchar("lease_id"),
        bookingId: varchar("booking_id"),
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
        bookingIdx: index("lifecycle_events_booking_idx").on(table.bookingId),
        dedupeIdx: index("lifecycle_events_dedupe_idx").on(
          table.leaseId,
          table.eventType,
          table.scheduleSeq
        )
      })
    );
    insertLifecycleEventSchema = createInsertSchema(lifecycleEvents).omit({
      id: true,
      createdAt: true
    });
    heroImages = pgTable(
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
    insertHeroImageSchema = createInsertSchema(heroImages).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    journalPosts = pgTable(
      "journal_posts",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        slug: text("slug").notNull().unique(),
        title: text("title").notNull(),
        excerpt: text("excerpt").notNull(),
        // Public R2 URL; null → the site's branded gradient fallback.
        coverUrl: text("cover_url"),
        blocks: jsonb("blocks").$type().notNull().default(sql`'[]'::jsonb`),
        published: boolean("published").notNull().default(false),
        // Stamped on first publish; used as the display date.
        publishedAt: timestamp("published_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        publishedIdx: index("journal_posts_published_idx").on(table.published, table.publishedAt)
      })
    );
    externalBookings = pgTable(
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
    insertExternalBookingSchema = createInsertSchema(externalBookings).omit({
      id: true,
      createdAt: true,
      updatedAt: true
    });
    MANUAL_BLOCK_KINDS = ["OFF_PLATFORM_BOOKING", "MAINTENANCE", "OWNER_USE", "OTHER"];
    MANUAL_BLOCK_SOURCES = ["ADMIN", "UO"];
    manualBlocks = pgTable(
      "manual_blocks",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        propertyId: varchar("property_id").notNull().references(() => properties.id),
        roomId: varchar("room_id").references(() => rooms.id),
        startDate: date("start_date").notNull(),
        endDate: date("end_date").notNull(),
        kind: text("kind").notNull().default("OTHER"),
        note: text("note"),
        guestName: text("guest_name"),
        source: text("source").notNull().default("ADMIN"),
        createdBy: text("created_by"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        propertyRangeIdx: index("manual_blocks_property_range_idx").on(table.propertyId, table.startDate, table.endDate),
        roomRangeIdx: index("manual_blocks_room_range_idx").on(table.roomId, table.startDate, table.endDate)
      })
    );
    insertManualBlockSchema = createInsertSchema(manualBlocks, {
      kind: z.enum(MANUAL_BLOCK_KINDS).optional(),
      source: z.enum(MANUAL_BLOCK_SOURCES).optional()
    }).omit({ id: true, createdAt: true, updatedAt: true });
    MESSAGE_DIRECTIONS = ["OUTBOUND", "INBOUND"];
    MESSAGE_AUDIENCES = ["GUEST", "ADMIN"];
    MESSAGE_CHANNELS = ["EMAIL", "SMS", "TELEGRAM", "PORTAL"];
    MESSAGE_LOG_STATUSES = ["SENT", "FAILED", "DRY_RUN", "SKIPPED"];
    messageLog = pgTable(
      "message_log",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        bookingId: varchar("booking_id"),
        leaseId: varchar("lease_id"),
        guestId: varchar("guest_id"),
        direction: text("direction").notNull().default("OUTBOUND"),
        audience: text("audience").notNull().default("GUEST"),
        channel: text("channel").notNull(),
        // Template key (e.g. BOOKING_CONFIRMED) or MANUAL for staff-composed.
        kind: text("kind").notNull().default("MANUAL"),
        toAddress: text("to_address"),
        subject: text("subject"),
        body: text("body").notNull(),
        status: text("status").notNull(),
        providerRef: text("provider_ref"),
        error: text("error"),
        // "system" | admin email | "uo:<actor>"
        sentBy: text("sent_by").notNull().default("system"),
        createdAt: timestamp("created_at").defaultNow().notNull()
      },
      (table) => ({
        bookingIdx: index("message_log_booking_idx").on(table.bookingId),
        leaseIdx: index("message_log_lease_idx").on(table.leaseId),
        guestIdx: index("message_log_guest_idx").on(table.guestId),
        createdIdx: index("message_log_created_idx").on(table.createdAt)
      })
    );
    insertMessageLogSchema = createInsertSchema(messageLog, {
      direction: z.enum(MESSAGE_DIRECTIONS).optional(),
      audience: z.enum(MESSAGE_AUDIENCES).optional(),
      channel: z.enum(MESSAGE_CHANNELS),
      status: z.enum(MESSAGE_LOG_STATUSES)
    }).omit({ id: true, createdAt: true });
    bookingIntents = pgTable(
      "booking_intents",
      {
        id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
        reference: text("reference").notNull().unique(),
        stripePaymentIntentId: text("stripe_payment_intent_id").notNull(),
        propertyId: varchar("property_id").notNull(),
        roomId: varchar("room_id"),
        model: text("model").notNull(),
        // STR | COLIVING
        checkIn: date("check_in").notNull(),
        checkOut: date("check_out"),
        quotedTotal: decimal("quoted_total", { precision: 10, scale: 2 }).notNull(),
        guestName: text("guest_name"),
        guestEmail: text("guest_email"),
        guestPhone: text("guest_phone"),
        contactAttachedAt: timestamp("contact_attached_at"),
        createdAt: timestamp("created_at").defaultNow().notNull(),
        updatedAt: timestamp("updated_at").defaultNow().notNull()
      },
      (table) => ({
        piIdx: index("booking_intents_pi_idx").on(table.stripePaymentIntentId),
        emailIdx: index("booking_intents_email_idx").on(table.guestEmail),
        createdIdx: index("booking_intents_created_idx").on(table.createdAt)
      })
    );
    insertBookingIntentSchema = createInsertSchema(bookingIntents, {
      model: z.enum(BOOKING_MODELS)
    }).omit({ id: true, createdAt: true, updatedAt: true });
  }
});

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
var databaseUrl, sql2, db;
var init_db = __esm({
  "server/db.ts"() {
    "use strict";
    init_schema();
    databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "DATABASE_URL is not set. Point it at a Neon test branch (see .env.example)."
      );
    }
    sql2 = neon(databaseUrl);
    db = drizzle({ client: sql2, schema: schema_exports });
  }
});

// shared/dates.ts
function todayIso(now = /* @__PURE__ */ new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: HOTEL_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}
function addDaysIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) + days * 864e5;
  return new Date(t).toISOString().slice(0, 10);
}
var HOTEL_TZ;
var init_dates = __esm({
  "shared/dates.ts"() {
    "use strict";
    HOTEL_TZ = "America/New_York";
  }
});

// server/lib/ranges.ts
function toHalfOpen(r) {
  return { start: r.start, end: r.endExclusive ? r.end : addDaysIso(r.end, 1) };
}
function overlapsRange(a, b) {
  const A = toHalfOpen(a), B = toHalfOpen(b);
  return A.start < B.end && B.start < A.end;
}
var init_ranges = __esm({
  "server/lib/ranges.ts"() {
    "use strict";
    init_dates();
  }
});

// server/lib/messageLogQuery.ts
function boundedMessageLogLimit(limit) {
  if (limit === void 0 || !Number.isFinite(limit)) return MESSAGE_LOG_DEFAULT_LIMIT;
  return Math.min(Math.max(Math.trunc(limit), 1), MESSAGE_LOG_MAX_LIMIT);
}
function planMessageLogQuery(opts) {
  const scoped = Boolean(opts.bookingId || opts.leaseId || opts.guestId);
  return {
    refuse: !scoped && !opts.all,
    limit: boundedMessageLogLimit(opts.limit),
    scoped
  };
}
var MESSAGE_LOG_DEFAULT_LIMIT, MESSAGE_LOG_MAX_LIMIT;
var init_messageLogQuery = __esm({
  "server/lib/messageLogQuery.ts"() {
    "use strict";
    MESSAGE_LOG_DEFAULT_LIMIT = 200;
    MESSAGE_LOG_MAX_LIMIT = 1e3;
  }
});

// server/lib/escalationDedupe.ts
function escalationDedupeMatch(existing, incoming) {
  if (incoming.leaseId) {
    return existing.leaseId === incoming.leaseId && (existing.scheduleSeq ?? null) === (incoming.scheduleSeq ?? null);
  }
  if (incoming.bookingId) {
    return existing.bookingId === incoming.bookingId;
  }
  return existing.leaseId == null && existing.bookingId == null && (existing.scheduleSeq ?? null) === (incoming.scheduleSeq ?? null);
}
var init_escalationDedupe = __esm({
  "server/lib/escalationDedupe.ts"() {
    "use strict";
  }
});

// shared/rateSelection.ts
import { addDays, getDay, parseISO } from "date-fns";
var init_rateSelection = __esm({
  "shared/rateSelection.ts"() {
    "use strict";
  }
});

// shared/leaseSchedule.ts
function parseYmd(ymd) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
function inclusiveDays(startDate, endDate) {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
}
var ScheduleError, MS_PER_DAY;
var init_leaseSchedule = __esm({
  "shared/leaseSchedule.ts"() {
    "use strict";
    init_schema();
    init_rateSelection();
    ScheduleError = class extends Error {
    };
    MS_PER_DAY = 24 * 60 * 60 * 1e3;
  }
});

// server/storage.ts
var storage_exports = {};
__export(storage_exports, {
  StorageError: () => StorageError,
  parseSettingNumber: () => parseSettingNumber,
  storage: () => storage
});
import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lte, max, ne, notInArray, or, sql as sql3 } from "drizzle-orm";
function roomHoldingLeaseCondition(now = /* @__PURE__ */ new Date()) {
  const windowStart = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 6e4);
  return or(
    // 1. Deposit paid — the real hold, for the whole term.
    and(
      eq(leases.depositStatus, "PAID"),
      inArray(leases.status, [...DEPOSIT_HELD_LEASE_STATUSES])
    ),
    // 2. Unpaid, but still inside the checkout window.
    and(
      inArray(leases.status, [...CHECKOUT_HOLD_LEASE_STATUSES]),
      gte(leases.createdAt, windowStart)
    )
  );
}
function parseSettingNumber(value, fallback) {
  if (value == null || value.trim() === "") return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}
var NON_TERMINAL_LEASE_STATUSES, StorageError, Storage, storage;
var init_storage = __esm({
  "server/storage.ts"() {
    "use strict";
    init_db();
    init_ranges();
    init_messageLogQuery();
    init_escalationDedupe();
    init_schema();
    init_leaseSchedule();
    init_schema();
    NON_TERMINAL_LEASE_STATUSES = [
      "DRAFT",
      "PENDING_SIGNATURE",
      "PENDING_FIRST_PAYMENT",
      "PENDING_VERIFICATION",
      "ACTIVE"
    ];
    StorageError = class extends Error {
      status;
      constructor(message, status = 400) {
        super(message);
        this.status = status;
      }
    };
    Storage = class {
      // --- Hero images (BT-22) ---
      async getActiveHeroImages() {
        return db.select().from(heroImages).where(eq(heroImages.isActive, true)).orderBy(asc(heroImages.displayOrder), asc(heroImages.createdAt));
      }
      // --- Journal (authored in Unified Ops; site reads published posts only) ---
      async getPublishedJournalPosts() {
        return db.select().from(journalPosts).where(eq(journalPosts.published, true)).orderBy(desc(journalPosts.publishedAt), desc(journalPosts.createdAt));
      }
      async getPublishedJournalPostBySlug(slug) {
        const [row] = await db.select().from(journalPosts).where(and(eq(journalPosts.slug, slug), eq(journalPosts.published, true))).limit(1);
        return row;
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
      async getPropertiesByIds(ids) {
        if (ids.length === 0) return [];
        return db.select().from(properties).where(inArray(properties.id, ids));
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
      async getGuestsByIds(ids) {
        if (ids.length === 0) return [];
        return db.select().from(guests).where(inArray(guests.id, ids));
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
      // Idempotent by email: a repeat signup returns the existing row unchanged
      // (no disclosure of prior membership at the API layer). Mirrors the
      // read-then-insert convention used for guests; the DB unique constraint is the
      // safety net. Write-once — nothing to update, so an existing row is returned
      // as-is.
      async upsertNewsletterSubscriber(data) {
        const [existing] = await db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.email, data.email));
        if (existing) return existing;
        const [row] = await db.insert(newsletterSubscribers).values(data).returning();
        return row;
      }
      // Append-only lead capture — a person may inquire more than once, so this is a
      // plain insert (no dedupe/upsert, unlike the newsletter list above).
      async createLtrInquiry(data) {
        const [row] = await db.insert(ltrInquiries).values(data).returning();
        return row;
      }
      // Append-only B2B lead capture for the /partner page — like LTR inquiries, a
      // person may inquire more than once, so this is a plain insert (no dedupe).
      async createPartnerInquiry(data) {
        const [row] = await db.insert(partnerInquiries).values(data).returning();
        return row;
      }
      // --- Bookings ---
      async getBooking(id) {
        const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
        return row;
      }
      async getBookingsByIds(ids) {
        if (ids.length === 0) return [];
        return db.select().from(bookings).where(inArray(bookings.id, ids));
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
            // CONFLICT rows are paid-but-unresolved: they block no dates and hold
            // no room (see server/lib/materialize.ts), so they must not appear in
            // availability or "next opening" either. Same exemption the exclusion
            // constraint and strHasConflict use.
            notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES]),
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
      async getBookingsWithGuest(opts) {
        const statuses = opts?.statuses ?? ["PENDING_APPROVAL", "CONFIRMED", "ACTIVE", "CONFLICT"];
        const filters = [inArray(bookings.status, statuses)];
        if (opts?.from) {
          filters.push(sql3`(${bookings.checkOut} >= ${opts.from} OR ${bookings.checkOut} IS NULL)`);
        }
        const rows = await db.select().from(bookings).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(properties, eq(bookings.propertyId, properties.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id)).where(and(...filters)).orderBy(desc(bookings.createdAt));
        return rows.filter((r) => r.guests !== null && r.properties !== null).map((r) => ({
          ...r.bookings,
          guest: r.guests,
          property: r.properties,
          room: r.rooms
        }));
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
      async getLeasesByIds(ids) {
        if (ids.length === 0) return [];
        return db.select().from(leases).where(inArray(leases.id, ids));
      }
      /**
       * Non-terminal leases — NON_TERMINAL_LEASE_STATUSES is exactly "every
       * status short of COMPLETED/TERMINATED/DEFAULTED" — joined to guest +
       * property in one query. Mirrors getBookingsWithGuest's join pattern; the
       * guest picker uses this instead of getLeases() + a per-row lookup loop.
       */
      async getActiveLeasesWithGuest() {
        const rows = await db.select().from(leases).leftJoin(guests, eq(leases.guestId, guests.id)).leftJoin(properties, eq(leases.propertyId, properties.id)).where(inArray(leases.status, [...NON_TERMINAL_LEASE_STATUSES])).orderBy(desc(leases.createdAt));
        return rows.filter((r) => r.guests !== null && r.properties !== null).map((r) => ({
          ...r.leases,
          guest: r.guests,
          property: r.properties
        }));
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
            endDate: args.lease.endDate,
            endExclusive: false
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
      // --- Booking gate -------------------------------------------------------
      // A gated short stay owns exactly one row here, enforced by booking_id being
      // the PRIMARY KEY rather than by application logic.
      async getBookingGate(bookingId) {
        const [row] = await db.select().from(bookingGate).where(eq(bookingGate.bookingId, bookingId));
        return row;
      }
      async ensureBookingGate(bookingId, seed) {
        await db.insert(bookingGate).values({ ...seed, bookingId }).onConflictDoNothing({ target: bookingGate.bookingId });
        const row = await this.getBookingGate(bookingId);
        if (!row) throw new StorageError(`booking_gate row missing after ensure for ${bookingId}`);
        return row;
      }
      async updateBookingGate(bookingId, updates) {
        const [row] = await db.update(bookingGate).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(bookingGate.bookingId, bookingId)).returning();
        return row;
      }
      async getBookingByGateToken(token) {
        const rows = await db.select().from(bookingGate).innerJoin(bookings, eq(bookingGate.bookingId, bookings.id)).where(eq(bookingGate.gateToken, token));
        const hit = rows[0];
        if (!hit) return void 0;
        return { ...hit.bookings, gate: hit.booking_gate };
      }
      // --- Gate sweep queries -------------------------------------------------
      // Each is windowed/filtered in SQL so a daily sweep never scans the booking
      // table, and each joins the guest + property + room the templates need.
      gateStayRows(rows) {
        return rows.filter((r) => r.guests !== null && r.properties !== null).map((r) => ({
          ...r.bookings,
          gate: r.booking_gate,
          guest: r.guests,
          property: r.properties,
          room: r.rooms
        }));
      }
      /**
       * Gated stays whose guest has NOT finished their documents. The filter is
       * structural — a stay with both documents in is excluded by the QUERY, not by
       * a check inside the sweep loop, so a guest waiting on an admin can never be
       * nudged or auto-declined. Same discipline as dunning filtering PAID rows out
       * before any decision is made.
       */
      async getStaysAwaitingDocs() {
        const rows = await db.select().from(bookings).innerJoin(bookingGate, eq(bookings.id, bookingGate.bookingId)).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(properties, eq(bookings.propertyId, properties.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id)).where(
          and(
            eq(bookings.status, "PENDING_APPROVAL"),
            // Not yet approved, and at least one document still outstanding.
            isNull(bookingGate.approvedAt),
            or(
              isNull(bookingGate.agreementSignedAt),
              notInArray(bookingGate.verificationStatus, ["PENDING_REVIEW", "APPROVED"])
            )
          )
        );
        return this.gateStayRows(rows);
      }
      /** Stays whose check-out falls in [from, to] — the checkout-reminder window. */
      async getStaysCheckingOutBetween(from, to) {
        const rows = await db.select().from(bookings).leftJoin(bookingGate, eq(bookings.id, bookingGate.bookingId)).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(properties, eq(bookings.propertyId, properties.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id)).where(
          and(
            inArray(bookings.status, ["ACTIVE", "CONFIRMED"]),
            // An open-ended stay has no check-out to remind about. Excluded in SQL
            // rather than skipped in the loop so the window stays a real index scan.
            sql3`${bookings.checkOut} IS NOT NULL`,
            gte(bookings.checkOut, from),
            lte(bookings.checkOut, to)
          )
        );
        return this.gateStayRows(rows);
      }
      /** Stays whose check-IN falls in [from, to] — the pre-arrival window. */
      async getStaysCheckingInBetween(from, to) {
        const rows = await db.select().from(bookings).leftJoin(bookingGate, eq(bookings.id, bookingGate.bookingId)).leftJoin(guests, eq(bookings.guestId, guests.id)).leftJoin(properties, eq(bookings.propertyId, properties.id)).leftJoin(rooms, eq(bookings.roomId, rooms.id)).where(
          and(
            inArray(bookings.status, ["ACTIVE", "CONFIRMED"]),
            gte(bookings.checkIn, from),
            lte(bookings.checkIn, to)
          )
        );
        return this.gateStayRows(rows);
      }
      // --- Access info --------------------------------------------------------
      async getPropertyAccessInfo(propertyId) {
        const [row] = await db.select().from(propertyAccessInfo).where(eq(propertyAccessInfo.propertyId, propertyId));
        return row?.info;
      }
      async upsertPropertyAccessInfo(propertyId, info, actor) {
        const [row] = await db.insert(propertyAccessInfo).values({ propertyId, info, updatedBy: actor }).onConflictDoUpdate({
          target: propertyAccessInfo.propertyId,
          set: { info, updatedBy: actor, updatedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return row.info;
      }
      async getRoomAccessInfo(roomId) {
        const [row] = await db.select().from(roomAccessInfo).where(eq(roomAccessInfo.roomId, roomId));
        return row?.info;
      }
      async upsertRoomAccessInfo(roomId, info, actor) {
        const [row] = await db.insert(roomAccessInfo).values({ roomId, info, updatedBy: actor }).onConflictDoUpdate({
          target: roomAccessInfo.roomId,
          set: { info, updatedBy: actor, updatedAt: /* @__PURE__ */ new Date() }
        }).returning();
        return row.info;
      }
      // --- Refund ledger ------------------------------------------------------
      /**
       * Record a Stripe refund. Returns null when this refund id is already on file.
       *
       * The UNIQUE index on stripe_refund_id is what makes this safe: a Stripe
       * idempotency key expires after 24 hours, so the daily ghost sweep WILL retry
       * outside that window, and the database — not the key — is what guarantees one
       * row per refund.
       */
      async recordPaymentRefund(data) {
        const [row] = await db.insert(paymentRefunds).values(data).onConflictDoNothing({ target: paymentRefunds.stripeRefundId }).returning();
        return row ?? null;
      }
      async getRefundsByPayment(paymentId) {
        return db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentId, paymentId));
      }
      // --- Guest messages ---
      async getMessageThreadsByLease(leaseId) {
        const all = await db.select().from(guestMessages).where(eq(guestMessages.leaseId, leaseId)).orderBy(desc(guestMessages.createdAt));
        return all.filter((m) => m.id === m.threadId);
      }
      async getMessageThreadsByBooking(bookingId) {
        const all = await db.select().from(guestMessages).where(eq(guestMessages.bookingId, bookingId)).orderBy(desc(guestMessages.createdAt));
        return all.filter((m) => m.id === m.threadId);
      }
      async getMessageThreadRoots(opts) {
        const filters = [sql3`${guestMessages.threadId} = ${guestMessages.id}`];
        if (opts?.status) filters.push(eq(guestMessages.status, opts.status));
        const q = db.select().from(guestMessages).where(and(...filters)).orderBy(desc(guestMessages.createdAt));
        return opts?.limit ? q.limit(opts.limit) : q;
      }
      async getMessagesByThread(threadId) {
        return db.select().from(guestMessages).where(eq(guestMessages.threadId, threadId)).orderBy(asc(guestMessages.createdAt));
      }
      async getMessage(id) {
        const [row] = await db.select().from(guestMessages).where(eq(guestMessages.id, id));
        return row;
      }
      /**
       * One grouped query for message count + last-message time across every
       * threadId given — the batched stand-in for calling getMessagesByThread
       * once per thread root in a list view.
       */
      async getThreadStats(threadIds) {
        if (threadIds.length === 0) return [];
        const rows = await db.select({
          threadId: guestMessages.threadId,
          messageCount: count(guestMessages.id),
          lastMessageAt: max(guestMessages.createdAt)
        }).from(guestMessages).where(inArray(guestMessages.threadId, threadIds)).groupBy(guestMessages.threadId);
        return rows.map((r) => ({
          threadId: r.threadId,
          // COUNT() comes back as a bigint-safe string over the Neon HTTP driver,
          // not a JS number, despite drizzle's `count()` typing it as `number`.
          messageCount: Number(r.messageCount),
          lastMessageAt: new Date(r.lastMessageAt)
        }));
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
      // --- Message log ---
      async createMessageLog(data) {
        const [row] = await db.insert(messageLog).values(data).returning();
        return row;
      }
      async getMessageLog(opts) {
        const filters = [];
        if (opts.bookingId) filters.push(eq(messageLog.bookingId, opts.bookingId));
        if (opts.leaseId) filters.push(eq(messageLog.leaseId, opts.leaseId));
        if (opts.guestId) filters.push(eq(messageLog.guestId, opts.guestId));
        const plan = planMessageLogQuery(opts);
        if (plan.refuse) return [];
        const q = db.select().from(messageLog).orderBy(desc(messageLog.createdAt));
        const filtered = filters.length ? q.where(and(...filters)) : q;
        return filtered.limit(plan.limit);
      }
      // --- Lifecycle events ---
      async hasLifecycleEvent(ref, eventType, scheduleSeq) {
        const conds = [eq(lifecycleEvents.eventType, eventType)];
        if (ref.leaseId) conds.push(eq(lifecycleEvents.leaseId, ref.leaseId));
        else if (ref.bookingId) conds.push(eq(lifecycleEvents.bookingId, ref.bookingId));
        else return false;
        const rows = await db.select().from(lifecycleEvents).where(and(...conds));
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
        return parseSettingNumber(row?.value, fallback);
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
        if (opts?.bookingId) filters.push(eq(uoEscalations.bookingId, opts.bookingId));
        const q = db.select().from(uoEscalations).orderBy(desc(uoEscalations.createdAt));
        return filters.length ? q.where(and(...filters)) : q;
      }
      async raiseEscalationOnce(data) {
        const conds = [eq(uoEscalations.kind, data.kind), eq(uoEscalations.status, "OPEN")];
        if (data.leaseId) conds.push(eq(uoEscalations.leaseId, data.leaseId));
        else if (data.bookingId) conds.push(eq(uoEscalations.bookingId, data.bookingId));
        else conds.push(isNull(uoEscalations.leaseId), isNull(uoEscalations.bookingId));
        const open = await db.select().from(uoEscalations).where(and(...conds));
        if (open.some((e) => escalationDedupeMatch(e, data))) return null;
        const [row] = await db.insert(uoEscalations).values(data).returning();
        return row;
      }
      async updateEscalation(id, updates) {
        const [row] = await db.update(uoEscalations).set({ ...updates, updatedAt: /* @__PURE__ */ new Date() }).where(eq(uoEscalations.id, id)).returning();
        return row;
      }
      async isRoomAvailableForRange(args) {
        const want = { start: args.startDate, end: args.endDate, endExclusive: args.endExclusive };
        const leases2 = (await this.getRoomBlockingLeasesForRoom(args.roomId)).filter(
          (l) => l.id !== args.excludeLeaseId
        );
        if (leases2.some(
          (l) => overlapsRange(want, { start: l.startDate, end: l.endDate, endExclusive: false })
        )) {
          return false;
        }
        const roomBookings = (await this.getColivingBookingsForRoom(args.roomId)).filter(
          (b) => b.id !== args.excludeBookingId
        );
        if (roomBookings.some(
          (b) => b.checkOut !== null && overlapsRange(want, { start: b.checkIn, end: b.checkOut, endExclusive: true })
        )) {
          return false;
        }
        const blocks = await this.getExternalBlocksForRoom(args.roomId);
        if (blocks.some(
          (b) => overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true })
        )) {
          return false;
        }
        const manual = await this.getManualBlocksForRoom(args.roomId);
        return !manual.some(
          (b) => overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true })
        );
      }
      async getColivingBookingsForRoom(roomId) {
        return db.select().from(bookings).where(
          and(
            eq(bookings.roomId, roomId),
            eq(bookings.model, "COLIVING"),
            ne(bookings.status, "CANCELLED"),
            ne(bookings.status, "CONFLICT")
          )
        ).orderBy(asc(bookings.checkIn));
      }
      async getOccupiedRoomIdsOn(dateIso) {
        const occupied = /* @__PURE__ */ new Set();
        const bookingRows = await db.select({ roomId: bookings.roomId }).from(bookings).where(
          and(
            sql3`${bookings.roomId} IS NOT NULL`,
            ne(bookings.status, "CANCELLED"),
            ne(bookings.status, "CONFLICT"),
            lte(bookings.checkIn, dateIso),
            gt(bookings.checkOut, dateIso)
          )
        );
        for (const r of bookingRows) if (r.roomId) occupied.add(r.roomId);
        const leaseRows = await db.select({ roomId: leaseRooms.roomId }).from(leaseRooms).innerJoin(leases, eq(leaseRooms.leaseId, leases.id)).where(
          and(
            roomHoldingLeaseCondition(),
            lte(leases.startDate, dateIso),
            gte(leases.endDate, dateIso)
          )
        );
        for (const r of leaseRows) occupied.add(r.roomId);
        const extRows = await db.select({ roomId: externalBookings.roomId }).from(externalBookings).where(
          and(
            sql3`${externalBookings.roomId} IS NOT NULL`,
            lte(externalBookings.startDate, dateIso),
            gt(externalBookings.endDate, dateIso)
          )
        );
        for (const r of extRows) if (r.roomId) occupied.add(r.roomId);
        const manualRows = await db.select({ roomId: manualBlocks.roomId }).from(manualBlocks).where(
          and(
            sql3`${manualBlocks.roomId} IS NOT NULL`,
            lte(manualBlocks.startDate, dateIso),
            gt(manualBlocks.endDate, dateIso)
          )
        );
        for (const r of manualRows) if (r.roomId) occupied.add(r.roomId);
        return occupied;
      }
      // --- Manual blocks ---
      async getManualBlocksForRoom(roomId) {
        return db.select().from(manualBlocks).where(eq(manualBlocks.roomId, roomId)).orderBy(asc(manualBlocks.startDate));
      }
      async getManualBlocksForProperty(propertyId) {
        return db.select().from(manualBlocks).where(and(eq(manualBlocks.propertyId, propertyId), sql3`${manualBlocks.roomId} IS NULL`)).orderBy(asc(manualBlocks.startDate));
      }
      async getManualBlocks(opts) {
        const filters = [];
        if (opts?.propertyId) filters.push(eq(manualBlocks.propertyId, opts.propertyId));
        if (opts?.roomId) filters.push(eq(manualBlocks.roomId, opts.roomId));
        if (opts?.from) filters.push(gte(manualBlocks.endDate, opts.from));
        const q = db.select().from(manualBlocks).orderBy(asc(manualBlocks.startDate));
        return filters.length ? q.where(and(...filters)) : q;
      }
      async createManualBlock(data) {
        const [row] = await db.insert(manualBlocks).values(data).returning();
        return row;
      }
      async deleteManualBlock(id) {
        const deleted = await db.delete(manualBlocks).where(eq(manualBlocks.id, id)).returning();
        return deleted.length > 0;
      }
      // ---------------------------------------------------------------------------
      // Booking intents — a row per checkout started (payment-first leaves no
      // booking row until Stripe confirms). Written by /api/booking-intent, read by
      // UO for guest website activity. A write failure here must never break a
      // checkout, so callers wrap these in try/catch.
      // ---------------------------------------------------------------------------
      async createBookingIntent(data) {
        const [row] = await db.insert(bookingIntents).values(data).returning();
        return row;
      }
      async attachBookingIntentContact(stripePaymentIntentId, contact) {
        const [row] = await db.update(bookingIntents).set({
          guestName: contact.name,
          guestEmail: contact.email.trim().toLowerCase(),
          guestPhone: contact.phone || null,
          contactAttachedAt: /* @__PURE__ */ new Date(),
          updatedAt: /* @__PURE__ */ new Date()
        }).where(eq(bookingIntents.stripePaymentIntentId, stripePaymentIntentId)).returning();
        return row;
      }
      async getBookingIntents(opts) {
        const filters = [];
        if (opts?.guestEmail) filters.push(eq(bookingIntents.guestEmail, opts.guestEmail.trim().toLowerCase()));
        if (opts?.since) filters.push(gte(bookingIntents.createdAt, opts.since));
        const limit = Math.min(Math.max(1, opts?.limit ?? 100), 500);
        const q = db.select().from(bookingIntents).orderBy(desc(bookingIntents.createdAt)).limit(limit);
        return filters.length ? q.where(and(...filters)) : q;
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
            // CANCELLED and CONFLICT rows block nothing — see
            // NON_BLOCKING_BOOKING_STATUSES.
            notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES])
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
            roomHoldingLeaseCondition()
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
    storage = new Storage();
  }
});

// api-src/cron/calendar.ts
import "dotenv/config";

// server/lib/icalSync.ts
init_storage();
import { promises as dns } from "node:dns";
import net from "node:net";

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

// server/lib/telegram.ts
function isTelegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}
function adminChatIds() {
  return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}
async function sendTelegram(opts) {
  if (!isTelegramConfigured()) {
    log(`[dry-run telegram] "${opts.text.slice(0, 60)}\u2026" (telegram not configured)`, "notify");
    return { sent: false, channel: "telegram", reason: "not-configured" };
  }
  const ids = opts.chatIds ?? adminChatIds();
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  let failure;
  for (const chat_id of ids) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id, text: opts.text.slice(0, 4e3), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(2e4)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.ok === false) failure = json.description || `HTTP ${res.status}`;
    } catch (err) {
      failure = err.message;
    }
  }
  if (failure) {
    log(`telegram FAILED: ${failure}`, "notify");
    return { sent: false, channel: "telegram", reason: failure };
  }
  log(`telegram sent to ${ids.length} chat(s)`, "notify");
  return { sent: true, channel: "telegram" };
}

// server/lib/notifications.ts
function statusFor(result) {
  if (result.sent) return "SENT";
  if (result.reason === "not-configured") return "DRY_RUN";
  if (result.reason === "no-phone") return "SKIPPED";
  return "FAILED";
}
var storageModulePromise = null;
function getStorageModule() {
  if (!storageModulePromise) storageModulePromise = Promise.resolve().then(() => (init_storage(), storage_exports));
  return storageModulePromise;
}
async function record(channel, ctx, to, subject, body, result) {
  try {
    const { storage: storage2 } = await getStorageModule();
    await storage2.createMessageLog({
      bookingId: ctx.bookingId ?? null,
      leaseId: ctx.leaseId ?? null,
      guestId: ctx.guestId ?? null,
      audience: ctx.audience,
      channel,
      kind: ctx.kind,
      toAddress: to,
      subject,
      body,
      status: statusFor(result),
      error: result.sent ? void 0 : result.reason,
      sentBy: ctx.sentBy ?? "system"
    });
  } catch (err) {
    log(`message_log write FAILED: ${err.message}`, "notify");
  }
}
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
function textToHtml(text2) {
  const esc = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<p>${esc.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`;
}
async function sendEmail(opts) {
  let result;
  if (!isEmailConfigured()) {
    log(`[dry-run email] to=${opts.to} subject="${opts.subject}" (email not configured)`, "notify");
    result = { sent: false, channel: "email", reason: "not-configured" };
  } else {
    try {
      const transport = await getTransport();
      await transport.sendMail({
        from: mailFrom(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? textToHtml(opts.text)
      });
      log(`email sent to=${opts.to} subject="${opts.subject}"`, "notify");
      result = { sent: true, channel: "email" };
    } catch (err) {
      log(`email FAILED to=${opts.to}: ${err.message}`, "notify");
      result = { sent: false, channel: "email", reason: err.message };
    }
  }
  if (opts.context) {
    await record("EMAIL", opts.context, opts.to, opts.subject, opts.logBody ?? opts.text, result);
  }
  return result;
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
  let result;
  if (!opts.to) {
    result = { sent: false, channel: "sms", reason: "no-phone" };
  } else if (!isSmsConfigured()) {
    log(`[dry-run sms] to=${opts.to} body="${opts.body.slice(0, 40)}\u2026" (sms not configured)`, "notify");
    result = { sent: false, channel: "sms", reason: "not-configured" };
  } else {
    try {
      const client = await getTwilio();
      await client.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to: opts.to,
        body: opts.body
      });
      log(`sms sent to=${opts.to}`, "notify");
      result = { sent: true, channel: "sms" };
    } catch (err) {
      log(`sms FAILED to=${opts.to}: ${err.message}`, "notify");
      result = { sent: false, channel: "sms", reason: err.message };
    }
  }
  if (opts.context) await record("SMS", opts.context, opts.to, void 0, opts.body, result);
  return result;
}
async function sendTelegramLogged(opts) {
  const result = await sendTelegram({ text: opts.text, chatIds: opts.chatIds });
  if (opts.context) {
    const to = (opts.chatIds ?? adminChatIds()).join(",");
    await record("TELEGRAM", opts.context, to, void 0, opts.text, result);
  }
  return result;
}
async function notifyGuest(opts) {
  const ctx = opts.context ? { ...opts.context, audience: "GUEST" } : void 0;
  const [email, sms] = await Promise.all([
    sendEmail({
      to: opts.email,
      subject: opts.subject,
      text: opts.body,
      html: opts.html,
      logBody: opts.logBody,
      context: ctx
    }),
    // sendSms already returns/records "no-phone" as SKIPPED when `to` is empty,
    // so route both branches through it rather than short-circuiting here.
    sendSms({ to: opts.phone ?? "", body: opts.smsBody ?? opts.body, context: ctx })
  ]);
  return { email, sms };
}
async function notifyAdmin(opts) {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const ctx = { ...opts.context ?? { kind: "ADMIN_ALERT" }, audience: "ADMIN" };
  const [email, telegram] = await Promise.all([
    to ? sendEmail({ to, subject: opts.subject, text: opts.body, context: ctx }) : Promise.resolve({ sent: false, channel: "email", reason: "no-admin-email" }),
    sendTelegramLogged({
      text: `${opts.subject}

${opts.telegramText ?? opts.body}`,
      context: ctx
    })
  ]);
  return { email, telegram };
}

// server/lib/icalSync.ts
init_dates();
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
async function parseICalData(icalData, opts = {}) {
  const today = opts.today ?? todayIso();
  const honorHostBlocks = opts.honorHostBlocks ?? false;
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
    const isHostBlock = /not available/i.test(rawSummary);
    if (isHostBlock && !honorHostBlocks) continue;
    events.push({
      externalId: event.uid || key,
      summary: isHostBlock ? "Airbnb (Not available)" : event.summary ? String(event.summary) : "External Event",
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
var HONOR_HOST_BLOCKS_SETTING = "ical_honor_host_blocks";
var LAST_SYNC_AT_SETTING = "ical_last_sync_at";
var LAST_SYNC_RESULT_SETTING = "ical_last_sync_result";
async function syncListing(listing, dryRun = false, honorHostBlocks = false) {
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
    parsedEvents = await parseICalData(icalData, { honorHostBlocks });
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
  let honorHostBlocks = true;
  try {
    const setting = await storage.getSetting(HONOR_HOST_BLOCKS_SETTING);
    honorHostBlocks = setting?.value !== "false";
  } catch {
    honorHostBlocks = true;
  }
  const listings = await storage.getListingsWithIcalUrl();
  const results = [];
  for (const l of listings) {
    results.push(await syncListing(l, dryRun, honorHostBlocks));
  }
  const ok = results.filter((r) => r.ok).length;
  const failed = results.length - ok;
  const created = results.reduce((n, r) => n + r.created, 0);
  const updated = results.reduce((n, r) => n + r.updated, 0);
  const removed = results.reduce((n, r) => n + r.removed, 0);
  try {
    const at = (/* @__PURE__ */ new Date()).toISOString();
    await storage.setSetting(LAST_SYNC_AT_SETTING, at);
    await storage.setSetting(
      LAST_SYNC_RESULT_SETTING,
      JSON.stringify({
        at,
        totalListings: listings.length,
        ok,
        failed,
        created,
        updated,
        removed,
        listings: results.map((r) => ({ key: r.key, label: r.label, ok: r.ok, error: r.error }))
      })
    );
  } catch (err) {
    log(`ical sync: failed to record sync status: ${err.message}`, "icalSync");
  }
  return { totalListings: listings.length, ok, failed, created, updated, removed, listings: results };
}
async function refreshExternalCalendars() {
  return syncAllListings(false);
}
var STALE_AFTER_MS = 3 * 60 * 60 * 1e3;
async function checkCalendarSyncHealth(now = /* @__PURE__ */ new Date()) {
  const [lastSyncAtRow, lastResultRow] = await Promise.all([
    storage.getSetting(LAST_SYNC_AT_SETTING),
    storage.getSetting(LAST_SYNC_RESULT_SETTING)
  ]);
  let stale = true;
  if (lastSyncAtRow?.value) {
    const lastSyncAtMs = new Date(lastSyncAtRow.value).getTime();
    stale = !Number.isFinite(lastSyncAtMs) || now.getTime() - lastSyncAtMs > STALE_AFTER_MS;
  }
  let failed = false;
  let failedListings = [];
  if (lastResultRow?.value) {
    try {
      const parsedResult = JSON.parse(lastResultRow.value);
      failed = (parsedResult.failed ?? 0) > 0;
      failedListings = (parsedResult.listings ?? []).filter((l) => !l.ok);
    } catch {
      failed = true;
    }
  }
  let alerted = false;
  if (stale || failed) {
    const detailParts = [];
    if (stale) {
      detailParts.push(
        lastSyncAtRow?.value ? `Last calendar sync recorded at ${lastSyncAtRow.value} (more than 3h ago).` : "No calendar sync has ever completed."
      );
    }
    if (failed) {
      const names = failedListings.map((l) => l.error ? `${l.label} (${l.error})` : l.label).join("; ");
      detailParts.push(names ? `Failed listing(s): ${names}` : "The last sync run reported failures.");
    }
    const detail = detailParts.join(" ");
    const escalation = await storage.raiseEscalationOnce({
      leaseId: null,
      bookingId: null,
      scheduleSeq: Number(todayIso(now).replace(/-/g, "")),
      kind: "CALENDAR_SYNC_FAILED",
      severity: "MEDIUM",
      detail
    });
    if (escalation) {
      alerted = true;
      await notifyAdmin({
        subject: "Airbnb calendar sync problem",
        body: detail,
        context: { kind: "CALENDAR_SYNC_FAILED" }
      });
    }
  }
  return { stale, failed, alerted };
}

// server/lib/cronAuth.ts
import { timingSafeEqual } from "node:crypto";
function cronAuthFailure(authorization, env = process.env) {
  const secret = env.CRON_SECRET;
  if (!secret) {
    if (env.VERCEL) {
      return { status: 503, message: "CRON_SECRET is not configured" };
    }
    return null;
  }
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization ?? "");
  const ok = expected.length === actual.length && timingSafeEqual(expected, actual);
  return ok ? null : { status: 401, message: "Unauthorized" };
}

// server/lib/leaseHolds.ts
init_dates();
init_schema();
init_storage();

// server/lib/publicUrl.ts
function publicBaseUrl() {
  const explicit = process.env.PUBLIC_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, "");
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://www.beniceproperties.com";
}
function lookupUrl() {
  return `${publicBaseUrl()}/lookup`;
}
function portalUrl(lease) {
  return lease.portalToken ? `${publicBaseUrl()}/portal/${lease.portalToken}` : lookupUrl();
}

// server/lib/leaseHolds.ts
var ABANDONED_HOURS = 24;
var SETTLED = /* @__PURE__ */ new Set(["PAID", "WAIVED"]);
async function runLeaseHoldExpiry(opts = {}) {
  const now = opts.now ?? /* @__PURE__ */ new Date();
  const today = opts.today ?? todayIso();
  const result = { movedIn: 0, abandoned: 0, nudged: 0 };
  const leases2 = await storage.getActiveLeasesWithGuest();
  for (const lease of leases2) {
    const depositPaid = lease.depositStatus === "PAID";
    if (depositPaid) {
      await handleDepositedLease(lease, today, result);
      continue;
    }
    if (!CHECKOUT_HOLD_LEASE_STATUSES.includes(lease.status)) continue;
    const createdAt = lease.createdAt ? new Date(lease.createdAt) : null;
    if (!createdAt) continue;
    const ageHours = (now.getTime() - createdAt.getTime()) / 36e5;
    if (ageHours < ABANDONED_HOURS) continue;
    if (lease.cleaningFeeStatus === "PAID") continue;
    if (await anyInstallmentSettled(lease.id)) continue;
    await release(lease, "abandoned before any payment was made");
    result.abandoned += 1;
  }
  if (result.movedIn || result.abandoned || result.nudged) {
    log(
      `hold expiry: ${result.movedIn} released at move-in, ${result.abandoned} abandoned, ${result.nudged} nudged`,
      "scheduler"
    );
  }
  return result;
}
async function handleDepositedLease(lease, today, result) {
  if (lease.status === "DEFAULTED" || lease.status === "TERMINATED") return;
  const schedule = await storage.getScheduleByLease(lease.id);
  const first = schedule.find((s) => s.scheduleSeq === 1);
  if (!first || SETTLED.has(first.status)) return;
  if (today === lease.startDate) {
    if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "FIRST_PAYMENT_REMINDER", null)) {
      return;
    }
    const sent = await notifyGuest({
      email: lease.guest.email,
      phone: lease.guest.phone,
      context: { leaseId: lease.id, guestId: lease.guest.id, kind: "FIRST_PAYMENT_REMINDER" },
      subject: "Today is move-in \u2014 your first rent payment is due",
      body: `Hi ${lease.guest.name}, welcome \u2014 today is your move-in date. Your first rent payment of $${first.amount} is due today to keep your room.

Pay by card, or by CashApp/Zelle: ${portalUrl(lease)}

If it isn't paid by the end of today the room goes back on the market. Your deposit is not forfeited automatically \u2014 reply to this email and we'll sort it out with you.`,
      smsBody: `BNP: move-in day. First rent $${first.amount} is due today to keep your room. Pay: ${portalUrl(lease)}`
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "FIRST_PAYMENT_REMINDER",
      scheduleSeq: null,
      status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
    result.nudged += 1;
    return;
  }
  if (today <= lease.startDate) return;
  if (first.paymentMethod === "MANUAL") {
    await storage.raiseEscalationOnce({
      leaseId: lease.id,
      scheduleSeq: 1,
      kind: "PAYMENT_OVERDUE",
      severity: "HIGH",
      detail: `Move-in was ${lease.startDate} and installment #1 (manual CashApp/Zelle) is still unpaid. Hold NOT auto-released \u2014 confirm the payment with Mark Paid, or terminate the lease by hand to free the room.`
    });
    return;
  }
  await release(lease, `first payment not received by the move-in date (${lease.startDate})`);
  result.movedIn += 1;
}
async function anyInstallmentSettled(leaseId) {
  const schedule = await storage.getScheduleByLease(leaseId);
  return schedule.some((s) => SETTLED.has(s.status));
}
async function release(lease, reason) {
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "LEASE_HOLD_RELEASED", null)) return;
  await storage.updateLease(lease.id, { status: "TERMINATED" });
  log(`lease ${lease.id} hold released \u2014 ${reason}`, "scheduler");
  const sent = await notifyGuest({
    email: lease.guest.email,
    phone: lease.guest.phone,
    context: { leaseId: lease.id, guestId: lease.guest.id, kind: "LEASE_HOLD_RELEASED" },
    subject: `Your reservation at ${lease.property.name} has been released`,
    body: `Hi ${lease.guest.name}, we've released the hold on your room at ${lease.property.name} because the ${reason}.

The room is back on the market. If you still want it, you can rebook here: ${publicBaseUrl()}/property/${lease.propertyId}

If you believe this is a mistake \u2014 or you already paid \u2014 reply to this email right away and we'll get it sorted.`,
    smsBody: `BNP: the hold on your room at ${lease.property.name} was released. Rebook: ${publicBaseUrl()}/property/${lease.propertyId}`
  });
  await notifyAdmin({
    subject: `Hold released \u2014 ${lease.property.name} (${lease.guest.name})`,
    body: `Lease ${lease.id} at ${lease.property.name} was TERMINATED and the room released: ${reason}. Guest: ${lease.guest.name} <${lease.guest.email}>. Term was ${lease.startDate} to ${lease.endDate}. Deposit status: ${lease.depositStatus ?? "none"} \u2014 NOT auto-refunded.`,
    // Telegram is third-party: name only, never contact details.
    telegramText: `Hold released: ${lease.property.name}, ${lease.guest.name}. ${reason}. Deposit ${lease.depositStatus ?? "none"} \u2014 refund decision pending.`,
    context: { leaseId: lease.id, guestId: lease.guest.id, kind: "ESCALATION" }
  });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "LEASE_HOLD_RELEASED",
    scheduleSeq: null,
    status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
}

// server/lib/occupancy.ts
init_schema();
init_dates();
init_storage();
async function syncRoomOccupancyStatus(today = todayIso()) {
  const [properties2, occupiedRoomIds] = await Promise.all([
    storage.getProperties(),
    storage.getOccupiedRoomIdsOn(today)
  ]);
  const roomLists = await Promise.all(properties2.map((p) => storage.getRoomsByProperty(p.id)));
  const rooms2 = roomLists.flat();
  let occupied = 0;
  let available = 0;
  let changed = 0;
  for (const room of rooms2) {
    if (ROOM_UNBOOKABLE_STATUSES.includes(room.status)) continue;
    const wantStatus = occupiedRoomIds.has(room.id) ? "OCCUPIED" : "AVAILABLE";
    if (wantStatus === "OCCUPIED") occupied++;
    else available++;
    if (room.status !== wantStatus) {
      await storage.updateRoom(room.id, { status: wantStatus });
      changed++;
    }
  }
  return { occupied, available, changed };
}

// api-src/cron/calendar.ts
async function handler(req, res) {
  const denied = cronAuthFailure(req.headers.authorization);
  if (denied) return res.status(denied.status).json({ message: denied.message });
  try {
    const result = await refreshExternalCalendars();
    if (result.totalListings > 0) {
      log(
        `calendar cron: ${result.totalListings} listing(s), ${result.created} new, ${result.removed} removed, ${result.failed} failed`,
        "cron"
      );
    }
    try {
      const released = await runLeaseHoldExpiry();
      if (released.movedIn > 0 || released.abandoned > 0) {
        await syncRoomOccupancyStatus();
      }
    } catch (err) {
      log(`lease hold expiry failed: ${err.message}`, "cron");
    }
    try {
      await checkCalendarSyncHealth();
    } catch (err) {
      log(`calendar sync health check failed: ${err.message}`, "cron");
    }
    return res.json({ ...result, ok: true });
  } catch (err) {
    log(`calendar cron error: ${err.message}`, "cron");
    return res.status(500).json({ ok: false, message: err.message });
  }
}
export {
  handler as default
};

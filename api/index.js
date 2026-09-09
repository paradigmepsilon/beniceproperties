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
function parseRate(v) {
  if (v === null || v === void 0 || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}
function combineLeaseRates(rooms2) {
  let daily = 0, weekly = 0, biweekly = 0, monthly = 0, any = false;
  for (const r of rooms2) {
    const wk = parseRate(r.weeklyRent);
    if (wk === null) continue;
    any = true;
    weekly += wk;
    daily += parseRate(r.dailyRate) ?? wk / 7;
    biweekly += parseRate(r.biweeklyRate) ?? wk * 2;
    monthly += parseRate(r.monthlyRate) ?? wk * 4;
  }
  if (!any) throw new RateError("No rate configured for this room \u2014 set a weekly rent.");
  return { daily, weekly, biweekly, monthly };
}
function tierUnitRate(tier, rates) {
  const weekly = parseRate(rates.weekly);
  switch (tier) {
    case "MONTHLY":
      return parseRate(rates.monthly);
    case "BIWEEKLY": {
      const bi = parseRate(rates.biweekly);
      if (bi !== null) return bi;
      return weekly !== null ? weekly * 2 : null;
    }
    case "WEEKLY":
      return weekly;
    case "DAILY": {
      const daily = parseRate(rates.daily);
      if (daily !== null) return daily;
      return weekly !== null ? weekly / 7 : null;
    }
  }
}
function cascadeStayPrice(input) {
  if (!(input.days >= 1)) throw new RateError("Stay must be at least 1 day");
  const segments = [];
  let remaining = input.days;
  let cursor = 0;
  for (const tier of CASCADE_ORDER[input.topTier]) {
    if (remaining <= 0) break;
    const unitRate = tierUnitRate(tier, input.rates);
    if (unitRate === null) continue;
    const unitDays = CASCADE_TIER_DAYS[tier];
    const units = Math.floor(remaining / unitDays);
    if (units < 1) continue;
    const days = units * unitDays;
    segments.push({
      tier,
      units,
      unitDays,
      unitRate,
      days,
      amount: roundCurrency(units * unitRate),
      startDay: cursor
    });
    remaining -= days;
    cursor += days;
  }
  if (segments.length === 0) {
    throw new RateError(
      "No rate configured for this listing \u2014 set a daily, weekly, or monthly rate."
    );
  }
  if (remaining > 0) {
    throw new RateError(
      `No daily rate configured to cover the final ${remaining} day(s) of this stay.`
    );
  }
  return {
    segments,
    total: roundCurrency(segments.reduce((sum, seg) => sum + seg.amount, 0)),
    days: input.days
  };
}
function hasAnyWeekdayRate(rates) {
  return WEEKDAY_FIELDS.some((f) => parseRate(rates[f]) !== null);
}
function averageWeekdayRate(rates) {
  const set = WEEKDAY_FIELDS.map((f) => parseRate(rates[f])).filter(
    (v) => v !== null
  );
  if (set.length === 0) return null;
  return set.reduce((a, b) => a + b, 0) / set.length;
}
function weekdayStayTotal(input) {
  const { checkIn, nights: nights2, weekdayRates, fallbackNightly } = input;
  if (!(nights2 >= 1)) throw new RateError("Stay must be at least 1 night");
  const start = parseISO(checkIn);
  let total = 0;
  for (let k = 0; k < nights2; k++) {
    const day = getDay(addDays(start, k));
    const wkPrice = parseRate(weekdayRates[WEEKDAY_FIELDS[day]]);
    const nightly = wkPrice ?? fallbackNightly;
    if (nightly === null) {
      throw new RateError("No price for one or more nights of this stay.");
    }
    total += nightly;
  }
  return roundCurrency(total);
}
var RateError, roundCurrency, CASCADE_TIER_DAYS, CASCADE_ORDER, WEEKDAY_FIELDS;
var init_rateSelection = __esm({
  "shared/rateSelection.ts"() {
    "use strict";
    RateError = class extends Error {
    };
    roundCurrency = (v) => Math.round(v * 100) / 100;
    CASCADE_TIER_DAYS = {
      MONTHLY: 28,
      BIWEEKLY: 14,
      WEEKLY: 7,
      DAILY: 1
    };
    CASCADE_ORDER = {
      // Monthly steps to WEEKLY, not biweekly — the owner's rule, verbatim.
      MONTHLY: ["MONTHLY", "WEEKLY", "DAILY"],
      BIWEEKLY: ["BIWEEKLY", "WEEKLY", "DAILY"],
      WEEKLY: ["WEEKLY", "DAILY"],
      DAILY: ["DAILY"]
    };
    WEEKDAY_FIELDS = [
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
  }
});

// shared/leaseSchedule.ts
function parseYmd(ymd2) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd2);
  if (!m) throw new ScheduleError(`Invalid date (expected YYYY-MM-DD): ${ymd2}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}
function toYmd(d) {
  return d.toISOString().slice(0, 10);
}
function addDays2(ymd2, days) {
  return toYmd(new Date(parseYmd(ymd2).getTime() + days * MS_PER_DAY));
}
function inclusiveDays(startDate, endDate) {
  const diff = Math.round((parseYmd(endDate).getTime() - parseYmd(startDate).getTime()) / MS_PER_DAY);
  return diff + 1;
}
function generateCascadeSchedule(input) {
  const { startDate, endDate, cadence, rates } = input;
  if (parseYmd(endDate).getTime() < parseYmd(startDate).getTime()) {
    throw new ScheduleError("endDate must be on or after startDate");
  }
  const totalDays = inclusiveDays(startDate, endDate);
  if (totalDays > MAX_LEASE_DAYS) {
    throw new ScheduleError(`Lease term ${totalDays} days exceeds the ${MAX_LEASE_DAYS}-day maximum`);
  }
  const topTier = CADENCE_TOP_TIER[cadence];
  const priced = cascadeStayPrice({ days: totalDays, rates, topTier });
  const installments = [];
  let seq = 1;
  let cursor = startDate;
  const head = priced.segments.find((seg) => seg.tier === topTier);
  const tail = priced.segments.filter((seg) => seg.tier !== topTier);
  if (head) {
    for (let i = 0; i < head.units; i++) {
      installments.push({
        seq: seq++,
        dueDate: cursor,
        amount: roundCurrency2(head.unitRate),
        prorated: false,
        daysCovered: head.unitDays
      });
      cursor = addDays2(cursor, head.unitDays);
    }
  }
  if (tail.length > 0) {
    installments.push({
      seq: seq++,
      dueDate: cursor,
      amount: roundCurrency2(tail.reduce((sum, seg) => sum + seg.amount, 0)),
      prorated: true,
      daysCovered: tail.reduce((sum, seg) => sum + seg.days, 0)
    });
  }
  const fullCount = head?.units ?? 0;
  const fullLabel = head ? `$${roundCurrency2(head.unitRate).toFixed(2)}` : "";
  const cadenceWord = cadence.toLowerCase();
  const prorationNote = tail.length ? `${fullCount} full ${cadenceWord} installment(s)${fullCount ? ` of ${fullLabel}` : ""}, plus a final payment of $${installments[installments.length - 1].amount.toFixed(2)} covering ${installments[installments.length - 1].daysCovered} day(s) \u2014 billed as ${tail.map((seg) => `${seg.units} ${TIER_WORD[seg.tier]}${seg.units === 1 ? "" : "s"}`).join(" + ")}. First payment due on the move-in date.` : `${fullCount} ${cadenceWord} installment(s) of ${fullLabel}, no proration. First payment due on the move-in date.`;
  return {
    installments,
    totalLeaseValue: roundCurrency2(installments.reduce((sum, i) => sum + i.amount, 0)),
    prorationNote,
    totalDays
  };
}
var ScheduleError, roundCurrency2, MS_PER_DAY, CADENCE_TOP_TIER, TIER_WORD;
var init_leaseSchedule = __esm({
  "shared/leaseSchedule.ts"() {
    "use strict";
    init_schema();
    init_rateSelection();
    ScheduleError = class extends Error {
    };
    roundCurrency2 = (v) => Math.round(v * 100) / 100;
    MS_PER_DAY = 24 * 60 * 60 * 1e3;
    CADENCE_TOP_TIER = {
      WEEKLY: "WEEKLY",
      BIWEEKLY: "BIWEEKLY",
      MONTHLY: "MONTHLY"
    };
    TIER_WORD = {
      MONTHLY: "month",
      BIWEEKLY: "two-week period",
      WEEKLY: "week",
      DAILY: "day"
    };
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

// api-src/index.ts
import "dotenv/config";

// server/app.ts
import express2 from "express";
import compression from "compression";
import helmet from "helmet";

// server/routes.ts
import express from "express";
import multer from "multer";
import { z as z4 } from "zod";
import { differenceInCalendarDays as differenceInCalendarDays3, parseISO as parseISO6 } from "date-fns";

// server/auth.ts
init_storage();
import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";

// server/lib/posthog.ts
import { PostHog } from "posthog-node";
var posthog = new PostHog(process.env.POSTHOG_API_KEY ?? "", {
  host: process.env.POSTHOG_HOST ?? "https://us.i.posthog.com",
  enableExceptionAutocapture: true
});

// server/lib/sessionSecret.ts
function resolveSessionSecret(env) {
  const configured = env.SESSION_SECRET?.trim();
  if (configured) return configured;
  if (env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET must be set in production (admin sessions cannot use the dev fallback)");
  }
  return "bnp-dev-only-secret";
}

// server/lib/rateLimit.ts
function createRateLimiter(opts) {
  const buckets = /* @__PURE__ */ new Map();
  function evict(now) {
    buckets.forEach((b, k) => {
      if (b.resetAt <= now) buckets.delete(k);
    });
  }
  return {
    check(key, now = Date.now()) {
      evict(now);
      const b = buckets.get(key);
      if (!b) {
        buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
        return { allowed: true, retryAfterSec: 0 };
      }
      b.count += 1;
      if (b.count > opts.max) {
        return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1e3)) };
      }
      return { allowed: true, retryAfterSec: 0 };
    },
    size() {
      return buckets.size;
    }
  };
}
function clientKey(req) {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}
function rateLimit(opts) {
  const limiter = createRateLimiter(opts);
  return (req, res, next) => {
    const result = limiter.check(clientKey(req));
    if (result.allowed) return next();
    res.setHeader("Retry-After", String(result.retryAfterSec));
    res.status(429).json({ message: opts.message ?? "Too many requests \u2014 please try again shortly." });
  };
}

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
      // Fails closed in production: no env secret → boot error, never the dev
      // fallback (a known secret would let anyone forge an admin session).
      secret: resolveSessionSecret(process.env),
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
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 10,
    message: "Too many login attempts \u2014 try again in a few minutes."
  });
  app.post("/api/admin/login", loginLimiter, passport.authenticate("local"), (req, res) => {
    const admin = req.user;
    if (admin) {
      posthog.identify({ distinctId: admin.email, properties: { name: admin.name, role: "admin" } });
      posthog.capture({ distinctId: admin.email, event: "admin_login", properties: { admin_email: admin.email } });
    }
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

// server/routes.ts
init_storage();

// shared/api-types.ts
init_schema();
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
var bookingIntentSchema = z2.object({
  propertyId: z2.string().min(1),
  roomId: z2.string().optional(),
  checkIn: z2.string().optional(),
  checkOut: z2.string().optional(),
  guest: z2.object({
    name: z2.string().optional(),
    email: z2.string().optional(),
    phone: z2.string().optional()
  }).optional()
}).refine((d) => d.roomId || d.checkIn && d.checkOut, {
  message: "STR bookings need checkIn+checkOut; co-living needs a roomId"
});
var leaseQuoteRequestSchema = z2.object({
  propertyId: z2.string().min(1),
  // One or more rooms in the same property (co-living can rent multiple rooms).
  roomIds: z2.array(z2.string().min(1)).min(1, "Select at least one room"),
  startDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Start date is required"),
  endDate: z2.string().regex(/^\d{4}-\d{2}-\d{2}$/, "End date is required"),
  // The guest's billing cadence. Must be one of allowedCadencesForTerm() when
  // sent; omitted means the server uses the shortest allowed cadence so a first
  // preview always renders. Cadence DRIVES THE RATE — it is not cosmetic.
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

// server/routes.ts
init_schema();

// server/lib/booking.ts
import { customAlphabet } from "nanoid";
import { addDays as addDays3, differenceInCalendarDays, format, parseISO as parseISO2 } from "date-fns";

// shared/pricing.ts
var DEFAULT_CREDIT_CARD_RATE = 0.035;
var formatSurchargePct = (rate) => {
  const pct = Math.round(rate * 1e4) / 100;
  return `${pct}%`;
};
var TAX_RATE = 0;
var DEFAULT_CLEANING_FEE = 0;
var roundCurrency3 = (v) => Math.round(v * 100) / 100;
var calculateBreakdown = ({
  baseAmount,
  cleaningFee = DEFAULT_CLEANING_FEE,
  extrasTotal = 0,
  promoDiscount = 0,
  paymentMethod,
  surchargeRate = DEFAULT_CREDIT_CARD_RATE
}) => {
  const cf = roundCurrency3(cleaningFee);
  const extras = roundCurrency3(extrasTotal);
  const discount = roundCurrency3(Math.max(0, promoDiscount));
  const subtotal = roundCurrency3(Math.max(0, baseAmount + cf + extras - discount));
  const tax = roundCurrency3(subtotal * TAX_RATE);
  const surcharge = paymentMethod === "STRIPE" ? roundCurrency3((subtotal + tax) * surchargeRate) : 0;
  const total = roundCurrency3(subtotal + tax + surcharge);
  return {
    baseAmount: roundCurrency3(baseAmount),
    cleaningFee: cf,
    extrasTotal: extras,
    discount,
    subtotal,
    tax,
    surcharge,
    total
  };
};

// server/lib/booking.ts
init_rateSelection();
init_storage();
init_schema();
init_ranges();
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
  const weekdayRates = {
    monPrice: property.monPrice,
    tuePrice: property.tuePrice,
    wedPrice: property.wedPrice,
    thuPrice: property.thuPrice,
    friPrice: property.friPrice,
    satPrice: property.satPrice,
    sunPrice: property.sunPrice
  };
  const priced = cascadeStayPrice({
    days: n,
    rates: {
      // base_price is the legacy nightly; treat it as the daily-tier rate so a
      // property with only base_price set keeps billing nightly × n. A property
      // that prices ONLY by weekday still has a priced daily tier — average the
      // set weekdays so the cascade can size the tail and fall back on it.
      daily: property.dailyRate ?? property.basePrice ?? averageWeekdayRate(weekdayRates),
      weekly: property.weeklyRate,
      biweekly: property.biweeklyRate,
      monthly: property.monthlyRate
    },
    // Whole-property stays have no billing cadence, so they cascade from the
    // top: months, then weeks, then days (biweekly is skipped, exactly as the
    // MONTHLY cadence does on the lease side).
    topTier: "MONTHLY"
  });
  const dailySeg = priced.segments.find((seg) => seg.tier === "DAILY");
  let baseAmount = priced.total;
  if (dailySeg && hasAnyWeekdayRate(weekdayRates)) {
    const weekdayAmount = weekdayStayTotal({
      // The daily tail starts this many nights after check-in.
      checkIn: format(addDays3(parseISO2(checkIn), dailySeg.startDay), "yyyy-MM-dd"),
      nights: dailySeg.units,
      weekdayRates,
      fallbackNightly: dailySeg.unitRate
    });
    baseAmount = Math.round((priced.total - dailySeg.amount + weekdayAmount) * 100) / 100;
  }
  const top = priced.segments[0].tier;
  return {
    baseAmount,
    tier: top === "BIWEEKLY" ? "WEEKLY" : top,
    // Nightly prices vary across a cascaded stay, so there is no single nightly
    // rate. This is a DISPLAY average only — baseAmount is authoritative and is
    // the value that flows to the charge.
    effectiveNightly: Math.round(baseAmount / n * 100) / 100
  };
}
var BookingError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
};
async function strHasConflict(propertyId, checkIn, checkOut, excludeBookingId) {
  const requestedRange = { start: checkIn, end: checkOut, endExclusive: true };
  const hits = (blocks2) => blocks2.some((b) => overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true }));
  const existing = await storage.getBookings();
  const directBlocks = existing.filter(
    (b) => b.propertyId === propertyId && b.model === "STR" && !NON_BLOCKING_BOOKING_STATUSES.includes(b.status) && b.id !== excludeBookingId && b.checkOut
  ).map((b) => ({ startDate: b.checkIn, endDate: b.checkOut }));
  if (hits(directBlocks)) return true;
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  if (hits(blocks)) return true;
  const manualBlocks2 = await storage.getManualBlocksForProperty(propertyId);
  return hits(manualBlocks2);
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
    if (ROOM_UNBOOKABLE_STATUSES.includes(room.status)) {
      throw new BookingError("That room is no longer available", 409);
    }
    if (!input.checkIn || !input.checkOut) {
      throw new BookingError("Select move-in and move-out dates");
    }
    const n2 = nights(input.checkIn, input.checkOut);
    if (n2 < 1) throw new BookingError("Move-out must be after move-in");
    if (n2 < COLIVING_MIN_DAYS) {
      throw new BookingError(`Co-living stays have a ${COLIVING_MIN_DAYS}-night minimum`);
    }
    if (requiresLease(n2)) {
      throw new BookingError(
        "Stays over 28 nights are booked as a lease \u2014 start from the room page to choose a payment schedule.",
        409
      );
    }
    const free = await storage.isRoomAvailableForRange({
      roomId: room.id,
      startDate: input.checkIn,
      endDate: input.checkOut,
      endExclusive: true
    });
    if (!free) throw new BookingError("Those dates are not available for this room", 409);
    let priced;
    try {
      priced = cascadeStayPrice({
        days: n2,
        rates: {
          daily: room.dailyRate,
          weekly: room.weeklyRent,
          biweekly: room.biweeklyRate,
          monthly: room.monthlyRate
        },
        topTier: "MONTHLY"
      });
    } catch (err) {
      if (err instanceof RateError) throw new BookingError(err.message, 422);
      throw err;
    }
    const weekSeg = priced.segments.find((seg) => seg.tier === "WEEKLY");
    const daySeg = priced.segments.find((seg) => seg.tier === "DAILY");
    return {
      model: "COLIVING",
      property,
      room,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      baseAmount: priced.total,
      // Per-room cleaning fee, folded into the upfront charge like STR. 0 if unset.
      cleaningFee: room.cleaningFee ? parseFloat(room.cleaningFee) : 0,
      nights: n2,
      shortStay: {
        weeks: weekSeg?.units ?? 0,
        remainderDays: daySeg?.units ?? 0,
        weeklyRate: weekSeg?.unitRate ?? parseFloat(room.weeklyRent),
        dailyRate: daySeg?.unitRate ?? parseFloat(room.weeklyRent) / 7
      }
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
function buildQuote(resolved, paymentMethod, surchargeRate = DEFAULT_CREDIT_CARD_RATE) {
  if (resolved.model === "STR") {
    const b2 = calculateBreakdown({
      baseAmount: resolved.baseAmount,
      cleaningFee: resolved.cleaningFee,
      paymentMethod,
      surchargeRate
    });
    const tierLabel = resolved.rateTier === "MONTHLY" ? " @ monthly rate" : resolved.rateTier === "WEEKLY" ? " @ weekly rate" : "";
    const lines2 = [
      {
        label: `Stay (${resolved.nights} night${resolved.nights === 1 ? "" : "s"}${tierLabel})`,
        amount: resolved.baseAmount
      }
    ];
    if (resolved.cleaningFee > 0) lines2.push({ label: "Cleaning fee", amount: resolved.cleaningFee });
    if (b2.tax > 0) lines2.push({ label: "Tax", amount: b2.tax });
    if (b2.surcharge > 0) lines2.push({ label: `Card processing (${formatSurchargePct(surchargeRate)})`, amount: b2.surcharge });
    return {
      model: "STR",
      nights: resolved.nights,
      dueNow: { lines: lines2, subtotal: b2.subtotal, tax: b2.tax, surcharge: b2.surcharge, total: b2.total }
    };
  }
  const b = calculateBreakdown({
    baseAmount: resolved.baseAmount,
    cleaningFee: resolved.cleaningFee,
    paymentMethod,
    surchargeRate
  });
  const ss = resolved.shortStay;
  const lines = [];
  if (ss) {
    if (ss.weeks > 0) {
      lines.push({
        label: `${ss.weeks} week${ss.weeks === 1 ? "" : "s"} @ ${money(ss.weeklyRate)}/wk`,
        amount: Math.round(ss.weeks * ss.weeklyRate * 100) / 100
      });
    }
    if (ss.remainderDays > 0) {
      lines.push({
        label: `${ss.remainderDays} day${ss.remainderDays === 1 ? "" : "s"} @ ${money(ss.dailyRate)}/day`,
        amount: Math.round(ss.remainderDays * ss.dailyRate * 100) / 100
      });
    }
  } else {
    lines.push({ label: `Stay (${resolved.nights} nights)`, amount: resolved.baseAmount });
  }
  if (resolved.cleaningFee > 0) lines.push({ label: "Cleaning fee", amount: resolved.cleaningFee });
  if (b.surcharge > 0) lines.push({ label: `Card processing (${formatSurchargePct(surchargeRate)})`, amount: b.surcharge });
  return {
    model: "COLIVING",
    nights: resolved.nights,
    dueNow: { lines, subtotal: b.subtotal, tax: b.tax, surcharge: b.surcharge, total: b.total }
  };
}
function money(n) {
  return `$${(Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
    maximumFractionDigits: 2
  })}`;
}

// server/lib/lease.ts
init_leaseSchedule();
init_rateSelection();
init_schema();
init_storage();

// server/lib/errorResponse.ts
function clientErrorMessage(err, status, isDev2) {
  if (status >= 500 && !isDev2) return "Internal Server Error";
  return err.message || "Internal Server Error";
}
var LeaseError = class extends Error {
  status;
  constructor(message, status = 400) {
    super(message);
    this.name = "LeaseError";
    this.status = status;
  }
};

// server/lib/lease.ts
init_ranges();
var roundMoney = (v) => Math.round(v * 100) / 100;
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
    if (ROOM_UNBOOKABLE_STATUSES.includes(room.status)) {
      throw new LeaseError(`Room ${room.name} is no longer available`, 409);
    }
    const requestedRange = { start: input.startDate, end: input.endDate, endExclusive: false };
    const blocks = await storage.getExternalBlocksForRoom(room.id);
    const externalConflict = blocks.some(
      (b) => overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true })
    );
    if (externalConflict) {
      throw new LeaseError(
        `${room.name} is booked for those dates on Airbnb. Pick different dates.`,
        409
      );
    }
    const manualBlocks2 = await storage.getManualBlocksForRoom(room.id);
    const manualConflict = manualBlocks2.some(
      (b) => overlapsRange(requestedRange, { start: b.startDate, end: b.endDate, endExclusive: true })
    );
    if (manualConflict) {
      throw new LeaseError(`${room.name} isn't available for those dates. Pick different dates.`, 409);
    }
    rooms2.push(room);
  }
  const termDays = inclusiveDays(input.startDate, input.endDate);
  if (termDays > MAX_LEASE_DAYS) {
    throw new LeaseError(`Lease term cannot exceed ${MAX_LEASE_DAYS} days`, 422);
  }
  const weeklyRateTotal = sumRate(rooms2, (r) => r.weeklyRent) ?? 0;
  const depositTotal = sumRate(rooms2, (r) => r.depositAmount) ?? 0;
  const cleaningFeeTotal = sumRate(rooms2, (r) => r.cleaningFee) ?? 0;
  const allowed = allowedCadencesForTerm(termDays);
  if (input.cadence && !allowed.includes(input.cadence)) {
    throw new LeaseError(
      `A ${input.cadence.toLowerCase()} schedule isn't available for a ${termDays}-day term`,
      422
    );
  }
  const cadence = input.cadence ?? allowed[0];
  let rates;
  let generated;
  let priced;
  try {
    rates = combineLeaseRates(
      rooms2.map((r) => ({
        weeklyRent: r.weeklyRent,
        dailyRate: r.dailyRate,
        biweeklyRate: r.biweeklyRate,
        monthlyRate: r.monthlyRate
      }))
    );
    generated = generateCascadeSchedule({
      startDate: input.startDate,
      endDate: input.endDate,
      cadence,
      rates
    });
    priced = cascadeStayPrice({
      days: generated.totalDays,
      rates,
      topTier: cadence
    });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    if (err instanceof ScheduleError) throw new LeaseError(err.message, 422);
    throw err;
  }
  const head = priced.segments.find((seg) => seg.tier === cadence);
  const rate = {
    periodRate: roundMoney(head?.unitRate ?? generated.installments[0]?.amount ?? 0),
    periodDays: head?.unitDays ?? CADENCE_DAYS[cadence]
  };
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
    installmentAmount: rate.periodRate,
    periodDays: rate.periodDays,
    depositTotal,
    cleaningFeeTotal,
    termDays: generated.totalDays,
    schedule,
    totalLeaseValue: generated.totalLeaseValue,
    prorationNote: generated.prorationNote,
    dueToday: schedule[0]?.amount ?? 0
  };
}

// server/lib/availability.ts
init_storage();
init_dates();
init_schema();
import { addDays as addDays4, format as format2, parseISO as parseISO3 } from "date-fns";
function isNonBlocking(status) {
  return NON_BLOCKING_BOOKING_STATUSES.includes(status);
}
function exclusiveEnd(inclusiveEnd) {
  return format2(addDays4(parseISO3(inclusiveEnd), 1), "yyyy-MM-dd");
}
function sortByStart(ranges) {
  return [...ranges].sort((a, b) => a.start < b.start ? -1 : a.start > b.start ? 1 : 0);
}
function isRoomBookableStatus(status) {
  return !ROOM_UNBOOKABLE_STATUSES.includes(status);
}
async function roomAvailableForDates(room, range) {
  if (!range) return true;
  if (!isRoomBookableStatus(room.status)) return false;
  return storage.isRoomAvailableForRange({
    roomId: room.id,
    startDate: range.checkIn,
    endDate: range.checkOut,
    endExclusive: true
  });
}
async function buildStrAvailability(propertyId) {
  const today = todayIso();
  const bookings2 = await storage.getStrBookingsForProperty(propertyId);
  const directRanges = bookings2.filter((b) => !isNonBlocking(b.status)).filter((b) => b.checkOut && b.checkOut >= today).map((b) => ({ start: b.checkIn, end: b.checkOut, source: "direct" }));
  const blocks = await storage.getExternalBlocksForProperty(propertyId);
  const externalRanges = blocks.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "external" }));
  const manualBlocks2 = await storage.getManualBlocksForProperty(propertyId);
  const manualRanges = manualBlocks2.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "manual" }));
  return { busy: sortByStart([...directRanges, ...externalRanges, ...manualRanges]), minDate: today };
}
async function buildRoomAvailability(roomId) {
  const today = todayIso();
  const leases2 = await storage.getRoomBlockingLeasesForRoom(roomId);
  const leaseRanges = leases2.filter((l) => l.endDate >= today).map((l) => ({ start: l.startDate, end: exclusiveEnd(l.endDate), source: "direct" }));
  const bookings2 = await storage.getColivingBookingsForRoom(roomId);
  const bookingRanges = bookings2.filter((b) => !isNonBlocking(b.status)).filter((b) => b.checkOut && b.checkOut >= today).map((b) => ({ start: b.checkIn, end: b.checkOut, source: "direct" }));
  const blocks = await storage.getExternalBlocksForRoom(roomId);
  const externalRanges = blocks.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "external" }));
  const manualBlocks2 = await storage.getManualBlocksForRoom(roomId);
  const manualRanges = manualBlocks2.filter((b) => b.endDate >= today).map((b) => ({ start: b.startDate, end: b.endDate, source: "manual" }));
  return {
    busy: sortByStart([...leaseRanges, ...bookingRanges, ...externalRanges, ...manualRanges]),
    minDate: today
  };
}

// server/routes.ts
init_dates();

// shared/bookingGate.ts
init_schema();
import { differenceInCalendarDays as differenceInCalendarDays2, parseISO as parseISO4 } from "date-fns";
function stayNights(checkIn, checkOut) {
  const n = differenceInCalendarDays2(parseISO4(checkOut), parseISO4(checkIn));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
function isGatedStay(stay) {
  if (stay.model !== "COLIVING") return false;
  if (!stay.checkOut) return false;
  return isDirectCoLivingStay(stayNights(stay.checkIn, stay.checkOut));
}
function postPaymentStatusFor(stay) {
  if (isGatedStay(stay)) return "PENDING_APPROVAL";
  return stay.model === "COLIVING" ? "ACTIVE" : "CONFIRMED";
}

// server/lib/stayPortal.ts
init_storage();
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

// server/lib/uploadValidation.ts
var EXT_BY_TYPE = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf"
};
var MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
function assertR2Configured() {
  if (!isR2Configured()) {
    throw new LeaseError("File uploads aren't enabled yet (storage not configured).", 503);
  }
}
function validateUpload(file) {
  if (!file || !file.buffer?.length) throw new LeaseError("No file was uploaded.", 400);
  if (file.size > MAX_UPLOAD_BYTES) throw new LeaseError("File too large (max 12 MB).", 400);
  const ext = EXT_BY_TYPE[file.mimetype];
  if (!ext) {
    throw new LeaseError("Unsupported file type \u2014 upload a JPG, PNG, WEBP, HEIC, or PDF.", 400);
  }
  return ext;
}

// server/lib/stayLifecycle.ts
init_storage();

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
  return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "").split(",").map((s) => s.trim()).filter(Boolean).map((entry) => entry.includes(":") ? entry.slice(entry.lastIndexOf(":") + 1).trim() : entry).filter((id) => /^-?\d+$/.test(id));
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
  const esc3 = text2.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  return `<p>${esc3.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>').replace(/\n/g, "<br>")}</p>`;
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
      const client2 = await getTwilio();
      await client2.messages.create({
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

// server/lib/formatShared.ts
var fmtMoney = (v) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
function roomDisplayName(room) {
  if (!room) return null;
  return room.roomNumber ? `Room ${room.roomNumber} \u2014 ${room.name}` : room.name;
}

// server/lib/stayLifecycle.ts
init_schema();

// shared/contact.ts
var BNP_CONTACT = {
  phone: "(404) 541-9934",
  email: "beniceproperties@gmail.com",
  website: "www.beniceproperties.com"
};

// server/lib/stayTemplates.ts
function listOf(items) {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
var roomClause = (room) => room ? ` (${room})` : "";
function stayDocsRequired(v) {
  const what = listOf(v.outstanding);
  return {
    subject: `Thanks for booking \u2014 ${v.outstanding.length} thing${v.outstanding.length === 1 ? "" : "s"} left to finish (${v.reference})`,
    body: `Hi ${v.name}, thank you for booking${roomClause(v.room)} at ${v.property} from ${v.checkIn} to ${v.checkOut}. Your payment of ${v.total} has gone through and your dates are held.

TO COMPLETE YOUR BOOKING we still need ${what}. It takes about two minutes:
${v.stayUrl}

Once we have everything, we review it and confirm \u2014 that can take up to 24 hours. We will email you your door code and arrival details as soon as it is approved.

Reference ${v.reference}.`,
    smsBody: `BNP: payment received for ${v.reference}. Finish your booking (ID + agreement): ${v.smsUrl}`
  };
}
function stayDocsComplete(v) {
  return {
    subject: `We have everything \u2014 reviewing your stay (${v.reference})`,
    body: `Hi ${v.name}, thanks \u2014 we have your ID and your signed agreement for ${v.property}${roomClause(v.room)}, arriving ${v.checkIn}.

We review these by hand, which can take up to 24 hours. As soon as it is approved we will email your door code, wifi and directions.

Check your status anytime: ${v.stayUrl}

Reference ${v.reference}.`,
    smsBody: `BNP: got your ID and agreement for ${v.reference}. We confirm within 24 hours.`
  };
}
function adminStayAwaitingApproval(v) {
  const flag = v.nameMismatch ? "NAME MISMATCH - " : "";
  return {
    subject: `${flag}Stay awaiting approval - ${v.property}${roomClause(v.room)} ${v.checkIn}`,
    body: `${v.guest} has completed their documents and is awaiting approval.

Listing: ${v.property}${roomClause(v.room)}
Dates: ${v.checkIn} to ${v.checkOut} (${v.nights} nights)
Reference: ${v.reference}
Paid: ${v.total}
Signed as: ${v.signedName}
Guest record: ${v.guest}
` + (v.nameMismatch ? `
** The signed name does not match the guest record. Check the licence carefully. **
` : "") + `
Contact: ${v.email}${v.phone ? ` / ${v.phone}` : ""}

Review the licence, confirm the name matches, and set the door code: ${v.adminUrl}`,
    // Name / listing / dates / reference / amount only — no email, no phone.
    telegramText: `${v.guest} - ${v.property}${roomClause(v.room)} - ${v.checkIn} to ${v.checkOut} - ${v.reference} - ${v.total}${v.nameMismatch ? " - NAME MISMATCH" : ""} - awaiting approval`
  };
}
function stayFixRequested(v) {
  return {
    subject: `Action needed to confirm your stay (${v.reference})`,
    body: `Hi ${v.name}, we need one more thing before we can confirm your stay at ${v.property}.

${v.reason}

Your dates are still held and no further payment is needed \u2014 just resubmit here:
${v.stayUrl}

If this is not sorted within 3 days we will cancel the booking and refund you in full.

Reference ${v.reference}.`,
    smsBody: `BNP: we need one more thing to confirm ${v.reference}. Details in your email: ${v.smsUrl}`
  };
}
function stayApprovedWelcome(v) {
  const shell = (access) => `Greetings ${v.name},

We are excited to welcome you to Be Nice Properties and are looking forward to your arrival on ${v.checkIn}. Your reservation has been approved and your payment has been received. Below is your welcome information so you can get settled in comfortably when you arrive.

YOUR STAY
${v.property}${roomClause(v.room)}
` + (v.propertyAddress ? `${v.propertyAddress}
` : "") + `Check-in: ${v.checkIn}
Check-out: ${v.checkOut}
Reference: ${v.reference}

GETTING IN
${access}

HOUSE RULES
${v.houseRulesUrl}

DURING YOUR STAY
If you need anything during your stay, please reach out to us at ${BNP_CONTACT.phone} or ${BNP_CONTACT.email}, or use your stay page: ${v.stayUrl}. We want your stay to feel easy, comfortable, and welcoming.

EXTENSIONS & ADDITIONAL PAYMENTS
If you would like to extend your stay, you can do so from your stay page. We will also send you an extension link two days before your reservation ends, which you may use to request and pay for additional time.

We recommend securing your extension as soon as possible. Rooms remain available for new reservations until an extension is completed, so booking early helps avoid an interruption in your stay due to a new incoming guest.

Extensions are subject to room availability and are not confirmed until payment is completed. If you need to pay using an option that is not available through the stay page or extension link, please contact us directly for assistance.

If you have any questions before arrival, feel free to reach out. We are happy to help and look forward to having you with us.

Happy Moving!

Best,
Be Nice Properties Team`;
  return {
    subject: `Your Be Nice Properties Stay Details - Arrival on ${v.checkIn}`,
    body: shell(v.accessText),
    // Rule 2: the code never leaves by SMS. It points at the email instead.
    smsBody: `BNP: you are confirmed for ${v.checkIn}. Door code, wifi and directions are in your email.`,
    logBody: shell(v.accessTextRedacted)
  };
}
function stayDeclinedRefunded(v) {
  return {
    subject: `Your booking ${v.reference} has been cancelled and refunded`,
    body: `Hi ${v.name}, your booking at ${v.property} (${v.reference}) has been cancelled and ${v.refundAmount} has been refunded in full to the card you paid with. Refunds usually land within 5 to 10 business days.

` + (v.auto ? `We did not receive the ID and signed agreement we needed to confirm the stay.

` : v.reason ? `Reason: ${v.reason}

` : "") + `If you would still like to stay with us, you are welcome to book again: ${v.rebookUrl}`,
    smsBody: `BNP: booking ${v.reference} is cancelled and ${v.refundAmount} refunded in full. Details in your email.`
  };
}
function adminStayAutoDeclined(v) {
  const text2 = `Auto-declined and refunded: ${v.guest} - ${v.property}${roomClause(v.room)} - ${v.checkIn} to ${v.checkOut} - ${v.reference} - ${v.refundAmount} refunded. The guest never completed their ID and agreement. The dates are back on sale.`;
  return {
    subject: `Auto-declined + refunded - ${v.property}${roomClause(v.room)} ${v.checkIn}`,
    body: text2,
    // Carries no contact details, but passed explicitly so a later edit that adds
    // an email cannot silently start leaking it to a third party.
    telegramText: text2
  };
}
function stayExtended(v) {
  return {
    subject: `Your stay is extended \u2014 now through ${v.newCheckOut} (${v.reference})`,
    body: `Hi ${v.name}, done \u2014 your stay at ${v.property}${roomClause(v.room)} is extended.

YOUR UPDATED STAY
Was ending: ${v.previousCheckOut}
Now ending: ${v.newCheckOut}
Added: ${v.addedNights} night${v.addedNights === 1 ? "" : "s"}
Paid today: ${v.amount}
Reference ${v.reference}

Nothing else changes \u2014 same room, same door code, and there is nothing new to sign.

Your booking: ${v.stayUrl}`,
    smsBody: `BNP: your stay is extended to ${v.newCheckOut}. ${v.amount} paid. Same room, same code.`
  };
}
function adminStayExtended(v) {
  const text2 = `Stay extended: ${v.guest} - ${v.property}${roomClause(v.room)} - ${v.previousCheckOut} to ${v.newCheckOut} - ${v.reference} - ${v.amount} paid.`;
  return { subject: `Stay extended - ${v.property}${roomClause(v.room)}`, body: text2, telegramText: text2 };
}
function adminStayExtensionConflict(v) {
  const text2 = `EXTENSION PAID BUT NOT APPLIED: ${v.guest} - ${v.property}${roomClause(v.room)} - ${v.reference} - ${v.amount} charged for an extension to ${v.requestedCheckOut}, but the dates were taken in the meantime (${v.reason}). The charge STANDS and was NOT refunded. Resolve by hand: extend to a shorter date, move the guest, or refund.`;
  return {
    subject: `EXTENSION PAID BUT DATES TAKEN - ${v.reference}`,
    body: text2,
    telegramText: text2
  };
}

// server/lib/accessInfo.ts
init_storage();
var REQUIRED_WELCOME_FIELDS = ["doorCode", "wifiSsid", "directions"];
var nonEmpty = (v) => {
  const t = typeof v === "string" ? v.trim() : "";
  return t.length > 0 ? t : null;
};
async function resolveStayAccessInfo(args) {
  const [propertyInfo, roomInfo] = await Promise.all([
    storage.getPropertyAccessInfo(args.property.id),
    args.room ? storage.getRoomAccessInfo(args.room.id) : Promise.resolve(void 0)
  ]);
  return {
    doorCode: nonEmpty(args.gate?.doorCode),
    wifiSsid: nonEmpty(propertyInfo?.wifiSsid),
    wifiPassword: nonEmpty(propertyInfo?.wifiPassword),
    buildingEntry: nonEmpty(propertyInfo?.buildingEntry),
    directions: nonEmpty(propertyInfo?.directions),
    parking: nonEmpty(propertyInfo?.parking),
    roomFinding: nonEmpty(roomInfo?.findingNotes),
    checkInFrom: nonEmpty(propertyInfo?.checkInFrom),
    checkOutBy: nonEmpty(propertyInfo?.checkOutBy),
    notes: nonEmpty(propertyInfo?.notes)
  };
}
function missingAccessFields(info, opts = {}) {
  const requireDoorCode = opts.requireDoorCode !== false;
  return REQUIRED_WELCOME_FIELDS.filter((field) => {
    if (field === "doorCode" && !requireDoorCode) {
      return !info.doorCode && !info.buildingEntry;
    }
    return !info[field];
  });
}
function renderAccessInfoText(info) {
  const lines = [];
  if (info.doorCode) lines.push(`Door code: ${info.doorCode}`);
  if (info.buildingEntry) lines.push(`Building/gate entry: ${info.buildingEntry}`);
  if (info.wifiSsid) {
    lines.push(
      info.wifiPassword ? `Wi-Fi: ${info.wifiSsid} \u2014 password ${info.wifiPassword}` : `Wi-Fi: ${info.wifiSsid}`
    );
  }
  if (info.roomFinding) lines.push(`Finding your room: ${info.roomFinding}`);
  if (info.directions) lines.push(`Getting here: ${info.directions}`);
  if (info.parking) lines.push(`Parking: ${info.parking}`);
  if (info.checkInFrom) lines.push(`Check-in from: ${info.checkInFrom}`);
  if (info.checkOutBy) lines.push(`Checkout by: ${info.checkOutBy}`);
  if (info.notes) lines.push(info.notes);
  return lines.join("\n");
}
function renderAccessInfoRedacted(info) {
  return renderAccessInfoText({
    ...info,
    doorCode: info.doorCode ? "[redacted]" : null,
    buildingEntry: info.buildingEntry ? "[redacted]" : null,
    wifiPassword: info.wifiPassword ? "[redacted]" : null
  });
}

// server/lib/smsLinks.ts
init_storage();
var SETTING_SMS_LINKS = "sms_include_links";
async function smsLinksEnabled() {
  const value = (await storage.getSetting(SETTING_SMS_LINKS))?.value;
  return !(value === "false" || value === "0");
}
async function smsLink(url) {
  return await smsLinksEnabled() ? url : "";
}

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
function houseRulesUrl() {
  return `${publicBaseUrl()}/house-rules`;
}
function stayUrl(gate) {
  return gate?.gateToken ? `${publicBaseUrl()}/stay/${gate.gateToken}` : lookupUrl();
}

// server/lib/stayLifecycle.ts
async function guestSendsEnabled() {
  const setting = await storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING);
  return setting?.value !== "false";
}
function outstandingItems(gate) {
  const items = [];
  if (!gate?.agreementSignedAt) items.push("your signed rental agreement");
  if (!gate || !["PENDING_REVIEW", "APPROVED"].includes(gate.verificationStatus)) {
    items.push("a photo of your driver's licence");
  }
  return items;
}
function guestDocsSubmitted(gate) {
  return outstandingItems(gate).length === 0;
}
async function sendGuest(ctx, kind, tpl, scheduleSeq = null) {
  if (await storage.hasLifecycleEvent({ bookingId: ctx.booking.id }, kind, scheduleSeq)) {
    return false;
  }
  const enabled = await guestSendsEnabled();
  if (!enabled) {
    await storage.recordLifecycleEvent({
      bookingId: ctx.booking.id,
      eventType: kind,
      scheduleSeq,
      status: "SKIPPED",
      emailSent: false,
      smsSent: false
    });
    return false;
  }
  const sent = await notifyGuest({
    email: ctx.guest.email,
    phone: ctx.guest.phone,
    subject: tpl.subject,
    body: tpl.body,
    smsBody: tpl.smsBody,
    logBody: tpl.logBody,
    context: { bookingId: ctx.booking.id, guestId: ctx.guest.id, kind }
  });
  await storage.recordLifecycleEvent({
    bookingId: ctx.booking.id,
    eventType: kind,
    scheduleSeq,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
  return sent.email.sent;
}
async function sendAdmin(ctx, kind, tpl, scheduleSeq = null) {
  if (await storage.hasLifecycleEvent({ bookingId: ctx.booking.id }, kind, scheduleSeq)) return;
  await notifyAdmin({
    subject: tpl.subject,
    body: tpl.body,
    telegramText: tpl.telegramText,
    context: { bookingId: ctx.booking.id, guestId: ctx.guest.id, kind }
  });
  await storage.recordLifecycleEvent({
    bookingId: ctx.booking.id,
    eventType: kind,
    scheduleSeq,
    status: "SENT",
    emailSent: true,
    smsSent: false
  });
}
async function vars(ctx) {
  const url = stayUrl(ctx.gate);
  return {
    name: ctx.guest.name,
    property: ctx.property.name,
    room: roomDisplayName(ctx.room),
    reference: ctx.booking.reference,
    stayUrl: url,
    // Routed through the A2P 10DLC switch: when SMS links are off this is "" and
    // the template renders without one.
    smsUrl: await smsLink(url)
  };
}
async function onStayBookingConfirmed(ctx) {
  const v = await vars(ctx);
  const tpl = stayDocsRequired({
    ...v,
    checkIn: ctx.booking.checkIn,
    checkOut: ctx.booking.checkOut ?? "",
    total: fmtMoney(parseFloat(ctx.booking.quotedTotal)),
    outstanding: outstandingItems(ctx.gate)
  });
  await sendGuest(ctx, "STAY_DOCS_REQUIRED", tpl);
  log(`stay ${ctx.booking.reference}: gated \u2014 documents requested`, "lifecycle");
}
async function onStayDocsComplete(ctx) {
  const round2 = (ctx.gate?.fixRequestCount ?? 0) + 1;
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_DOCS_COMPLETE",
    stayDocsComplete({ ...v, checkIn: ctx.booking.checkIn }),
    round2
  );
  const signedName = ctx.gate?.agreementSignedName ?? "";
  await sendAdmin(
    ctx,
    "STAY_ADMIN_AWAITING_APPROVAL",
    adminStayAwaitingApproval({
      property: ctx.property.name,
      room: roomDisplayName(ctx.room),
      guest: ctx.guest.name,
      email: ctx.guest.email,
      phone: ctx.guest.phone ?? "",
      checkIn: ctx.booking.checkIn,
      checkOut: ctx.booking.checkOut ?? "",
      nights: stayNights(ctx.booking.checkIn, ctx.booking.checkOut ?? ctx.booking.checkIn),
      reference: ctx.booking.reference,
      total: fmtMoney(parseFloat(ctx.booking.quotedTotal)),
      signedName,
      // The substance of the review, surfaced rather than left for the admin to
      // spot. Same comparison the lease verification queue already makes.
      nameMismatch: signedName.trim().toLowerCase() !== ctx.guest.name.trim().toLowerCase(),
      adminUrl: `${publicBaseUrl()}/admin`
    }),
    round2
  );
  log(`stay ${ctx.booking.reference}: documents complete \u2014 awaiting approval`, "lifecycle");
}
async function onStayFixRequested(ctx, reason) {
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_FIX_REQUESTED",
    stayFixRequested({ ...v, reason }),
    ctx.gate?.fixRequestCount ?? 1
  );
  log(`stay ${ctx.booking.reference}: fix requested`, "lifecycle");
}
async function onStayApproved(ctx) {
  const info = await resolveStayAccessInfo({
    gate: ctx.gate,
    property: ctx.property,
    room: ctx.room
  });
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_APPROVED_WELCOME",
    stayApprovedWelcome({
      ...v,
      propertyAddress: ctx.property.address,
      checkIn: ctx.booking.checkIn,
      checkOut: ctx.booking.checkOut ?? "",
      accessText: renderAccessInfoText(info),
      accessTextRedacted: renderAccessInfoRedacted(info),
      houseRulesUrl: houseRulesUrl()
    })
  );
  log(`stay ${ctx.booking.reference}: approved \u2014 welcome letter sent`, "lifecycle");
}
async function onStayDeclined(ctx, args) {
  await sendGuest(
    ctx,
    "STAY_DECLINED_REFUNDED",
    stayDeclinedRefunded({
      name: ctx.guest.name,
      property: ctx.property.name,
      reference: ctx.booking.reference,
      reason: args.reason,
      refundAmount: fmtMoney(args.refundAmount),
      auto: args.auto,
      rebookUrl: `${publicBaseUrl()}/property/${ctx.booking.propertyId}`
    })
  );
  if (args.auto) {
    await sendAdmin(
      ctx,
      "STAY_ADMIN_AUTO_DECLINED",
      adminStayAutoDeclined({
        property: ctx.property.name,
        room: roomDisplayName(ctx.room),
        guest: ctx.guest.name,
        checkIn: ctx.booking.checkIn,
        checkOut: ctx.booking.checkOut ?? "",
        reference: ctx.booking.reference,
        refundAmount: fmtMoney(args.refundAmount)
      })
    );
  }
  log(
    `stay ${ctx.booking.reference}: declined + refunded (${args.auto ? "auto" : "admin"})`,
    "lifecycle"
  );
}
async function onStayExtended(ctx, args) {
  const addedNights = stayNights(args.previousCheckOut, args.newCheckOut);
  const v = await vars(ctx);
  await sendGuest(
    ctx,
    "STAY_EXTENDED",
    stayExtended({
      ...v,
      previousCheckOut: args.previousCheckOut,
      newCheckOut: args.newCheckOut,
      addedNights,
      amount: fmtMoney(args.amount)
    }),
    args.extensionSeq
  );
  await sendAdmin(
    ctx,
    "STAY_ADMIN_EXTENDED",
    adminStayExtended({
      property: ctx.property.name,
      room: roomDisplayName(ctx.room),
      guest: ctx.guest.name,
      previousCheckOut: args.previousCheckOut,
      newCheckOut: args.newCheckOut,
      reference: ctx.booking.reference,
      amount: fmtMoney(args.amount)
    }),
    args.extensionSeq
  );
  log(
    `stay ${ctx.booking.reference}: extended ${args.previousCheckOut} \u2192 ${args.newCheckOut}`,
    "lifecycle"
  );
}

// server/lib/documentHtml.ts
function esc(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var ESIGN_ATTESTATION = "By typing my full legal name below and submitting this Agreement, I acknowledge that I have read and agree to its terms, and I intend my typed name to be my legally binding electronic signature under the U.S. E-SIGN Act and UETA.";
function documentPage(title, inner) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1a1a1a}@media print{body{margin:0}}</style></head><body>${inner}</body></html>`;
}
function awaitingSignatureHtml(attestation = ESIGN_ATTESTATION) {
  return `<section style="margin-top:24px"><p style="line-height:1.5">${esc(attestation)}</p><p style="color:#777">\u2014 Awaiting signature \u2014</p></section>`;
}
function signatureBlockHtml(signature, attestation = ESIGN_ATTESTATION) {
  return `<section style="margin-top:24px;border-top:2px solid #1a1a1a;padding-top:16px"><p style="line-height:1.5">${esc(attestation)}</p><div style="margin-top:12px;font-size:14px"><div><strong>Signed by:</strong> ${esc(signature.signedName)}</div><div><strong>Date &amp; time:</strong> ${esc(signature.signedAt.toISOString())}</div><div><strong>IP address:</strong> ${esc(signature.signedIp)}</div><div style="margin-top:8px;color:#555">Electronically signed under the E-SIGN Act / UETA.</div></div></section>`;
}
function fillTokens(template, tokens) {
  return template.replace(
    /\{\{(\w+)\}\}/g,
    (whole, key) => Object.prototype.hasOwnProperty.call(tokens, key) ? tokens[key] : whole
  );
}

// server/lib/stayAgreementDocument.ts
var DEFAULT_STAY_AGREEMENT_TEMPLATE = {
  title: "Room Booking & Resident Acknowledgment",
  version: "BNP-RBA-2026.3",
  /** The reservation-details table at the top: [label, text]. */
  details: [
    ["Resident legal name", "{{guestName}}"],
    ["Property address", "{{propertyLocation}}"],
    ["Assigned room", "{{roomLabel}}"],
    ["Check-in date", "{{checkIn}} ({{checkInFrom}})"],
    ["Check-out date", "{{checkOut}} ({{checkOutBy}})"],
    ["Length of stay", "{{nights}} night(s)"],
    ["Booking total", "{{totalPaid}}"],
    ["Amount due", "{{totalPaid}} \u2014 paid in full at booking"]
  ],
  intro: "This acknowledgment applies to your furnished private-room reservation with Be Nice Properties (BNP). Your booking details above control your specific room, dates, rate, fees, and amount due. Your reservation is for the assigned bedroom only, with non-exclusive use of approved shared/common areas.",
  sections: [
    {
      heading: "Payment & Reservation",
      bullets: [
        "Pay all amounts according to the schedule shown in your booking.",
        "A payment received after the agreed due date is late. BNP's current late fee is $25, unless Management authorizes otherwise.",
        "No security deposit or reservation hold is required for weekly stays.",
        "Any cancellation/refund follows the terms shown at booking.",
        "Staying beyond the confirmed check-out date requires BNP approval and a new or extended reservation. Unless BNP requires a newer agreement version, an approved extension remains subject to this acknowledgment."
      ]
    },
    {
      // NOT in BNP-RBA-2026.3 — describes the app's own approval flow.
      heading: "Confirmation & Access",
      body: "This booking is confirmed only after BNP has (a) received this signed acknowledgment, (b) received a government-issued photo identification matching the name signed below, and (c) approved both. Access details, including the door code, are issued on approval and are personal to the Resident. The Resident may not share, copy, or transfer any access code or key."
    },
    {
      heading: "Room & Common Areas",
      bullets: [
        "Only approved residents may occupy the room. Unauthorized occupants are prohibited.",
        "Residents may use designated shared kitchen, bathroom, laundry, living, parking, and outdoor areas.",
        "Keep your bedroom reasonably clean. Wash dishes, remove trash, clean spills, and keep shared areas sanitary.",
        "Weekly common-area housekeeping does not replace your responsibility to clean up after yourself."
      ]
    },
    {
      heading: "House & Community Rules",
      // The link sentence is NOT in BNP-RBA-2026.3; the app incorporates the
      // published page by reference so the two can never silently diverge.
      body: "The full house rules are published at {{houseRulesUrl}} and form part of this acknowledgment.",
      bullets: [
        "No pets, except approved or legally required accommodations.",
        "No smoking or vaping inside. Smoking is only permitted in approved outdoor areas.",
        "Quiet hours: 10:00 p.m.-7:00 a.m.",
        "Illegal drug activity, criminal conduct, threats, harassment, violence, and unlawful weapons-related conduct are prohibited.",
        "You are responsible for your guests and for damage caused by you or your guests, to the extent permitted by law.",
        "Report maintenance, leaks, damage, safety concerns, and access problems promptly.",
        "Be respectful of residents, neighbors, BNP staff, vendors, and guests."
      ]
    },
    {
      heading: "Move-Out",
      bullets: [
        "Remove all belongings, food, and trash by check-out. Your property access code will automatically become inactive after your reservation ends.",
        "Items left behind will be handled under BNP policy and applicable Georgia law."
      ]
    },
    {
      heading: "Violations, Nonpayment & Communications",
      body: "Failure to pay amounts due or serious/repeated violations may result in warnings, charges permitted by the reservation, refusal of an extension, termination procedures, or other action permitted by law. Nothing in this acknowledgment permits BNP to bypass any notice, possession, dispossessory, or other process required by Georgia law. You agree that BNP may communicate with you by text, email, booking/property-management software, and other electronic methods regarding your stay."
    }
  ],
  /** The owner's checkbox statement, rendered immediately above the signature block. */
  acknowledgment: "I have read and agree to the Be Nice Properties Room Booking & Resident Acknowledgment (Version {{version}}) and the reservation details above. I understand my room, dates, payment terms, house/community rules, and that staying beyond my confirmed check-out date requires BNP approval and an extension or new reservation. By signing below and completing my booking, I electronically acknowledge and agree to these terms to the extent permitted by law.",
  bookingRecord: "Booking Record: Reservation # {{reference}} | Agreement Version {{version}}",
  signatureStatement: ESIGN_ATTESTATION
};
function stayAgreementTokens(data, template = DEFAULT_STAY_AGREEMENT_TEMPLATE) {
  return {
    guestName: data.guestName,
    propertyName: data.propertyName,
    propertyLocation: data.propertyLocation,
    roomLabel: data.roomLabel,
    checkIn: data.checkIn,
    checkOut: data.checkOut,
    nights: String(stayNights(data.checkIn, data.checkOut)),
    totalPaid: fmtMoney(data.totalPaid),
    houseRulesUrl: data.houseRulesUrl,
    reference: data.reference,
    version: template.version,
    // Fall back to plain language rather than rendering an empty parenthesis when
    // a property has not had its arrival times filled in yet.
    checkInFrom: data.checkInFrom || "check-in time as advised",
    checkOutBy: data.checkOutBy || "the stated checkout time"
  };
}
function bodyHtml(data, template) {
  const tokens = stayAgreementTokens(data, template);
  const fill2 = (s) => esc(fillTokens(s, tokens));
  const details = `<table style="width:100%;border-collapse:collapse;margin:0 0 16px;font-size:14px">` + template.details.map(
    ([label, text2]) => `<tr><th style="text-align:left;padding:6px 8px;border:1px solid #ddd;background:#f5f5f5;width:38%">${esc(
      label
    )}</th><td style="padding:6px 8px;border:1px solid #ddd">${fill2(text2)}</td></tr>`
  ).join("") + `</table>`;
  const sections = template.sections.map((s) => {
    const body = s.body ? `<p style="margin:0 0 6px;line-height:1.5">${fill2(s.body)}</p>` : "";
    const bullets = s.bullets?.length ? `<ul style="margin:0;padding-left:20px;line-height:1.5">${s.bullets.map((b) => `<li>${fill2(b)}</li>`).join("")}</ul>` : "";
    return `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc(s.heading)}</h2>` + body + bullets + `</section>`;
  }).join("");
  return `<h1 style="font-size:20px;margin:0 0 2px">${esc(template.title)}</h1><p style="color:#555;margin:0 0 14px;font-size:13px">Version ${esc(template.version)}</p>` + details + `<p style="margin:0 0 4px;line-height:1.5">${fill2(template.intro)}</p>` + sections + `<p style="margin:18px 0 0;padding:10px 12px;border:2px solid #7a9a2e;line-height:1.5;font-weight:bold">${fill2(
    template.acknowledgment
  )}</p><p style="color:#555;margin:10px 0 0;font-size:12px">${fill2(template.bookingRecord)}</p>`;
}
function renderStayAgreementHtml(data, template = DEFAULT_STAY_AGREEMENT_TEMPLATE) {
  return documentPage(
    template.title,
    bodyHtml(data, template) + awaitingSignatureHtml(template.signatureStatement)
  );
}
function renderSignedStayAgreementHtml(data, signature, template = DEFAULT_STAY_AGREEMENT_TEMPLATE) {
  return documentPage(
    template.title,
    bodyHtml(data, template) + signatureBlockHtml(signature, template.signatureStatement)
  );
}

// server/lib/gateToken.ts
import { customAlphabet as customAlphabet2 } from "nanoid";
var ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
var GATE_TOKEN_LENGTH = 24;
var gateTokenGen = customAlphabet2(ALPHABET, GATE_TOKEN_LENGTH);
var GATE_DOCS_DEADLINE_HOURS = 72;
var GATE_DOCS_DEADLINE_MS = GATE_DOCS_DEADLINE_HOURS * 60 * 60 * 1e3;

// server/lib/stayPortal.ts
function stayStage(gate) {
  if (gate.approvedAt) return "APPROVED";
  if (!guestDocsSubmitted(gate)) {
    return gate.fixRequestedAt || gate.verificationStatus === "REJECTED" ? "FIX_REQUESTED" : "AWAITING_DOCS";
  }
  return "AWAITING_APPROVAL";
}
async function resolveStay(token) {
  if (!token || token.length < GATE_TOKEN_LENGTH) throw new LeaseError("Invalid stay link", 404);
  const found = await storage.getBookingByGateToken(token);
  if (!found) throw new LeaseError("Stay link not found", 404);
  const [guest, property, room] = await Promise.all([
    storage.getGuest(found.guestId),
    storage.getProperty(found.propertyId),
    found.roomId ? storage.getRoom(found.roomId) : Promise.resolve(void 0)
  ]);
  if (!guest || !property) throw new LeaseError("Stay is missing its guest or property", 409);
  const { gate, ...booking } = found;
  return { booking, gate, guest, property, room: room ?? null };
}
async function getStayView(token) {
  const stay = await resolveStay(token);
  const stage = stayStage(stay.gate);
  const access = stage === "APPROVED" ? renderAccessInfoText(
    await resolveStayAccessInfo({
      gate: stay.gate,
      property: stay.property,
      room: stay.room
    })
  ) : null;
  return {
    reference: stay.booking.reference,
    stage,
    propertyName: stay.property.name,
    roomName: roomDisplayName(stay.room),
    checkIn: stay.booking.checkIn,
    checkOut: stay.booking.checkOut,
    nights: stay.booking.checkOut ? stayNights(stay.booking.checkIn, stay.booking.checkOut) : null,
    total: stay.booking.quotedTotal,
    guestName: stay.guest.name,
    outstanding: outstandingItems(stay.gate),
    licence: {
      status: stay.gate.verificationStatus,
      uploadedAt: stay.gate.licenseUploadedAt,
      // The guest sees WHY it was bounced; they never see the object key.
      rejectionReason: stay.gate.verificationRejectionReason
    },
    agreement: {
      signed: Boolean(stay.gate.agreementSignedAt),
      signedAt: stay.gate.agreementSignedAt,
      signedName: stay.gate.agreementSignedName,
      documentUrl: stay.gate.agreementSignedAt ? `/api/stay/${token}/agreement` : null
    },
    fixReason: stay.gate.fixRequestedReason,
    deadlineAt: stay.gate.docsDeadlineAt,
    houseRulesUrl: houseRulesUrl(),
    /** Rendered arrival block, or null until approved. */
    accessInfo: access
  };
}
async function agreementData(stay) {
  const info = await resolveStayAccessInfo({
    gate: stay.gate,
    property: stay.property,
    room: stay.room
  });
  return {
    guestName: stay.guest.name,
    propertyName: stay.property.name,
    propertyLocation: stay.property.address ?? "",
    roomLabel: roomDisplayName(stay.room) ?? "the whole property",
    checkIn: stay.booking.checkIn,
    checkOut: stay.booking.checkOut ?? stay.booking.checkIn,
    totalPaid: parseFloat(stay.booking.quotedTotal),
    houseRulesUrl: houseRulesUrl(),
    checkInFrom: info.checkInFrom ?? "",
    checkOutBy: info.checkOutBy ?? "",
    reference: stay.booking.reference
  };
}
async function previewStayAgreement(token) {
  const stay = await resolveStay(token);
  return renderStayAgreementHtml(await agreementData(stay));
}
async function getSignedStayAgreement(token) {
  const stay = await resolveStay(token);
  if (!stay.gate.agreementDocumentHtml) {
    throw new LeaseError("This agreement has not been signed yet.", 409);
  }
  return stay.gate.agreementDocumentHtml;
}
async function signStayAgreement(args) {
  const stay = await resolveStay(args.token);
  if (stay.gate.agreementSignedAt) {
    return {
      signedAt: stay.gate.agreementSignedAt,
      documentUrl: `/api/stay/${args.token}/agreement`
    };
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  if (!args.affirmed) {
    throw new LeaseError("You must confirm you agree to the terms before signing.", 400);
  }
  const name = args.signedName.trim();
  if (name.length < 2) throw new LeaseError("Enter your full legal name.", 400);
  const signedAt = args.now ?? /* @__PURE__ */ new Date();
  const html = renderSignedStayAgreementHtml(await agreementData(stay), {
    signedName: name,
    signedAt,
    signedIp: args.ip
  });
  const documentUrl = `/api/stay/${args.token}/agreement`;
  await storage.updateBookingGate(stay.booking.id, {
    agreementSignedName: name,
    agreementSignedAt: signedAt,
    agreementSignedIp: args.ip,
    agreementDocumentHtml: html,
    agreementDocumentUrl: documentUrl
  });
  log(`stay ${stay.booking.reference}: agreement signed`, "stay");
  await maybeAnnounceComplete(stay.booking.id);
  return { signedAt, documentUrl };
}
async function uploadStayLicense(token, file) {
  assertR2Configured();
  const stay = await resolveStay(token);
  const ext = validateUpload(file);
  if (stay.gate.approvedAt) {
    throw new LeaseError("This stay is already approved; no further ID is needed.", 409);
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  const key = `bnp/licenses/booking/${stay.booking.id}/${randomUUID()}.${ext}`;
  await uploadBuffer(key, file.buffer, file.mimetype);
  const priorKey = stay.gate.licenseR2Key;
  if (priorKey && priorKey !== key) {
    deleteObject(priorKey).catch(
      (err) => log(`could not delete prior stay licence ${priorKey}: ${err.message}`, "stay")
    );
  }
  const uploadedAt = /* @__PURE__ */ new Date();
  await storage.updateBookingGate(stay.booking.id, {
    licenseR2Key: key,
    licenseUploadedAt: uploadedAt,
    verificationStatus: "PENDING_REVIEW",
    verificationRejectionReason: null,
    verificationReviewedAt: null,
    verificationReviewedBy: null
  });
  log(`stay ${stay.booking.reference}: licence uploaded \u2192 PENDING_REVIEW`, "stay");
  await maybeAnnounceComplete(stay.booking.id);
  return { verificationStatus: "PENDING_REVIEW", uploadedAt };
}
async function maybeAnnounceComplete(bookingId) {
  const gate = await storage.getBookingGate(bookingId);
  if (!gate || !guestDocsSubmitted(gate)) return;
  const booking = await storage.getBooking(bookingId);
  if (!booking) return;
  const [guest, property, room] = await Promise.all([
    storage.getGuest(booking.guestId),
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(void 0)
  ]);
  if (!guest || !property) return;
  await onStayDocsComplete({ booking, gate, guest, property, room: room ?? null });
}
async function getStayLicenseViewUrl(bookingId) {
  const gate = await storage.getBookingGate(bookingId);
  if (!gate?.licenseR2Key) throw new LeaseError("No licence has been uploaded.", 404);
  return getPresignedDownloadUrl(gate.licenseR2Key);
}

// server/lib/stayApproval.ts
init_storage();

// shared/doorCode.ts
var DOOR_CODE_PATTERN = /^[0-9A-Za-z#*-]+$/;
var DOOR_CODE_MIN_LENGTH = 4;
var DOOR_CODE_MAX_LENGTH = 12;
function normalizeDoorCode(raw) {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : null;
}
function doorCodeError(raw) {
  const code = normalizeDoorCode(raw);
  if (!code) return "Enter the door code the guest will use.";
  if (code.length < DOOR_CODE_MIN_LENGTH) {
    return `Door code must be at least ${DOOR_CODE_MIN_LENGTH} characters.`;
  }
  if (code.length > DOOR_CODE_MAX_LENGTH) {
    return `Door code must be at most ${DOOR_CODE_MAX_LENGTH} characters.`;
  }
  if (!DOOR_CODE_PATTERN.test(code)) {
    return "Door code can contain only letters, numbers, #, * and -.";
  }
  return null;
}

// server/lib/stayApproval.ts
function isNameMismatch(a, b) {
  const x = (a ?? "").trim().toLowerCase();
  const y = (b ?? "").trim().toLowerCase();
  if (!x || !y) return false;
  return x !== y;
}
async function loadStay(bookingId) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);
  const gate = await storage.getBookingGate(bookingId);
  if (!gate) throw new LeaseError("This booking has no approval gate.", 409);
  const [guest, property, room] = await Promise.all([
    storage.getGuest(booking.guestId),
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(void 0)
  ]);
  if (!guest || !property) throw new LeaseError("Booking is missing its guest or property", 409);
  return { booking, gate, guest, property, room: room ?? null };
}
async function listPendingApprovals() {
  const stays = await storage.getBookingsWithGuest({ statuses: ["PENDING_APPROVAL"] });
  const rows = [];
  for (const stay of stays) {
    const gate = await storage.getBookingGate(stay.id);
    if (!gate) continue;
    if (outstandingItems(gate).length > 0) continue;
    const info = await resolveStayAccessInfo({ gate, property: stay.property, room: stay.room });
    rows.push({
      bookingId: stay.id,
      reference: stay.reference,
      propertyName: stay.property.name,
      roomName: roomDisplayName(stay.room),
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
      nights: stay.checkOut ? stayNights(stay.checkIn, stay.checkOut) : null,
      total: stay.quotedTotal,
      guestName: stay.guest.name,
      guestEmail: stay.guest.email,
      guestPhone: stay.guest.phone,
      signedName: gate.agreementSignedName,
      nameMismatch: isNameMismatch(gate.agreementSignedName, stay.guest.name),
      licenseUploadedAt: gate.licenseUploadedAt,
      agreementSignedAt: gate.agreementSignedAt,
      docsDeadlineAt: gate.docsDeadlineAt,
      fixRequestCount: gate.fixRequestCount,
      accessInfoMissing: missingAccessFields(info).filter((f) => f !== "doorCode")
    });
  }
  return rows.sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}
async function approveStay(args) {
  const stay = await loadStay(args.bookingId);
  const codeError = doorCodeError(args.doorCode);
  if (codeError) throw new LeaseError(codeError, 400);
  const doorCode = normalizeDoorCode(args.doorCode);
  if (args.nameMatches !== true) {
    throw new LeaseError(
      "Confirm the name on the licence matches the guest before approving.",
      400
    );
  }
  if (stay.gate.approvedAt && stay.booking.status === "ACTIVE") {
    await onStayApproved(stay);
    return { reference: stay.booking.reference, status: stay.booking.status };
  }
  if (outstandingItems(stay.gate).length > 0) {
    throw new LeaseError(
      "The guest has not submitted everything yet \u2014 nothing to approve.",
      409
    );
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  const info = await resolveStayAccessInfo({
    gate: { ...stay.gate, doorCode },
    property: stay.property,
    room: stay.room
  });
  const missing = missingAccessFields(info);
  if (missing.length > 0) {
    throw new LeaseError(
      `Set up the arrival details for ${stay.property.name} first \u2014 missing ${missing.join(", ")}.`,
      409
    );
  }
  const approvedAt = /* @__PURE__ */ new Date();
  await storage.updateBookingGate(stay.booking.id, {
    doorCode,
    nameMatchesAck: true,
    approvedAt,
    approvedBy: args.actor,
    verificationStatus: "APPROVED",
    verificationReviewedAt: approvedAt,
    verificationReviewedBy: args.actor,
    verificationRejectionReason: null,
    fixRequestedReason: null
  });
  const liveStatus = stay.booking.model === "COLIVING" ? "ACTIVE" : "CONFIRMED";
  await storage.updateBooking(stay.booking.id, { status: liveStatus });
  if (stay.booking.roomId) {
    await storage.updateRoom(stay.booking.roomId, { status: "OCCUPIED" });
  }
  const open = await storage.getEscalations({ bookingId: stay.booking.id, status: "OPEN" });
  for (const esc3 of open) {
    if (esc3.kind === "GATE_AWAITING_APPROVAL") {
      await storage.updateEscalation(esc3.id, { status: "RESOLVED", resolvedBy: args.actor });
    }
  }
  const fresh = await storage.getBookingGate(stay.booking.id);
  await onStayApproved({
    ...stay,
    booking: { ...stay.booking, status: liveStatus },
    gate: fresh ?? { ...stay.gate, doorCode, approvedAt }
  });
  log(`stay ${stay.booking.reference}: APPROVED by ${args.actor}`, "admin");
  return { reference: stay.booking.reference, status: liveStatus };
}
async function requestStayFix(args) {
  const stay = await loadStay(args.bookingId);
  const reason = args.reason?.trim() ?? "";
  if (reason.length < 5) {
    throw new LeaseError("Tell the guest what to fix (at least 5 characters).", 400);
  }
  if (stay.booking.status === "CANCELLED") {
    throw new LeaseError("This booking has been cancelled.", 409);
  }
  if (stay.gate.approvedAt) {
    throw new LeaseError("This stay is already approved.", 409);
  }
  const now = args.now ?? /* @__PURE__ */ new Date();
  const fixRequestCount = stay.gate.fixRequestCount + 1;
  const clearLicense = args.what === "LICENSE" || args.what === "BOTH";
  const clearAgreement = args.what === "AGREEMENT" || args.what === "BOTH";
  await storage.updateBookingGate(stay.booking.id, {
    fixRequestedAt: now,
    fixRequestedBy: args.actor,
    fixRequestedReason: reason,
    fixRequestCount,
    // Restart the clock: "silence" means since WE last asked.
    docsDeadlineAt: new Date(now.getTime() + GATE_DOCS_DEADLINE_MS),
    ...clearLicense ? {
      verificationStatus: "REJECTED",
      verificationRejectionReason: reason,
      verificationReviewedAt: now,
      verificationReviewedBy: args.actor
    } : {},
    ...clearAgreement ? {
      agreementSignedAt: null,
      agreementSignedName: null,
      agreementSignedIp: null,
      agreementDocumentHtml: null,
      agreementDocumentUrl: null
    } : {}
  });
  const fresh = await storage.getBookingGate(stay.booking.id);
  await onStayFixRequested({ ...stay, gate: fresh ?? stay.gate }, reason);
  log(
    `stay ${stay.booking.reference}: fix requested (${args.what}) by ${args.actor} \u2014 round ${fixRequestCount}`,
    "admin"
  );
  return { reference: stay.booking.reference, fixRequestCount };
}

// server/lib/bookingGateDecline.ts
init_storage();

// server/lib/bookingConflicts.ts
init_storage();

// server/lib/stripe.ts
import Stripe from "stripe";

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
function buildRoomBookingChargeMetadata(args) {
  return {
    entity: str(args.entity),
    product_type: "COLIVING_ROOM",
    property_id: str(args.property.id),
    property_name: str(args.property.name),
    room_id: str(args.room.id),
    room_name: str(args.room.name),
    room_number: str(args.room.roomNumber),
    lease_id: NULL,
    payment_kind: args.paymentKind,
    schedule_seq: NULL,
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
function buildShortStayIntentMetadata(args) {
  const base = args.model === "COLIVING" && args.room ? buildRoomBookingChargeMetadata({
    entity: args.entity,
    property: args.property,
    room: args.room,
    paymentKind: "BOOKING_DEPOSIT",
    rateCadence: args.rateCadence ?? "WEEKLY"
  }) : buildStrChargeMetadata({
    entity: args.entity,
    property: args.property,
    paymentKind: "BOOKING_DEPOSIT",
    rateCadence: args.rateCadence ?? null
  });
  return {
    ...base,
    // Booking-rebuild fields (read back by the webhook). property_id/room_id/
    // reference already live in `base` / are added at PI-create time.
    model: args.model,
    check_in: str(args.checkIn),
    check_out: str(args.checkOut),
    reference: str(args.reference),
    quoted_total: str(args.quotedTotal),
    amount: str(args.amount),
    surcharge: str(args.surcharge),
    guest_name: str(args.guest?.name),
    guest_email: str(args.guest?.email),
    guest_phone: str(args.guest?.phone)
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
var REQUIRED_REFUND_METADATA_KEYS = [
  ...REQUIRED_METADATA_KEYS,
  "refund_kind",
  "refunded_payment_intent",
  "refunded_payment_id",
  "booking_reference",
  "actor"
];
function buildRefundMetadata(args) {
  return {
    ...args.base,
    refund_kind: args.kind,
    refunded_payment_intent: str(args.paymentIntentId),
    refunded_payment_id: str(args.paymentId),
    booking_reference: str(args.reference),
    actor: str(args.actor),
    refund_reason: str(args.reason)
  };
}
function assertCompleteRefundMetadata(meta) {
  const missing = REQUIRED_REFUND_METADATA_KEYS.filter(
    (k) => meta[k] === void 0 || meta[k] === ""
  );
  if (missing.length > 0) {
    throw new Error(
      `Stripe refund metadata contract incomplete \u2014 missing/empty: ${missing.join(", ")}`
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
async function createOneTimePaymentIntent(opts) {
  const s = requireStripe();
  assertCompleteMetadata(opts.metadata);
  return s.paymentIntents.create(
    {
      amount: toCents(opts.amount),
      currency: "usd",
      // Only set receipt_email when we actually have one — in the payment-first
      // flow the intent is created before contact, and Stripe rejects an empty
      // string. It's set later via updatePaymentIntentContact.
      ...opts.guestEmail ? { receipt_email: opts.guestEmail } : {},
      automatic_payment_methods: { enabled: true },
      // Carry the booking reference alongside the contract for webhook correlation.
      metadata: { ...opts.metadata, reference: opts.reference }
    },
    { idempotencyKey: opts.idempotencyKey }
  );
}
async function updatePaymentIntentContact(opts) {
  const s = requireStripe();
  return s.paymentIntents.update(opts.paymentIntentId, {
    receipt_email: opts.email,
    metadata: {
      guest_name: opts.name,
      guest_email: opts.email,
      guest_phone: opts.phone && opts.phone !== "" ? opts.phone : "null"
    }
  });
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
    {
      payment_intent: opts.paymentIntentId,
      ...opts.metadata ? { metadata: opts.metadata } : {},
      ...opts.reason ? { reason: opts.reason } : {}
    },
    { idempotencyKey: opts.idempotencyKey }
  );
}
var stripePublishableConfigured = () => Boolean(process.env.VITE_STRIPE_PUBLIC_KEY?.startsWith("pk_"));

// server/lib/lifecycle.ts
init_storage();
init_schema();
init_dates();
var CONFLICT_ADMIN_NOTE = (status) => status === "CONFLICT" ? "\n\nDATES WERE ALREADY TAKEN. Booking saved as CONFLICT (paid, not blocking). Resolve in the admin console: confirm, or cancel + refund." : "";
var LIFECYCLE_TEMPLATES = {
  welcome: (v) => ({
    subject: `Welcome to ${v.property} \u{1F389}`,
    body: `Hi ${v.name}, welcome! Your lease at ${v.property} is active and your move-in date is ${v.start}. We're glad to have you.

Your guest portal \u2014 payment schedule, signed lease, every rent payment, and maintenance requests \u2014 is here: ${v.portalUrl}

Save that link. It is how you pay and how you reach us.`,
    smsBody: `BNP: welcome! Your lease is active (move-in ${v.start}). Save your portal link: ${v.portalUrl}`
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
    body: `Hi ${v.name}, we received your rent payment of ${v.amount} (installment #${v.seq}) for ${v.property}. Thank you!

Your receipt and full payment schedule: ${v.portalUrl}`,
    smsBody: `BNP: payment of ${v.amount} received (installment #${v.seq}). Thanks! ${v.portalUrl}`
  }),
  depositReceipt: (v) => ({
    subject: `Your room is secured \u2014 ${v.property} \u{1F512}`,
    body: `Hi ${v.name}, we received your refundable security deposit of ${v.amount} \u2014 your room (${v.room}) at ${v.property} is now secured and held for you. The deposit is returned at the end of your lease per the agreement.

One last step to activate your lease: upload a photo of your driver's license from your portal so we can verify your identity. Once we approve it, your lease goes active and your first rent payment is charged. Upload here: ${v.portalUrl}`
  }),
  // --- Short-stay bookings (no lease: STR nightly, or a 7–28-night co-living stay) ---
  bookingConfirmed: (v) => ({
    subject: `You're booked \u2014 ${v.property}${v.room ? `, ${v.room}` : ""} (${v.reference})`,
    body: `Hi ${v.name}, your stay at ${v.property}${v.room ? ` (${v.room})` : ""} is confirmed for ${v.checkIn} to ${v.checkOut}. Reference ${v.reference}, paid ${v.total}. Check-in details arrive the day before arrival. View your booking anytime: ${v.lookupUrl}`
  }),
  adminNewBooking: (v) => ({
    subject: `${v.status === "CONFLICT" ? "\u26A0\uFE0F CONFLICT \u2014 " : ""}New booking \u2014 ${v.property}${v.room ? ` ${v.room}` : ""} ${v.checkIn}\u2192${v.checkOut}`,
    body: `${v.guest} (${v.email}${v.phone ? `, ${v.phone}` : ""}) \xB7 ${v.reference} \xB7 ${v.total}${CONFLICT_ADMIN_NOTE(v.status)}`,
    // Telegram is a third party: guest NAME + listing + dates + reference +
    // amount only. Contact details stay in the admin EMAIL body above.
    telegramText: `${v.guest} \xB7 ${v.property}${v.room ? ` ${v.room}` : ""} \xB7 ${v.checkIn}\u2192${v.checkOut} \xB7 ${v.reference} \xB7 ${v.total}${CONFLICT_ADMIN_NOTE(v.status)}`
  }),
  leaseEnding: (v) => ({
    subject: `Your lease ends in ${v.days} days`,
    body: `Hi ${v.name}, your lease at ${v.property} ends on ${v.end} (${v.days} days away). If you'd like to renew or extend, reply or reach out through your portal: ${v.portalUrl}. We'd love to have you stay.`
  })
};
async function onLeaseActivated(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) return;
  const [property, guest, schedule] = await Promise.all([
    storage.getProperty(lease.propertyId),
    storage.getGuest(lease.guestId),
    storage.getScheduleByLease(lease.id)
  ]);
  if (!property || !guest) return;
  if (!await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_WELCOME", null)) {
    const tpl = LIFECYCLE_TEMPLATES.welcome({
      name: guest.name,
      property: property.name,
      start: lease.startDate,
      portalUrl: portalUrl(lease)
    });
    const sent = await notifyGuest({
      email: guest.email,
      phone: guest.phone,
      subject: tpl.subject,
      body: tpl.body,
      smsBody: tpl.smsBody,
      context: { leaseId: lease.id, guestId: guest.id, kind: "COLIVING_WELCOME" }
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_WELCOME",
      scheduleSeq: null,
      status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
  }
  if (!await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_SCHEDULE_RECAP", null)) {
    const rows = schedule.map((s) => `  #${s.scheduleSeq}  ${s.dueDate}  ${fmtMoney(parseFloat(s.amount))}`).join("\n");
    const tpl = LIFECYCLE_TEMPLATES.scheduleRecap({
      name: guest.name,
      total: fmtMoney(parseFloat(lease.totalLeaseValue)),
      rows,
      portalUrl: portalUrl(lease)
    });
    const sent = await notifyGuest({
      email: guest.email,
      phone: guest.phone,
      subject: tpl.subject,
      body: tpl.body,
      context: { leaseId: lease.id, guestId: guest.id, kind: "COLIVING_SCHEDULE_RECAP" }
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_SCHEDULE_RECAP",
      scheduleSeq: null,
      status: sent.email.sent ? "SENT" : "SKIPPED",
      emailSent: sent.email.sent,
      smsSent: sent.sms.sent
    });
  }
  if (!await storage.hasLifecycleEvent({ leaseId: lease.id }, "COLIVING_ADMIN_NEW_LEASE", null)) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewLease({
      property: property.name,
      guest: guest.name,
      start: lease.startDate,
      end: lease.endDate,
      total: fmtMoney(parseFloat(lease.totalLeaseValue))
    });
    const res = await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
      context: { leaseId: lease.id, guestId: guest.id, kind: "LEASE_ACTIVATED" }
    });
    await storage.recordLifecycleEvent({
      leaseId: lease.id,
      eventType: "COLIVING_ADMIN_NEW_LEASE",
      scheduleSeq: null,
      status: res.email.sent || res.telegram.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
      smsSent: false
    });
  }
  log(`lifecycle: activation emails processed for lease ${lease.id}`, "lifecycle");
}
async function onPaymentReceived(args) {
  const { lease, property, guest, scheduleRow } = args;
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "PAYMENT_RECEIPT", scheduleRow.scheduleSeq)) return;
  const tpl = LIFECYCLE_TEMPLATES.paymentReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(scheduleRow.amount)),
    seq: scheduleRow.scheduleSeq,
    property: property.name,
    portalUrl: portalUrl(lease)
  });
  const sent = await notifyGuest({
    email: guest.email,
    phone: guest.phone,
    subject: tpl.subject,
    body: tpl.body,
    smsBody: tpl.smsBody,
    context: { leaseId: lease.id, guestId: guest.id, kind: "PAYMENT_RECEIPT" }
  });
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
  if (await storage.hasLifecycleEvent({ leaseId: lease.id }, "DEPOSIT_RECEIPT", null)) return;
  const rooms2 = await storage.getLeaseRooms(lease.id);
  const roomNames = rooms2.map((r) => r.roomNameSnapshot).join(", ") || "your room";
  const tpl = LIFECYCLE_TEMPLATES.depositReceipt({
    name: guest.name,
    amount: fmtMoney(parseFloat(lease.depositAmountSnapshot ?? "0")),
    property: property.name,
    room: roomNames,
    portalUrl: portalUrl(lease)
  });
  const sent = await notifyGuest({
    email: guest.email,
    phone: guest.phone,
    subject: tpl.subject,
    body: tpl.body,
    context: { leaseId: lease.id, guestId: guest.id, kind: "DEPOSIT_RECEIPT" }
  });
  await storage.recordLifecycleEvent({
    leaseId: lease.id,
    eventType: "DEPOSIT_RECEIPT",
    scheduleSeq: null,
    status: sent.email.sent ? "SENT" : "SKIPPED",
    emailSent: sent.email.sent,
    smsSent: sent.sms.sent
  });
}
function bookingLookupUrl() {
  return lookupUrl();
}
async function onBookingConfirmed(args) {
  const { booking, property, room, guest } = args;
  const isConflict = booking.status === "CONFLICT";
  const roomLabel = roomDisplayName(room);
  const total = fmtMoney(parseFloat(booking.quotedTotal));
  if (!isConflict && !await storage.hasLifecycleEvent({ bookingId: booking.id }, "BOOKING_CONFIRMED", null)) {
    const autoSetting = await storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING);
    const guestSendsOn = autoSetting?.value !== "false";
    if (guestSendsOn) {
      const tpl = LIFECYCLE_TEMPLATES.bookingConfirmed({
        name: guest.name,
        property: property.name,
        room: roomLabel,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut ?? "",
        reference: booking.reference,
        total,
        lookupUrl: bookingLookupUrl()
      });
      const sent = await notifyGuest({
        email: guest.email,
        phone: guest.phone,
        subject: tpl.subject,
        body: tpl.body,
        context: { bookingId: booking.id, guestId: guest.id, kind: "BOOKING_CONFIRMED" }
      });
      await storage.recordLifecycleEvent({
        bookingId: booking.id,
        leaseId: null,
        eventType: "BOOKING_CONFIRMED",
        scheduleSeq: null,
        status: sent.email.sent || sent.sms.sent ? "SENT" : "SKIPPED",
        emailSent: sent.email.sent,
        smsSent: sent.sms.sent
      });
    } else {
      await storage.recordLifecycleEvent({
        bookingId: booking.id,
        leaseId: null,
        eventType: "BOOKING_CONFIRMED",
        scheduleSeq: null,
        status: "SKIPPED",
        emailSent: false,
        smsSent: false
      });
    }
  }
  if (!await storage.hasLifecycleEvent({ bookingId: booking.id }, "ADMIN_NEW_BOOKING", null)) {
    const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
      property: property.name,
      room: roomLabel,
      guest: guest.name,
      email: guest.email,
      phone: guest.phone ?? "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut ?? "",
      reference: booking.reference,
      total,
      status: booking.status
    });
    const res = await notifyAdmin({
      subject: tpl.subject,
      body: tpl.body,
      telegramText: tpl.telegramText,
      context: {
        bookingId: booking.id,
        guestId: guest.id,
        kind: isConflict ? "BOOKING_CONFLICT" : "ADMIN_NEW_BOOKING"
      }
    });
    await storage.recordLifecycleEvent({
      bookingId: booking.id,
      leaseId: null,
      eventType: "ADMIN_NEW_BOOKING",
      scheduleSeq: null,
      status: res.email.sent || res.telegram.sent ? "SENT" : "SKIPPED",
      emailSent: res.email.sent,
      smsSent: false
    });
  }
  log(`lifecycle: booking ${booking.reference} (${booking.status}) notifications processed`, "lifecycle");
}

// server/lib/bookingConflicts.ts
init_dates();
var PG_EXCLUSION_VIOLATION = "23P01";
async function resolveConflictEscalations(bookingId, actor) {
  const open = await storage.getEscalations({ status: "OPEN", bookingId });
  const mine = open.filter((e) => e.kind === "BOOKING_CONFLICT");
  for (const esc3 of mine) {
    await storage.updateEscalation(esc3.id, {
      status: "RESOLVED",
      resolvedAt: /* @__PURE__ */ new Date(),
      resolvedBy: actor
    });
  }
  return mine.length;
}
async function confirmConflictBooking(bookingId, actor) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);
  if (booking.status !== "CONFLICT") {
    throw new BookingError(
      `Only a CONFLICT booking can be confirmed here (this one is ${booking.status})`,
      409
    );
  }
  if (booking.model === "COLIVING") {
    if (!booking.roomId || !booking.checkOut) {
      throw new BookingError("Co-living booking is missing a room or check-out date", 409);
    }
    const free = await storage.isRoomAvailableForRange({
      roomId: booking.roomId,
      startDate: booking.checkIn,
      endDate: booking.checkOut,
      endExclusive: true,
      excludeBookingId: booking.id
    });
    if (!free) {
      throw new BookingError("Those dates are still taken for this room \u2014 cannot confirm", 409);
    }
  } else {
    if (!booking.checkOut) throw new BookingError("Booking is missing a check-out date", 409);
    const taken = await strHasConflict(
      booking.propertyId,
      booking.checkIn,
      booking.checkOut,
      booking.id
    );
    if (taken) {
      throw new BookingError("Those dates are still taken for this property \u2014 cannot confirm", 409);
    }
  }
  const status = postPaymentStatusFor(booking);
  let updated;
  try {
    updated = await storage.updateBooking(booking.id, { status }) ?? { ...booking, status };
  } catch (err) {
    if (err.code === PG_EXCLUSION_VIOLATION) {
      log(
        `booking ${booking.reference} (${booking.id}) confirm rejected by exclusion constraint`,
        "admin"
      );
      throw new BookingError("Those dates were just taken \u2014 cannot confirm", 409);
    }
    throw err;
  }
  if (booking.roomId) await storage.updateRoom(booking.roomId, { status: "OCCUPIED" });
  await resolveConflictEscalations(booking.id, actor);
  const [property, room, guest] = await Promise.all([
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(void 0),
    storage.getGuest(booking.guestId)
  ]);
  if (property && guest) {
    await onBookingConfirmed({ booking: updated, property, room: room ?? null, guest });
  }
  log(`booking ${booking.reference} (${booking.id}) confirmed out of CONFLICT by ${actor}`, "admin");
  return updated;
}
async function cancelBooking(args) {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new BookingError("Booking not found", 404);
  const alreadyCancelled = booking.status === "CANCELLED";
  if (alreadyCancelled && args.refund !== true) {
    return {
      reference: booking.reference,
      alreadyCancelled: true,
      roomFreed: false,
      refunded: false,
      refundIds: [],
      alreadyRefunded: []
    };
  }
  if (!alreadyCancelled) await storage.updateBooking(booking.id, { status: "CANCELLED" });
  let roomFreed = false;
  if (booking.roomId && !alreadyCancelled) {
    const occupiedToday = await storage.getOccupiedRoomIdsOn(todayIso());
    if (!occupiedToday.has(booking.roomId)) {
      const room = await storage.getRoom(booking.roomId);
      if (room && room.status === "OCCUPIED") {
        await storage.updateRoom(booking.roomId, { status: "AVAILABLE" });
        roomFreed = true;
      }
    } else {
      log(
        `booking ${booking.reference} cancelled but room ${booking.roomId} is still covered today \u2014 left OCCUPIED`,
        "admin"
      );
    }
  }
  const refundIds = [];
  const alreadyRefunded = [];
  if (args.refund === true) {
    const payments2 = await storage.getPaymentsByBooking(booking.id);
    for (const p of payments2) {
      if (p.method !== "STRIPE" || p.status !== "PAID" || !p.stripeRef) continue;
      try {
        const refund = await refundPaymentIntent({
          paymentIntentId: p.stripeRef,
          // Stable key: a retry WITHIN 24 HOURS returns the same refund instead of
          // a second one. Stripe expires idempotency keys after that, so the key
          // is only the first line of defence — see the catch below.
          idempotencyKey: `refund:${p.stripeRef}`
        });
        refundIds.push(refund.id);
        log(
          `booking ${booking.reference}: refunded payment ${p.id} (PI ${p.stripeRef}) \u2192 ${refund.id} by ${args.actor}`,
          "admin"
        );
      } catch (err) {
        if (err.code === "charge_already_refunded") {
          alreadyRefunded.push(p.stripeRef);
          log(
            `booking ${booking.reference}: PI ${p.stripeRef} was already refunded \u2014 treating as done`,
            "admin"
          );
          continue;
        }
        throw err;
      }
    }
    if (refundIds.length === 0 && alreadyRefunded.length === 0) {
      log(
        `booking ${booking.reference}: refund requested but no PAID Stripe payment to refund (manual payments settle off-band)`,
        "admin"
      );
    }
  }
  await resolveConflictEscalations(booking.id, args.actor);
  log(`booking ${booking.reference} (${booking.id}) CANCELLED by ${args.actor}`, "admin");
  return {
    reference: booking.reference,
    alreadyCancelled,
    roomFreed,
    refunded: refundIds.length > 0 || alreadyRefunded.length > 0,
    refundIds,
    alreadyRefunded
  };
}

// server/lib/bookingGateDecline.ts
var CHARGE_ALREADY_REFUNDED = "charge_already_refunded";
var AMOUNT_TOLERANCE = 5e-3;
function refundableTotal(payments2) {
  return payments2.filter((p) => p.method === "STRIPE" && p.status === "PAID" && p.stripeRef).reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge ?? "0"), 0);
}
async function declineAndRefundBooking(args) {
  const booking = await storage.getBooking(args.bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);
  if (args.confirm !== booking.reference) {
    throw new LeaseError(
      "Confirmation did not match the booking reference \u2014 nothing was changed.",
      400
    );
  }
  if (!args.reason || args.reason.trim().length < 5) {
    throw new LeaseError("A reason of at least 5 characters is required to decline.", 400);
  }
  const payments2 = await storage.getPaymentsByBooking(booking.id);
  const refundable = payments2.filter(
    (p) => p.method === "STRIPE" && p.status === "PAID" && p.stripeRef
  );
  if (refundable.length === 0) {
    throw new LeaseError(
      "No settled card payment found for this booking \u2014 resolve it by hand rather than declining.",
      409
    );
  }
  const total = refundableTotal(payments2);
  if (args.expectedRefundAmount !== void 0 && Math.abs(args.expectedRefundAmount - total) > AMOUNT_TOLERANCE) {
    throw new LeaseError(
      `Refund amount has changed (expected ${fmtMoney(args.expectedRefundAmount)}, now ${fmtMoney(total)}) \u2014 reload and try again.`,
      409
    );
  }
  const [property, room, guest] = await Promise.all([
    storage.getProperty(booking.propertyId),
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(void 0),
    storage.getGuest(booking.guestId)
  ]);
  if (!property || !guest) throw new LeaseError("Booking is missing its property or guest", 409);
  const cancelled = await cancelBooking({
    bookingId: booking.id,
    actor: args.actor,
    refund: false
  });
  const baseMetadata = room ? buildRoomBookingChargeMetadata({
    entity: property.entity,
    property,
    room,
    paymentKind: "BOOKING_DEPOSIT"
  }) : buildStrChargeMetadata({
    entity: property.entity,
    property,
    paymentKind: "BOOKING_DEPOSIT"
  });
  const result = {
    reference: booking.reference,
    refunded: [],
    failed: [],
    totalRefunded: 0,
    datesReleased: true,
    roomFreed: cancelled.roomFreed
  };
  for (const payment of refundable) {
    const amount = parseFloat(payment.amount) + parseFloat(payment.surcharge ?? "0");
    const metadata = buildRefundMetadata({
      base: baseMetadata,
      kind: args.kind,
      paymentIntentId: payment.stripeRef,
      paymentId: payment.id,
      reference: booking.reference,
      actor: args.actor,
      // Truncated and stripped of newlines: this reaches Stripe, and a reason is
      // operator free-text. It must never carry contact details or an access code.
      reason: args.reason.replace(/\s+/g, " ").slice(0, 400)
    });
    assertCompleteRefundMetadata(metadata);
    try {
      const refund = await refundPaymentIntent({
        paymentIntentId: payment.stripeRef,
        idempotencyKey: `refund:${payment.stripeRef}`,
        metadata,
        reason: "requested_by_customer"
      });
      await storage.recordPaymentRefund({
        paymentId: payment.id,
        bookingId: booking.id,
        leaseId: null,
        stripeRefundId: refund.id,
        stripePaymentIntentId: payment.stripeRef,
        amount: amount.toFixed(2),
        kind: args.kind,
        reason: args.reason.slice(0, 400),
        actor: args.actor
      });
      await storage.updatePayment(payment.id, { status: "REFUNDED" });
      result.refunded.push({ paymentId: payment.id, stripeRefundId: refund.id, amount: amount.toFixed(2) });
      result.totalRefunded += amount;
      log(
        `stay ${booking.reference}: refunded ${payment.id} (PI ${payment.stripeRef}) \u2192 ${refund.id} by ${args.actor}`,
        "admin"
      );
    } catch (err) {
      if (err.code === CHARGE_ALREADY_REFUNDED) {
        await storage.updatePayment(payment.id, { status: "REFUNDED" });
        result.refunded.push({ paymentId: payment.id, stripeRefundId: null, amount: amount.toFixed(2) });
        result.totalRefunded += amount;
        log(
          `stay ${booking.reference}: PI ${payment.stripeRef} was already refunded \u2014 treated as done`,
          "admin"
        );
        continue;
      }
      result.failed.push({
        paymentId: payment.id,
        stripePaymentIntentId: payment.stripeRef,
        error: err.message
      });
      log(
        `stay ${booking.reference}: REFUND FAILED for ${payment.id} (PI ${payment.stripeRef}): ${err.message}`,
        "admin"
      );
    }
  }
  if (result.failed.length > 0) {
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "REFUND_FAILED",
      severity: "HIGH",
      detail: `Booking ${booking.reference} was cancelled but ${result.failed.length} refund(s) FAILED: ` + result.failed.map((f) => `${f.stripePaymentIntentId} (${f.error})`).join("; ") + `. The dates are released. Refund by hand in Stripe, then re-run the decline.`
    });
    const alert = `Booking ${booking.reference} at ${property.name} was cancelled, but ${result.failed.length} refund(s) FAILED. The guest's money has NOT been returned and the dates are back on sale. Refund in Stripe by hand: ` + result.failed.map((f) => f.stripePaymentIntentId).join(", ");
    await notifyAdmin({
      subject: `REFUND FAILED - ${booking.reference} cancelled but not refunded`,
      body: alert,
      telegramText: alert,
      context: { bookingId: booking.id, guestId: guest.id, kind: "REFUND_FAILED" }
    });
  }
  if (result.refunded.length > 0) {
    await onStayDeclined(
      {
        booking: { ...booking, status: "CANCELLED" },
        gate: await storage.getBookingGate(booking.id).then((g) => g ?? null),
        guest,
        property,
        room: room ?? null
      },
      {
        reason: args.kind === "GATE_AUTO_DECLINE" ? null : args.reason,
        refundAmount: result.totalRefunded,
        auto: args.kind === "GATE_AUTO_DECLINE"
      }
    );
  }
  await storage.updateBookingGate(booking.id, {
    cancelReason: args.reason.slice(0, 1e3),
    cancelledBy: args.actor
  });
  log(
    `stay ${booking.reference}: declined by ${args.actor} \u2014 ${result.refunded.length} refunded, ${result.failed.length} failed`,
    "admin"
  );
  return result;
}

// server/lib/stayExtension.ts
init_storage();
init_rateSelection();

// server/lib/pricingSettings.ts
init_storage();
init_schema();
import { z as z3 } from "zod";
var pricingSettingsInputSchema = z3.object({
  lateFeePerDay: z3.number().min(0, "lateFeePerDay must be 0\u2013500").max(500, "lateFeePerDay must be 0\u2013500").optional(),
  cardSurchargeRate: z3.number().min(0, "cardSurchargeRate must be 0\u20130.10").max(0.1, "cardSurchargeRate must be 0\u20130.10").optional()
}).refine((v) => v.lateFeePerDay !== void 0 || v.cardSurchargeRate !== void 0, {
  message: "Provide lateFeePerDay and/or cardSurchargeRate"
});
async function getLateFeePerDay() {
  return storage.getSettingNumber(LATE_FEE_PER_DAY_SETTING, DEFAULT_LATE_FEE_PER_DAY);
}
async function getCardSurchargeRate() {
  return storage.getSettingNumber(CARD_SURCHARGE_RATE_SETTING, DEFAULT_CREDIT_CARD_RATE);
}
async function getPricingSettings() {
  const [lateFeePerDay, cardSurchargeRate] = await Promise.all([getLateFeePerDay(), getCardSurchargeRate()]);
  return { lateFeePerDay, cardSurchargeRate };
}
async function updatePricingSettings(input, actor) {
  if (!actor || !actor.trim()) throw new LeaseError("actor is required", 400);
  const parsed = pricingSettingsInputSchema.safeParse(input);
  if (!parsed.success) throw new LeaseError(parsed.error.errors[0]?.message ?? "Invalid pricing settings", 400);
  if (parsed.data.lateFeePerDay !== void 0) {
    await storage.setSetting(LATE_FEE_PER_DAY_SETTING, String(parsed.data.lateFeePerDay));
  }
  if (parsed.data.cardSurchargeRate !== void 0) {
    await storage.setSetting(CARD_SURCHARGE_RATE_SETTING, String(parsed.data.cardSurchargeRate));
  }
  log(`pricing settings updated by ${actor}: ${Object.keys(parsed.data).join(", ")}`, "uo");
  return getPricingSettings();
}
function leaseLateFeePerDay(lease, fallback) {
  const snap = lease.lateFeePerDaySnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}
function leaseCardSurchargeRate(lease, fallback) {
  const snap = lease.cardSurchargeRateSnapshot;
  return snap != null && snap !== "" ? parseFloat(snap) : fallback;
}

// server/lib/stayExtension.ts
init_dates();
var PG_EXCLUSION_VIOLATION2 = "23P01";
var MAX_EXTENSION_NIGHTS = 14;
function roomRates(room) {
  return {
    daily: room.dailyRate,
    weekly: room.weeklyRent,
    biweekly: room.biweeklyRate,
    monthly: room.monthlyRate
  };
}
async function alreadyPaidTotal(bookingId) {
  const payments2 = await storage.getPaymentsByBooking(bookingId);
  return payments2.filter((p) => p.status === "PAID").reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge ?? "0"), 0);
}
async function loadExtendable(bookingId) {
  const booking = await storage.getBooking(bookingId);
  if (!booking) throw new LeaseError("Booking not found", 404);
  if (!booking.checkOut) {
    throw new LeaseError("An open-ended stay cannot be extended.", 409);
  }
  if (!booking.roomId) {
    throw new LeaseError("Only a room booking can be extended here.", 409);
  }
  if (!["PENDING_APPROVAL", "ACTIVE", "CONFIRMED"].includes(booking.status)) {
    throw new LeaseError("This booking is not live, so it cannot be extended.", 409);
  }
  const [room, property, guest, gate] = await Promise.all([
    storage.getRoom(booking.roomId),
    storage.getProperty(booking.propertyId),
    storage.getGuest(booking.guestId),
    storage.getBookingGate(booking.id)
  ]);
  if (!room || !property || !guest) {
    throw new LeaseError("Booking is missing its room, property or guest", 409);
  }
  return { booking, room, property, guest, gate: gate ?? null };
}
async function quoteExtension(args) {
  const { booking, room } = await loadExtendable(args.bookingId);
  const fromCheckOut = booking.checkOut;
  if (args.newCheckOut <= fromCheckOut) {
    throw new LeaseError("Pick a date after your current checkout.", 400);
  }
  const currentNights = stayNights(booking.checkIn, fromCheckOut);
  const newNights = stayNights(booking.checkIn, args.newCheckOut);
  let priced;
  try {
    priced = cascadeStayPrice({ days: newNights, rates: roomRates(room), topTier: "MONTHLY" });
  } catch (err) {
    if (err instanceof RateError) throw new LeaseError(err.message, 422);
    throw err;
  }
  const cleaningFee = room.cleaningFee ? parseFloat(room.cleaningFee) : 0;
  const newStayTotal = priced.total + cleaningFee;
  const alreadyPaid = await alreadyPaidTotal(booking.id);
  const delta = Math.round((newStayTotal - alreadyPaid) * 100) / 100;
  if (delta <= 0) {
    throw new LeaseError(
      `Extending to ${newNights} nights re-prices this stay at or below what has already been paid. This needs a person \u2014 please get in touch and we will sort it out.`,
      409
    );
  }
  const breakdown = calculateBreakdown({
    baseAmount: delta,
    cleaningFee: 0,
    // already inside newStayTotal
    paymentMethod: "STRIPE",
    surchargeRate: await getCardSurchargeRate()
  });
  return {
    reference: booking.reference,
    fromCheckOut,
    toCheckOut: args.newCheckOut,
    currentNights,
    newNights,
    addedNights: newNights - currentNights,
    alreadyPaid,
    newStayTotal,
    delta,
    surcharge: breakdown.surcharge,
    dueNow: breakdown.total
  };
}
async function extensionOptions(bookingId) {
  const { booking } = await loadExtendable(bookingId);
  const from = booking.checkOut;
  const options = [];
  let maxNewCheckOut = null;
  for (let n = 1; n <= MAX_EXTENSION_NIGHTS; n += 1) {
    const candidate = addDaysIso(from, n);
    const free = await storage.isRoomAvailableForRange({
      roomId: booking.roomId,
      startDate: from,
      endDate: candidate,
      endExclusive: true,
      excludeBookingId: booking.id
    });
    if (!free) break;
    maxNewCheckOut = candidate;
    if ([1, 2, 3, 7, 14].includes(n)) {
      try {
        const quote = await quoteExtension({ bookingId, newCheckOut: candidate });
        options.push({ newCheckOut: candidate, addedNights: n, dueNow: quote.dueNow });
      } catch {
      }
    }
  }
  return { maxNewCheckOut, options };
}
async function startExtension(args) {
  const { booking, room, property, guest } = await loadExtendable(args.bookingId);
  const quote = await quoteExtension(args);
  const free = await storage.isRoomAvailableForRange({
    roomId: booking.roomId,
    startDate: booking.checkOut,
    endDate: args.newCheckOut,
    endExclusive: true,
    excludeBookingId: booking.id
  });
  if (!free) {
    throw new LeaseError("Those extra nights have just been taken \u2014 pick a shorter extension.", 409);
  }
  const metadata = {
    ...buildRoomBookingChargeMetadata({
      entity: property.entity,
      property,
      room,
      paymentKind: "BOOKING_DEPOSIT"
    }),
    // Everything the webhook needs to apply the extension without re-quoting.
    extension_from: booking.checkOut,
    extension_to: args.newCheckOut,
    extension_booking_id: booking.id,
    amount: quote.delta.toFixed(2),
    surcharge: quote.surcharge.toFixed(2)
  };
  const intent = await createOneTimePaymentIntent({
    amount: quote.dueNow,
    guestEmail: guest.email,
    reference: booking.reference,
    metadata,
    idempotencyKey: `extend:${booking.id}:${args.newCheckOut}`
  });
  log(
    `stay ${booking.reference}: extension intent ${intent.id} for ${booking.checkOut} \u2192 ${args.newCheckOut}`,
    "stay"
  );
  return { clientSecret: intent.client_secret, paymentIntentId: intent.id, quote };
}
async function applyExtension(pi) {
  const m = pi.metadata ?? {};
  const bookingId = m.extension_booking_id;
  const newCheckOut = m.extension_to;
  if (!bookingId || !newCheckOut) {
    log(`extension PI ${pi.id} has no booking/target metadata \u2014 cannot apply`, "stripe");
    return { applied: false, conflicted: false };
  }
  const booking = await storage.getBooking(bookingId);
  if (!booking) {
    log(`extension PI ${pi.id}: booking ${bookingId} not found`, "stripe");
    return { applied: false, conflicted: false };
  }
  if (booking.checkOut && booking.checkOut >= newCheckOut) {
    log(`extension PI ${pi.id}: ${booking.reference} already extended to ${booking.checkOut}`, "stripe");
    return { applied: true, conflicted: false };
  }
  const previousCheckOut = booking.checkOut ?? booking.checkIn;
  const [room, property, guest, gate] = await Promise.all([
    booking.roomId ? storage.getRoom(booking.roomId) : Promise.resolve(void 0),
    storage.getProperty(booking.propertyId),
    storage.getGuest(booking.guestId),
    storage.getBookingGate(booking.id)
  ]);
  const existingPayment = await storage.getPaymentByStripeRef(pi.id);
  if (!existingPayment) {
    await storage.createPayment({
      bookingId: booking.id,
      type: "ONE_TIME",
      method: "STRIPE",
      amount: m.amount ?? "0",
      surcharge: m.surcharge ?? "0",
      status: "PAID",
      stripeRef: pi.id,
      confirmedBy: null,
      paidAt: /* @__PURE__ */ new Date()
    });
  }
  try {
    await storage.updateBooking(booking.id, { checkOut: newCheckOut });
  } catch (err) {
    if (err.code !== PG_EXCLUSION_VIOLATION2) throw err;
    await storage.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "EXTENSION_CONFLICT",
      severity: "HIGH",
      detail: `Extension for ${booking.reference} was PAID (PI ${pi.id}, ${m.amount ?? "?"}) but the nights ${previousCheckOut}\u2192${newCheckOut} were taken in the meantime. check_out is UNCHANGED and the charge was NOT refunded. Resolve by hand: extend to a shorter date, move the guest, or refund.`
    });
    if (property && guest) {
      const tpl = adminStayExtensionConflict({
        property: property.name,
        room: roomDisplayName(room),
        guest: guest.name,
        reference: booking.reference,
        requestedCheckOut: newCheckOut,
        amount: `$${m.amount ?? "?"}`,
        reason: "the exclusion constraint rejected the new range"
      });
      await notifyAdmin({
        subject: tpl.subject,
        body: tpl.body,
        telegramText: tpl.telegramText,
        context: { bookingId: booking.id, guestId: guest.id, kind: "EXTENSION_CONFLICT" }
      });
    }
    log(`extension PI ${pi.id}: ${booking.reference} CONFLICT \u2014 charge stands, no refund`, "stripe");
    return { applied: false, conflicted: true };
  }
  const extensionSeq = (gate?.extensionCount ?? 0) + 1;
  if (gate) {
    await storage.updateBookingGate(booking.id, {
      extensionCount: extensionSeq,
      // Preserve the term this stay was originally sold with, once.
      originalCheckOut: gate.originalCheckOut ?? previousCheckOut
    });
  }
  if (property && guest) {
    const freshGate = await storage.getBookingGate(booking.id);
    await onStayExtended(
      {
        booking: { ...booking, checkOut: newCheckOut },
        gate: freshGate ?? gate ?? null,
        guest,
        property,
        room: room ?? null
      },
      {
        previousCheckOut,
        newCheckOut,
        amount: parseFloat(m.amount ?? "0") + parseFloat(m.surcharge ?? "0"),
        extensionSeq
      }
    );
  }
  log(
    `stay ${booking.reference}: extended ${previousCheckOut} \u2192 ${newCheckOut} via ${pi.id}`,
    "stripe"
  );
  return { applied: true, conflicted: false };
}

// server/routes.ts
init_schema();

// server/lib/nextOpening.ts
import { addDays as addDays5, parseISO as parseISO5 } from "date-fns";
var ymd = (d) => d.toISOString().slice(0, 10);
function dayAfter(isoDate) {
  return ymd(addDays5(parseISO5(isoDate), 1));
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
function cheapestAvailableWeeklyRent(rooms2) {
  const rates = rooms2.filter((r) => r.available).map((r) => parseFloat(r.weeklyRent)).filter((n) => Number.isFinite(n) && n > 0);
  if (rates.length === 0) return { fromWeeklyRent: null, available: false };
  return { fromWeeklyRent: String(Math.min(...rates)), available: true };
}

// server/lib/leaseFlow.ts
import { customAlphabet as customAlphabet3 } from "nanoid";

// server/lib/leaseDocument.ts
init_schema();
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
      body: "Rent is billed on a {{cadenceLabel}} basis at {{installmentLabel}} per payment, each payment covering {{periodDaysLabel}} days across all rented room(s). The first payment is due on the start date (move-in). The complete schedule of payments and amounts appears below; the total value of this lease is {{totalLeaseValue}}. {{prorationNote}}"
    },
    {
      heading: "4. Move-in Charges (Deposit & Cleaning Fee)",
      body: "At move-in the Resident pays a refundable security deposit of {{depositTotal}}, which secures the room(s) and is returned at the end of the term less any deductions permitted by law.{{cleaningFeeClause}} These move-in charges are separate from rent and from the payment schedule below."
    },
    {
      heading: "5. Late Fees",
      body: "If a scheduled payment is not received by its due date, a late fee of {{lateFeePerDay}} per day accrues beginning the day after the due date and continues to accrue daily until the balance is paid. Accrued late fees are billed as a separate charge from rent."
    },
    {
      heading: "6. House Rules",
      body: "The Resident agrees to: keep shared spaces clean; respect quiet hours and other residents; not sublet or assign the room; not engage in illegal activity on the premises; and follow any posted property-specific house rules. Repeated or serious violations may result in termination of this Agreement."
    },
    {
      heading: "7. Payment Authorization",
      body: "A payment method is kept on file for the term of this lease. The Resident may pay each scheduled payment either by that card (subject to a {{cardSurchargePct}} processing fee) or manually by CashApp/Zelle (no processing fee); a manual payment is held pending until confirmed. The Resident authorizes Be Nice Properties to charge the saved payment method on file for any scheduled payment not elected as manual, and for any accrued late fees, on or after each due date."
    }
  ],
  signatureStatement: "By typing my full legal name below and submitting this Agreement, I acknowledge that I have read and agree to its terms, and I intend my typed name to be my legally binding electronic signature under the U.S. E-SIGN Act and UETA."
};
function esc2(s) {
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
    installmentLabel: fmtMoney(data.installmentAmount),
    periodDaysLabel: String(CADENCE_DAYS[data.cadence]),
    totalLeaseValue: fmtMoney(data.totalLeaseValue),
    depositTotal: fmtMoney(data.depositTotal),
    // Only state a cleaning fee when one applies; it is non-refundable.
    cleaningFeeClause: data.cleaningFeeTotal > 0 ? ` A one-time, non-refundable cleaning fee of ${fmtMoney(data.cleaningFeeTotal)} is also due at move-in.` : "",
    prorationNote: data.prorationNote,
    lateFeePerDay: fmtMoney(data.lateFeePerDay),
    cardSurchargePct: formatSurchargePct(data.cardSurchargeRate)
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
    (r) => `<tr><td>${r.seq}</td><td>${esc2(r.dueDate)}${r.seq === 1 ? " <strong>(due on start)</strong>" : ""}${r.prorated ? " <em>(prorated)</em>" : ""}</td><td style="text-align:right">${fmtMoney(
      r.amount
    )}</td></tr>`
  ).join("");
  return `<table style="width:100%;border-collapse:collapse" cellpadding="6"><thead><tr style="border-bottom:1px solid #ccc;text-align:left"><th>#</th><th>Due date</th><th style="text-align:right">Amount</th></tr></thead><tbody>${rows}</tbody></table>`;
}
function bodyHtml2(data, template) {
  const tokens = tokenMap(data);
  const sections = template.sections.map(
    (s) => `<section><h2 style="font-size:15px;margin:18px 0 6px">${esc2(s.heading)}</h2><p style="margin:0;line-height:1.5">${esc2(fill(s.body, tokens))}</p></section>`
  ).join("");
  return `<h1 style="font-size:20px;margin:0 0 4px">${esc2(template.title)}</h1><p style="color:#555;margin:0 0 16px;line-height:1.5">${esc2(fill(template.intro, tokens))}</p>` + sections + `<section><h2 style="font-size:15px;margin:18px 0 6px">Payment Schedule</h2>` + scheduleTableHtml(data.schedule) + `</section>`;
}
var PAGE = (inner) => `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Room Rental Agreement</title><style>body{font-family:Georgia,'Times New Roman',serif;max-width:720px;margin:32px auto;padding:0 20px;color:#1a1a1a}@media print{body{margin:0}}</style></head><body>${inner}</body></html>`;
function renderLeaseHtml(data, template = DEFAULT_LEASE_TEMPLATE) {
  const unsigned = bodyHtml2(data, template) + `<section style="margin-top:24px"><p style="line-height:1.5">${esc2(
    template.signatureStatement
  )}</p><p style="color:#777">\u2014 Awaiting signature \u2014</p></section>`;
  return PAGE(unsigned);
}
function renderSignedLeaseHtml(data, signature, template = DEFAULT_LEASE_TEMPLATE) {
  const signed = bodyHtml2(data, template) + `<section style="margin-top:24px;border-top:2px solid #1a1a1a;padding-top:16px"><p style="line-height:1.5">${esc2(template.signatureStatement)}</p><div style="margin-top:12px;font-size:14px"><div><strong>Signed by:</strong> ${esc2(signature.signedName)}</div><div><strong>Date &amp; time:</strong> ${esc2(signature.signedAt.toISOString())}</div><div><strong>IP address:</strong> ${esc2(signature.signedIp)}</div><div style="margin-top:8px;color:#555">Electronically signed under the E-SIGN Act / UETA.</div></div></section>`;
  return PAGE(signed);
}

// server/lib/leaseFlow.ts
init_storage();
var portalTokenGen = customAlphabet3(
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ",
  32
);
function docDataFrom(leaseId, quote, guest, location, pricing) {
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
    installmentAmount: quote.installmentAmount,
    totalLeaseValue: quote.totalLeaseValue,
    depositTotal: quote.depositTotal,
    cleaningFeeTotal: quote.cleaningFeeTotal,
    lateFeePerDay: pricing.lateFeePerDay,
    cardSurchargeRate: pricing.cardSurchargeRate,
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
  const pricing = await getPricingSettings();
  const documentHtml = renderLeaseHtml(
    docDataFrom("PREVIEW", quote, input.guest, property.location, pricing)
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
  const pricing = await getPricingSettings();
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
      // Freeze the one-time cleaning fee at booking too (non-refundable; charged as
      // its own PaymentIntent at move-in). "0" when no room carries a fee.
      cleaningFeeSnapshot: String(quote.cleaningFeeTotal),
      cleaningFeeStatus: "PENDING",
      lateFeePerDaySnapshot: String(pricing.lateFeePerDay),
      cardSurchargeRateSnapshot: String(pricing.cardSurchargeRate),
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
    docDataFrom(lease.id, quote, input.guest, property.location, pricing)
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
  const fullInstallment = parseFloat(schedule[0]?.amount ?? "0");
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
    installmentAmount: fullInstallment,
    totalLeaseValue: parseFloat(lease.totalLeaseValue),
    depositTotal: parseFloat(lease.depositAmountSnapshot ?? "0"),
    cleaningFeeTotal: parseFloat(lease.cleaningFeeSnapshot ?? "0"),
    lateFeePerDay: leaseLateFeePerDay(lease, await getLateFeePerDay()),
    cardSurchargeRate: leaseCardSurchargeRate(lease, await getCardSurchargeRate()),
    prorationNote: lease.prorationNote ?? "",
    schedule: schedule.map((s) => ({
      seq: s.scheduleSeq,
      dueDate: s.dueDate,
      amount: parseFloat(s.amount),
      // A row smaller than a full period IS the day-prorated tail. Previously
      // hardcoded false, so the SIGNED doc never marked the tail even though the
      // review render did.
      prorated: parseFloat(s.amount) < fullInstallment
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

// server/lib/leasePayments.ts
init_storage();

// server/lib/dunning.ts
init_storage();
init_schema();
init_dates();
var MS_PER_DAY2 = 24 * 60 * 60 * 1e3;
async function payLink(lease) {
  return smsLink(portalUrl(lease));
}
async function handleChargeFailure(args) {
  const today = args.today ?? todayIso();
  if (args.scheduleRow.status !== "FAILED") {
    await storage.updateScheduleRow(args.scheduleRow.id, { status: "FAILED" });
  }
  const failureEsc = await storage.raiseEscalationOnce({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    severity: "HIGH",
    detail: `Card-on-file charge FAILED for installment #${args.scheduleRow.scheduleSeq} ($${args.scheduleRow.amount})${args.reason ? `: ${args.reason}` : ""}.`
  });
  if (failureEsc) {
    const failureTail = `failed${args.reason ? `: ${args.reason}` : ""}. Installment #${args.scheduleRow.scheduleSeq} is marked FAILED; the guest has been sent a fix link.`;
    await notifyAdmin({
      subject: `Card charge FAILED \u2014 ${args.guest.name} installment #${args.scheduleRow.scheduleSeq}`,
      body: `Saved-card charge of $${args.scheduleRow.amount} for ${args.guest.name} (${args.guest.email}) ${failureTail}`,
      // Telegram: name only, no contact details (third-party channel).
      telegramText: `Saved-card charge of $${args.scheduleRow.amount} for ${args.guest.name} ${failureTail}`,
      context: { leaseId: args.lease.id, guestId: args.guest.id, kind: "ESCALATION" }
    });
  }
  const already = await storage.hasNotification({
    leaseId: args.lease.id,
    scheduleSeq: args.scheduleRow.scheduleSeq,
    kind: "PAYMENT_FAILED",
    sendDate: today
  });
  if (!already) {
    const fixUrl = portalUrl(args.lease);
    const smsUrl = await payLink(args.lease);
    const sent = await notifyGuest({
      email: args.guest.email,
      phone: args.guest.phone,
      context: { leaseId: args.lease.id, guestId: args.guest.id, kind: "PAYMENT_FAILED" },
      subject: "Action needed \u2014 your rent payment failed",
      body: `Hi ${args.guest.name}, we couldn't process your rent payment for installment #${args.scheduleRow.scheduleSeq}.

Retry it from your portal: ${fixUrl}

If your card has changed, you can pay this installment by CashApp or Zelle from that same page \u2014 no card needed.`,
      smsBody: `BNP: we could not process your rent payment for installment #${args.scheduleRow.scheduleSeq}.` + (smsUrl ? ` Retry: ${smsUrl}` : "")
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

// server/lib/leasePayments.ts
init_dates();
async function loadLeaseContext(leaseId) {
  const lease = await storage.getLease(leaseId);
  if (!lease) throw new LeaseError("Lease not found", 404);
  const property = await storage.getProperty(lease.propertyId);
  if (!property) throw new LeaseError("Lease property not found", 500);
  const rooms2 = await storage.getLeaseRooms(lease.id);
  return { lease, property, rooms: rooms2 };
}
async function chargeTotalFor(lease, base) {
  const rate = leaseCardSurchargeRate(lease, await getCardSurchargeRate());
  return calculateBreakdown({ baseAmount: base, paymentMethod: "STRIPE", surchargeRate: rate }).total;
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
  const amount = await chargeTotalFor(lease, parseFloat(first.amount));
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
  const leaseRooms2 = await storage.getLeaseRooms(lease.id);
  const conflicts = [];
  for (const lr of leaseRooms2) {
    const free = await storage.isRoomAvailableForRange({
      roomId: lr.roomId,
      startDate: lease.startDate,
      endDate: lease.endDate,
      endExclusive: false,
      // lease endDate is INCLUSIVE
      excludeLeaseId: lease.id
    });
    if (!free) conflicts.push(lr.roomNameSnapshot ?? lr.roomId);
  }
  await storage.updateLease(lease.id, {
    depositStatus: "PAID",
    depositPaidAt: /* @__PURE__ */ new Date(),
    depositStripePaymentIntentId: paymentIntentId,
    stripePaymentMethodId: savedPaymentMethodId ?? void 0,
    status: "PENDING_VERIFICATION"
  });
  if (conflicts.length > 0) {
    log(
      `lease ${lease.id} deposit PAID but room(s) ${conflicts.join(", ")} were taken first \u2014 NOT occupied`,
      "stripe"
    );
    await storage.raiseEscalationOnce({
      leaseId: lease.id,
      scheduleSeq: null,
      kind: "PAYMENT_FAILED",
      severity: "HIGH",
      detail: `Deposit ${paymentIntentId} was captured but ${conflicts.join(", ")} is already held for ${lease.startDate} \u2192 ${lease.endDate}. Room NOT occupied. Decide: rehouse the guest, or refund the deposit manually. Nothing was auto-refunded.`
    });
  } else {
    for (const lr of leaseRooms2) {
      await storage.updateRoom(lr.roomId, { status: "OCCUPIED" });
    }
  }
  log(
    `lease ${lease.id} PENDING_VERIFICATION \u2014 deposit PAID via ${paymentIntentId}; room(s) secured, awaiting ID approval`,
    "stripe"
  );
  try {
    const property = await storage.getProperty(lease.propertyId);
    const guest = await storage.getGuest(lease.guestId);
    if (property && guest) {
      const depositSummary = `paid the $${lease.depositAmountSnapshot ?? "0"} deposit for ${property.name}, ${lease.startDate} \u2192 ${lease.endDate}. Room(s) secured; lease is PENDING_VERIFICATION awaiting ID approval.`;
      await notifyAdmin({
        subject: `Deposit paid \u2014 ${property.name} (${guest.name})`,
        body: `${guest.name} (${guest.email}) ${depositSummary}`,
        // Telegram: name only, no contact details (third-party channel).
        telegramText: `${guest.name} ${depositSummary}`,
        context: { leaseId: lease.id, guestId: guest.id, kind: "DEPOSIT_PAID" }
      });
      await onDepositReceived({ lease, property, guest });
    }
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
  const firstIsManual = first?.paymentMethod === "MANUAL";
  if (firstIsManual) {
    log(
      `lease ${lease.id} first payment is MANUAL \u2014 cleaning fee + first installment held for manual settlement (UO Mark Paid)`,
      "stripe"
    );
    return;
  }
  if (savedPaymentMethodId) {
    await chargeCleaningFeeOffSession(lease.id, savedPaymentMethodId).catch((err) => {
      log(`cleaning-fee charge on activation failed lease ${lease.id}: ${err.message}`, "stripe");
    });
  }
  const dueNow = first && first.status !== "PAID" && first.dueDate <= todayIso();
  if (dueNow && savedPaymentMethodId) {
    await chargeFirstWeekOffSession(lease.id, savedPaymentMethodId).catch((err) => {
      log(`first-week charge on activation failed lease ${lease.id}: ${err.message}`, "stripe");
    });
  } else if (first && !dueNow) {
    log(`lease ${lease.id} first installment (${first.dueDate}) deferred to move-in; rent sweep will charge it`, "stripe");
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
  const amount = await chargeTotalFor(lease, parseFloat(first.amount));
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
  log(`lease ${lease.id} first installment charged off-session ${pi.id}`, "stripe");
  try {
    const guest = await storage.getGuest(lease.guestId);
    if (guest) {
      await onPaymentReceived({ lease, property, guest, scheduleRow: { scheduleSeq: 1, amount: first.amount } });
    }
  } catch (err) {
    log(`first-week receipt error lease ${lease.id}: ${err.message}`, "stripe");
  }
}
async function chargeCleaningFeeOffSession(leaseId, paymentMethodId) {
  const { lease, property, rooms: rooms2 } = await loadLeaseContext(leaseId);
  if (!lease.stripeCustomerId) throw new LeaseError("Lease has no Stripe customer", 500);
  const fee = parseFloat(lease.cleaningFeeSnapshot ?? "0");
  if (!(fee > 0)) return;
  if (lease.cleaningFeeStatus === "PAID") return;
  const amount = await chargeTotalFor(lease, fee);
  const metadata = buildLeaseChargeMetadata({
    entity: property.entity,
    property,
    lease,
    rooms: rooms2,
    paymentKind: "CLEANING_FEE",
    scheduleSeq: null
  });
  const pi = await chargeSavedCard({
    amount,
    customerId: lease.stripeCustomerId,
    paymentMethodId,
    metadata,
    idempotencyKey: `lease-cleaning-${lease.id}`
  });
  await storage.updateLease(lease.id, { cleaningFeeStripePaymentIntentId: pi.id });
  log(`lease ${lease.id} cleaning fee charged off-session ${pi.id}`, "stripe");
}

// server/lib/materialize.ts
init_storage();
var PG_EXCLUSION_VIOLATION3 = "23P01";
var defaultDeps = () => ({
  storage,
  resolveBooking,
  notifyAdmin,
  onBookingConfirmed,
  onStayBookingConfirmed
});
async function fireConfirmation(args, deps) {
  if (args.booking.status === "PENDING_APPROVAL") {
    const gate = await deps.storage.getBookingGate(args.booking.id);
    await deps.onStayBookingConfirmed({ ...args, gate: gate ?? null });
    return;
  }
  await deps.onBookingConfirmed(args);
}
async function repairExistingBooking(args) {
  const { existing, pi, reference, deps } = args;
  const { storage: storage2, notifyAdmin: notifyAdmin2 } = deps;
  const m = pi.metadata ?? {};
  const payment = await storage2.getPaymentByStripeRef(pi.id);
  if (!payment) {
    await storage2.createPayment({
      bookingId: existing.id,
      type: "ONE_TIME",
      method: "STRIPE",
      amount: m.amount ?? "0",
      surcharge: m.surcharge ?? "0",
      status: "PAID",
      stripeRef: pi.id,
      confirmedBy: null,
      paidAt: /* @__PURE__ */ new Date()
    });
    log(`short-stay ${reference}: booking existed without a payment row \u2014 PAID row written`, "stripe");
  } else if (payment.status !== "PAID") {
    await storage2.updatePayment(payment.id, { status: "PAID", paidAt: /* @__PURE__ */ new Date() });
  }
  if (existing.status === "CONFLICT") {
    const raised = await storage2.raiseEscalationOnce({
      bookingId: existing.id,
      leaseId: null,
      kind: "BOOKING_CONFLICT",
      severity: "HIGH",
      detail: `Paid booking ${reference} (PI ${pi.id}) is held in CONFLICT \u2014 resolve by confirming or cancelling + refunding.`
    });
    if (raised) {
      const [property, room, guest] = await Promise.all([
        storage2.getProperty(existing.propertyId),
        existing.roomId ? storage2.getRoom(existing.roomId) : Promise.resolve(void 0),
        storage2.getGuest(existing.guestId)
      ]);
      const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
        property: property?.name ?? existing.propertyId,
        room: roomDisplayName(room),
        guest: guest?.name ?? "(unknown guest)",
        email: guest?.email ?? "",
        phone: guest?.phone ?? "",
        checkIn: existing.checkIn,
        checkOut: existing.checkOut ?? "",
        reference,
        total: fmtMoney(parseFloat(existing.quotedTotal)),
        status: "CONFLICT"
      });
      await notifyAdmin2({
        subject: tpl.subject,
        body: tpl.body,
        telegramText: tpl.telegramText,
        context: { bookingId: existing.id, guestId: guest?.id ?? null, kind: "BOOKING_CONFLICT" }
      });
    }
    log(`short-stay ${reference} already exists as CONFLICT \u2014 escalation re-checked`, "stripe");
    return;
  }
  if (existing.status === "CONFIRMED" || existing.status === "ACTIVE" || existing.status === "PENDING_APPROVAL") {
    const [property, room, guest] = await Promise.all([
      storage2.getProperty(existing.propertyId),
      existing.roomId ? storage2.getRoom(existing.roomId) : Promise.resolve(void 0),
      storage2.getGuest(existing.guestId)
    ]);
    if (property && guest) {
      await fireConfirmation({ booking: existing, property, room: room ?? null, guest }, deps);
    }
    log(`short-stay booking ${reference} already exists \u2014 confirmation re-checked`, "stripe");
    return;
  }
  log(`short-stay booking ${reference} already exists (${existing.status}) \u2014 left as is`, "stripe");
}
function brokenIntentBody(pi, m, reason) {
  const where = [m.property_name, m.room_name].filter((v) => v && v !== "null").join(" \xB7 ");
  return `PaymentIntent ${pi.id}${m.reference && m.reference !== "null" ? ` for reference ${m.reference}` : ""} ($${m.quoted_total ?? m.amount ?? "?"}${where ? `, ${where}` : ""}) succeeded but ${reason}, so no booking row could be written. The charge stands. Reconcile this manually in Stripe and the admin console.`;
}
async function materializeShortStayBooking(pi, deps = defaultDeps()) {
  const { storage: storage2, resolveBooking: resolveBooking2, notifyAdmin: notifyAdmin2 } = deps;
  const m = pi.metadata ?? {};
  const reference = m.reference;
  if (!reference) {
    log(`short-stay PI ${pi.id} has no reference \u2014 cannot materialize, admin alerted`, "stripe");
    await notifyAdmin2({
      subject: `\u26A0\uFE0F Paid booking could not be created \u2014 PaymentIntent ${pi.id}`,
      body: brokenIntentBody(pi, m, "its metadata carries no `reference`"),
      context: { kind: "BOOKING_MATERIALIZE_FAILED" }
    });
    posthog.capture({
      distinctId: pi.id,
      event: "booking_materialize_failed",
      properties: { reference: null, missing: "reference" }
    });
    return;
  }
  const existing = await storage2.getBookingByReference(reference);
  if (existing) {
    await repairExistingBooking({ existing, pi, reference, deps });
    return;
  }
  const guestName = m.guest_name;
  const guestEmail = m.guest_email;
  if (!guestName || guestName === "null" || !guestEmail || guestEmail === "null") {
    const missingContact = [
      (!guestName || guestName === "null") && "guest_name",
      (!guestEmail || guestEmail === "null") && "guest_email"
    ].filter(Boolean).join(", ");
    log(
      `short-stay PI ${pi.id} (${reference}) missing guest contact \u2014 NOT materializing, admin alerted`,
      "stripe"
    );
    await notifyAdmin2({
      subject: `\u26A0\uFE0F Paid booking could not be created \u2014 ${reference}`,
      body: brokenIntentBody(pi, m, `its metadata is missing ${missingContact}`),
      context: { kind: "BOOKING_MATERIALIZE_FAILED" }
    });
    posthog.capture({ distinctId: pi.id, event: "booking_intent_missing_contact", properties: { reference, missing: missingContact } });
    return;
  }
  const propertyId = m.property_id && m.property_id !== "null" ? m.property_id : void 0;
  const roomId = m.room_id && m.room_id !== "null" ? m.room_id : void 0;
  const checkIn = m.check_in && m.check_in !== "null" ? m.check_in : void 0;
  const checkOut = m.check_out && m.check_out !== "null" ? m.check_out : void 0;
  const model = m.model === "COLIVING" ? "COLIVING" : "STR";
  if (!propertyId || !checkIn) {
    const missing = [!propertyId && "property_id", !checkIn && "check_in"].filter(Boolean).join(", ");
    log(
      `short-stay PI ${pi.id} (${reference}) missing ${missing} \u2014 NOT materializing, admin alerted`,
      "stripe"
    );
    await notifyAdmin2({
      subject: `\u26A0\uFE0F Paid booking could not be created \u2014 ${reference}`,
      body: brokenIntentBody(pi, m, `its metadata is missing ${missing}`),
      context: { kind: "BOOKING_MATERIALIZE_FAILED" }
    });
    posthog.capture({
      distinctId: pi.id,
      event: "booking_materialize_failed",
      properties: { reference, missing }
    });
    return;
  }
  let conflictReason = null;
  try {
    await resolveBooking2({ propertyId, roomId, checkIn, checkOut });
  } catch (err) {
    if (!(err instanceof BookingError)) throw err;
    conflictReason = err.message;
    log(
      `short-stay ${reference} dates taken since intent \u2014 saving as CONFLICT (PI ${pi.id}): ${err.message}`,
      "stripe"
    );
  }
  const guestRow = await storage2.upsertGuestByEmail({
    name: guestName,
    email: guestEmail,
    phone: m.guest_phone && m.guest_phone !== "null" ? m.guest_phone : void 0
  });
  const baseBooking = {
    propertyId,
    roomId: roomId ?? null,
    guestId: guestRow.id,
    model,
    checkIn,
    checkOut: checkOut ?? null,
    paymentMethod: "STRIPE",
    reference,
    quotedTotal: m.quoted_total ?? "0"
  };
  const okStatus = postPaymentStatusFor({ model, checkIn, checkOut: checkOut ?? null });
  let booking;
  if (conflictReason) {
    booking = await storage2.createBooking({ ...baseBooking, status: "CONFLICT" });
  } else {
    try {
      booking = await storage2.createBooking({ ...baseBooking, status: okStatus });
    } catch (err) {
      if (err.code !== PG_EXCLUSION_VIOLATION3) throw err;
      conflictReason = `Database exclusion constraint rejected the booking (${PG_EXCLUSION_VIOLATION3}) \u2014 the dates were taken concurrently.`;
      log(`short-stay ${reference} hit the exclusion constraint \u2014 saving as CONFLICT`, "stripe");
      booking = await storage2.createBooking({ ...baseBooking, status: "CONFLICT" });
    }
  }
  if (booking.status === "PENDING_APPROVAL") {
    await storage2.ensureBookingGate(booking.id, {
      gateToken: gateTokenGen(),
      docsDeadlineAt: new Date(Date.now() + GATE_DOCS_DEADLINE_MS)
    });
  }
  await storage2.createPayment({
    bookingId: booking.id,
    type: "ONE_TIME",
    method: "STRIPE",
    amount: m.amount ?? "0",
    surcharge: m.surcharge ?? "0",
    status: "PAID",
    stripeRef: pi.id,
    confirmedBy: null,
    paidAt: /* @__PURE__ */ new Date()
  });
  const [property, room] = await Promise.all([
    storage2.getProperty(propertyId),
    roomId ? storage2.getRoom(roomId) : Promise.resolve(void 0)
  ]);
  if (conflictReason) {
    await storage2.raiseEscalationOnce({
      bookingId: booking.id,
      leaseId: null,
      kind: "BOOKING_CONFLICT",
      severity: "HIGH",
      detail: `Paid booking ${reference} (PI ${pi.id}) landed on unavailable dates ${checkIn}\u2192${checkOut ?? "?"}: ${conflictReason} Saved as CONFLICT \u2014 resolve by confirming or cancelling + refunding.`
    });
    const tpl = LIFECYCLE_TEMPLATES.adminNewBooking({
      property: property?.name ?? propertyId,
      room: roomDisplayName(room),
      guest: guestName,
      email: guestEmail,
      phone: m.guest_phone && m.guest_phone !== "null" ? m.guest_phone : "",
      checkIn,
      checkOut: checkOut ?? "",
      reference,
      total: fmtMoney(parseFloat(m.quoted_total ?? "0")),
      status: "CONFLICT"
    });
    await notifyAdmin2({
      subject: tpl.subject,
      body: tpl.body,
      telegramText: tpl.telegramText,
      context: { bookingId: booking.id, guestId: guestRow.id, kind: "BOOKING_CONFLICT" }
    });
    posthog.capture({
      distinctId: guestEmail,
      event: "booking_conflict_saved",
      properties: { reference, booking_id: booking.id, payment_intent_id: pi.id, reason: conflictReason }
    });
    log(`short-stay booking ${reference} saved as CONFLICT via ${pi.id} \u2014 admin alerted, NO refund`, "stripe");
    return;
  }
  if (roomId) await storage2.updateRoom(roomId, { status: "OCCUPIED" });
  posthog.capture({
    distinctId: guestEmail,
    event: "booking_confirmed",
    properties: {
      reference,
      booking_id: booking.id,
      property_id: propertyId,
      property_type: model,
      room_id: roomId ?? null,
      check_in: checkIn,
      check_out: checkOut,
      payment_intent_id: pi.id
    }
  });
  if (property) {
    await fireConfirmation({ booking, property, room: room ?? null, guest: guestRow }, deps);
  }
  log(`short-stay booking ${reference} materialized + confirmed via ${pi.id}`, "stripe");
}

// server/lib/portal.ts
init_storage();

// server/lib/manualPayment.ts
function manualHandle(method) {
  return method === "CASHAPP" ? process.env.CASHAPP_TAG ?? "$BeNiceProperties" : process.env.ZELLE_HANDLE ?? "pay@beniceproperties.com";
}
function buildManualInstructions(args) {
  return {
    method: args.method,
    handle: manualHandle(args.method),
    amount: args.amount,
    memo: args.memo
  };
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
      hasSavedCard: Boolean(lease.stripeCustomerId && lease.stripePaymentMethodId),
      // The lease's own snapshotted rate, not the live setting — a portal guest
      // must be quoted the same rate payInstallmentNow actually charges. See
      // chargeTotalFor below, which uses the identical leaseCardSurchargeRate call.
      cardSurchargeRate: leaseCardSurchargeRate(lease, await getCardSurchargeRate())
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
async function chargeTotalFor2(lease, base) {
  const rate = leaseCardSurchargeRate(lease, await getCardSurchargeRate());
  return calculateBreakdown({ baseAmount: base, paymentMethod: "STRIPE", surchargeRate: rate }).total;
}
async function payInstallmentNow(token, scheduleSeq) {
  const lease = await resolvePortalLease(token);
  if (lease.status === "COMPLETED" || lease.status === "TERMINATED") {
    throw new LeaseError("This lease is closed", 409);
  }
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
  const amount = await chargeTotalFor2(lease, parseFloat(row.amount));
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
async function electManualInstallment(token, scheduleSeq, method) {
  const lease = await resolvePortalLease(token);
  const schedule = await storage.getScheduleByLease(lease.id);
  const row = schedule.find((s) => s.scheduleSeq === scheduleSeq);
  if (!row) throw new LeaseError("Installment not found", 404);
  if (row.status === "PAID") throw new LeaseError("That installment is already paid", 409);
  if (row.status === "WAIVED") throw new LeaseError("That installment was waived", 409);
  if (!OPEN_FOR_PAY.has(row.status)) throw new LeaseError("That installment can't be paid now", 409);
  let amount = parseFloat(row.amount);
  if (row.scheduleSeq === 1 && lease.cleaningFeeStatus !== "PAID") {
    amount += parseFloat(lease.cleaningFeeSnapshot ?? "0");
  }
  amount = Math.round(amount * 100) / 100;
  if (row.paymentMethod !== "MANUAL") {
    await storage.updateScheduleRow(row.id, { paymentMethod: "MANUAL" });
  }
  const memo = `LEASE-${lease.id.slice(0, 8).toUpperCase()}-P${row.scheduleSeq}`;
  return buildManualInstructions({ method, amount, memo });
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
  await storage.createMessageLog({
    leaseId: lease.id,
    guestId: lease.guestId,
    direction: "INBOUND",
    audience: "ADMIN",
    channel: "PORTAL",
    kind: "GUEST_MESSAGE",
    subject: input.subject ?? null,
    body: input.body,
    status: "SENT",
    sentBy: "guest"
  });
  const [guest, property] = await Promise.all([
    storage.getGuest(lease.guestId),
    storage.getProperty(lease.propertyId)
  ]);
  const guestName = guest?.name ?? "A guest";
  const propertyName = property?.name ?? "a BNP property";
  const snippet = input.body.length > 300 ? `${input.body.slice(0, 300)}\u2026` : input.body;
  const subjectLine = input.subject ? ` \u2014 "${input.subject}"` : "";
  await notifyAdmin({
    subject: `Guest message \u2014 ${propertyName}`,
    body: `${guestName} (${guest?.email ?? "no email on file"})${subjectLine}

${snippet}`,
    telegramText: `${guestName}${subjectLine}

${snippet}`,
    context: { leaseId: lease.id, guestId: lease.guestId, kind: "GUEST_MESSAGE" }
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
init_storage();
import { randomUUID as randomUUID2 } from "node:crypto";
init_schema();
async function uploadLicense(token, file) {
  assertR2Configured();
  const lease = await resolvePortalLease(token);
  const ext = validateUpload(file);
  if (lease.status === "ACTIVE") {
    throw new LeaseError("This lease is already active; no verification needed.", 409);
  }
  if (["COMPLETED", "TERMINATED", "DEFAULTED"].includes(lease.status)) {
    throw new LeaseError("This lease is closed.", 409);
  }
  const key = `bnp/licenses/${lease.id}/${randomUUID2()}.${ext}`;
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
  const verifEsc = await storage.raiseEscalationOnce({
    leaseId: lease.id,
    kind: "VERIFICATION_PENDING",
    severity: "LOW",
    detail: `Driver's license uploaded for review (guest ${lease.guestId}).`
  });
  if (verifEsc) {
    await notifyAdmin({
      subject: "ID awaiting review \u2014 a tenant uploaded their license",
      // No PII beyond the ids: the document itself is only ever viewed through
      // the presigned admin route.
      body: `Lease ${lease.id} has a driver's license awaiting review. Approve or reject it in the admin console to activate the lease.`,
      context: { leaseId: lease.id, guestId: lease.guestId, kind: "ESCALATION" }
    });
  }
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
  assertR2Configured();
  const lease = await resolvePortalLease(token);
  const ext = validateUpload(file);
  const key = `bnp/vehicles/${lease.id}/${randomUUID2()}.${ext}`;
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
  assertR2Configured();
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
      const link = portalUrl(lease);
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

// server/lib/publicInventory.ts
init_schema();
function roomPubliclyVisible(room, property) {
  if (!property || !property.active) return false;
  return !ROOM_UNBOOKABLE_STATUSES.includes(room.status);
}

// server/lib/bookingIntentGuard.ts
var OPEN_STATUSES = /* @__PURE__ */ new Set(["requires_payment_method", "requires_confirmation", "requires_action"]);
var ENTITIES = /* @__PURE__ */ new Set(["BNP", "TRAD"]);
function isOpenShortStayIntent(pi) {
  const m = pi.metadata;
  if (!m) return false;
  if (!OPEN_STATUSES.has(pi.status)) return false;
  if (!ENTITIES.has(m.entity ?? "")) return false;
  if (m.payment_kind !== "BOOKING_DEPOSIT") return false;
  if (m.lease_id && m.lease_id !== "null") return false;
  if (!m.reference || m.reference === "null") return false;
  return true;
}

// server/lib/bookingIntents.ts
var ABANDON_AFTER_MS = 24 * 60 * 60 * 1e3;
function bookingIntentStatus(intent, ctx) {
  if (ctx.hasBooking) return "PAID";
  if (ctx.now.getTime() - intent.createdAt.getTime() > ABANDON_AFTER_MS) return "ABANDONED";
  return intent.guestEmail ? "CONTACT_ADDED" : "STARTED";
}

// server/lib/manualSettle.ts
init_storage();
var defaultDeps2 = () => ({
  storage,
  strHasConflict,
  onBookingConfirmed,
  notifyAdmin
});
async function settleManualBookingPayment(args, deps = defaultDeps2()) {
  const { storage: storage2 } = deps;
  const payment = await storage2.getPayment(args.paymentId);
  if (!payment) throw new BookingError("Payment not found", 404);
  if (payment.method === "STRIPE") {
    throw new BookingError("Stripe payments are confirmed by webhook, not manually", 400);
  }
  const booking = await storage2.getBooking(payment.bookingId);
  if (payment.status === "PAID") return { payment, booking: booking ?? null };
  if (booking && booking.checkOut) {
    if (booking.model === "COLIVING" && booking.roomId) {
      const free = await storage2.isRoomAvailableForRange({
        roomId: booking.roomId,
        startDate: booking.checkIn,
        endDate: booking.checkOut,
        endExclusive: true,
        excludeBookingId: booking.id
      });
      if (!free) {
        throw new BookingError("Those dates are no longer available for this room \u2014 cannot mark paid", 409);
      }
    } else if (booking.model === "STR") {
      if (await deps.strHasConflict(booking.propertyId, booking.checkIn, booking.checkOut, booking.id)) {
        throw new BookingError("Those dates are no longer available \u2014 cannot mark paid", 409);
      }
    }
  }
  const updatedPayment = await storage2.updatePayment(payment.id, {
    status: "PAID",
    confirmedBy: args.adminId,
    paidAt: /* @__PURE__ */ new Date()
  }) ?? payment;
  if (!booking) return { payment: updatedPayment, booking: null };
  const liveStatus = postPaymentStatusFor(booking);
  const updatedBooking = await storage2.updateBooking(booking.id, { status: liveStatus }) ?? {
    ...booking,
    status: liveStatus
  };
  if (booking.roomId) await storage2.updateRoom(booking.roomId, { status: "OCCUPIED" });
  const [guest, property, room] = await Promise.all([
    storage2.getGuest(booking.guestId),
    storage2.getProperty(booking.propertyId),
    booking.roomId ? storage2.getRoom(booking.roomId) : Promise.resolve(void 0)
  ]);
  if (guest && property) {
    await deps.onBookingConfirmed({ booking: updatedBooking, property, room: room ?? null, guest });
    const settledTail = `marked PAID by ${args.actor}. Booking is now ${liveStatus}.`;
    await deps.notifyAdmin({
      subject: `Manual payment marked paid \u2014 ${booking.reference}`,
      body: `${payment.method} payment of $${payment.amount} for ${booking.reference} (${guest.name}, ${guest.email}) ${settledTail}`,
      // Telegram: name only, no contact details (third-party channel).
      telegramText: `${payment.method} payment of $${payment.amount} for ${booking.reference} (${guest.name}) ${settledTail}`,
      context: { bookingId: booking.id, guestId: guest.id, kind: "MANUAL_PAYMENT_CONFIRMED", sentBy: args.actor }
    });
  }
  return { payment: updatedPayment, booking: updatedBooking };
}

// server/lib/uoApi.ts
init_storage();

// server/lib/adminMessages.ts
init_storage();
var DEFAULT_SUBJECT = "Message from Be Nice Properties";
var NOT_REQUESTED = (channel) => ({
  sent: false,
  channel,
  reason: "not-requested"
});
async function resolveTarget(args) {
  if (args.threadId) {
    const messages = await storage.getMessagesByThread(args.threadId);
    const root = messages.find((m) => m.id === args.threadId);
    if (!root) throw new LeaseError("Thread not found", 404);
    return {
      bookingId: root.bookingId ?? null,
      leaseId: root.leaseId ?? null,
      guestId: root.guestId,
      category: root.category ?? "OTHER",
      root
    };
  }
  const bookingId = args.bookingId ?? null;
  const leaseId = args.leaseId ?? null;
  if (!bookingId && !leaseId) {
    throw new LeaseError("bookingId or leaseId is required to start a new thread", 400);
  }
  let guestId;
  if (leaseId) {
    const lease = await storage.getLease(leaseId);
    if (!lease) throw new LeaseError("Lease not found", 404);
    guestId = lease.guestId;
  } else {
    const booking = await storage.getBooking(bookingId);
    if (!booking) throw new LeaseError("Booking not found", 404);
    guestId = booking.guestId;
  }
  return { bookingId, leaseId, guestId, category: "OTHER", root: null };
}
async function sendStaffMessage(args) {
  const target = await resolveTarget(args);
  const guest = await storage.getGuest(target.guestId);
  if (!guest) throw new LeaseError("Guest not found", 404);
  const subject = args.subject ?? DEFAULT_SUBJECT;
  const message = await storage.createMessage({
    leaseId: target.leaseId,
    bookingId: target.bookingId,
    guestId: target.guestId,
    threadId: args.threadId ?? "",
    // "" → storage assigns a self-referential root id
    authorRole: "STAFF",
    category: target.category,
    subject: target.root ? target.root.subject : subject,
    body: args.body,
    status: "ANSWERED"
  });
  if (target.root) {
    await storage.updateMessage(target.root.id, { status: "ANSWERED" });
  }
  const context = {
    bookingId: target.bookingId,
    leaseId: target.leaseId,
    guestId: target.guestId,
    audience: "GUEST",
    kind: "MANUAL",
    sentBy: args.actor
  };
  const wantsEmail = args.channels.includes("EMAIL");
  const wantsSms = args.channels.includes("SMS");
  let email = NOT_REQUESTED("email");
  let sms = NOT_REQUESTED("sms");
  if (wantsEmail) {
    const delivery = await notifyGuest({
      email: guest.email,
      phone: wantsSms ? guest.phone : null,
      subject,
      body: args.body,
      context
    });
    email = delivery.email;
    sms = delivery.sms;
  } else if (wantsSms) {
    sms = await sendSms({ to: guest.phone ?? "", body: args.body, context });
  }
  return { messageId: message.id, threadId: message.threadId, delivery: { email, sms } };
}
var DEFAULT_THREAD_LIMIT = 100;
var MAX_THREAD_LIMIT = 500;
async function listThreads(opts) {
  const limit = Math.min(Math.max(opts?.limit ?? DEFAULT_THREAD_LIMIT, 1), MAX_THREAD_LIMIT);
  const roots = await storage.getMessageThreadRoots({ status: opts?.status, limit });
  if (roots.length === 0) return [];
  const guestIds = Array.from(new Set(roots.map((r) => r.guestId)));
  const bookingIds = Array.from(
    new Set(roots.map((r) => r.bookingId).filter((id) => Boolean(id)))
  );
  const leaseIds = Array.from(
    new Set(roots.map((r) => r.leaseId).filter((id) => Boolean(id)))
  );
  const threadIds = roots.map((r) => r.threadId);
  const [guestRows, bookingRows, leaseRows, stats] = await Promise.all([
    storage.getGuestsByIds(guestIds),
    storage.getBookingsByIds(bookingIds),
    storage.getLeasesByIds(leaseIds),
    storage.getThreadStats(threadIds)
  ]);
  const propertyIds = Array.from(
    /* @__PURE__ */ new Set([...bookingRows.map((b) => b.propertyId), ...leaseRows.map((l) => l.propertyId)])
  );
  const propertyRows = await storage.getPropertiesByIds(propertyIds);
  const guestById = new Map(guestRows.map((g) => [g.id, g]));
  const bookingById = new Map(bookingRows.map((b) => [b.id, b]));
  const leaseById = new Map(leaseRows.map((l) => [l.id, l]));
  const propertyById = new Map(propertyRows.map((p) => [p.id, p]));
  const statsByThread = new Map(stats.map((s) => [s.threadId, s]));
  return roots.map((root) => {
    const guest = guestById.get(root.guestId);
    let propertyName = null;
    let bookingReference = null;
    if (root.bookingId) {
      const booking = bookingById.get(root.bookingId);
      if (booking) {
        bookingReference = booking.reference;
        propertyName = propertyById.get(booking.propertyId)?.name ?? null;
      }
    } else if (root.leaseId) {
      const lease = leaseById.get(root.leaseId);
      if (lease) {
        propertyName = propertyById.get(lease.propertyId)?.name ?? null;
      }
    }
    const stat = statsByThread.get(root.threadId);
    return {
      id: root.id,
      status: root.status,
      category: root.category,
      subject: root.subject,
      createdAt: root.createdAt,
      guestName: guest?.name ?? null,
      guestEmail: guest?.email ?? null,
      propertyName,
      bookingReference,
      leaseId: root.leaseId ?? null,
      bookingId: root.bookingId ?? null,
      // Every root is itself a message, so a missing stats row (shouldn't
      // happen — the root always has at least itself) still degrades to
      // sane values instead of null/NaN.
      lastMessageAt: stat?.lastMessageAt ?? root.createdAt,
      messageCount: stat?.messageCount ?? 1
    };
  });
}
async function getThread2(threadId) {
  const messages = await storage.getMessagesByThread(threadId);
  const root = messages.find((m) => m.id === threadId);
  if (!root) throw new LeaseError("Thread not found", 404);
  const scope = root.leaseId ? { leaseId: root.leaseId } : root.bookingId ? { bookingId: root.bookingId } : null;
  if (!scope) return { root, messages, deliveries: [] };
  const logs = await storage.getMessageLog(scope);
  const deliveries = logs.filter((l) => l.kind === "MANUAL").sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  return { root, messages, deliveries };
}

// server/lib/uoApi.ts
init_schema();
async function listPropertiesWithRooms() {
  const properties2 = await storage.getProperties();
  const out = [];
  for (const p of properties2) {
    const rooms2 = p.type === "COLIVING" ? await storage.getRoomsByProperty(p.id) : [];
    out.push({ ...p, rooms: rooms2 });
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
  if (row.scheduleSeq === 1 && lease.status === "PENDING_VERIFICATION" && lease.verificationStatus === "APPROVED") {
    try {
      await activateVerifiedLease(lease.id);
    } catch (err) {
      log(`manual seq-1 settle: activation deferred for lease ${lease.id}: ${err.message}`, "uo");
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
  return sendStaffMessage({
    threadId: args.threadId,
    body: args.body,
    channels: ["EMAIL", "SMS"],
    actor: `uo:${args.actor}`
  });
}
async function resolveEscalation(args) {
  const escalations = await storage.getEscalations();
  const esc3 = escalations.find((e) => e.id === args.escalationId);
  if (!esc3) throw new LeaseError("Escalation not found", 404);
  const target = args.status ?? "RESOLVED";
  if (esc3.status === target) return { status: target, noop: true };
  await storage.updateEscalation(esc3.id, {
    status: target,
    resolvedAt: target === "RESOLVED" ? /* @__PURE__ */ new Date() : esc3.resolvedAt ?? null,
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
function requireActor(actor) {
  if (!actor || !actor.trim()) throw new LeaseError("actor is required", 400);
  return actor.trim();
}
function firstIssue(err, fallback) {
  return err.errors[0]?.message ?? fallback;
}
async function updateProperty(args) {
  const actor = requireActor(args.actor);
  const parsed = insertPropertySchema.partial().safeParse(args.patch);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid property patch"), 400);
  const keys = Object.keys(parsed.data);
  if (keys.length === 0) throw new LeaseError("Empty patch", 400);
  const updated = await storage.updateProperty(args.propertyId, parsed.data);
  if (!updated) throw new LeaseError("Property not found", 404);
  log(`property ${args.propertyId} updated by uo:${actor}: ${keys.join(", ")}`, "uo");
  return updated;
}
async function updateRoom(args) {
  const actor = requireActor(args.actor);
  const parsed = insertRoomSchema.partial().safeParse(args.patch);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid room patch"), 400);
  const keys = Object.keys(parsed.data);
  if (keys.length === 0) throw new LeaseError("Empty patch", 400);
  const updated = await storage.updateRoom(args.roomId, parsed.data);
  if (!updated) throw new LeaseError("Room not found", 404);
  log(`room ${args.roomId} updated by uo:${actor}: ${keys.join(", ")}`, "uo");
  return updated;
}
async function createProperty(args) {
  const actor = requireActor(args.actor);
  const parsed = insertPropertySchema.safeParse(args.property);
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid property"), 400);
  const created = await storage.createProperty(parsed.data);
  log(`property ${created.id} created by uo:${actor}`, "uo");
  return created;
}
async function createRoom(args) {
  const actor = requireActor(args.actor);
  const parent = await storage.getProperty(args.propertyId);
  if (!parent) throw new LeaseError("Property not found", 404);
  if (parent.type !== "COLIVING") throw new LeaseError("Rooms can only be added to COLIVING properties", 400);
  const parsed = insertRoomSchema.safeParse({ ...args.room, propertyId: args.propertyId });
  if (!parsed.success) throw new LeaseError(firstIssue(parsed.error, "Invalid room"), 400);
  const created = await storage.createRoom(parsed.data);
  log(`room ${created.id} created under ${args.propertyId} by uo:${actor}`, "uo");
  return created;
}

// server/lib/manualBlocks.ts
var OK = { ok: true, message: null };
var fail = (message) => ({ ok: false, message });
function validateManualBlockInput(args) {
  const { property, room, roomId } = args;
  if (!property) return fail("Property not found");
  if (!roomId) {
    return property.type === "COLIVING" ? fail("Co-living blocks must name a room") : OK;
  }
  if (!room) return fail("Room not found");
  if (room.propertyId !== property.id) return fail("Room does not belong to that property");
  return OK;
}

// server/routes.ts
init_messageLogQuery();

// server/lib/icalSync.ts
init_storage();
import { promises as dns } from "node:dns";
import net from "node:net";
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

// server/lib/reconciliation.ts
init_storage();
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

// server/integrations/kpiRollup.ts
init_storage();

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
var upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});
var checkoutLimiter = rateLimit({ windowMs: 10 * 60 * 1e3, max: 20 });
var leaseCreateLimiter = rateLimit({ windowMs: 60 * 60 * 1e3, max: 10 });
var declineLimiter = rateLimit({ windowMs: 60 * 60 * 1e3, max: 5 });
var stayDocsLimiter = rateLimit({ windowMs: 10 * 60 * 1e3, max: 30 });
function toUploadedFile(f) {
  if (!f) return void 0;
  return { buffer: f.buffer, mimetype: f.mimetype, size: f.size };
}
function xmlEscape(value) {
  return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}
async function reconciliationHandler(req, res, next) {
  try {
    const schema = z4.object({
      from: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      to: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/)
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
  app.get("/api/site-config", async (_req, res, next) => {
    try {
      const [ltr, journal] = await Promise.all([
        storage.getSetting("page_ltr_visible"),
        storage.getSetting("page_journal_visible")
      ]);
      res.json({
        pages: {
          ltr: ltr?.value !== "false",
          journal: journal?.value !== "false"
        }
      });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/newsletter", async (req, res, next) => {
    try {
      const parsed = insertNewsletterSubscriberSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid email" });
      }
      await storage.upsertNewsletterSubscriber(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/ltr-inquiries", async (req, res, next) => {
    try {
      const parsed = insertLtrInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid inquiry" });
      }
      await storage.createLtrInquiry(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/partner-inquiries", async (req, res, next) => {
    try {
      const parsed = insertPartnerInquirySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid inquiry" });
      }
      await storage.createPartnerInquiry(parsed.data);
      res.status(200).json({ ok: true });
    } catch (err) {
      next(err);
    }
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
  app.get("/api/journal", async (_req, res, next) => {
    try {
      const posts = await storage.getPublishedJournalPosts();
      res.json(
        posts.map((p) => ({
          slug: p.slug,
          title: p.title,
          date: (p.publishedAt ?? p.createdAt).toISOString().slice(0, 10),
          excerpt: p.excerpt,
          cover: p.coverUrl ?? void 0
        }))
      );
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/journal/:slug", async (req, res, next) => {
    try {
      const post = await storage.getPublishedJournalPostBySlug(req.params.slug);
      if (!post) return res.status(404).json({ message: "Post not found" });
      res.json({
        slug: post.slug,
        title: post.title,
        date: (post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
        excerpt: post.excerpt,
        cover: post.coverUrl ?? void 0,
        blocks: post.blocks
      });
    } catch (err) {
      next(err);
    }
  });
  app.get("/sitemap.xml", async (_req, res, next) => {
    try {
      const origin = publicBaseUrl();
      const [ltrFlag, journalFlag, properties2, posts] = await Promise.all([
        storage.getSetting("page_ltr_visible"),
        storage.getSetting("page_journal_visible"),
        storage.getProperties({ activeOnly: true }),
        storage.getPublishedJournalPosts()
      ]);
      const ltrVisible = ltrFlag?.value !== "false";
      const journalVisible = journalFlag?.value !== "false";
      const entries = [
        { path: "/", changefreq: "weekly", priority: "1.0" },
        { path: "/str", changefreq: "weekly", priority: "0.9" },
        ...ltrVisible ? [{ path: "/ltr", changefreq: "weekly", priority: "0.9" }] : [],
        { path: "/community", changefreq: "monthly", priority: "0.7" },
        { path: "/about", changefreq: "monthly", priority: "0.6" },
        { path: "/house-rules", changefreq: "yearly", priority: "0.4" },
        { path: "/partner", changefreq: "monthly", priority: "0.7" }
      ];
      for (const p of properties2) {
        if (p.type === "LTR" && !ltrVisible) continue;
        entries.push({ path: `/property/${p.id}`, changefreq: "weekly", priority: "0.8" });
        if (p.type === "COLIVING") {
          const rooms2 = await storage.getRoomsByProperty(p.id);
          for (const r of rooms2) {
            if (!roomPubliclyVisible(r, p)) continue;
            entries.push({ path: `/room/${r.id}`, changefreq: "weekly", priority: "0.7" });
          }
        }
      }
      if (journalVisible) {
        entries.push({ path: "/journal", changefreq: "weekly", priority: "0.6" });
        for (const post of posts) {
          entries.push({
            path: `/journal/${post.slug}`,
            lastmod: (post.updatedAt ?? post.publishedAt ?? post.createdAt).toISOString().slice(0, 10),
            changefreq: "monthly",
            priority: "0.6"
          });
        }
      }
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
` + entries.map((e) => {
        const parts = [`    <loc>${origin}${e.path}</loc>`];
        if (e.lastmod) parts.push(`    <lastmod>${e.lastmod}</lastmod>`);
        if (e.changefreq) parts.push(`    <changefreq>${e.changefreq}</changefreq>`);
        if (e.priority) parts.push(`    <priority>${e.priority}</priority>`);
        return `  <url>
${parts.join("\n")}
  </url>`;
      }).join("\n") + `
</urlset>
`;
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });
  app.get("/feed.xml", async (_req, res, next) => {
    try {
      const origin = publicBaseUrl();
      const [journalFlag, posts] = await Promise.all([
        storage.getSetting("page_journal_visible"),
        storage.getPublishedJournalPosts()
      ]);
      const journalVisible = journalFlag?.value !== "false";
      const items = journalVisible ? posts : [];
      const blocksToHtml = (blocks) => blocks.map((b) => {
        if (b.type === "heading") return `<h2>${xmlEscape(b.text)}</h2>`;
        if (b.type === "paragraph") return `<p>${xmlEscape(b.text)}</p>`;
        if (b.type === "image" && b.src)
          return `<p><img src="${xmlEscape(b.src)}" alt="${xmlEscape(b.alt)}" /></p>`;
        return "";
      }).filter(Boolean).join("\n");
      const feedUrl = `${origin}/feed.xml`;
      const lastBuild = (items[0]?.updatedAt ?? items[0]?.publishedAt ?? items[0]?.createdAt ?? /* @__PURE__ */ new Date()).toUTCString();
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Be Nice Properties Journal</title>
    <link>${origin}/journal</link>
    <description>Notes from the homes: booking direct, what's included, and making the most of a stay, straight from the people who run the places.</description>
    <language>en-us</language>
    <lastBuildDate>${lastBuild}</lastBuildDate>
    <atom:link href="${feedUrl}" rel="self" type="application/rss+xml" />
` + items.map((post) => {
        const url = `${origin}/journal/${post.slug}`;
        const pubDate = (post.publishedAt ?? post.createdAt).toUTCString();
        const cover = post.coverUrl ? `<p><img src="${xmlEscape(post.coverUrl)}" alt="${xmlEscape(post.title)}" /></p>
` : "";
        const body = cover + blocksToHtml(post.blocks);
        return `    <item>
      <title>${xmlEscape(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <description>${xmlEscape(post.excerpt)}</description>
      <pubDate>${pubDate}</pubDate>
      <dc:creator>Be Nice Properties</dc:creator>
      <content:encoded>${xmlEscape(body)}</content:encoded>
    </item>`;
      }).join("\n") + `
  </channel>
</rss>
`;
      res.set("Content-Type", "application/xml; charset=utf-8");
      res.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
      res.send(xml);
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/properties", async (req, res, next) => {
    try {
      const today = todayIso();
      const ISO = /^\d{4}-\d{2}-\d{2}$/;
      const ci = typeof req.query.checkIn === "string" ? req.query.checkIn : "";
      const co = typeof req.query.checkOut === "string" ? req.query.checkOut : "";
      const dated = ISO.test(ci) && ISO.test(co) && co > ci && ci >= today ? { checkIn: ci, checkOut: co } : null;
      const searchNights = dated ? differenceInCalendarDays3(parseISO6(dated.checkOut), parseISO6(dated.checkIn)) : 0;
      const colivingBelowMin = Boolean(dated) && searchNights < COLIVING_MIN_DAYS;
      const props = await storage.getProperties({ activeOnly: true });
      const withRent = await Promise.all(
        props.map(async (p) => {
          let fromWeeklyRent = null;
          let availableForDates = true;
          if (p.type === "COLIVING") {
            const rooms2 = await storage.getRoomsByProperty(p.id);
            const openRooms = rooms2.filter((r) => isRoomBookableStatus(r.status));
            let free;
            if (dated) {
              free = await Promise.all(
                openRooms.map(
                  (r) => storage.isRoomAvailableForRange({
                    roomId: r.id,
                    startDate: dated.checkIn,
                    endDate: dated.checkOut,
                    endExclusive: true
                  })
                )
              );
            } else {
              free = openRooms.map(() => true);
            }
            const priced = cheapestAvailableWeeklyRent(
              openRooms.map((r, i) => ({ weeklyRent: r.weeklyRent, available: free[i] }))
            );
            fromWeeklyRent = priced.fromWeeklyRent;
            if (dated) availableForDates = colivingBelowMin ? false : priced.available;
          } else if (p.type === "STR" && dated) {
            availableForDates = !await strHasConflict(p.id, dated.checkIn, dated.checkOut);
          }
          return { ...p, fromWeeklyRent, availableForDates };
        })
      );
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
      const today = todayIso();
      const ISO = /^\d{4}-\d{2}-\d{2}$/;
      const ci = typeof req.query.checkIn === "string" ? req.query.checkIn : "";
      const co = typeof req.query.checkOut === "string" ? req.query.checkOut : "";
      const dated = ISO.test(ci) && ISO.test(co) && co > ci && ci >= today ? { checkIn: ci, checkOut: co } : null;
      const baseRooms = property.type === "COLIVING" ? await storage.getRoomsByProperty(property.id) : [];
      const rooms2 = await Promise.all(
        baseRooms.map(async (r) => ({ ...r, availableForDates: await roomAvailableForDates(r, dated) }))
      );
      res.json({ property, rooms: rooms2 });
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/rooms/:id", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      const property = room ? await storage.getProperty(room.propertyId) : void 0;
      if (!room || !roomPubliclyVisible(room, property)) {
        return res.status(404).json({ message: "Room not found" });
      }
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
        return res.json({ busy: [], minDate: todayIso() });
      }
      res.json(await buildStrAvailability(property.id));
    } catch (err) {
      next(err);
    }
  });
  app.get("/api/rooms/:id/availability", async (req, res, next) => {
    try {
      const room = await storage.getRoom(req.params.id);
      const property = room ? await storage.getProperty(room.propertyId) : void 0;
      if (!room || !roomPubliclyVisible(room, property)) {
        return res.status(404).json({ message: "Room not found" });
      }
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
      res.json(buildQuote(resolved, paymentMethod, await getCardSurchargeRate()));
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/booking-intent", checkoutLimiter, async (req, res, next) => {
    try {
      const parsed = bookingIntentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid request" });
      }
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet (Stripe key not set)." });
      }
      const { propertyId, roomId, checkIn, checkOut, guest } = parsed.data;
      const resolved = await resolveBooking({ propertyId, roomId, checkIn, checkOut });
      const quote = buildQuote(resolved, "STRIPE", await getCardSurchargeRate());
      const reference = generateReference();
      const dueNow = quote.dueNow.total;
      const surcharge = quote.dueNow.surcharge;
      const metadata = buildShortStayIntentMetadata({
        entity: resolved.property.entity,
        property: resolved.property,
        room: resolved.room ?? null,
        model: resolved.model,
        checkIn: resolved.checkIn,
        checkOut: resolved.checkOut,
        reference,
        quotedTotal: dueNow,
        amount: dueNow - surcharge,
        surcharge,
        rateCadence: resolved.model === "COLIVING" ? "WEEKLY" : resolved.rateTier ?? null,
        guest: guest ?? void 0
      });
      const paymentIntent = await createOneTimePaymentIntent({
        amount: dueNow,
        guestEmail: guest?.email ?? "",
        reference,
        metadata,
        idempotencyKey: `intent:${reference}`
      });
      try {
        await storage.createBookingIntent({
          reference,
          stripePaymentIntentId: paymentIntent.id,
          propertyId: resolved.property.id,
          roomId: resolved.room?.id ?? null,
          model: resolved.model,
          checkIn: resolved.checkIn,
          checkOut: resolved.checkOut ?? null,
          quotedTotal: String(dueNow),
          guestName: guest?.name ?? null,
          guestEmail: guest?.email ? guest.email.trim().toLowerCase() : null,
          guestPhone: guest?.phone ?? null,
          contactAttachedAt: guest?.email ? /* @__PURE__ */ new Date() : null
        });
      } catch (recErr) {
        log(`booking_intents write failed for ${reference}: ${recErr.message}`, "checkout");
      }
      res.json({
        reference,
        clientSecret: paymentIntent.client_secret,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY,
        paymentIntentId: paymentIntent.id,
        quote
      });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/booking-intent/:id/contact", async (req, res, next) => {
    try {
      const schema = z4.object({
        name: z4.string().min(1, "Name required"),
        email: z4.string().email("Valid email required"),
        phone: z4.string().optional()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid contact" });
      }
      if (!isStripeConfigured()) {
        return res.status(503).json({ message: "Card payments aren't enabled yet." });
      }
      let pi;
      try {
        pi = await retrievePaymentIntent(req.params.id);
      } catch {
        return res.status(404).json({ message: "Checkout not found" });
      }
      if (!isOpenShortStayIntent(pi)) {
        return res.status(404).json({ message: "Checkout not found" });
      }
      await updatePaymentIntentContact({
        paymentIntentId: pi.id,
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone
      });
      try {
        await storage.attachBookingIntentContact(pi.id, parsed.data);
      } catch (recErr) {
        log(`booking_intents contact update failed for ${pi.id}: ${recErr.message}`, "checkout");
      }
      res.json({ ok: true });
    } catch (err) {
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
  app.post("/api/leases", leaseCreateLimiter, async (req, res, next) => {
    try {
      const parsed = createDraftLeaseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message ?? "Invalid lease request" });
      }
      const { lease, documentHtml } = await createDraftLease(parsed.data);
      posthog.identify({
        distinctId: parsed.data.guest.email,
        properties: { name: parsed.data.guest.name, email: parsed.data.guest.email, phone: parsed.data.guest.phone ?? void 0 }
      });
      posthog.capture({
        distinctId: parsed.data.guest.email,
        event: "lease_created",
        properties: {
          lease_id: lease.id,
          property_id: parsed.data.propertyId,
          room_ids: parsed.data.roomIds,
          start_date: parsed.data.startDate,
          end_date: parsed.data.endDate,
          cadence: parsed.data.cadence
        }
      });
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
      const signedGuest = await storage.getGuest(lease.guestId);
      if (signedGuest) {
        posthog.capture({
          distinctId: signedGuest.email,
          event: "lease_signed",
          properties: {
            lease_id: lease.id,
            property_id: lease.propertyId,
            signed_name: parsed.data.signedName,
            cadence: lease.paymentCadence,
            total_lease_value: lease.totalLeaseValue
          }
        });
      }
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
      const payResult = await payInstallmentNow(req.params.token, seq);
      const portalData = await getPortalView(req.params.token).catch(() => null);
      const portalGuestEmail = portalData?.guest?.email;
      if (portalGuestEmail) {
        posthog.capture({
          distinctId: portalGuestEmail,
          event: "portal_installment_paid",
          properties: {
            portal_token: req.params.token,
            schedule_seq: seq
          }
        });
      }
      res.json(payResult);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/pay/:seq/manual", async (req, res, next) => {
    try {
      const seq = parseInt(req.params.seq, 10);
      if (!Number.isFinite(seq)) return res.status(400).json({ message: "Invalid installment" });
      const schema = z4.object({ method: z4.enum(["CASHAPP", "ZELLE"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: "method must be CASHAPP or ZELLE" });
      const instructions = await electManualInstallment(req.params.token, seq, parsed.data.method);
      const portalData = await getPortalView(req.params.token).catch(() => null);
      const portalGuestEmail = portalData?.guest?.email;
      if (portalGuestEmail) {
        posthog.capture({
          distinctId: portalGuestEmail,
          event: "portal_installment_manual_elected",
          properties: {
            portal_token: req.params.token,
            schedule_seq: seq,
            method: parsed.data.method,
            amount: instructions.amount
          }
        });
      }
      res.json(instructions);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/messages", async (req, res, next) => {
    try {
      const schema = z4.object({
        category: z4.enum(["QUESTION", "MAINTENANCE", "OTHER"]).optional(),
        subject: z4.string().max(200).optional(),
        body: z4.string().min(1, "Message can't be empty").max(5e3)
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const msg = await submitMessage(req.params.token, parsed.data);
      const msgPortalData = await getPortalView(req.params.token).catch(() => null);
      const msgGuestEmail = msgPortalData?.guest?.email;
      if (msgGuestEmail) {
        posthog.capture({
          distinctId: msgGuestEmail,
          event: "guest_message_submitted",
          properties: {
            category: parsed.data.category ?? null,
            subject: parsed.data.subject ?? null
          }
        });
      }
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
      const schema = z4.object({ body: z4.string().min(1).max(5e3) });
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
      const licPortalData = await getPortalView(req.params.token).catch(() => null);
      const licGuestEmail = licPortalData?.guest?.email;
      if (licGuestEmail) {
        posthog.capture({
          distinctId: licGuestEmail,
          event: "license_uploaded",
          properties: { portal_token: req.params.token }
        });
      }
      res.status(201).json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/portal/:token/vehicle", async (req, res, next) => {
    try {
      const schema = z4.object({
        hasVehicle: z4.boolean(),
        make: z4.string().max(60).nullish(),
        model: z4.string().max(60).nullish(),
        year: z4.number().int().min(1900).max(2100).nullish(),
        color: z4.string().max(40).nullish(),
        plate: z4.string().max(15).nullish(),
        plateState: z4.enum(US_STATE_CODES).nullish()
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
      const depositLease = await storage.getLease(req.params.id);
      if (depositLease) {
        const depositGuest = await storage.getGuest(depositLease.guestId);
        if (depositGuest) {
          posthog.capture({
            distinctId: depositGuest.email,
            event: "deposit_payment_started",
            properties: {
              lease_id: req.params.id,
              property_id: depositLease.propertyId,
              amount: result.amount
            }
          });
        }
      }
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
  app.get("/api/payments/config", async (_req, res, next) => {
    try {
      res.json({
        stripeEnabled: isStripeConfigured() && stripePublishableConfigured(),
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY ?? null,
        // Live card surcharge so the client renders the real percentage.
        cardSurchargeRate: await getCardSurchargeRate()
      });
    } catch (err) {
      next(err);
    }
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
      const schema = z4.object({ days: z4.number().int().min(1).max(120) });
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
      const approveResult = await approveVerification(req.params.id, adminActor(req));
      const verifiedLease = await storage.getLease(req.params.id);
      if (verifiedLease) {
        const verifiedGuest = await storage.getGuest(verifiedLease.guestId);
        if (verifiedGuest) {
          posthog.capture({
            distinctId: verifiedGuest.email,
            event: "verification_approved",
            properties: {
              lease_id: req.params.id,
              property_id: verifiedLease.propertyId,
              actor: adminActor(req)
            }
          });
        }
      }
      res.json(approveResult);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/leases/:id/reject-verification", requireAdmin, async (req, res, next) => {
    try {
      const schema = z4.object({ reason: z4.string().min(1, "A reason is required").max(500) });
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
  app.post("/api/bookings", (_req, res) => {
    res.status(410).json({
      message: "Manual booking is no longer offered here. Card payments use /api/booking-intent (payment-first)."
    });
  });
  app.get("/api/lookup", async (req, res, next) => {
    try {
      const schema = z4.object({ reference: z4.string().min(1), email: z4.string().email() });
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
  const bookingIntentsHandler = async (req, res, next) => {
    try {
      const email = typeof req.query.email === "string" ? req.query.email : void 0;
      const days = typeof req.query.days === "string" ? parseInt(req.query.days, 10) : 30;
      const since = new Date(Date.now() - (Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30) * 864e5);
      const intents = await storage.getBookingIntents({ guestEmail: email, since, limit: 200 });
      const now = /* @__PURE__ */ new Date();
      const rows = await Promise.all(
        intents.map(async (i) => {
          const booking = await storage.getBookingByReference(i.reference);
          return {
            ...i,
            status: bookingIntentStatus(i, { hasBooking: Boolean(booking), now }),
            bookingId: booking?.id ?? null,
            bookingStatus: booking?.status ?? null
          };
        })
      );
      res.json({ intents: rows });
    } catch (e) {
      next(e);
    }
  };
  app.get("/api/uo/booking-intents", requireServiceToken, bookingIntentsHandler);
  app.get("/api/admin/booking-intents", requireAdmin, bookingIntentsHandler);
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
      const schema = z4.object({ scheduleSeq: z4.number().int(), note: z4.string().min(1), actor: z4.string().min(1) });
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
      const schema = z4.object({ body: z4.string().min(1), actor: z4.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await respondToMessage({ threadId: req.params.threadId, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/escalations/:id/resolve", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ actor: z4.string().min(1), status: z4.enum(["ACKNOWLEDGED", "RESOLVED"]).optional() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await resolveEscalation({ escalationId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/leases/:id/waive-late-fee", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ scheduleSeq: z4.number().int(), reason: z4.string().min(1), actor: z4.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await waiveLateFees({ leaseId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  const actorBody = z4.string().min(1, "actor is required");
  const pricingValuesSchema = z4.object({
    lateFeePerDay: z4.number().optional(),
    cardSurchargeRate: z4.number().optional()
  });
  const uoPricingSettingsBody = pricingValuesSchema.extend({ actor: actorBody });
  const getPricingSettingsHandler = async (_req, res, next) => {
    try {
      res.json(await getPricingSettings());
    } catch (e) {
      uoErr(e, res, next);
    }
  };
  const putPricingSettingsHandler = (bodySchema, actorFrom) => async (req, res, next) => {
    try {
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const { lateFeePerDay, cardSurchargeRate } = parsed.data;
      res.json(await updatePricingSettings({ lateFeePerDay, cardSurchargeRate }, actorFrom(req, parsed.data)));
    } catch (e) {
      uoErr(e, res, next);
    }
  };
  app.get("/api/uo/settings/pricing", requireServiceToken, getPricingSettingsHandler);
  app.put(
    "/api/uo/settings/pricing",
    requireServiceToken,
    putPricingSettingsHandler(uoPricingSettingsBody, (_req, parsed) => `uo:${parsed.actor}`)
  );
  app.get("/api/admin/settings/pricing", requireAdmin, getPricingSettingsHandler);
  app.put(
    "/api/admin/settings/pricing",
    requireAdmin,
    putPricingSettingsHandler(pricingValuesSchema, (req) => adminActor(req))
  );
  app.patch("/api/uo/properties/:id", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ actor: actorBody, patch: z4.record(z4.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await updateProperty({ propertyId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.patch("/api/uo/rooms/:id", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ actor: actorBody, patch: z4.record(z4.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.json(await updateRoom({ roomId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/properties", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ actor: actorBody, property: z4.record(z4.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await createProperty(parsed.data));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  app.post("/api/uo/properties/:id/rooms", requireServiceToken, async (req, res, next) => {
    try {
      const schema = z4.object({ actor: actorBody, room: z4.record(z4.unknown()) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      res.status(201).json(await createRoom({ propertyId: req.params.id, ...parsed.data }));
    } catch (e) {
      uoErr(e, res, next);
    }
  });
  function messagingErr(err, res, next) {
    if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
    if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
    next(err);
  }
  function uoActor(req) {
    const raw = typeof req.body?.actor === "string" ? req.body.actor : typeof req.query.actor === "string" ? req.query.actor : void 0;
    if (!raw) throw new LeaseError("actor is required", 400);
    return `uo:${raw}`;
  }
  function actorLogTag(actor) {
    return actor.startsWith("uo:") ? "uo" : "admin";
  }
  const newThreadBodySchema = z4.object({
    bookingId: z4.string().optional(),
    leaseId: z4.string().optional(),
    subject: z4.string().optional(),
    body: z4.string().min(1),
    channels: z4.array(z4.enum(["EMAIL", "SMS"])).min(1)
  });
  const replyBodySchema = z4.object({
    body: z4.string().min(1),
    channels: z4.array(z4.enum(["EMAIL", "SMS"])).min(1)
  });
  const createBlockBodySchema = insertManualBlockSchema.omit({ source: true, createdBy: true });
  const autoNotifyBodySchema = z4.object({ enabled: z4.boolean() });
  function messageHandlers(source, actorFrom) {
    return {
      listThreads: async (req, res, next) => {
        try {
          const status = typeof req.query.status === "string" ? req.query.status : void 0;
          let limit;
          if (typeof req.query.limit === "string") {
            const n = parseInt(req.query.limit, 10);
            if (Number.isFinite(n)) limit = n;
          }
          res.json({ threads: await listThreads({ status, limit }) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      getThreadDetail: async (req, res, next) => {
        try {
          res.json(await getThread2(req.params.threadId));
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      createThread: async (req, res, next) => {
        try {
          const parsed = newThreadBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          const actor = actorFrom(req);
          res.json(await sendStaffMessage({ ...parsed.data, actor }));
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      reply: async (req, res, next) => {
        try {
          const parsed = replyBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          const actor = actorFrom(req);
          res.json(
            await sendStaffMessage({ threadId: req.params.threadId, ...parsed.data, actor })
          );
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      messageLog: async (req, res, next) => {
        try {
          const bookingId = typeof req.query.bookingId === "string" ? req.query.bookingId : void 0;
          const leaseId = typeof req.query.leaseId === "string" ? req.query.leaseId : void 0;
          const guestId = typeof req.query.guestId === "string" ? req.query.guestId : void 0;
          const limit = typeof req.query.limit === "string" ? boundedMessageLogLimit(parseInt(req.query.limit, 10)) : void 0;
          const all = !bookingId && !leaseId && !guestId;
          res.json({ log: await storage.getMessageLog({ bookingId, leaseId, guestId, limit, all }) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      listBlocks: async (req, res, next) => {
        try {
          const propertyId = typeof req.query.propertyId === "string" ? req.query.propertyId : void 0;
          res.json({ blocks: await storage.getManualBlocks({ propertyId }) });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      createBlock: async (req, res, next) => {
        try {
          const parsed = createBlockBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          if (parsed.data.endDate <= parsed.data.startDate) {
            return res.status(400).json({ message: "endDate must be after startDate" });
          }
          const [blockProperty, blockRoom] = await Promise.all([
            storage.getProperty(parsed.data.propertyId),
            parsed.data.roomId ? storage.getRoom(parsed.data.roomId) : Promise.resolve(void 0)
          ]);
          const check = validateManualBlockInput({
            property: blockProperty,
            room: blockRoom,
            roomId: parsed.data.roomId
          });
          if (!check.ok) return res.status(400).json({ message: check.message });
          const actor = actorFrom(req);
          const block = await storage.createManualBlock({ ...parsed.data, source, createdBy: actor });
          res.json(block);
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      deleteBlock: async (req, res, next) => {
        try {
          const actor = actorFrom(req);
          const deleted = await storage.deleteManualBlock(req.params.id);
          if (!deleted) return res.status(404).json({ message: "Block not found" });
          log(`manual block ${req.params.id} deleted by ${actor}`, actorLogTag(actor));
          res.json({ ok: true });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      calendarRefresh: async (req, res, next) => {
        try {
          const actor = actorFrom(req);
          log(`calendar refresh triggered by ${actor}`, actorLogTag(actor));
          res.json(await refreshExternalCalendars());
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      calendarStatus: async (_req, res, next) => {
        try {
          const [lastSyncAtRow, lastResultRow] = await Promise.all([
            storage.getSetting("ical_last_sync_at"),
            storage.getSetting("ical_last_sync_result")
          ]);
          let lastResult = null;
          if (lastResultRow?.value) {
            try {
              lastResult = JSON.parse(lastResultRow.value);
            } catch {
              lastResult = null;
            }
          }
          res.json({ lastSyncAt: lastSyncAtRow?.value ?? null, lastResult });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      // Guest picker: everyone currently reachable — active/upcoming bookings
      // plus non-terminal leases — with enough context (property, reference)
      // to start a new staff message thread against the right one. Both
      // halves are single joined queries (getBookingsWithGuest /
      // getActiveLeasesWithGuest) — no per-row getGuest/getProperty loop.
      guests: async (_req, res, next) => {
        try {
          const [bookingsWithGuest, activeLeases] = await Promise.all([
            storage.getBookingsWithGuest({ from: todayIso() }),
            storage.getActiveLeasesWithGuest()
          ]);
          const leaseRows = activeLeases.map((l) => ({
            leaseId: l.id,
            guestId: l.guestId,
            guestName: l.guest.name,
            guestEmail: l.guest.email,
            guestPhone: l.guest.phone,
            propertyId: l.propertyId,
            propertyName: l.property.name,
            status: l.status,
            startDate: l.startDate,
            endDate: l.endDate
          }));
          const bookingRows = bookingsWithGuest.map((b) => ({
            bookingId: b.id,
            guestId: b.guestId,
            guestName: b.guest.name,
            guestEmail: b.guest.email,
            guestPhone: b.guest.phone,
            propertyId: b.propertyId,
            propertyName: b.property.name,
            reference: b.reference,
            status: b.status,
            checkIn: b.checkIn,
            checkOut: b.checkOut
          }));
          res.json({ bookings: bookingRows, leases: leaseRows });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      getAutoNotify: async (_req, res, next) => {
        try {
          const row = await storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING);
          res.json({ enabled: row ? row.value === "true" : true });
        } catch (e) {
          messagingErr(e, res, next);
        }
      },
      putAutoNotify: async (req, res, next) => {
        try {
          const parsed = autoNotifyBodySchema.safeParse(req.body);
          if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
          const actor = actorFrom(req);
          await storage.setSetting(GUEST_AUTO_NOTIFICATIONS_SETTING, parsed.data.enabled ? "true" : "false");
          log(
            `${GUEST_AUTO_NOTIFICATIONS_SETTING} set to ${parsed.data.enabled} by ${actor}`,
            actorLogTag(actor)
          );
          res.json({ enabled: parsed.data.enabled });
        } catch (e) {
          messagingErr(e, res, next);
        }
      }
    };
  }
  function mountMessagingRoutes(prefix, authMiddleware, source, actorFrom) {
    const h = messageHandlers(source, actorFrom);
    app.get(`${prefix}/messages`, authMiddleware, h.listThreads);
    app.get(`${prefix}/messages/:threadId`, authMiddleware, h.getThreadDetail);
    app.post(`${prefix}/messages`, authMiddleware, h.createThread);
    app.post(`${prefix}/messages/:threadId/reply`, authMiddleware, h.reply);
    app.get(`${prefix}/message-log`, authMiddleware, h.messageLog);
    app.get(`${prefix}/blocks`, authMiddleware, h.listBlocks);
    app.post(`${prefix}/blocks`, authMiddleware, h.createBlock);
    app.delete(`${prefix}/blocks/:id`, authMiddleware, h.deleteBlock);
    app.post(`${prefix}/calendar/refresh`, authMiddleware, h.calendarRefresh);
    app.get(`${prefix}/calendar/status`, authMiddleware, h.calendarStatus);
    app.get(`${prefix}/guests`, authMiddleware, h.guests);
    app.get(`${prefix}/settings/guest-auto-notifications`, authMiddleware, h.getAutoNotify);
    app.put(`${prefix}/settings/guest-auto-notifications`, authMiddleware, h.putAutoNotify);
  }
  mountMessagingRoutes("/api/admin", requireAdmin, "ADMIN", adminActor);
  mountMessagingRoutes("/api/uo", requireServiceToken, "UO", uoActor);
  app.post("/api/uo/bookings/:id/confirm", requireServiceToken, async (req, res, next) => {
    try {
      const actor = uoActor(req);
      const booking = await confirmConflictBooking(req.params.id, actor);
      res.json({ ok: true, booking });
    } catch (e) {
      messagingErr(e, res, next);
    }
  });
  app.post("/api/uo/bookings/:id/cancel", requireServiceToken, async (req, res, next) => {
    try {
      const actor = uoActor(req);
      const refund = req.body?.refund === true;
      const result = await cancelBooking({ bookingId: req.params.id, actor, refund });
      res.json({ ok: true, ...result });
    } catch (e) {
      messagingErr(e, res, next);
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
  app.post("/api/stay/claim", checkoutLimiter, async (req, res, next) => {
    try {
      const schema = z4.object({
        reference: z4.string().min(4).max(40),
        email: z4.string().email()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Enter your reference and the email you booked with." });
      }
      const booking = await storage.getBookingByReference(parsed.data.reference.trim().toUpperCase());
      if (!booking) return res.status(202).json({ pending: true });
      const guest = await storage.getGuest(booking.guestId);
      if (!guest || guest.email.toLowerCase() !== parsed.data.email.trim().toLowerCase()) {
        return res.status(404).json({ message: "We could not find that booking." });
      }
      const gate = await storage.getBookingGate(booking.id);
      if (!gate) {
        return res.json({ gated: false, reference: booking.reference, status: booking.status });
      }
      res.json({ gated: true, reference: booking.reference, token: gate.gateToken });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/stay/:token", async (req, res, next) => {
    try {
      res.json(await getStayView(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/stay/:token/agreement/preview", async (req, res, next) => {
    try {
      res.type("html").send(await previewStayAgreement(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/stay/:token/agreement", async (req, res, next) => {
    try {
      res.type("html").send(await getSignedStayAgreement(req.params.token));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/stay/:token/sign", stayDocsLimiter, async (req, res, next) => {
    try {
      const schema = z4.object({
        signedName: z4.string().min(2).max(200),
        affirmed: z4.boolean()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message });
      }
      const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
      const signed = await signStayAgreement({
        token: req.params.token,
        signedName: parsed.data.signedName,
        affirmed: parsed.data.affirmed,
        ip
      });
      posthog.capture({
        distinctId: req.params.token,
        event: "stay_agreement_signed",
        properties: { signed_at: signed.signedAt.toISOString() }
      });
      res.json(signed);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post(
    "/api/stay/:token/license",
    stayDocsLimiter,
    upload.single("file"),
    async (req, res, next) => {
      try {
        res.json(await uploadStayLicense(req.params.token, toUploadedFile(req.file)));
      } catch (err) {
        if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
        next(err);
      }
    }
  );
  app.get("/api/stay/:token/extension-options", async (req, res, next) => {
    try {
      const stay = await resolveStay(req.params.token);
      res.json(await extensionOptions(stay.booking.id));
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/stay/:token/extension-intent", checkoutLimiter, async (req, res, next) => {
    try {
      const schema = z4.object({ newCheckOut: z4.string().regex(/^\d{4}-\d{2}-\d{2}$/) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Pick a valid new checkout date." });
      }
      const stay = await resolveStay(req.params.token);
      const started = await startExtension({
        bookingId: stay.booking.id,
        newCheckOut: parsed.data.newCheckOut
      });
      res.json({
        clientSecret: started.clientSecret,
        paymentIntentId: started.paymentIntentId,
        quote: started.quote,
        publishableKey: process.env.VITE_STRIPE_PUBLIC_KEY
      });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/admin/stay-approvals", requireAdmin, async (_req, res, next) => {
    try {
      res.json(await listPendingApprovals());
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/admin/stays/:id/license-url", requireAdmin, async (req, res, next) => {
    try {
      res.json({ url: await getStayLicenseViewUrl(req.params.id) });
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.get("/api/admin/stays/:id/agreement", requireAdmin, async (req, res, next) => {
    try {
      const gate = await storage.getBookingGate(req.params.id);
      if (!gate?.agreementDocumentHtml) {
        return res.status(404).json({ message: "No signed agreement on file." });
      }
      res.type("html").send(gate.agreementDocumentHtml);
    } catch (err) {
      next(err);
    }
  });
  app.post("/api/admin/stays/:id/approve", requireAdmin, async (req, res, next) => {
    try {
      const schema = z4.object({
        // Shape is validated again inside approveStay via the SHARED schema — a
        // client-side check is not a check.
        doorCode: z4.string().min(1, "A door code is required"),
        nameMatches: z4.literal(true, {
          errorMap: () => ({ message: "Confirm the name on the licence matches the guest." })
        })
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message });
      }
      const result = await approveStay({
        bookingId: req.params.id,
        actor: adminActor(req),
        doorCode: parsed.data.doorCode,
        nameMatches: parsed.data.nameMatches
      });
      posthog.capture({
        distinctId: result.reference,
        event: "stay_approved",
        properties: { booking_id: req.params.id, actor: adminActor(req) }
      });
      res.json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/stays/:id/request-fix", requireAdmin, async (req, res, next) => {
    try {
      const schema = z4.object({
        reason: z4.string().min(5, "Tell the guest what to fix").max(1e3),
        what: z4.enum(["LICENSE", "AGREEMENT", "BOTH"]).default("LICENSE")
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message });
      }
      res.json(
        await requestStayFix({
          bookingId: req.params.id,
          actor: adminActor(req),
          reason: parsed.data.reason,
          what: parsed.data.what
        })
      );
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/stays/:id/decline-refund", requireAdmin, declineLimiter, async (req, res, next) => {
    try {
      const schema = z4.object({
        reason: z4.string().min(5, "A reason is required").max(1e3),
        confirm: z4.string().min(1, "Type the booking reference to confirm"),
        expectedRefundAmount: z4.number().nonnegative().optional()
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message });
      }
      const result = await declineAndRefundBooking({
        bookingId: req.params.id,
        actor: adminActor(req),
        reason: parsed.data.reason,
        confirm: parsed.data.confirm,
        kind: "GATE_DECLINE",
        expectedRefundAmount: parsed.data.expectedRefundAmount
      });
      if (result.failed.length > 0) return res.status(502).json(result);
      res.json(result);
    } catch (err) {
      if (err instanceof LeaseError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  const accessInfoRoutes = (prefix, guard) => {
    app.get(`${prefix}/properties/:id/access-info`, guard, async (req, res, next) => {
      try {
        res.json({ info: await storage.getPropertyAccessInfo(req.params.id) ?? {} });
      } catch (err) {
        next(err);
      }
    });
    app.put(`${prefix}/properties/:id/access-info`, guard, async (req, res, next) => {
      try {
        const schema = z4.object({
          actor: z4.string().min(1).optional(),
          info: propertyAccessInfoSchema
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.errors[0]?.message });
        }
        const actor = parsed.data.actor ?? adminActor(req);
        res.json({
          info: await storage.upsertPropertyAccessInfo(req.params.id, parsed.data.info, actor)
        });
      } catch (err) {
        next(err);
      }
    });
    app.get(`${prefix}/rooms/:id/access-info`, guard, async (req, res, next) => {
      try {
        res.json({ info: await storage.getRoomAccessInfo(req.params.id) ?? {} });
      } catch (err) {
        next(err);
      }
    });
    app.put(`${prefix}/rooms/:id/access-info`, guard, async (req, res, next) => {
      try {
        const schema = z4.object({
          actor: z4.string().min(1).optional(),
          info: roomAccessInfoSchema
        });
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
          return res.status(400).json({ message: parsed.error.errors[0]?.message });
        }
        const actor = parsed.data.actor ?? adminActor(req);
        res.json({ info: await storage.upsertRoomAccessInfo(req.params.id, parsed.data.info, actor) });
      } catch (err) {
        next(err);
      }
    });
  };
  accessInfoRoutes("/api/admin", requireAdmin);
  accessInfoRoutes("/api/uo", requireServiceToken);
  app.post("/api/admin/bookings/:id/cancel", requireAdmin, async (req, res, next) => {
    try {
      const refund = req.body?.refund === true;
      const result = await cancelBooking({
        bookingId: req.params.id,
        actor: adminActor(req),
        refund
      });
      res.json({ ok: true, ...result });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
      next(err);
    }
  });
  app.post("/api/admin/bookings/:id/confirm", requireAdmin, async (req, res, next) => {
    try {
      const booking = await confirmConflictBooking(req.params.id, adminActor(req));
      res.json({ ok: true, booking });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
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
      const adminId = req.user.id;
      const { payment, booking } = await settleManualBookingPayment({
        paymentId: req.params.id,
        adminId,
        actor: adminActor(req)
      });
      if (booking) {
        const manualGuest = await storage.getGuest(booking.guestId);
        if (manualGuest) {
          posthog.capture({
            distinctId: manualGuest.email,
            event: "manual_payment_confirmed",
            properties: {
              payment_id: payment.id,
              booking_id: payment.bookingId,
              booking_reference: booking.reference,
              payment_method: payment.method,
              amount: payment.amount,
              property_id: booking.propertyId,
              confirmed_by: adminActor(req)
            }
          });
        }
      }
      res.json({ payment });
    } catch (err) {
      if (err instanceof BookingError) return res.status(err.status).json({ message: err.message });
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
      const liveStatus = postPaymentStatusFor(booking);
      await storage.updateBooking(booking.id, { status: liveStatus });
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
      const confirmedGuest = await storage.getGuest(booking.guestId);
      if (confirmedGuest) {
        posthog.capture({
          distinctId: confirmedGuest.email,
          event: "booking_confirmed",
          properties: {
            reference,
            booking_id: booking.id,
            property_id: booking.propertyId,
            property_type: booking.model,
            room_id: booking.roomId ?? null,
            check_in: booking.checkIn,
            check_out: booking.checkOut
          }
        });
        const confirmedProperty = await storage.getProperty(booking.propertyId);
        const confirmedRoom = booking.roomId ? await storage.getRoom(booking.roomId) : null;
        if (confirmedProperty) {
          await onBookingConfirmed({
            booking: { ...booking, status: liveStatus },
            property: confirmedProperty,
            room: confirmedRoom,
            guest: confirmedGuest
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
      const hasLease = pi.metadata?.lease_id && pi.metadata.lease_id !== "null";
      const isExtension = Boolean(pi.metadata?.extension_booking_id);
      if (isExtension) {
        await applyExtension(pi);
      } else if (kind === "BOOKING_DEPOSIT" && !hasLease) {
        await materializeShortStayBooking(pi);
      } else if (kind === "BOOKING_DEPOSIT" && hasLease) {
        await finalizeDepositPayment(pi.id);
        const depositedLease = await storage.getLease(pi.metadata.lease_id);
        if (depositedLease) {
          const depositedGuest = await storage.getGuest(depositedLease.guestId);
          if (depositedGuest) {
            posthog.capture({
              distinctId: depositedGuest.email,
              event: "lease_activated",
              properties: {
                lease_id: depositedLease.id,
                property_id: depositedLease.propertyId,
                payment_intent_id: pi.id,
                amount: pi.amount / 100
              }
            });
          }
        }
      } else if (kind === "FIRST_PAYMENT") {
        await finalizeFirstPayment(pi.id);
      } else if (kind === "CLEANING_FEE") {
        const leaseId = pi.metadata?.lease_id;
        if (leaseId && leaseId !== "null") {
          const feeLease = await storage.getLease(leaseId);
          if (feeLease && feeLease.cleaningFeeStatus !== "PAID") {
            await storage.updateLease(leaseId, {
              cleaningFeeStatus: "PAID",
              cleaningFeePaidAt: /* @__PURE__ */ new Date(),
              cleaningFeeStripePaymentIntentId: pi.id
            });
          }
        }
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
            if (lease) {
              const rentGuest = await storage.getGuest(lease.guestId);
              if (rentGuest) {
                posthog.capture({
                  distinctId: rentGuest.email,
                  event: "scheduled_rent_paid",
                  properties: {
                    lease_id: leaseId,
                    schedule_seq: seq,
                    amount: pi.amount / 100,
                    payment_intent_id: pi.id
                  }
                });
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
      let dunningHandled = false;
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
              posthog.capture({
                distinctId: guest.email,
                event: "payment_failed",
                properties: {
                  lease_id: leaseId,
                  schedule_seq: seq,
                  amount: pi.amount / 100,
                  failure_reason: pi.last_payment_error?.message ?? null,
                  payment_intent_id: pi.id
                }
              });
              try {
                await handleChargeFailure({ lease, guest, scheduleRow: failed, reason: pi.last_payment_error?.message });
                dunningHandled = true;
              } catch (dErr) {
                log(`webhook failure-path error ${leaseId} seq ${seq}: ${dErr.message}`, "stripe");
              }
            }
          }
        }
      }
      if (!dunningHandled) {
        await notifyAdmin({
          subject: `Card charge FAILED \u2014 ${kind ?? "untagged"} ($${(pi.amount / 100).toFixed(2)})`,
          body: `PaymentIntent ${pi.id} (${kind ?? "untagged"}) failed${pi.metadata?.lease_id && pi.metadata.lease_id !== "null" ? ` for lease ${pi.metadata.lease_id}` : ""}${pi.metadata?.schedule_seq ? ` installment #${pi.metadata.schedule_seq}` : ""}: ${pi.last_payment_error?.message ?? "no reason given"}.`,
          context: {
            leaseId: pi.metadata?.lease_id && pi.metadata.lease_id !== "null" ? pi.metadata.lease_id : null,
            kind: "PAYMENT_FAILED"
          }
        });
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
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://js.stripe.com",
            "https://us-assets.i.posthog.com"
          ],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
          imgSrc: ["'self'", "data:", "blob:", "https:"],
          connectSrc: [
            "'self'",
            "https://api.stripe.com",
            "https://*.stripe.com",
            "https://*.i.posthog.com"
          ],
          frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"]
        }
      },
      crossOriginEmbedderPolicy: false
    })
  );
  const STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";
  const skipWebhook = (parser) => (req, res, next) => req.path === STRIPE_WEBHOOK_PATH ? next() : parser(req, res, next);
  app.use(skipWebhook(express2.json({ limit: "10mb" })));
  app.use(skipWebhook(express2.urlencoded({ extended: false, limit: "10mb" })));
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
  app.use((err, req, res, _next) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      const user = req.user;
      posthog.captureException(err, user?.email ?? "anonymous");
    }
    res.status(status).json({ message: clientErrorMessage(err, status, isDev) });
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

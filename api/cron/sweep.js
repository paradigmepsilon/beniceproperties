var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/cron/sweep.ts
import "dotenv/config";

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
  LATE_FEE_PER_DAY: () => LATE_FEE_PER_DAY,
  LATE_FEE_STATUSES: () => LATE_FEE_STATUSES,
  LEASE_STATUSES: () => LEASE_STATUSES,
  MAX_LEASE_DAYS: () => MAX_LEASE_DAYS,
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
  bookings: () => bookings,
  guests: () => guests,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertGuestSchema: () => insertGuestSchema,
  insertKpiSnapshotSchema: () => insertKpiSnapshotSchema,
  insertLateFeeSchema: () => insertLateFeeSchema,
  insertLeaseRoomSchema: () => insertLeaseRoomSchema,
  insertLeaseSchema: () => insertLeaseSchema,
  insertPaymentScheduleSchema: () => insertPaymentScheduleSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  kpiSnapshots: () => kpiSnapshots,
  lateFees: () => lateFees,
  leaseRooms: () => leaseRooms,
  leases: () => leases,
  paymentSchedule: () => paymentSchedule,
  payments: () => payments,
  properties: () => properties,
  rooms: () => rooms,
  subscriptions: () => subscriptions
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
    schedule_seq: str(args.scheduleSeq)
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
      if (row.scheduleSeq === 1) continue;
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
    } else {
      await storage.updateScheduleRow(row.id, {
        status: "DUE",
        stripePaymentIntentId: pi.id
      });
      result.skipped += 1;
    }
  } catch (err) {
    const piId = err?.raw?.payment_intent?.id;
    await storage.updateScheduleRow(row.id, {
      status: "FAILED",
      stripePaymentIntentId: piId ?? row.stripePaymentIntentId ?? null
    });
    result.failed += 1;
    log(`rent charge FAILED lease ${lease.id} seq ${row.scheduleSeq}: ${err.message}`, "scheduler");
  }
}
function todayYmd() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}

// api-src/cron/sweep.ts
async function handler(req, res) {
  const secret2 = process.env.CRON_SECRET;
  if (secret2 && req.headers.authorization !== `Bearer ${secret2}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const rent = await runScheduledRentSweep();
    const active = (await storage.getBookings({ status: "ACTIVE" })).length;
    if (active > 0) log(`weeklyRentRun: ${active} active co-living booking(s) checked`, "cron");
    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "cron");
    }
    const snapshot = await buildAndPushSnapshot();
    return res.json({ ok: true, rent, active, pending: pending.length, snapshot });
  } catch (err) {
    log(`sweep error: ${err.message}`, "cron");
    return res.status(500).json({ ok: false, message: err.message });
  }
}
export {
  handler as default
};

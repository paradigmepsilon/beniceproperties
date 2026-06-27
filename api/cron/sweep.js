var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// api-src/cron/sweep.ts
import "dotenv/config";

// server/storage.ts
import { desc, eq } from "drizzle-orm";

// server/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  BOOKING_MODELS: () => BOOKING_MODELS,
  BOOKING_STATUSES: () => BOOKING_STATUSES,
  PAYMENT_METHODS: () => PAYMENT_METHODS,
  PAYMENT_STATUSES: () => PAYMENT_STATUSES,
  PAYMENT_TYPES: () => PAYMENT_TYPES,
  PROPERTY_TYPES: () => PROPERTY_TYPES,
  ROOM_STATUSES: () => ROOM_STATUSES,
  adminUsers: () => adminUsers,
  bookings: () => bookings,
  guests: () => guests,
  insertAdminUserSchema: () => insertAdminUserSchema,
  insertBookingSchema: () => insertBookingSchema,
  insertGuestSchema: () => insertGuestSchema,
  insertKpiSnapshotSchema: () => insertKpiSnapshotSchema,
  insertPaymentSchema: () => insertPaymentSchema,
  insertPropertySchema: () => insertPropertySchema,
  insertRoomSchema: () => insertRoomSchema,
  insertSubscriptionSchema: () => insertSubscriptionSchema,
  kpiSnapshots: () => kpiSnapshots,
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
var properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  // Free-text location label, e.g. "Atlanta" | "Antigua". Kept as text (not an
  // enum) so new markets don't require a migration.
  location: text("location").notNull(),
  // "STR" (book the whole place) | "COLIVING" (book a room within it).
  type: text("type").notNull().default("STR"),
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
  photos: z.array(z.string()).optional(),
  amenities: z.array(z.string()).optional()
}).omit({ id: true, createdAt: true, updatedAt: true });
var rooms = pgTable(
  "rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    propertyId: varchar("property_id").notNull().references(() => properties.id),
    name: text("name").notNull(),
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

// server/db.ts
var databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Point it at a Neon test branch (see .env.example)."
  );
}
var sql2 = neon(databaseUrl);
var db = drizzle({ client: sql2, schema: schema_exports });

// server/storage.ts
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

// api-src/cron/sweep.ts
async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  try {
    const active = (await storage.getBookings({ status: "ACTIVE" })).length;
    if (active > 0) log(`weeklyRentRun: ${active} active co-living booking(s) checked`, "cron");
    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "cron");
    }
    const snapshot = await buildAndPushSnapshot();
    return res.json({ ok: true, active, pending: pending.length, snapshot });
  } catch (err) {
    log(`sweep error: ${err.message}`, "cron");
    return res.status(500).json({ ok: false, message: err.message });
  }
}
export {
  handler as default
};

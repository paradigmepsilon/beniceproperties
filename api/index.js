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

// server/lib/booking.ts
import { customAlphabet } from "nanoid";
import { differenceInCalendarDays, parseISO } from "date-fns";

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

// server/lib/stripe.ts
import Stripe from "stripe";
var secret = process.env.STRIPE_SECRET_KEY;
function isStripeConfigured() {
  return Boolean(secret && secret.startsWith("sk_") && !secret.includes("placeholder"));
}
var stripe = isStripeConfigured() ? new Stripe(secret) : null;
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
    metadata: { reference: opts.reference, kind: "one_time" },
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
        const session2 = await createCheckoutSession({
          amount: dueNow,
          description: resolved.model === "COLIVING" ? `Deposit \u2014 ${resolved.room.name} @ ${resolved.property.name}` : `Stay \u2014 ${resolved.property.name}`,
          reference,
          guestEmail: guest.email,
          successUrl: appUrl(req, `/confirmation/${reference}`),
          cancelUrl: appUrl(req, `/property/${resolved.property.id}`)
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

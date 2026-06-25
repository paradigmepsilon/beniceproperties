// server/storage.ts
// =============================================================================
// Storage abstraction. ALL database access in BNP goes through this layer —
// routes never touch `db` directly. Mirrors the TRAD app: one IStorage
// interface + one Storage class implementing it with Drizzle queries.
//
// Phase 1 scaffold: CRUD for every table plus the read helpers the later
// phases (browse, booking, reconciliation, KPI rollup) will call. Methods are
// thin and typed off shared/schema.ts.
// =============================================================================

import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "./db";
import {
  properties,
  rooms,
  guests,
  bookings,
  payments,
  subscriptions,
  kpiSnapshots,
  adminUsers,
  type Property,
  type InsertProperty,
  type Room,
  type InsertRoom,
  type Guest,
  type InsertGuest,
  type Booking,
  type InsertBooking,
  type Payment,
  type InsertPayment,
  type Subscription,
  type InsertSubscription,
  type KpiSnapshot,
  type InsertKpiSnapshot,
  type AdminUser,
  type InsertAdminUser,
} from "@shared/schema";

export interface IStorage {
  // --- Properties ---
  getProperties(opts?: { activeOnly?: boolean }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  createProperty(data: InsertProperty): Promise<Property>;
  updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined>;

  // --- Rooms ---
  getRoomsByProperty(propertyId: string): Promise<Room[]>;
  getRoom(id: string): Promise<Room | undefined>;
  createRoom(data: InsertRoom): Promise<Room>;
  updateRoom(id: string, updates: Partial<InsertRoom>): Promise<Room | undefined>;

  // --- Guests (minimal PII; never pushed to UO) ---
  getGuest(id: string): Promise<Guest | undefined>;
  getGuestByEmail(email: string): Promise<Guest | undefined>;
  upsertGuestByEmail(data: InsertGuest): Promise<Guest>;

  // --- Bookings ---
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByReference(reference: string): Promise<Booking | undefined>;
  getBookings(opts?: { status?: string }): Promise<Booking[]>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;

  // --- Payments ---
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByBooking(bookingId: string): Promise<Payment[]>;
  getPaymentByStripeRef(stripeRef: string): Promise<Payment | undefined>;
  getPendingManualPayments(): Promise<Payment[]>;
  createPayment(data: InsertPayment): Promise<Payment>;
  updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined>;

  // --- Subscriptions (co-living weekly rent) ---
  getSubscriptionByBooking(bookingId: string): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;
  createSubscription(data: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  // --- KPI snapshots (local rollup cache before UO push) ---
  getUnpushedSnapshots(): Promise<KpiSnapshot[]>;
  createSnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot>;
  markSnapshotPushed(id: string, pushedAt: Date): Promise<void>;

  // --- Admin users ---
  getAdminByEmail(email: string): Promise<AdminUser | undefined>;
  getAdmin(id: string): Promise<AdminUser | undefined>;
  createAdmin(data: InsertAdminUser): Promise<AdminUser>;

  // --- Aggregates (for KPI rollup; AGGREGATES ONLY, no PII) ---
  getKpiAggregates(): Promise<{
    bookingCount: number;
    occupancyPct: number;
    revenueTotal: number;
    roomsOccupied: number;
    upcomingCheckIns: number;
  }>;
}

class Storage implements IStorage {
  // --- Properties ---
  async getProperties(opts?: { activeOnly?: boolean }): Promise<Property[]> {
    if (opts?.activeOnly) {
      return db.select().from(properties).where(eq(properties.active, true));
    }
    return db.select().from(properties);
  }

  async getProperty(id: string): Promise<Property | undefined> {
    const [row] = await db.select().from(properties).where(eq(properties.id, id));
    return row;
  }

  async createProperty(data: InsertProperty): Promise<Property> {
    const [row] = await db.insert(properties).values(data).returning();
    return row;
  }

  async updateProperty(id: string, updates: Partial<InsertProperty>): Promise<Property | undefined> {
    const [row] = await db
      .update(properties)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(properties.id, id))
      .returning();
    return row;
  }

  // --- Rooms ---
  async getRoomsByProperty(propertyId: string): Promise<Room[]> {
    return db.select().from(rooms).where(eq(rooms.propertyId, propertyId));
  }

  async getRoom(id: string): Promise<Room | undefined> {
    const [row] = await db.select().from(rooms).where(eq(rooms.id, id));
    return row;
  }

  async createRoom(data: InsertRoom): Promise<Room> {
    const [row] = await db.insert(rooms).values(data).returning();
    return row;
  }

  async updateRoom(id: string, updates: Partial<InsertRoom>): Promise<Room | undefined> {
    const [row] = await db
      .update(rooms)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return row;
  }

  // --- Guests ---
  async getGuest(id: string): Promise<Guest | undefined> {
    const [row] = await db.select().from(guests).where(eq(guests.id, id));
    return row;
  }

  async getGuestByEmail(email: string): Promise<Guest | undefined> {
    const [row] = await db.select().from(guests).where(eq(guests.email, email));
    return row;
  }

  async upsertGuestByEmail(data: InsertGuest): Promise<Guest> {
    const existing = await this.getGuestByEmail(data.email);
    if (existing) {
      const [row] = await db
        .update(guests)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(guests.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db.insert(guests).values(data).returning();
    return row;
  }

  // --- Bookings ---
  async getBooking(id: string): Promise<Booking | undefined> {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
    return row;
  }

  async getBookingByReference(reference: string): Promise<Booking | undefined> {
    const [row] = await db.select().from(bookings).where(eq(bookings.reference, reference));
    return row;
  }

  async getBookings(opts?: { status?: string }): Promise<Booking[]> {
    if (opts?.status) {
      return db
        .select()
        .from(bookings)
        .where(eq(bookings.status, opts.status))
        .orderBy(desc(bookings.createdAt));
    }
    return db.select().from(bookings).orderBy(desc(bookings.createdAt));
  }

  async createBooking(data: InsertBooking): Promise<Booking> {
    const [row] = await db.insert(bookings).values(data).returning();
    return row;
  }

  async updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined> {
    const [row] = await db
      .update(bookings)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookings.id, id))
      .returning();
    return row;
  }

  // --- Payments ---
  async getPayment(id: string): Promise<Payment | undefined> {
    const [row] = await db.select().from(payments).where(eq(payments.id, id));
    return row;
  }

  async getPaymentsByBooking(bookingId: string): Promise<Payment[]> {
    return db
      .select()
      .from(payments)
      .where(eq(payments.bookingId, bookingId))
      .orderBy(desc(payments.createdAt));
  }

  async getPaymentByStripeRef(stripeRef: string): Promise<Payment | undefined> {
    const [row] = await db.select().from(payments).where(eq(payments.stripeRef, stripeRef));
    return row;
  }

  async getPendingManualPayments(): Promise<Payment[]> {
    // Manual = CashApp/Zelle awaiting admin confirmation.
    return db
      .select()
      .from(payments)
      .where(eq(payments.status, "PENDING"))
      .orderBy(desc(payments.createdAt));
  }

  async createPayment(data: InsertPayment): Promise<Payment> {
    const [row] = await db.insert(payments).values(data).returning();
    return row;
  }

  async updatePayment(id: string, updates: Partial<InsertPayment>): Promise<Payment | undefined> {
    const [row] = await db
      .update(payments)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(payments.id, id))
      .returning();
    return row;
  }

  // --- Subscriptions ---
  async getSubscriptionByBooking(bookingId: string): Promise<Subscription | undefined> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.bookingId, bookingId));
    return row;
  }

  async getSubscriptionByStripeId(
    stripeSubscriptionId: string,
  ): Promise<Subscription | undefined> {
    const [row] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return row;
  }

  async createSubscription(data: InsertSubscription): Promise<Subscription> {
    const [row] = await db.insert(subscriptions).values(data).returning();
    return row;
  }

  async updateSubscription(
    id: string,
    updates: Partial<InsertSubscription>,
  ): Promise<Subscription | undefined> {
    const [row] = await db
      .update(subscriptions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(subscriptions.id, id))
      .returning();
    return row;
  }

  // --- KPI snapshots ---
  async getUnpushedSnapshots(): Promise<KpiSnapshot[]> {
    return db.select().from(kpiSnapshots).where(eq(kpiSnapshots.pushedToUo, false));
  }

  async createSnapshot(data: InsertKpiSnapshot): Promise<KpiSnapshot> {
    const [row] = await db.insert(kpiSnapshots).values(data).returning();
    return row;
  }

  async markSnapshotPushed(id: string, pushedAt: Date): Promise<void> {
    await db
      .update(kpiSnapshots)
      .set({ pushedToUo: true, pushedAt })
      .where(eq(kpiSnapshots.id, id));
  }

  // --- Admin users ---
  async getAdminByEmail(email: string): Promise<AdminUser | undefined> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return row;
  }

  async getAdmin(id: string): Promise<AdminUser | undefined> {
    const [row] = await db.select().from(adminUsers).where(eq(adminUsers.id, id));
    return row;
  }

  async createAdmin(data: InsertAdminUser): Promise<AdminUser> {
    const [row] = await db.insert(adminUsers).values(data).returning();
    return row;
  }

  // --- Aggregates ---
  async getKpiAggregates() {
    const allBookings = await db.select().from(bookings);
    const allRooms = await db.select().from(rooms);
    const paidPayments = await db.select().from(payments).where(eq(payments.status, "PAID"));

    const liveStatuses = new Set(["CONFIRMED", "ACTIVE"]);
    const bookingCount = allBookings.filter((b) => b.status !== "CANCELLED").length;

    const roomsOccupied = allRooms.filter((r) => r.status === "OCCUPIED").length;
    const occupancyPct =
      allRooms.length > 0 ? Math.round((roomsOccupied / allRooms.length) * 10000) / 100 : 0;

    const revenueTotal =
      Math.round(
        paidPayments.reduce((sum, p) => sum + parseFloat(p.amount) + parseFloat(p.surcharge), 0) * 100,
      ) / 100;

    const todayMs = Date.now();
    const weekMs = todayMs + 7 * 24 * 60 * 60 * 1000;
    const upcomingCheckIns = allBookings.filter((b) => {
      if (!liveStatuses.has(b.status)) return false;
      const ci = new Date(b.checkIn).getTime();
      return ci >= todayMs && ci <= weekMs;
    }).length;

    return { bookingCount, occupancyPct, revenueTotal, roomsOccupied, upcomingCheckIns };
  }
}

export const storage: IStorage = new Storage();

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

import { and, asc, count, desc, eq, gt, gte, inArray, isNull, lte, max, ne, notInArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { overlapsRange } from "./lib/ranges";
import { planMessageLogQuery } from "./lib/messageLogQuery";
import { escalationDedupeMatch } from "./lib/escalationDedupe";
import {
  NON_BLOCKING_BOOKING_STATUSES,
  properties,
  rooms,
  guests,
  bookings,
  payments,
  subscriptions,
  kpiSnapshots,
  adminUsers,
  leases,
  leaseRooms,
  vehicles,
  paymentSchedule,
  lateFees,
  notificationLog,
  appSettings,
  uoEscalations,
  guestMessages,
  lifecycleEvents,
  heroImages,
  journalPosts,
  externalBookings,
  newsletterSubscribers,
  ltrInquiries,
  partnerInquiries,
  manualBlocks,
  messageLog,
  bookingIntents,
  MAX_LEASE_DAYS,
  type Property,
  type InsertProperty,
  type HeroImage,
  type JournalPost,
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
  type Lease,
  type InsertLease,
  type LeaseRoom,
  type InsertLeaseRoom,
  type Vehicle,
  type InsertVehicle,
  type PaymentScheduleRow,
  type InsertPaymentScheduleRow,
  type LateFee,
  type InsertLateFee,
  type NotificationLogRow,
  type InsertNotificationLogRow,
  type AppSetting,
  type UoEscalation,
  type InsertUoEscalation,
  type GuestMessage,
  type InsertGuestMessage,
  type LifecycleEvent,
  type InsertLifecycleEvent,
  type ExternalBooking,
  type InsertExternalBooking,
  type NewsletterSubscriber,
  type InsertNewsletterSubscriber,
  type LtrInquiry,
  type InsertLtrInquiry,
  type PartnerInquiry,
  type InsertPartnerInquiry,
  type ManualBlock,
  type InsertManualBlock,
  type BookingIntent,
  type InsertBookingIntent,
  type MessageLogRow,
  type InsertMessageLog,
  bookingGate,
  paymentRefunds,
  propertyAccessInfo,
  roomAccessInfo,
  type BookingGate,
  type InsertBookingGate,
  type PaymentRefund,
  type InsertPaymentRefund,
  type PropertyAccessInfo,
  type RoomAccessInfo,
} from "@shared/schema";
import { inclusiveDays } from "@shared/leaseSchedule";
import {
  CHECKOUT_HOLD_LEASE_STATUSES,
  CHECKOUT_HOLD_MINUTES,
  DEPOSIT_HELD_LEASE_STATUSES,
} from "@shared/schema";

/**
 * A booking joined to everything a scheduled job or a template needs: the gate
 * row (null for an ungated STR stay), the guest, the property, and the room.
 * One shape for all three sweep queries so the jobs share a single row type.
 */
export type GateStayRow = Booking & {
  gate: BookingGate | null;
  guest: Guest;
  property: Property;
  room: Room | null;
};

/** Raw Drizzle join shape backing GateStayRow, before the null-filtering map. */
type GateStayJoin = {
  bookings: Booking;
  booking_gate: BookingGate | null;
  guests: Guest | null;
  properties: Property | null;
  rooms: Room | null;
};

/**
 * Every non-terminal lease status. NOT the same thing as "holds a room" — see
 * roomHoldingLeaseCondition() below. Used for listings that want all live
 * leases regardless of whether they currently block a calendar.
 */
const NON_TERMINAL_LEASE_STATUSES = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "PENDING_FIRST_PAYMENT",
  "PENDING_VERIFICATION",
  "ACTIVE",
] as const;

/**
 * SQL form of leaseHoldsRoom() in shared/schema.ts — the owner's rule that a
 * room is only held once a deposit is paid, plus a short checkout window so a
 * guest cannot lose the room mid-Stripe-flow. Keep the two in lockstep.
 */
function roomHoldingLeaseCondition(now: Date = new Date()) {
  const windowStart = new Date(now.getTime() - CHECKOUT_HOLD_MINUTES * 60_000);
  return or(
    // 1. Deposit paid — the real hold, for the whole term.
    and(
      eq(leases.depositStatus, "PAID"),
      inArray(leases.status, [...DEPOSIT_HELD_LEASE_STATUSES]),
    ),
    // 2. Unpaid, but still inside the checkout window.
    and(
      inArray(leases.status, [...CHECKOUT_HOLD_LEASE_STATUSES]),
      gte(leases.createdAt, windowStart),
    ),
  );
}

export class StorageError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export interface IStorage {
  // --- Hero images (BT-22): active homepage-hero slides, in display order. ---
  getActiveHeroImages(): Promise<HeroImage[]>;

  // --- Journal: PUBLISHED posts only (drafts are never exposed publicly). ---
  getPublishedJournalPosts(): Promise<JournalPost[]>;
  getPublishedJournalPostBySlug(slug: string): Promise<JournalPost | undefined>;

  // --- Properties ---
  getProperties(opts?: { activeOnly?: boolean }): Promise<Property[]>;
  getProperty(id: string): Promise<Property | undefined>;
  /** Batched by-id lookup (e.g. thread-list enrichment) — one query, not N. */
  getPropertiesByIds(ids: string[]): Promise<Property[]>;
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
  /** Batched by-id lookup (e.g. thread-list enrichment) — one query, not N. */
  getGuestsByIds(ids: string[]): Promise<Guest[]>;
  upsertGuestByEmail(data: InsertGuest): Promise<Guest>;

  // --- Newsletter (owned email-capture list) ---
  upsertNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber>;

  // --- LTR inquiries (long-term-rental lead capture; append-only) ---
  createLtrInquiry(data: InsertLtrInquiry): Promise<LtrInquiry>;

  // --- Partner inquiries (B2B /partner lead capture; append-only) ---
  createPartnerInquiry(data: InsertPartnerInquiry): Promise<PartnerInquiry>;

  // --- Bookings ---
  getBooking(id: string): Promise<Booking | undefined>;
  getBookingByReference(reference: string): Promise<Booking | undefined>;
  getBookings(opts?: { status?: string }): Promise<Booking[]>;
  /** Batched by-id lookup (e.g. thread-list enrichment) — one query, not N. */
  getBookingsByIds(ids: string[]): Promise<Booking[]>;
  /**
   * Date-BLOCKING STR bookings with a checkOut on/after `date`, for the given
   * properties, ordered by checkIn — the inputs to the "next opening" chain
   * walk (server/lib/nextOpening.ts). One batched query, never per-property.
   * CANCELLED and CONFLICT rows are excluded (NON_BLOCKING_BOOKING_STATUSES).
   */
  getStrBookingsEndingOnOrAfter(propertyIds: string[], date: string): Promise<Booking[]>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  /**
   * Bookings joined to their guest/property/room for admin/UO listing views.
   * Default statuses are CONFIRMED / ACTIVE / CONFLICT — no CANCELLED,
   * COMPLETED, or PENDING_PAYMENT. `from`, when given,
   * keeps only bookings that haven't fully checked out (`checkOut >= from`
   * OR `checkOut IS NULL` for open-ended stays).
   */
  getBookingsWithGuest(opts?: {
    statuses?: string[];
    from?: string;
  }): Promise<Array<Booking & { guest: Guest; property: Property; room: Room | null }>>;

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

  // --- Leases (co-living) ---
  getLease(id: string): Promise<Lease | undefined>;
  getLeases(opts?: { status?: string; guestId?: string; propertyId?: string }): Promise<Lease[]>;
  /** Batched by-id lookup (e.g. thread-list enrichment) — one query, not N. */
  getLeasesByIds(ids: string[]): Promise<Lease[]>;
  /**
   * Non-terminal (still-live) leases joined to guest/property in one query —
   * the guest picker's lease half, mirroring getBookingsWithGuest's join
   * pattern instead of getLeases() + a per-row getGuest/getProperty loop.
   */
  getActiveLeasesWithGuest(): Promise<Array<Lease & { guest: Guest; property: Property }>>;
  /**
   * Soonest endDate (>= `onOrAfter`) of an OCCUPYING lease per property —
   * statuses where the deposit is paid and a room is actually held
   * (PENDING_VERIFICATION | ACTIVE). Feeds "Next opening" on fully-booked
   * co-living cards. Returns propertyId → min endDate.
   */
  getSoonestOccupyingLeaseEndByProperty(
    propertyIds: string[],
    onOrAfter: string,
  ): Promise<Record<string, string>>;
  /**
   * Create a lease with its room links and full payment schedule in one call.
   * Enforces: term ≤ 90 days, ≥ 1 room, and the room-overlap availability guard
   * (no room on another room-blocking lease whose dates overlap). The schedule
   * MUST be pre-generated by shared/leaseSchedule.ts and passed in so the persisted
   * rows equal the guest's preview exactly.
   */
  createLeaseWithSchedule(args: {
    lease: InsertLease;
    rooms: InsertLeaseRoom[];
    schedule: InsertPaymentScheduleRow[];
  }): Promise<Lease>;
  updateLease(id: string, updates: Partial<InsertLease>): Promise<Lease | undefined>;
  getLeaseByPortalToken(token: string): Promise<Lease | undefined>;
  getLeaseRooms(leaseId: string): Promise<LeaseRoom[]>;

  // --- Vehicles (one per lease; parking identification) ---
  getVehicleByLease(leaseId: string): Promise<Vehicle | undefined>;
  upsertVehicleByLease(leaseId: string, data: Partial<InsertVehicle>): Promise<Vehicle>;

  // --- Booking gate (1:1 with a gated short stay) ---
  getBookingGate(bookingId: string): Promise<BookingGate | undefined>;
  /** Create the gate row if absent; never overwrites an existing one. */
  ensureBookingGate(bookingId: string, seed: Partial<InsertBookingGate>): Promise<BookingGate>;
  updateBookingGate(bookingId: string, updates: Partial<InsertBookingGate>): Promise<BookingGate | undefined>;
  /** Resolve the guest's document page from its token. The token IS the auth. */
  getBookingByGateToken(token: string): Promise<(Booking & { gate: BookingGate }) | undefined>;

  // --- Gate sweep queries (windowed in SQL; a sweep never scans the table) ---
  getStaysAwaitingDocs(): Promise<GateStayRow[]>;
  getStaysCheckingOutBetween(from: string, to: string): Promise<GateStayRow[]>;
  getStaysCheckingInBetween(from: string, to: string): Promise<GateStayRow[]>;

  // --- Access info (what a guest needs to get in) ---
  getPropertyAccessInfo(propertyId: string): Promise<PropertyAccessInfo | undefined>;
  upsertPropertyAccessInfo(propertyId: string, info: PropertyAccessInfo, actor: string): Promise<PropertyAccessInfo>;
  getRoomAccessInfo(roomId: string): Promise<RoomAccessInfo | undefined>;
  upsertRoomAccessInfo(roomId: string, info: RoomAccessInfo, actor: string): Promise<RoomAccessInfo>;

  // --- Refund ledger ---
  /** Idempotent on stripe_refund_id: recording the same refund twice is a no-op. */
  recordPaymentRefund(data: InsertPaymentRefund): Promise<PaymentRefund | null>;
  getRefundsByPayment(paymentId: string): Promise<PaymentRefund[]>;

  // --- Guest messages (threaded portal questions / requests) ---
  getMessageThreadsByLease(leaseId: string): Promise<GuestMessage[]>; // roots only
  getMessageThreadsByBooking(bookingId: string): Promise<GuestMessage[]>; // roots only
  /** Every thread's root row, newest first. `limit` bounds the page (admin/UO inbox). */
  getMessageThreadRoots(opts?: { status?: string; limit?: number }): Promise<GuestMessage[]>;
  getMessagesByThread(threadId: string): Promise<GuestMessage[]>; // all in a thread
  getMessage(id: string): Promise<GuestMessage | undefined>;
  createMessage(data: InsertGuestMessage): Promise<GuestMessage>;
  updateMessage(id: string, updates: Partial<InsertGuestMessage>): Promise<GuestMessage | undefined>;
  /**
   * Per-thread message count + last-message timestamp, one grouped query for
   * every threadId given — the thread-list enrichment's batched stand-in for
   * an N+1 getMessagesByThread-per-root loop.
   */
  getThreadStats(threadIds: string[]): Promise<Array<{ threadId: string; messageCount: number; lastMessageAt: Date }>>;

  // --- Message log (append-only audit trail of every send/receive, any channel) ---
  createMessageLog(data: InsertMessageLog): Promise<MessageLogRow>;
  /**
   * Delivery trail, newest first. ALWAYS bounded: `limit` defaults to
   * MESSAGE_LOG_DEFAULT_LIMIT and is capped at MESSAGE_LOG_MAX_LIMIT, so no
   * caller can pull the whole table.
   *
   * A scope (bookingId / leaseId / guestId) is REQUIRED. Without one this
   * returns `[]` unless `all: true` is passed — the unscoped firehose is for the
   * admin/UO `/message-log` console view only, never for a per-thread read that
   * lost its ids.
   */
  getMessageLog(opts: {
    bookingId?: string;
    leaseId?: string;
    guestId?: string;
    limit?: number;
    all?: boolean;
  }): Promise<MessageLogRow[]>;

  // --- Lifecycle events (idempotent send log) ---
  /**
   * Has this lifecycle send already happened? Scoped by REF — a lease-scoped
   * event (`{ leaseId }`) or a booking-scoped one (`{ bookingId }`). Short-stay
   * bookings have no lease, so their confirmation/admin sends key on bookingId.
   */
  hasLifecycleEvent(
    ref: { leaseId?: string | null; bookingId?: string | null },
    eventType: string,
    scheduleSeq: number | null,
  ): Promise<boolean>;
  recordLifecycleEvent(data: InsertLifecycleEvent): Promise<LifecycleEvent>;

  // --- Payment schedule ---
  getScheduleByLease(leaseId: string): Promise<PaymentScheduleRow[]>;
  getScheduleRow(id: string): Promise<PaymentScheduleRow | undefined>;
  updateScheduleRow(
    id: string,
    updates: Partial<InsertPaymentScheduleRow>,
  ): Promise<PaymentScheduleRow | undefined>;

  // --- Late fees ---
  getLateFeesByLease(leaseId: string): Promise<LateFee[]>;
  createLateFee(data: InsertLateFee): Promise<LateFee>;
  updateLateFee(id: string, updates: Partial<InsertLateFee>): Promise<LateFee | undefined>;
  /**
   * Idempotently accrue ONE late-fee row for (lease, schedule_seq, accrual day).
   * Returns the created row, or null if one already exists for that day (the
   * unique-accrual guard) — so re-running the sweep never double-accrues.
   */
  accrueLateFeeOnce(args: { leaseId: string; scheduleSeq: number; accrualDate: string; amount: number }): Promise<LateFee | null>;
  getAccruedLateFeesForSchedule(leaseId: string, scheduleSeq: number): Promise<LateFee[]>;

  // --- Notification log (idempotent dunning sends) ---
  hasNotification(args: { leaseId: string; scheduleSeq: number | null; kind: string; sendDate: string }): Promise<boolean>;
  recordNotification(data: InsertNotificationLogRow): Promise<NotificationLogRow>;

  // --- App settings (admin-configurable, no magic numbers) ---
  getSetting(key: string): Promise<AppSetting | undefined>;
  getSettingNumber(key: string, fallback: number): Promise<number>;
  setSetting(key: string, value: string): Promise<AppSetting>;

  // --- UO escalations (raised here, surfaced/resolved by UO in Phase 8) ---
  getEscalations(opts?: { status?: string; leaseId?: string; bookingId?: string }): Promise<UoEscalation[]>;
  /**
   * Create an escalation only if an equivalent one isn't already OPEN. Dedupe is
   * scoped to the subject: (leaseId, scheduleSeq, kind) for a lease, or
   * (bookingId, kind) for a booking — so a booking-scoped raise can never dedupe
   * against an unrelated lease. Returns null when deduped.
   */
  raiseEscalationOnce(data: InsertUoEscalation): Promise<UoEscalation | null>;
  updateEscalation(id: string, updates: Partial<InsertUoEscalation>): Promise<UoEscalation | undefined>;

  /**
   * Is `roomId` free for [startDate, endDate]? False if any room-blocking lease
   * (DRAFT, PENDING_SIGNATURE, PENDING_FIRST_PAYMENT, or ACTIVE), any
   * non-cancelled/non-CONFLICT short co-living booking, any external iCal
   * block, or any manual block for that room overlaps the range. `startDate`/
   * `endDate` are normalized against `endExclusive` via `overlapsRange`
   * (server/lib/ranges.ts) — pass `true` for a half-open range (a direct
   * booking's checkOut) or `false` for an inclusive range (a lease's endDate).
   * `excludeLeaseId`/`excludeBookingId` let a lease/booking ignore itself when
   * re-checking.
   */
  isRoomAvailableForRange(args: {
    roomId: string;
    startDate: string;
    endDate: string;
    endExclusive: boolean;
    excludeLeaseId?: string;
    excludeBookingId?: string;
  }): Promise<boolean>;

  /** Non-cancelled, non-CONFLICT co-living direct bookings for a room (short-stay overlap guard). CONFLICT bookings are paid but never block dates. */
  getColivingBookingsForRoom(roomId: string): Promise<Booking[]>;

  /**
   * Room ids occupied on `dateIso` by a live booking (`checkIn <= d < checkOut`,
   * non-CANCELLED/CONFLICT), a room-blocking lease (`startDate <= d <= endDate`),
   * an external block, or a manual block. Used for admin/UO occupancy views.
   */
  getOccupiedRoomIdsOn(dateIso: string): Promise<Set<string>>;

  // --- Manual blocks (admin/UO off-platform holds; room_id null = whole property) ---
  getManualBlocksForRoom(roomId: string): Promise<ManualBlock[]>;
  getManualBlocksForProperty(propertyId: string): Promise<ManualBlock[]>;
  getManualBlocks(opts?: { propertyId?: string; roomId?: string; from?: string }): Promise<ManualBlock[]>;
  createManualBlock(data: InsertManualBlock): Promise<ManualBlock>;
  /** Returns true if a row was actually deleted (false when the id didn't exist). */
  deleteManualBlock(id: string): Promise<boolean>;

  // --- Booking intents (checkouts started; see shared/schema.ts) ---
  createBookingIntent(data: InsertBookingIntent): Promise<BookingIntent>;
  attachBookingIntentContact(
    stripePaymentIntentId: string,
    contact: { name: string; email: string; phone?: string | null },
  ): Promise<BookingIntent | undefined>;
  /** Newest first, always bounded (default 100, cap 500). */
  getBookingIntents(opts?: { guestEmail?: string; since?: Date; limit?: number }): Promise<BookingIntent[]>;

  // --- Airbnb iCal listings + synced blocks (URL lives on properties/rooms) ---
  /** Active listings with a non-null airbnb_ical_url — the sync work-list.
   *  STR properties (kind "property", roomId null) + co-living rooms (kind
   *  "room"). `url` is the feed to fetch; `label` is a human name for logs. */
  getListingsWithIcalUrl(): Promise<
    { kind: "property" | "room"; propertyId: string; roomId: string | null; url: string; label: string }[]
  >;
  /** Busy external ranges for an STR whole-property listing (room_id IS NULL). */
  getExternalBlocksForProperty(propertyId: string): Promise<ExternalBooking[]>;
  /** Busy external ranges for a co-living room listing. */
  getExternalBlocksForRoom(roomId: string): Promise<ExternalBooking[]>;
  /** Upsert on (property_id|room_id, external_id); returns the current row. */
  upsertExternalBooking(data: InsertExternalBooking): Promise<ExternalBooking>;
  deleteExternalBooking(id: string): Promise<void>;

  // --- Direct-booking / lease reads used by iCal dedup + availability merge ---
  /**
   * Date-BLOCKING STR bookings for a property (external dedup + STR
   * availability). Excludes NON_BLOCKING_BOOKING_STATUSES (CANCELLED, CONFLICT).
   */
  getStrBookingsForProperty(propertyId: string): Promise<Booking[]>;
  /** Room-blocking leases that include a given room (external dedup + reused by isRoomAvailableForRange). */
  getRoomBlockingLeasesForRoom(roomId: string): Promise<Lease[]>;

  // --- Aggregates (for KPI rollup; AGGREGATES ONLY, no PII) ---
  getKpiAggregates(): Promise<{
    bookingCount: number;
    occupancyPct: number;
    revenueTotal: number;
    roomsOccupied: number;
    upcomingCheckIns: number;
  }>;
}

/** Parse an app_settings value as a number. Decimal-safe (parseFloat, not parseInt —
 *  "0.035" must not read back as 0). Non-numeric/blank → fallback. */
export function parseSettingNumber(value: string | undefined | null, fallback: number): number {
  if (value == null || value.trim() === "") return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

class Storage implements IStorage {
  // --- Hero images (BT-22) ---
  async getActiveHeroImages(): Promise<HeroImage[]> {
    return db
      .select()
      .from(heroImages)
      .where(eq(heroImages.isActive, true))
      .orderBy(asc(heroImages.displayOrder), asc(heroImages.createdAt));
  }

  // --- Journal (authored in Unified Ops; site reads published posts only) ---
  async getPublishedJournalPosts(): Promise<JournalPost[]> {
    return db
      .select()
      .from(journalPosts)
      .where(eq(journalPosts.published, true))
      // Newest first by publish date; fall back to created for any null.
      .orderBy(desc(journalPosts.publishedAt), desc(journalPosts.createdAt));
  }

  async getPublishedJournalPostBySlug(slug: string): Promise<JournalPost | undefined> {
    const [row] = await db
      .select()
      .from(journalPosts)
      .where(and(eq(journalPosts.slug, slug), eq(journalPosts.published, true)))
      .limit(1);
    return row;
  }

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

  async getPropertiesByIds(ids: string[]): Promise<Property[]> {
    if (ids.length === 0) return [];
    return db.select().from(properties).where(inArray(properties.id, ids));
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

  async getGuestsByIds(ids: string[]): Promise<Guest[]> {
    if (ids.length === 0) return [];
    return db.select().from(guests).where(inArray(guests.id, ids));
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

  // Idempotent by email: a repeat signup returns the existing row unchanged
  // (no disclosure of prior membership at the API layer). Mirrors the
  // read-then-insert convention used for guests; the DB unique constraint is the
  // safety net. Write-once — nothing to update, so an existing row is returned
  // as-is.
  async upsertNewsletterSubscriber(data: InsertNewsletterSubscriber): Promise<NewsletterSubscriber> {
    const [existing] = await db
      .select()
      .from(newsletterSubscribers)
      .where(eq(newsletterSubscribers.email, data.email));
    if (existing) return existing;
    const [row] = await db.insert(newsletterSubscribers).values(data).returning();
    return row;
  }

  // Append-only lead capture — a person may inquire more than once, so this is a
  // plain insert (no dedupe/upsert, unlike the newsletter list above).
  async createLtrInquiry(data: InsertLtrInquiry): Promise<LtrInquiry> {
    const [row] = await db.insert(ltrInquiries).values(data).returning();
    return row;
  }

  // Append-only B2B lead capture for the /partner page — like LTR inquiries, a
  // person may inquire more than once, so this is a plain insert (no dedupe).
  async createPartnerInquiry(data: InsertPartnerInquiry): Promise<PartnerInquiry> {
    const [row] = await db.insert(partnerInquiries).values(data).returning();
    return row;
  }

  // --- Bookings ---
  async getBooking(id: string): Promise<Booking | undefined> {
    const [row] = await db.select().from(bookings).where(eq(bookings.id, id));
    return row;
  }

  async getBookingsByIds(ids: string[]): Promise<Booking[]> {
    if (ids.length === 0) return [];
    return db.select().from(bookings).where(inArray(bookings.id, ids));
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

  async getStrBookingsEndingOnOrAfter(propertyIds: string[], date: string): Promise<Booking[]> {
    if (propertyIds.length === 0) return [];
    return db
      .select()
      .from(bookings)
      .where(
        and(
          inArray(bookings.propertyId, propertyIds),
          eq(bookings.model, "STR"),
          // CONFLICT rows are paid-but-unresolved: they block no dates and hold
          // no room (see server/lib/materialize.ts), so they must not appear in
          // availability or "next opening" either. Same exemption the exclusion
          // constraint and strHasConflict use.
          notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES]),
          // SQL null comparison also drops open-ended stays (null checkOut).
          gte(bookings.checkOut, date),
        ),
      )
      .orderBy(asc(bookings.checkIn));
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

  async getBookingsWithGuest(opts?: {
    statuses?: string[];
    from?: string;
  }): Promise<Array<Booking & { guest: Guest; property: Property; room: Room | null }>> {
    // Default = bookings a staff member can actually act on: live stays plus
    // paid-but-unresolved CONFLICTs. PENDING_PAYMENT is deliberately NOT here —
    // those are abandoned checkouts with no money and often no real guest, and
    // they swamped the message-compose guest picker. A caller that wants them
    // passes `statuses` explicitly.
    // PENDING_APPROVAL belongs here: the guest has PAID and is holding dates, so
    // staff must be able to see and message them while the review is pending.
    const statuses = opts?.statuses ?? ["PENDING_APPROVAL", "CONFIRMED", "ACTIVE", "CONFLICT"];
    const filters = [inArray(bookings.status, statuses)];
    if (opts?.from) {
      filters.push(sql`(${bookings.checkOut} >= ${opts.from} OR ${bookings.checkOut} IS NULL)`);
    }
    const rows = await db
      .select()
      .from(bookings)
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(and(...filters))
      .orderBy(desc(bookings.createdAt));
    return rows
      .filter((r) => r.guests !== null && r.properties !== null)
      .map((r) => ({
        ...r.bookings,
        guest: r.guests as Guest,
        property: r.properties as Property,
        room: r.rooms,
      }));
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

  // --- Leases ---
  async getLease(id: string): Promise<Lease | undefined> {
    const [row] = await db.select().from(leases).where(eq(leases.id, id));
    return row;
  }

  async getLeases(opts?: {
    status?: string;
    guestId?: string;
    propertyId?: string;
  }): Promise<Lease[]> {
    const filters = [];
    if (opts?.status) filters.push(eq(leases.status, opts.status));
    if (opts?.guestId) filters.push(eq(leases.guestId, opts.guestId));
    if (opts?.propertyId) filters.push(eq(leases.propertyId, opts.propertyId));
    const q = db.select().from(leases).orderBy(desc(leases.createdAt));
    return filters.length ? q.where(and(...filters)) : q;
  }

  async getLeasesByIds(ids: string[]): Promise<Lease[]> {
    if (ids.length === 0) return [];
    return db.select().from(leases).where(inArray(leases.id, ids));
  }

  /**
   * Non-terminal leases — NON_TERMINAL_LEASE_STATUSES is exactly "every
   * status short of COMPLETED/TERMINATED/DEFAULTED" — joined to guest +
   * property in one query. Mirrors getBookingsWithGuest's join pattern; the
   * guest picker uses this instead of getLeases() + a per-row lookup loop.
   */
  async getActiveLeasesWithGuest(): Promise<Array<Lease & { guest: Guest; property: Property }>> {
    const rows = await db
      .select()
      .from(leases)
      .leftJoin(guests, eq(leases.guestId, guests.id))
      .leftJoin(properties, eq(leases.propertyId, properties.id))
      .where(inArray(leases.status, [...NON_TERMINAL_LEASE_STATUSES]))
      .orderBy(desc(leases.createdAt));
    return rows
      .filter((r) => r.guests !== null && r.properties !== null)
      .map((r) => ({
        ...r.leases,
        guest: r.guests as Guest,
        property: r.properties as Property,
      }));
  }

  async getSoonestOccupyingLeaseEndByProperty(
    propertyIds: string[],
    onOrAfter: string,
  ): Promise<Record<string, string>> {
    if (propertyIds.length === 0) return {};
    // Occupying = deposit paid, room held. Narrower than
    // roomHoldingLeaseCondition on purpose: an in-checkout lease blocks
    // double-booking but does not make a card read "Fully booked" — only
    // occupied rooms do, and rooms flip OCCUPIED at deposit-paid.
    const rows = await db
      .select({
        propertyId: leases.propertyId,
        minEnd: sql<string>`min(${leases.endDate})`,
      })
      .from(leases)
      .where(
        and(
          inArray(leases.propertyId, propertyIds),
          inArray(leases.status, ["PENDING_VERIFICATION", "ACTIVE"]),
          gte(leases.endDate, onOrAfter),
        ),
      )
      .groupBy(leases.propertyId);
    return Object.fromEntries(rows.map((r) => [r.propertyId, r.minEnd]));
  }

  async createLeaseWithSchedule(args: {
    lease: InsertLease;
    rooms: InsertLeaseRoom[];
    schedule: InsertPaymentScheduleRow[];
  }): Promise<Lease> {
    // --- Enforce the spec's hard constraints at the storage boundary. ---
    if (args.rooms.length < 1) {
      throw new StorageError("A lease must include at least one room");
    }
    const days = inclusiveDays(args.lease.startDate, args.lease.endDate);
    if (days > MAX_LEASE_DAYS) {
      throw new StorageError(
        `Lease term ${days} days exceeds the ${MAX_LEASE_DAYS}-day maximum`,
        422,
      );
    }
    // Availability guard: every included room must be free for the term.
    for (const lr of args.rooms) {
      const free = await this.isRoomAvailableForRange({
        roomId: lr.roomId,
        startDate: args.lease.startDate,
        endDate: args.lease.endDate,
        endExclusive: false,
      });
      if (!free) {
        throw new StorageError(
          `Room ${lr.roomNameSnapshot} is already booked for an overlapping date range`,
          409,
        );
      }
    }

    const [lease] = await db.insert(leases).values(args.lease).returning();
    if (args.rooms.length) {
      await db
        .insert(leaseRooms)
        .values(args.rooms.map((r) => ({ ...r, leaseId: lease.id })));
    }
    if (args.schedule.length) {
      await db
        .insert(paymentSchedule)
        .values(args.schedule.map((s) => ({ ...s, leaseId: lease.id })));
    }
    return lease;
  }

  async updateLease(id: string, updates: Partial<InsertLease>): Promise<Lease | undefined> {
    const [row] = await db
      .update(leases)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(leases.id, id))
      .returning();
    return row;
  }

  async getLeaseByPortalToken(token: string): Promise<Lease | undefined> {
    const [row] = await db.select().from(leases).where(eq(leases.portalToken, token));
    return row;
  }

  async getLeaseRooms(leaseId: string): Promise<LeaseRoom[]> {
    return db.select().from(leaseRooms).where(eq(leaseRooms.leaseId, leaseId));
  }

  // --- Vehicles (one row per lease; upsert keyed on lease_id) ---
  async getVehicleByLease(leaseId: string): Promise<Vehicle | undefined> {
    const [row] = await db.select().from(vehicles).where(eq(vehicles.leaseId, leaseId));
    return row;
  }

  async upsertVehicleByLease(
    leaseId: string,
    data: Partial<InsertVehicle>,
  ): Promise<Vehicle> {
    const existing = await this.getVehicleByLease(leaseId);
    if (existing) {
      const [row] = await db
        .update(vehicles)
        .set({ ...data, leaseId, updatedAt: new Date() })
        .where(eq(vehicles.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(vehicles)
      .values({ ...data, leaseId })
      .returning();
    return row;
  }


  // --- Booking gate -------------------------------------------------------
  // A gated short stay owns exactly one row here, enforced by booking_id being
  // the PRIMARY KEY rather than by application logic.

  async getBookingGate(bookingId: string): Promise<BookingGate | undefined> {
    const [row] = await db.select().from(bookingGate).where(eq(bookingGate.bookingId, bookingId));
    return row;
  }

  async ensureBookingGate(
    bookingId: string,
    seed: Partial<InsertBookingGate>,
  ): Promise<BookingGate> {
    // ON CONFLICT DO NOTHING, then read back: the webhook that creates this runs
    // on every Stripe retry, and the gate token must stay STABLE across those
    // retries — a fresh token would invalidate the link already emailed out.
    await db
      .insert(bookingGate)
      .values({ ...seed, bookingId } as InsertBookingGate)
      .onConflictDoNothing({ target: bookingGate.bookingId });
    const row = await this.getBookingGate(bookingId);
    if (!row) throw new StorageError(`booking_gate row missing after ensure for ${bookingId}`);
    return row;
  }

  async updateBookingGate(
    bookingId: string,
    updates: Partial<InsertBookingGate>,
  ): Promise<BookingGate | undefined> {
    const [row] = await db
      .update(bookingGate)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bookingGate.bookingId, bookingId))
      .returning();
    return row;
  }

  async getBookingByGateToken(
    token: string,
  ): Promise<(Booking & { gate: BookingGate }) | undefined> {
    const rows = await db
      .select()
      .from(bookingGate)
      .innerJoin(bookings, eq(bookingGate.bookingId, bookings.id))
      .where(eq(bookingGate.gateToken, token));
    const hit = rows[0];
    if (!hit) return undefined;
    return { ...hit.bookings, gate: hit.booking_gate };
  }

  // --- Gate sweep queries -------------------------------------------------
  // Each is windowed/filtered in SQL so a daily sweep never scans the booking
  // table, and each joins the guest + property + room the templates need.

  private gateStayRows(rows: GateStayJoin[]): GateStayRow[] {
    return rows
      .filter((r) => r.guests !== null && r.properties !== null)
      .map((r) => ({
        ...r.bookings,
        gate: r.booking_gate,
        guest: r.guests as Guest,
        property: r.properties as Property,
        room: r.rooms,
      }));
  }

  /**
   * Gated stays whose guest has NOT finished their documents. The filter is
   * structural — a stay with both documents in is excluded by the QUERY, not by
   * a check inside the sweep loop, so a guest waiting on an admin can never be
   * nudged or auto-declined. Same discipline as dunning filtering PAID rows out
   * before any decision is made.
   */
  async getStaysAwaitingDocs(): Promise<GateStayRow[]> {
    const rows = await db
      .select()
      .from(bookings)
      .innerJoin(bookingGate, eq(bookings.id, bookingGate.bookingId))
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(
        and(
          eq(bookings.status, "PENDING_APPROVAL"),
          // Not yet approved, and at least one document still outstanding.
          isNull(bookingGate.approvedAt),
          or(
            isNull(bookingGate.agreementSignedAt),
            notInArray(bookingGate.verificationStatus, ["PENDING_REVIEW", "APPROVED"]),
          ),
        ),
      );
    return this.gateStayRows(rows as GateStayJoin[]);
  }

  /** Stays whose check-out falls in [from, to] — the checkout-reminder window. */
  async getStaysCheckingOutBetween(from: string, to: string): Promise<GateStayRow[]> {
    const rows = await db
      .select()
      .from(bookings)
      .leftJoin(bookingGate, eq(bookings.id, bookingGate.bookingId))
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(
        and(
          inArray(bookings.status, ["ACTIVE", "CONFIRMED"]),
          // An open-ended stay has no check-out to remind about. Excluded in SQL
          // rather than skipped in the loop so the window stays a real index scan.
          sql`${bookings.checkOut} IS NOT NULL`,
          gte(bookings.checkOut, from),
          lte(bookings.checkOut, to),
        ),
      );
    return this.gateStayRows(rows as GateStayJoin[]);
  }

  /** Stays whose check-IN falls in [from, to] — the pre-arrival window. */
  async getStaysCheckingInBetween(from: string, to: string): Promise<GateStayRow[]> {
    const rows = await db
      .select()
      .from(bookings)
      .leftJoin(bookingGate, eq(bookings.id, bookingGate.bookingId))
      .leftJoin(guests, eq(bookings.guestId, guests.id))
      .leftJoin(properties, eq(bookings.propertyId, properties.id))
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(
        and(
          inArray(bookings.status, ["ACTIVE", "CONFIRMED"]),
          gte(bookings.checkIn, from),
          lte(bookings.checkIn, to),
        ),
      );
    return this.gateStayRows(rows as GateStayJoin[]);
  }

  // --- Access info --------------------------------------------------------

  async getPropertyAccessInfo(propertyId: string): Promise<PropertyAccessInfo | undefined> {
    const [row] = await db
      .select()
      .from(propertyAccessInfo)
      .where(eq(propertyAccessInfo.propertyId, propertyId));
    return row?.info;
  }

  async upsertPropertyAccessInfo(
    propertyId: string,
    info: PropertyAccessInfo,
    actor: string,
  ): Promise<PropertyAccessInfo> {
    const [row] = await db
      .insert(propertyAccessInfo)
      .values({ propertyId, info, updatedBy: actor })
      .onConflictDoUpdate({
        target: propertyAccessInfo.propertyId,
        set: { info, updatedBy: actor, updatedAt: new Date() },
      })
      .returning();
    return row.info;
  }

  async getRoomAccessInfo(roomId: string): Promise<RoomAccessInfo | undefined> {
    const [row] = await db.select().from(roomAccessInfo).where(eq(roomAccessInfo.roomId, roomId));
    return row?.info;
  }

  async upsertRoomAccessInfo(
    roomId: string,
    info: RoomAccessInfo,
    actor: string,
  ): Promise<RoomAccessInfo> {
    const [row] = await db
      .insert(roomAccessInfo)
      .values({ roomId, info, updatedBy: actor })
      .onConflictDoUpdate({
        target: roomAccessInfo.roomId,
        set: { info, updatedBy: actor, updatedAt: new Date() },
      })
      .returning();
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
  async recordPaymentRefund(data: InsertPaymentRefund): Promise<PaymentRefund | null> {
    const [row] = await db
      .insert(paymentRefunds)
      .values(data)
      .onConflictDoNothing({ target: paymentRefunds.stripeRefundId })
      .returning();
    return row ?? null;
  }

  async getRefundsByPayment(paymentId: string): Promise<PaymentRefund[]> {
    return db.select().from(paymentRefunds).where(eq(paymentRefunds.paymentId, paymentId));
  }

  // --- Guest messages ---
  async getMessageThreadsByLease(leaseId: string): Promise<GuestMessage[]> {
    // Roots: where id === threadId. Fetch lease messages, filter to roots.
    const all = await db
      .select()
      .from(guestMessages)
      .where(eq(guestMessages.leaseId, leaseId))
      .orderBy(desc(guestMessages.createdAt));
    return all.filter((m) => m.id === m.threadId);
  }

  async getMessageThreadsByBooking(bookingId: string): Promise<GuestMessage[]> {
    // Roots: where id === threadId. Fetch booking messages, filter to roots.
    const all = await db
      .select()
      .from(guestMessages)
      .where(eq(guestMessages.bookingId, bookingId))
      .orderBy(desc(guestMessages.createdAt));
    return all.filter((m) => m.id === m.threadId);
  }

  async getMessageThreadRoots(opts?: { status?: string; limit?: number }): Promise<GuestMessage[]> {
    // Every thread's root row across all leases/bookings: id === threadId.
    const filters = [sql`${guestMessages.threadId} = ${guestMessages.id}`];
    if (opts?.status) filters.push(eq(guestMessages.status, opts.status));
    const q = db
      .select()
      .from(guestMessages)
      .where(and(...filters))
      .orderBy(desc(guestMessages.createdAt));
    return opts?.limit ? q.limit(opts.limit) : q;
  }

  async getMessagesByThread(threadId: string): Promise<GuestMessage[]> {
    return db
      .select()
      .from(guestMessages)
      .where(eq(guestMessages.threadId, threadId))
      .orderBy(asc(guestMessages.createdAt));
  }

  async getMessage(id: string): Promise<GuestMessage | undefined> {
    const [row] = await db.select().from(guestMessages).where(eq(guestMessages.id, id));
    return row;
  }

  /**
   * One grouped query for message count + last-message time across every
   * threadId given — the batched stand-in for calling getMessagesByThread
   * once per thread root in a list view.
   */
  async getThreadStats(
    threadIds: string[],
  ): Promise<Array<{ threadId: string; messageCount: number; lastMessageAt: Date }>> {
    if (threadIds.length === 0) return [];
    const rows = await db
      .select({
        threadId: guestMessages.threadId,
        messageCount: count(guestMessages.id),
        lastMessageAt: max(guestMessages.createdAt),
      })
      .from(guestMessages)
      .where(inArray(guestMessages.threadId, threadIds))
      .groupBy(guestMessages.threadId);
    return rows.map((r) => ({
      threadId: r.threadId,
      // COUNT() comes back as a bigint-safe string over the Neon HTTP driver,
      // not a JS number, despite drizzle's `count()` typing it as `number`.
      messageCount: Number(r.messageCount),
      lastMessageAt: new Date(r.lastMessageAt as unknown as string),
    }));
  }

  async createMessage(data: InsertGuestMessage): Promise<GuestMessage> {
    // Root messages reference themselves as the thread. Caller passes threadId
    // for replies; for a new root, insert then point threadId at the new id.
    if (data.threadId) {
      const [row] = await db.insert(guestMessages).values(data).returning();
      return row;
    }
    const [row] = await db
      .insert(guestMessages)
      .values({ ...data, threadId: sql`gen_random_uuid()` as unknown as string })
      .returning();
    // Fix threadId to equal the row's own id (self-referential root).
    const [fixed] = await db
      .update(guestMessages)
      .set({ threadId: row.id })
      .where(eq(guestMessages.id, row.id))
      .returning();
    return fixed;
  }

  async updateMessage(
    id: string,
    updates: Partial<InsertGuestMessage>,
  ): Promise<GuestMessage | undefined> {
    const [row] = await db
      .update(guestMessages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(guestMessages.id, id))
      .returning();
    return row;
  }

  // --- Message log ---
  async createMessageLog(data: InsertMessageLog): Promise<MessageLogRow> {
    const [row] = await db.insert(messageLog).values(data).returning();
    return row;
  }

  async getMessageLog(opts: {
    bookingId?: string;
    leaseId?: string;
    guestId?: string;
    limit?: number;
    all?: boolean;
  }): Promise<MessageLogRow[]> {
    const filters = [];
    if (opts.bookingId) filters.push(eq(messageLog.bookingId, opts.bookingId));
    if (opts.leaseId) filters.push(eq(messageLog.leaseId, opts.leaseId));
    if (opts.guestId) filters.push(eq(messageLog.guestId, opts.guestId));
    // No scope + no explicit `all` = a caller that lost its ids. Returning the
    // newest N rows of EVERY guest's traffic would leak one guest's messages
    // into another's thread view, so refuse instead.
    const plan = planMessageLogQuery(opts);
    if (plan.refuse) return [];
    const q = db.select().from(messageLog).orderBy(desc(messageLog.createdAt));
    const filtered = filters.length ? q.where(and(...filters)) : q;
    return filtered.limit(plan.limit);
  }

  // --- Lifecycle events ---
  async hasLifecycleEvent(
    ref: { leaseId?: string | null; bookingId?: string | null },
    eventType: string,
    scheduleSeq: number | null,
  ): Promise<boolean> {
    // Exactly one of leaseId/bookingId scopes the lookup. Without a scope this
    // would match every lease's row of that type, so refuse rather than guess.
    const conds = [eq(lifecycleEvents.eventType, eventType)];
    if (ref.leaseId) conds.push(eq(lifecycleEvents.leaseId, ref.leaseId));
    else if (ref.bookingId) conds.push(eq(lifecycleEvents.bookingId, ref.bookingId));
    else return false;
    const rows = await db
      .select()
      .from(lifecycleEvents)
      .where(and(...conds));
    return rows.some((r) => (r.scheduleSeq ?? null) === scheduleSeq);
  }

  async recordLifecycleEvent(data: InsertLifecycleEvent): Promise<LifecycleEvent> {
    const [row] = await db.insert(lifecycleEvents).values(data).returning();
    return row;
  }

  // --- Payment schedule ---
  async getScheduleByLease(leaseId: string): Promise<PaymentScheduleRow[]> {
    return db
      .select()
      .from(paymentSchedule)
      .where(eq(paymentSchedule.leaseId, leaseId))
      .orderBy(asc(paymentSchedule.scheduleSeq));
  }

  async getScheduleRow(id: string): Promise<PaymentScheduleRow | undefined> {
    const [row] = await db.select().from(paymentSchedule).where(eq(paymentSchedule.id, id));
    return row;
  }

  async updateScheduleRow(
    id: string,
    updates: Partial<InsertPaymentScheduleRow>,
  ): Promise<PaymentScheduleRow | undefined> {
    const [row] = await db
      .update(paymentSchedule)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(paymentSchedule.id, id))
      .returning();
    return row;
  }

  // --- Late fees ---
  async getLateFeesByLease(leaseId: string): Promise<LateFee[]> {
    return db
      .select()
      .from(lateFees)
      .where(eq(lateFees.leaseId, leaseId))
      .orderBy(asc(lateFees.accrualDate));
  }

  async createLateFee(data: InsertLateFee): Promise<LateFee> {
    const [row] = await db.insert(lateFees).values(data).returning();
    return row;
  }

  async updateLateFee(id: string, updates: Partial<InsertLateFee>): Promise<LateFee | undefined> {
    const [row] = await db
      .update(lateFees)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(lateFees.id, id))
      .returning();
    return row;
  }

  async accrueLateFeeOnce(args: {
    leaseId: string;
    scheduleSeq: number;
    accrualDate: string;
    amount: number;
  }): Promise<LateFee | null> {
    // Idempotency guard: one fee per (lease, seq, day).
    const [existing] = await db
      .select()
      .from(lateFees)
      .where(
        and(
          eq(lateFees.leaseId, args.leaseId),
          eq(lateFees.scheduleSeq, args.scheduleSeq),
          eq(lateFees.accrualDate, args.accrualDate),
        ),
      );
    if (existing) return null;
    const [row] = await db
      .insert(lateFees)
      .values({
        leaseId: args.leaseId,
        scheduleSeq: args.scheduleSeq,
        accrualDate: args.accrualDate,
        amount: String(args.amount),
        status: "ACCRUED",
      })
      .returning();
    return row;
  }

  async getAccruedLateFeesForSchedule(leaseId: string, scheduleSeq: number): Promise<LateFee[]> {
    return db
      .select()
      .from(lateFees)
      .where(
        and(
          eq(lateFees.leaseId, leaseId),
          eq(lateFees.scheduleSeq, scheduleSeq),
          eq(lateFees.status, "ACCRUED"),
        ),
      );
  }

  // --- Notification log ---
  async hasNotification(args: {
    leaseId: string;
    scheduleSeq: number | null;
    kind: string;
    sendDate: string;
  }): Promise<boolean> {
    const conds = [
      eq(notificationLog.leaseId, args.leaseId),
      eq(notificationLog.kind, args.kind),
      eq(notificationLog.sendDate, args.sendDate),
    ];
    if (args.scheduleSeq === null) {
      // lease-level notification
      const rows = await db
        .select()
        .from(notificationLog)
        .where(and(...conds));
      return rows.some((r) => r.scheduleSeq === null);
    }
    conds.push(eq(notificationLog.scheduleSeq, args.scheduleSeq));
    const rows = await db
      .select()
      .from(notificationLog)
      .where(and(...conds));
    return rows.length > 0;
  }

  async recordNotification(data: InsertNotificationLogRow): Promise<NotificationLogRow> {
    const [row] = await db.insert(notificationLog).values(data).returning();
    return row;
  }

  // --- App settings ---
  async getSetting(key: string): Promise<AppSetting | undefined> {
    const [row] = await db.select().from(appSettings).where(eq(appSettings.key, key));
    return row;
  }

  async getSettingNumber(key: string, fallback: number): Promise<number> {
    const row = await this.getSetting(key);
    return parseSettingNumber(row?.value, fallback);
  }

  async setSetting(key: string, value: string): Promise<AppSetting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [row] = await db
        .update(appSettings)
        .set({ value, updatedAt: new Date() })
        .where(eq(appSettings.key, key))
        .returning();
      return row;
    }
    const [row] = await db.insert(appSettings).values({ key, value }).returning();
    return row;
  }

  // --- UO escalations ---
  async getEscalations(opts?: {
    status?: string;
    leaseId?: string;
    bookingId?: string;
  }): Promise<UoEscalation[]> {
    const filters = [];
    if (opts?.status) filters.push(eq(uoEscalations.status, opts.status));
    if (opts?.leaseId) filters.push(eq(uoEscalations.leaseId, opts.leaseId));
    if (opts?.bookingId) filters.push(eq(uoEscalations.bookingId, opts.bookingId));
    const q = db.select().from(uoEscalations).orderBy(desc(uoEscalations.createdAt));
    return filters.length ? q.where(and(...filters)) : q;
  }

  async raiseEscalationOnce(data: InsertUoEscalation): Promise<UoEscalation | null> {
    // Dedupe is SCOPED to the subject of the escalation:
    //   lease-scoped   → (leaseId, scheduleSeq, kind, OPEN)
    //   booking-scoped → (bookingId, kind, OPEN)
    //   unscoped       → (scheduleSeq, kind, OPEN) among OTHER unscoped rows
    //                     only — the isNull filters below keep it from
    //                     matching a lease/booking-scoped row that happens to
    //                     share a scheduleSeq (a false dedupe across subjects).
    const conds = [eq(uoEscalations.kind, data.kind), eq(uoEscalations.status, "OPEN")];
    if (data.leaseId) conds.push(eq(uoEscalations.leaseId, data.leaseId));
    else if (data.bookingId) conds.push(eq(uoEscalations.bookingId, data.bookingId));
    else conds.push(isNull(uoEscalations.leaseId), isNull(uoEscalations.bookingId));

    const open = await db
      .select()
      .from(uoEscalations)
      .where(and(...conds));
    if (open.some((e) => escalationDedupeMatch(e, data))) return null;
    const [row] = await db.insert(uoEscalations).values(data).returning();
    return row;
  }

  async updateEscalation(
    id: string,
    updates: Partial<InsertUoEscalation>,
  ): Promise<UoEscalation | undefined> {
    const [row] = await db
      .update(uoEscalations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(uoEscalations.id, id))
      .returning();
    return row;
  }

  async isRoomAvailableForRange(args: {
    roomId: string;
    startDate: string;
    endDate: string;
    endExclusive: boolean;
    excludeLeaseId?: string;
    excludeBookingId?: string;
  }): Promise<boolean> {
    const want = { start: args.startDate, end: args.endDate, endExclusive: args.endExclusive };

    // (1) Room-blocking leases for this room. Leases store an INCLUSIVE endDate.
    const leases = (await this.getRoomBlockingLeasesForRoom(args.roomId)).filter(
      (l) => l.id !== args.excludeLeaseId,
    );
    if (
      leases.some((l) =>
        overlapsRange(want, { start: l.startDate, end: l.endDate, endExclusive: false }),
      )
    ) {
      return false;
    }

    // (2) Short co-living direct bookings for this room (half-open checkOut).
    //     Open-ended rows (legacy deposit bookings with null check_out) can't be
    //     range-checked and are skipped; the short-stay path always writes a
    //     real check_out. CONFLICT bookings are paid but never block dates.
    const roomBookings = (await this.getColivingBookingsForRoom(args.roomId)).filter(
      (b) => b.id !== args.excludeBookingId,
    );
    if (
      roomBookings.some(
        (b) =>
          b.checkOut !== null &&
          overlapsRange(want, { start: b.checkIn, end: b.checkOut, endExclusive: true }),
      )
    ) {
      return false;
    }

    // (3) External iCal blocks for this ROOM listing (Airbnb, half-open DTEND).
    const blocks = await this.getExternalBlocksForRoom(args.roomId);
    if (
      blocks.some((b) =>
        overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true }),
      )
    ) {
      return false;
    }

    // (4) Manual (admin/UO off-platform) blocks for this room (half-open).
    const manual = await this.getManualBlocksForRoom(args.roomId);
    return !manual.some((b) =>
      overlapsRange(want, { start: b.startDate, end: b.endDate, endExclusive: true }),
    );
  }

  async getColivingBookingsForRoom(roomId: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, roomId),
          eq(bookings.model, "COLIVING"),
          ne(bookings.status, "CANCELLED"),
          ne(bookings.status, "CONFLICT"),
        ),
      )
      .orderBy(asc(bookings.checkIn));
  }

  async getOccupiedRoomIdsOn(dateIso: string): Promise<Set<string>> {
    const occupied = new Set<string>();

    const bookingRows = await db
      .select({ roomId: bookings.roomId })
      .from(bookings)
      .where(
        and(
          sql`${bookings.roomId} IS NOT NULL`,
          ne(bookings.status, "CANCELLED"),
          ne(bookings.status, "CONFLICT"),
          lte(bookings.checkIn, dateIso),
          gt(bookings.checkOut, dateIso),
        ),
      );
    for (const r of bookingRows) if (r.roomId) occupied.add(r.roomId);

    const leaseRows = await db
      .select({ roomId: leaseRooms.roomId })
      .from(leaseRooms)
      .innerJoin(leases, eq(leaseRooms.leaseId, leases.id))
      .where(
        and(
          roomHoldingLeaseCondition(),
          lte(leases.startDate, dateIso),
          gte(leases.endDate, dateIso),
        ),
      );
    for (const r of leaseRows) occupied.add(r.roomId);

    const extRows = await db
      .select({ roomId: externalBookings.roomId })
      .from(externalBookings)
      .where(
        and(
          sql`${externalBookings.roomId} IS NOT NULL`,
          lte(externalBookings.startDate, dateIso),
          gt(externalBookings.endDate, dateIso),
        ),
      );
    for (const r of extRows) if (r.roomId) occupied.add(r.roomId);

    const manualRows = await db
      .select({ roomId: manualBlocks.roomId })
      .from(manualBlocks)
      .where(
        and(
          sql`${manualBlocks.roomId} IS NOT NULL`,
          lte(manualBlocks.startDate, dateIso),
          gt(manualBlocks.endDate, dateIso),
        ),
      );
    for (const r of manualRows) if (r.roomId) occupied.add(r.roomId);

    return occupied;
  }

  // --- Manual blocks ---
  async getManualBlocksForRoom(roomId: string): Promise<ManualBlock[]> {
    return db
      .select()
      .from(manualBlocks)
      .where(eq(manualBlocks.roomId, roomId))
      .orderBy(asc(manualBlocks.startDate));
  }

  async getManualBlocksForProperty(propertyId: string): Promise<ManualBlock[]> {
    return db
      .select()
      .from(manualBlocks)
      .where(and(eq(manualBlocks.propertyId, propertyId), sql`${manualBlocks.roomId} IS NULL`))
      .orderBy(asc(manualBlocks.startDate));
  }

  async getManualBlocks(opts?: {
    propertyId?: string;
    roomId?: string;
    from?: string;
  }): Promise<ManualBlock[]> {
    const filters = [];
    if (opts?.propertyId) filters.push(eq(manualBlocks.propertyId, opts.propertyId));
    if (opts?.roomId) filters.push(eq(manualBlocks.roomId, opts.roomId));
    if (opts?.from) filters.push(gte(manualBlocks.endDate, opts.from));
    const q = db.select().from(manualBlocks).orderBy(asc(manualBlocks.startDate));
    return filters.length ? q.where(and(...filters)) : q;
  }

  async createManualBlock(data: InsertManualBlock): Promise<ManualBlock> {
    const [row] = await db.insert(manualBlocks).values(data).returning();
    return row;
  }

  async deleteManualBlock(id: string): Promise<boolean> {
    const deleted = await db.delete(manualBlocks).where(eq(manualBlocks.id, id)).returning();
    return deleted.length > 0;
  }

  // ---------------------------------------------------------------------------
  // Booking intents — a row per checkout started (payment-first leaves no
  // booking row until Stripe confirms). Written by /api/booking-intent, read by
  // UO for guest website activity. A write failure here must never break a
  // checkout, so callers wrap these in try/catch.
  // ---------------------------------------------------------------------------

  async createBookingIntent(data: InsertBookingIntent): Promise<BookingIntent> {
    const [row] = await db.insert(bookingIntents).values(data).returning();
    return row;
  }

  async attachBookingIntentContact(
    stripePaymentIntentId: string,
    contact: { name: string; email: string; phone?: string | null },
  ): Promise<BookingIntent | undefined> {
    const [row] = await db
      .update(bookingIntents)
      .set({
        guestName: contact.name,
        guestEmail: contact.email.trim().toLowerCase(),
        guestPhone: contact.phone || null,
        contactAttachedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(bookingIntents.stripePaymentIntentId, stripePaymentIntentId))
      .returning();
    return row;
  }

  async getBookingIntents(opts?: { guestEmail?: string; since?: Date; limit?: number }): Promise<BookingIntent[]> {
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

  async getListingsWithIcalUrl(): Promise<
    { kind: "property" | "room"; propertyId: string; roomId: string | null; url: string; label: string }[]
  > {
    // Active STR/co-living properties with a feed URL (whole-property listings).
    const propRows = await db
      .select({ id: properties.id, name: properties.name, url: properties.airbnbIcalUrl })
      .from(properties)
      .where(and(eq(properties.active, true), sql`${properties.airbnbIcalUrl} IS NOT NULL`));
    // Rooms with a feed URL (private-room listings), joined to their property.
    const roomRows = await db
      .select({
        id: rooms.id,
        propertyId: rooms.propertyId,
        name: rooms.name,
        url: rooms.airbnbIcalUrl,
      })
      .from(rooms)
      .where(sql`${rooms.airbnbIcalUrl} IS NOT NULL`);

    const listings: {
      kind: "property" | "room";
      propertyId: string;
      roomId: string | null;
      url: string;
      label: string;
    }[] = [];
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

  async getExternalBlocksForProperty(propertyId: string): Promise<ExternalBooking[]> {
    // Whole-property STR listing → room_id IS NULL.
    return db
      .select()
      .from(externalBookings)
      .where(
        and(eq(externalBookings.propertyId, propertyId), sql`${externalBookings.roomId} IS NULL`),
      );
  }

  async getExternalBlocksForRoom(roomId: string): Promise<ExternalBooking[]> {
    return db.select().from(externalBookings).where(eq(externalBookings.roomId, roomId));
  }

  async upsertExternalBooking(data: InsertExternalBooking): Promise<ExternalBooking> {
    // Idempotency key is the LISTING + external_id: (room_id, external_id) for a
    // co-living room, else (property_id, external_id) for a whole-property STR.
    const listingMatch = data.roomId
      ? eq(externalBookings.roomId, data.roomId)
      : and(
          eq(externalBookings.propertyId, data.propertyId as string),
          sql`${externalBookings.roomId} IS NULL`,
        );
    const [existing] = await db
      .select({ id: externalBookings.id })
      .from(externalBookings)
      .where(and(listingMatch, eq(externalBookings.externalId, data.externalId)))
      .limit(1);

    if (existing) {
      const [row] = await db
        .update(externalBookings)
        .set({
          propertyId: data.propertyId ?? null,
          roomId: data.roomId ?? null,
          startDate: data.startDate,
          endDate: data.endDate,
          summary: data.summary ?? null,
          lastSynced: data.lastSynced ?? new Date(),
          updatedAt: new Date(),
        })
        .where(eq(externalBookings.id, existing.id))
        .returning();
      return row;
    }
    const [row] = await db
      .insert(externalBookings)
      .values({ ...data, lastSynced: data.lastSynced ?? new Date() })
      .returning();
    return row;
  }

  async deleteExternalBooking(id: string): Promise<void> {
    await db.delete(externalBookings).where(eq(externalBookings.id, id));
  }

  async getStrBookingsForProperty(propertyId: string): Promise<Booking[]> {
    return db
      .select()
      .from(bookings)
      .where(
        and(
          eq(bookings.propertyId, propertyId),
          eq(bookings.model, "STR"),
          // CANCELLED and CONFLICT rows block nothing — see
          // NON_BLOCKING_BOOKING_STATUSES.
          notInArray(bookings.status, [...NON_BLOCKING_BOOKING_STATUSES]),
        ),
      )
      .orderBy(asc(bookings.checkIn));
  }

  async getRoomBlockingLeasesForRoom(roomId: string): Promise<Lease[]> {
    const links = await db
      .select({ leaseId: leaseRooms.leaseId })
      .from(leaseRooms)
      .where(eq(leaseRooms.roomId, roomId));
    const leaseIds = links.map((l) => l.leaseId);
    if (leaseIds.length === 0) return [];
    return db
      .select()
      .from(leases)
      .where(
        and(
          inArray(leases.id, leaseIds),
          roomHoldingLeaseCondition(),
        ),
      );
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

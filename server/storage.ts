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

import { and, asc, desc, eq, gt, gte, inArray, lte, ne, sql } from "drizzle-orm";
import { db } from "./db";
import { overlapsRange } from "./lib/ranges";
import {
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
  type MessageLogRow,
  type InsertMessageLog,
} from "@shared/schema";
import { inclusiveDays } from "@shared/leaseSchedule";

/** Lease statuses that hold a room (block overlapping bookings for that room). */
const ROOM_BLOCKING_LEASE_STATUSES = [
  "DRAFT",
  "PENDING_SIGNATURE",
  "PENDING_FIRST_PAYMENT",
  "PENDING_VERIFICATION", // deposit paid, room secured, awaiting ID approval
  "ACTIVE",
] as const;

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
  /**
   * Non-cancelled STR bookings with a checkOut on/after `date`, for the given
   * properties, ordered by checkIn — the inputs to the "next opening" chain
   * walk (server/lib/nextOpening.ts). One batched query, never per-property.
   */
  getStrBookingsEndingOnOrAfter(propertyIds: string[], date: string): Promise<Booking[]>;
  createBooking(data: InsertBooking): Promise<Booking>;
  updateBooking(id: string, updates: Partial<InsertBooking>): Promise<Booking | undefined>;
  /**
   * Bookings joined to their guest/property/room for admin/UO listing views.
   * Default statuses exclude CANCELLED and COMPLETED. `from`, when given,
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

  // --- Guest messages (threaded portal questions / requests) ---
  getMessageThreadsByLease(leaseId: string): Promise<GuestMessage[]>; // roots only
  getMessageThreadsByBooking(bookingId: string): Promise<GuestMessage[]>; // roots only
  getMessageThreadRoots(opts?: { status?: string }): Promise<GuestMessage[]>; // every thread, roots only
  getMessagesByThread(threadId: string): Promise<GuestMessage[]>; // all in a thread
  getMessage(id: string): Promise<GuestMessage | undefined>;
  createMessage(data: InsertGuestMessage): Promise<GuestMessage>;
  updateMessage(id: string, updates: Partial<InsertGuestMessage>): Promise<GuestMessage | undefined>;

  // --- Message log (append-only audit trail of every send/receive, any channel) ---
  createMessageLog(data: InsertMessageLog): Promise<MessageLogRow>;
  getMessageLog(opts: {
    bookingId?: string;
    leaseId?: string;
    guestId?: string;
    limit?: number;
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
  deleteManualBlock(id: string): Promise<void>;

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
  /** Non-cancelled STR bookings for a property (external dedup + STR availability). */
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
          ne(bookings.status, "CANCELLED"),
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
    const statuses = opts?.statuses ?? ["CONFIRMED", "ACTIVE", "CONFLICT", "PENDING_PAYMENT"];
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

  async getSoonestOccupyingLeaseEndByProperty(
    propertyIds: string[],
    onOrAfter: string,
  ): Promise<Record<string, string>> {
    if (propertyIds.length === 0) return {};
    // Occupying = deposit paid, room held. Narrower than
    // ROOM_BLOCKING_LEASE_STATUSES on purpose: a DRAFT/unsigned lease blocks
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

  async getMessageThreadRoots(opts?: { status?: string }): Promise<GuestMessage[]> {
    // Every thread's root row across all leases/bookings: id === threadId.
    const filters = [sql`${guestMessages.threadId} = ${guestMessages.id}`];
    if (opts?.status) filters.push(eq(guestMessages.status, opts.status));
    return db
      .select()
      .from(guestMessages)
      .where(and(...filters))
      .orderBy(desc(guestMessages.createdAt));
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
  }): Promise<MessageLogRow[]> {
    const filters = [];
    if (opts.bookingId) filters.push(eq(messageLog.bookingId, opts.bookingId));
    if (opts.leaseId) filters.push(eq(messageLog.leaseId, opts.leaseId));
    if (opts.guestId) filters.push(eq(messageLog.guestId, opts.guestId));
    const q = db.select().from(messageLog).orderBy(desc(messageLog.createdAt));
    const filtered = filters.length ? q.where(and(...filters)) : q;
    return opts.limit ? filtered.limit(opts.limit) : filtered;
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
    if (!row) return fallback;
    const n = parseInt(row.value, 10);
    return Number.isFinite(n) ? n : fallback;
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
    // An unscoped call (neither id) would otherwise collapse every open
    // escalation of that kind into one, so it never dedupes across subjects.
    const conds = [eq(uoEscalations.kind, data.kind), eq(uoEscalations.status, "OPEN")];
    if (data.leaseId) conds.push(eq(uoEscalations.leaseId, data.leaseId));
    else if (data.bookingId) conds.push(eq(uoEscalations.bookingId, data.bookingId));

    const open = await db
      .select()
      .from(uoEscalations)
      .where(and(...conds));
    if (data.bookingId && !data.leaseId) {
      // Booking-scoped escalations carry no installment; one OPEN row per
      // (booking, kind) is the key.
      if (open.length > 0) return null;
    } else {
      // Lease-scoped (and the legacy unscoped case): per-installment.
      const seq = data.scheduleSeq ?? null;
      if (open.some((e) => (e.scheduleSeq ?? null) === seq)) return null;
    }
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
          inArray(leases.status, [...ROOM_BLOCKING_LEASE_STATUSES]),
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

  async deleteManualBlock(id: string): Promise<void> {
    await db.delete(manualBlocks).where(eq(manualBlocks.id, id));
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
          ne(bookings.status, "CANCELLED"),
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
          inArray(leases.status, [...ROOM_BLOCKING_LEASE_STATUSES]),
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

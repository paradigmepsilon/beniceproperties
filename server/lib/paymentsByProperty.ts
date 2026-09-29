// server/lib/paymentsByProperty.ts
// =============================================================================
// The admin Payments tree — "which room in which home did this dollar come
// from, and who paid it". Answers the question the old Payments tab could not:
// it rendered one card per booking whose only handle was a reference string,
// with property/room/guest left as unresolved UUIDs.
//
// Two disjoint money worlds are unioned here, because neither alone is enough:
//   bookings -> payments          (STR nights, short co-living stays, deposits)
//   leases   -> payment_schedule  (recurring co-living rent) + late_fees
// `leases` carries no booking_id and `payments` carries no lease_id, so the walk
// back to a room runs through a different path for each. Doing it once, here,
// keeps the client dumb and the attribution rules testable (the client cannot be
// tested at all — vitest runs environment:"node" with no jsdom).
//
// Two rules this module will not bend:
//   1. PLACEHOLDER properties are absent (shared/placeholder.ts). They are
//      front-end demand probes and must never dilute a report.
//   2. Money is never silently dropped. The joins that build the tree discard a
//      booking/lease whose guest or property row is gone, so those are diffed
//      back out and reported under `unattributed`. A money screen that quietly
//      understates is worse than one extra query.
//
// Deliberate divergence from reconciliation.ts: that report attributes a
// multi-room lease entirely to rooms[0] ("the primary unit") so its totals tie
// out to Stripe without double counting. Correct there, wrong here — it would
// make the other rooms read "$0 earned", which is the exact illegibility this
// screen exists to fix. Here a multi-room lease is listed under EVERY room it
// covers, its money held in `sharedTotals` (never a room's own `totals`), and
// counted exactly once at property level. The two screens will therefore show
// different per-room numbers for the same lease; that is a known, flagged
// difference, not a bug in either.
// =============================================================================

import { countsTowardBusiness } from "@shared/placeholder";
import { BOOKING_STATUSES, LEASE_STATUSES } from "@shared/schema";
import { storage } from "../storage";
import type {
  MoneyLine,
  MoneyLineKind,
  MoneyTotals,
  PaymentsByPropertyView,
  PropertyMoney,
  RoomMoney,
  StayMoney,
  StayRoomRef,
} from "@shared/api-types";

/**
 * How far back a FINISHED stay stays on the screen. Bounds the stay set, never
 * the lines — filtering individual lines by date would render partial stay
 * totals, which is a fresh way to be unreadable.
 */
export const PAYMENTS_VIEW_WINDOW_DAYS = 365;

/** Finished stays, for the aged-out window. */
const TERMINAL_BOOKING_STATUSES = new Set(["COMPLETED", "CANCELLED"]);
const TERMINAL_LEASE_STATUSES = new Set(["COMPLETED", "TERMINATED"]);

/**
 * CLOSED = no further money will ever arrive on this stay, so an unpaid row on
 * it is not a forecast, it is an artifact. Counting those as `scheduled` was
 * overstating expected revenue by thousands on real data: a terminated lease
 * still listed every remaining rent installment, a cancelled booking still
 * listed its unpaid PaymentIntent, and an abandoned checkout listed the
 * PENDING row it created before the guest walked away.
 *
 * DEFAULTED is deliberately NOT here — an unpaid installment on a defaulted
 * lease is real debt and must keep showing as overdue.
 */
const CLOSED_BOOKING_STATUSES = new Set(["COMPLETED", "CANCELLED", "PENDING_PAYMENT"]);
const CLOSED_LEASE_STATUSES = new Set(["COMPLETED", "TERMINATED"]);

/**
 * On a closed stay, demote forward-looking money to "shown but uncounted".
 * collected/refunded/lateFees survive: money that changed hands is history, and
 * accrued late fees may still be pursued.
 */
function demoteIfClosed(bucket: Bucket, closed: boolean): Bucket {
  if (!closed) return bucket;
  return bucket === "scheduled" || bucket === "overdue" ? "none" : bucket;
}

const DAY_MS = 86_400_000;
const round = (v: number) => Math.round(v * 100) / 100;

function num(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "number" ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

function iso(v: Date | string | null | undefined): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

/** Which total a line feeds. "none" = shown but counted nowhere (WAIVED, legacy). */
type Bucket = "collected" | "scheduled" | "overdue" | "lateFees" | "refunded" | "none";
interface BuiltLine {
  /** `counted` is DERIVED from `bucket` at emit time, so it is absent here —
   *  there is no way to set the flag and the bucket inconsistently. */
  line: Omit<MoneyLine, "counted">;
  bucket: Bucket;
}

function emptyTotals(): MoneyTotals {
  return { collected: 0, scheduled: 0, overdue: 0, lateFees: 0, refunded: 0, expected: 0 };
}

function addInto(target: MoneyTotals, source: MoneyTotals): void {
  target.collected = round(target.collected + source.collected);
  target.scheduled = round(target.scheduled + source.scheduled);
  target.overdue = round(target.overdue + source.overdue);
  target.lateFees = round(target.lateFees + source.lateFees);
  target.refunded = round(target.refunded + source.refunded);
  target.expected = round(target.collected + target.scheduled + target.overdue);
}

function totalsOf(built: BuiltLine[]): MoneyTotals {
  const t = emptyTotals();
  for (const { line, bucket } of built) {
    if (bucket === "none") continue;
    t[bucket] = round(t[bucket] + line.amount);
  }
  t.expected = round(t.collected + t.scheduled + t.overdue);
  return t;
}

/** A stay holds money at all? Drives the abandoned/MISSING decisions. */
const hasMoney = (t: MoneyTotals) =>
  t.collected !== 0 || t.scheduled !== 0 || t.overdue !== 0 || t.lateFees !== 0 || t.refunded !== 0;

// --- line classification -------------------------------------------------

/** payments.status: PENDING | PAID | FAILED | REFUNDED */
function bookingPaymentBucket(status: string): Bucket {
  if (status === "PAID") return "collected";
  if (status === "REFUNDED") return "refunded";
  if (status === "FAILED") return "overdue";
  return "scheduled"; // PENDING — a manual transfer awaiting confirmation
}

/** DEPOSIT_STATUSES: PENDING | PAID | REFUNDED | WAIVED */
function feeSnapshotBucket(status: string): Bucket {
  if (status === "PAID") return "collected";
  if (status === "REFUNDED") return "refunded";
  if (status === "WAIVED") return "none";
  return "scheduled";
}

/** SCHEDULE_STATUSES: SCHEDULED | DUE | PAID | FAILED | LATE | WAIVED */
function rentBucket(status: string, dueDate: string | null, asOfDay: string): Bucket {
  if (status === "PAID") return "collected";
  if (status === "WAIVED") return "none";
  if (status === "LATE" || status === "FAILED") return "overdue";
  if (status === "DUE") return dueDate && dueDate < asOfDay ? "overdue" : "scheduled";
  return "scheduled"; // SCHEDULED
}

/** LATE_FEE_STATUSES: ACCRUED | BILLED | PAID | WAIVED */
function lateFeeBucket(status: string): Bucket {
  if (status === "PAID") return "collected";
  if (status === "WAIVED") return "none";
  return "lateFees"; // ACCRUED | BILLED — still owed
}

const KIND_ORDER: Record<MoneyLineKind, number> = {
  DEPOSIT: 0,
  CLEANING_FEE: 1,
  RENT: 2,
  LATE_FEE: 3,
  BOOKING_PAYMENT: 4,
  SUBSCRIPTION: 5,
  MISSING: 6,
};

function sortLines(built: BuiltLine[]): BuiltLine[] {
  return built
    .map((b, i) => ({ b, i }))
    .sort((x, y) => {
      const k = KIND_ORDER[x.b.line.kind] - KIND_ORDER[y.b.line.kind];
      if (k !== 0) return k;
      const xs = x.b.line.scheduleSeq;
      const ys = y.b.line.scheduleSeq;
      if (xs !== null && ys !== null && xs !== ys) return xs - ys;
      return x.i - y.i; // stable: storage already ordered within a kind
    })
    .map(({ b }) => b);
}

// --- room sorting --------------------------------------------------------

function compareRooms(a: RoomMoney, b: RoomMoney): number {
  // The whole-property bucket represents the property itself — always first.
  if (a.roomId === null && b.roomId === null) return 0;
  if (a.roomId === null) return -1;
  if (b.roomId === null) return 1;
  const an = a.roomNumber;
  const bn = b.roomNumber;
  if (an === null && bn === null) return a.roomName.localeCompare(b.roomName);
  if (an === null) return 1; // unnumbered rooms last
  if (bn === null) return -1;
  const ai = parseInt(an, 10);
  const bi = parseInt(bn, 10);
  if (Number.isFinite(ai) && Number.isFinite(bi)) {
    return ai !== bi ? ai - bi : a.roomName.localeCompare(b.roomName);
  }
  return an.localeCompare(bn);
}

// --- grouping helpers ----------------------------------------------------

function groupBy<T>(rows: T[], key: (r: T) => string | null | undefined): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    if (!k) continue;
    const list = m.get(k);
    if (list) list.push(r);
    else m.set(k, [r]);
  }
  return m;
}

interface MutableRoom extends RoomMoney {}
interface MutableProperty extends PropertyMoney {
  rooms: MutableRoom[];
}

export async function buildPaymentsByProperty(asOf: string): Promise<PaymentsByPropertyView> {
  const asOfMs = Date.parse(asOf);
  const asOfDay = new Date(asOfMs).toISOString().slice(0, 10);
  const windowFloorDay = new Date(asOfMs - PAYMENTS_VIEW_WINDOW_DAYS * DAY_MS)
    .toISOString()
    .slice(0, 10);

  // Statuses derived from the schema constants, never literal lists, so a new
  // status is included the day it is added rather than silently omitted.
  const bookingStatuses = [...BOOKING_STATUSES];
  const leaseStatuses = LEASE_STATUSES.filter((s) => s !== "DRAFT");

  // --- wave 1: the row sets -------------------------------------------------
  const [allProperties, bookingsJoined, leasesJoined, allBookings, allLeases] = await Promise.all([
    storage.getProperties(),
    storage.getBookingsWithGuest({ statuses: bookingStatuses }),
    storage.getLeasesWithGuest({ statuses: leaseStatuses }),
    storage.getBookings(),
    storage.getLeases(),
  ]);

  const realProperties = allProperties.filter((p) => countsTowardBusiness(p));
  const placeholderProperties = allProperties.length - realProperties.length;
  const realPropertyIds = new Set(realProperties.map((p) => p.id));

  const allBookingIds = allBookings.map((b) => b.id);
  const allLeaseIds = allLeases.map((l) => l.id);

  // --- wave 2: the money, batched by id (no N+1) ----------------------------
  const [roomRows, paymentRows, subRows, scheduleRows, feeRows, leaseRoomRows] = await Promise.all([
    storage.getRoomsByProperties(realProperties.map((p) => p.id)),
    storage.getPaymentsByBookings(allBookingIds),
    storage.getSubscriptionsByBookings(allBookingIds),
    storage.getScheduleForLeases(allLeaseIds),
    storage.getLateFeesForLeases(allLeaseIds),
    storage.getLeaseRoomsForLeases(allLeaseIds),
  ]);

  const paymentsByBooking = groupBy(paymentRows, (p) => p.bookingId);
  const subsByBooking = groupBy(subRows, (s) => s.bookingId);
  const scheduleByLease = groupBy(scheduleRows, (s) => s.leaseId);
  const feesByLease = groupBy(feeRows, (f) => f.leaseId);
  const leaseRoomsByLease = groupBy(leaseRoomRows, (r) => r.leaseId);

  // --- the tree skeleton: every real property, every room pre-seeded --------
  // A room with no stays must still appear: for a four-room house the operator
  // needs to see which rooms are earning nothing. Vacancy is the most expensive
  // number on the page.
  const propertyById = new Map<string, MutableProperty>();
  for (const p of realProperties) {
    propertyById.set(p.id, {
      propertyId: p.id,
      propertyName: p.name,
      entity: p.entity,
      type: p.type,
      location: p.location,
      active: p.active,
      totals: emptyTotals(),
      stayCount: 0,
      rooms: [],
    });
  }
  for (const r of roomRows) {
    const p = propertyById.get(r.propertyId);
    if (!p) continue;
    p.rooms.push({
      roomId: r.id,
      roomName: r.name,
      roomNumber: r.roomNumber,
      roomStatus: r.status,
      totals: emptyTotals(),
      sharedTotals: emptyTotals(),
      stays: [],
    });
  }

  /** The "Whole property" bucket, created only when something lands in it. */
  function wholePropertyBucket(p: MutableProperty): MutableRoom {
    let bucket = p.rooms.find((r) => r.roomId === null);
    if (!bucket) {
      bucket = {
        roomId: null,
        roomName: "Whole property",
        roomNumber: null,
        roomStatus: null,
        totals: emptyTotals(),
        sharedTotals: emptyTotals(),
        stays: [],
      };
      p.rooms.push(bucket);
    }
    return bucket;
  }

  /** A lease room whose `rooms` row is gone still needs somewhere to sit. */
  function roomBucket(p: MutableProperty, ref: StayRoomRef): MutableRoom {
    const found = p.rooms.find((r) => r.roomId === ref.roomId);
    if (found) return found;
    const created: MutableRoom = {
      roomId: ref.roomId,
      roomName: ref.name,
      roomNumber: ref.roomNumber,
      roomStatus: null,
      totals: emptyTotals(),
      sharedTotals: emptyTotals(),
      stays: [],
    };
    p.rooms.push(created);
    return created;
  }

  const excluded = {
    abandonedCheckouts: 0,
    draftLeases: allLeases.filter((l) => l.status === "DRAFT").length,
    agedOut: 0,
    placeholderProperties,
  };
  const unattributedStays: StayMoney[] = [];
  const unattributedTotals = emptyTotals();

  /** Place a fully-built stay under its property, or under unattributed. */
  function place(stay: StayMoney, propertyId: string): void {
    const property = propertyById.get(propertyId);
    if (!property) {
      // Property is a placeholder, or its row is gone. Either way the stay has
      // no home in the tree — but if it holds money, say so rather than lose it.
      if (hasMoney(stay.totals)) {
        unattributedStays.push(stay);
        addInto(unattributedTotals, stay.totals);
      }
      return;
    }
    const buckets = stay.rooms.length
      ? stay.rooms.map((ref) => roomBucket(property, ref))
      : [wholePropertyBucket(property)];
    for (const bucket of buckets) {
      bucket.stays.push(stay);
      addInto(stay.multiRoom ? bucket.sharedTotals : bucket.totals, stay.totals);
    }
    // Property level counts each stay ONCE, however many rooms it spans.
    addInto(property.totals, stay.totals);
    property.stayCount += 1;
  }

  // --- booking stays -------------------------------------------------------
  function bookingLines(bookingId: string, closed: boolean): BuiltLine[] {
    const built: BuiltLine[] = [];
    for (const p of paymentsByBooking.get(bookingId) ?? []) {
      built.push({
        line: {
          id: `payment:${p.id}`,
          kind: "BOOKING_PAYMENT",
          label: `${p.type} · ${p.method}`,
          scheduleSeq: null,
          dueDate: null,
          amount: round(num(p.amount) + num(p.surcharge)),
          surcharge: round(num(p.surcharge)),
          status: p.status,
          method: p.method,
          paidAt: iso(p.paidAt),
          stripeRef: p.stripeRef ?? null,
        },
        bucket: demoteIfClosed(bookingPaymentBucket(p.status), closed),
      });
    }
    for (const s of subsByBooking.get(bookingId) ?? []) {
      // Superseded by the saved-card scheduler (see CLAUDE.md); any row is
      // historical. Shown so the money is not invisible, counted nowhere so it
      // cannot double up with the WEEKLY payment rows it produced.
      built.push({
        line: {
          id: `sub:${s.id}`,
          kind: "SUBSCRIPTION",
          label: "Weekly subscription (legacy)",
          scheduleSeq: null,
          dueDate: null,
          amount: round(num(s.weeklyAmount)),
          surcharge: null,
          status: s.status,
          method: "STRIPE",
          paidAt: null,
          stripeRef: s.stripeSubscriptionId ?? null,
        },
        bucket: "none",
      });
    }
    return built;
  }

  const joinedBookingIds = new Set(bookingsJoined.map((b) => b.id));
  for (const b of bookingsJoined) {
    const closed = CLOSED_BOOKING_STATUSES.has(b.status);
    const built = bookingLines(b.id, closed);

    // An abandoned checkout: started, never paid, no guest intent beyond a form.
    // The booking-intents report is the place for these.
    if (b.status === "PENDING_PAYMENT" && built.length === 0) {
      excluded.abandonedCheckouts += 1;
      continue;
    }
    // Finished long ago — bound the list, not the lines.
    const finishedOn = b.checkOut ?? b.checkIn;
    if (TERMINAL_BOOKING_STATUSES.has(b.status) && finishedOn && finishedOn < windowFloorDay) {
      excluded.agedOut += 1;
      continue;
    }

    const rooms: StayRoomRef[] = b.room
      ? [{ roomId: b.room.id, name: b.room.name, roomNumber: b.room.roomNumber }]
      : [];

    if (built.length === 0) {
      // A stay on the books with no money row at all. The most valuable anomaly
      // this screen can surface, so it is shown loudly rather than tidied away.
      built.push({
        line: {
          id: `missing:${b.id}`,
          kind: "MISSING",
          label: "No payment recorded",
          scheduleSeq: null,
          dueDate: null,
          amount: 0,
          surcharge: null,
          status: b.status,
          method: b.paymentMethod ?? null,
          paidAt: null,
          stripeRef: null,
        },
        bucket: "none",
      });
    }

    const sorted = sortLines(built);
    place(
      {
        kind: "BOOKING",
        id: b.id,
        reference: b.reference,
        handle: b.reference ?? b.id.slice(0, 8),
        guestName: b.guest.name,
        guestEmail: b.guest.email,
        guestPhone: b.guest.phone ?? null,
        status: b.status,
        start: b.checkIn,
        end: b.checkOut ?? null,
        model: b.model,
        cadence: null,
        rooms,
        multiRoom: false,
        totals: totalsOf(sorted),
        lines: sorted.map((x) => ({ ...x.line, counted: x.bucket !== "none" })),
        portalToken: null,
      },
      b.propertyId,
    );
  }

  // Bookings the join dropped (guest or property row gone). Their money is real.
  for (const b of allBookings) {
    if (joinedBookingIds.has(b.id)) continue;
    const sorted = sortLines(bookingLines(b.id, CLOSED_BOOKING_STATUSES.has(b.status)));
    const totals = totalsOf(sorted);
    if (!hasMoney(totals)) {
      if (b.status === "PENDING_PAYMENT") excluded.abandonedCheckouts += 1;
      continue;
    }
    unattributedStays.push({
      kind: "BOOKING",
      id: b.id,
      reference: b.reference ?? null,
      handle: b.reference ?? b.id.slice(0, 8),
      guestName: "(guest record missing)",
      guestEmail: "",
      guestPhone: null,
      status: b.status,
      start: b.checkIn,
      end: b.checkOut ?? null,
      model: b.model ?? "",
      cadence: null,
      rooms: [],
      multiRoom: false,
      totals,
      lines: sorted.map((x) => ({ ...x.line, counted: x.bucket !== "none" })),
      portalToken: null,
    });
    addInto(unattributedTotals, totals);
  }

  // --- lease stays ---------------------------------------------------------
  function leaseLines(l: {
    id: string;
    depositAmountSnapshot?: string | null;
    depositStatus?: string | null;
    depositPaidAt?: Date | string | null;
    cleaningFeeSnapshot?: string | null;
    cleaningFeeStatus?: string | null;
    cleaningFeePaidAt?: Date | string | null;
  }, closed: boolean): BuiltLine[] {
    const built: BuiltLine[] = [];

    const deposit = num(l.depositAmountSnapshot);
    if (deposit > 0) {
      built.push({
        line: {
          id: `deposit:${l.id}`,
          kind: "DEPOSIT",
          label: "Deposit",
          scheduleSeq: null,
          dueDate: null,
          amount: round(deposit),
          surcharge: null,
          status: l.depositStatus ?? "PENDING",
          method: null,
          paidAt: iso(l.depositPaidAt),
          stripeRef: null,
        },
        bucket: demoteIfClosed(feeSnapshotBucket(l.depositStatus ?? "PENDING"), closed),
      });
    }

    const cleaning = num(l.cleaningFeeSnapshot);
    if (cleaning > 0) {
      built.push({
        line: {
          id: `cleaning:${l.id}`,
          kind: "CLEANING_FEE",
          label: "Cleaning fee",
          scheduleSeq: null,
          dueDate: null,
          amount: round(cleaning),
          surcharge: null,
          status: l.cleaningFeeStatus ?? "PENDING",
          method: null,
          paidAt: iso(l.cleaningFeePaidAt),
          stripeRef: null,
        },
        bucket: demoteIfClosed(feeSnapshotBucket(l.cleaningFeeStatus ?? "PENDING"), closed),
      });
    }

    for (const s of scheduleByLease.get(l.id) ?? []) {
      built.push({
        line: {
          id: `sched:${l.id}:${s.scheduleSeq}`,
          kind: "RENT",
          label: "Rent",
          scheduleSeq: s.scheduleSeq,
          dueDate: s.dueDate,
          amount: round(num(s.amount)),
          surcharge: null,
          status: s.status,
          method: s.paymentMethod,
          paidAt: iso(s.paidAt),
          stripeRef: s.stripePaymentIntentId ?? null,
        },
        bucket: demoteIfClosed(rentBucket(s.status, s.dueDate, asOfDay), closed),
      });
    }

    // Late fees accrue ONE ROW PER DAY, indefinitely ($25/day per CLAUDE.md), so
    // a lease a month late carries thirty rows. Rendering them individually
    // would drown the screen and recreate the complaint this tab exists to fix.
    // Collapsed per installment AND status — a seq can hold both BILLED and
    // ACCRUED days, and those mean different things.
    const feeGroups = groupBy(feesByLease.get(l.id) ?? [], (f) => `${f.scheduleSeq}:${f.status}`);
    for (const fees of Array.from(feeGroups.values())) {
      const first = fees[0];
      const total = fees.reduce((n, f) => n + num(f.amount), 0);
      const earliest = fees
        .map((f) => f.accrualDate)
        .filter(Boolean)
        .sort()[0] ?? null;
      const days = fees.length === 1 ? "1 day" : `${fees.length} days`;
      built.push({
        line: {
          id: `latefee:${l.id}:${first.scheduleSeq}:${first.status}`,
          kind: "LATE_FEE",
          label:
            first.scheduleSeq === null || first.scheduleSeq === undefined
              ? `Late fees (${days})`
              : `Late fees (inst. #${first.scheduleSeq} — ${days})`,
          scheduleSeq: first.scheduleSeq ?? null,
          dueDate: earliest,
          amount: round(total),
          surcharge: null,
          status: first.status,
          method: null,
          paidAt: null,
          stripeRef: first.stripePaymentIntentId ?? null,
        },
        bucket: lateFeeBucket(first.status),
      });
    }

    return built;
  }

  function leaseRoomRefs(leaseId: string): StayRoomRef[] {
    return (leaseRoomsByLease.get(leaseId) ?? []).map((r) => ({
      roomId: r.roomId,
      name: r.roomNameSnapshot,
      roomNumber: r.roomNumberSnapshot ?? null,
    }));
  }

  const joinedLeaseIds = new Set(leasesJoined.map((l) => l.id));
  for (const l of leasesJoined) {
    if (TERMINAL_LEASE_STATUSES.has(l.status) && l.endDate && l.endDate < windowFloorDay) {
      excluded.agedOut += 1;
      continue;
    }
    const built = leaseLines(l, CLOSED_LEASE_STATUSES.has(l.status));
    if (built.length === 0) {
      built.push({
        line: {
          id: `missing:${l.id}`,
          kind: "MISSING",
          label: "No payment recorded",
          scheduleSeq: null,
          dueDate: null,
          amount: 0,
          surcharge: null,
          status: l.status,
          method: null,
          paidAt: null,
          stripeRef: null,
        },
        bucket: "none",
      });
    }
    const sorted = sortLines(built);
    const rooms = leaseRoomRefs(l.id);
    place(
      {
        kind: "LEASE",
        id: l.id,
        reference: null, // leases carry no human reference — see the handle
        handle: l.id.slice(0, 8),
        guestName: l.guest.name,
        guestEmail: l.guest.email,
        guestPhone: l.guest.phone ?? null,
        status: l.status,
        start: l.startDate,
        end: l.endDate,
        model: "LEASE",
        cadence: l.paymentCadence,
        rooms,
        multiRoom: rooms.length > 1,
        totals: totalsOf(sorted),
        lines: sorted.map((x) => ({ ...x.line, counted: x.bucket !== "none" })),
        portalToken: l.portalToken ?? null,
      },
      l.propertyId,
    );
  }

  // Leases the join dropped. DRAFT is already counted and carries no money.
  for (const l of allLeases) {
    if (joinedLeaseIds.has(l.id) || l.status === "DRAFT") continue;
    const sorted = sortLines(leaseLines(l, CLOSED_LEASE_STATUSES.has(l.status)));
    const totals = totalsOf(sorted);
    if (!hasMoney(totals)) continue;
    const rooms = leaseRoomRefs(l.id);
    unattributedStays.push({
      kind: "LEASE",
      id: l.id,
      reference: null,
      handle: l.id.slice(0, 8),
      guestName: "(guest record missing)",
      guestEmail: "",
      guestPhone: null,
      status: l.status,
      start: l.startDate,
      end: l.endDate,
      model: "LEASE",
      cadence: l.paymentCadence ?? null,
      rooms,
      multiRoom: rooms.length > 1,
      totals,
      lines: sorted.map((x) => ({ ...x.line, counted: x.bucket !== "none" })),
      portalToken: null,
    });
    addInto(unattributedTotals, totals);
  }

  // --- finalise ------------------------------------------------------------
  const properties = Array.from(propertyById.values())
    .map((p) => ({ ...p, rooms: [...p.rooms].sort(compareRooms) }))
    .sort((a, b) => a.propertyName.localeCompare(b.propertyName));

  for (const p of properties) {
    for (const r of p.rooms) {
      r.stays.sort((a, b) => (a.start === b.start ? a.handle.localeCompare(b.handle) : a.start < b.start ? 1 : -1));
    }
  }

  const grand = emptyTotals();
  for (const p of properties) addInto(grand, p.totals);
  addInto(grand, unattributedTotals);

  return {
    asOf,
    grand,
    properties,
    unattributed: { stays: unattributedStays, totals: unattributedTotals },
    excluded,
  };
}

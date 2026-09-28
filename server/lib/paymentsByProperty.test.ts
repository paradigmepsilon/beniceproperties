// server/lib/paymentsByProperty.test.ts
// The admin Payments tree over mocked storage. This is where the money
// ATTRIBUTION rules live, and none of them can be tested in the client (vitest
// runs environment:"node" with no jsdom), so they are pinned here:
//   - which room bucket a dollar lands in, including multi-room leases
//   - what counts as collected / scheduled / overdue / late / refunded
//   - that placeholder listings hold no place in a report
//   - that money whose guest or property row vanished is never silently lost

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getProperties: vi.fn(),
  getRoomsByProperties: vi.fn(),
  getBookingsWithGuest: vi.fn(),
  getBookings: vi.fn(),
  getPaymentsByBookings: vi.fn(),
  getSubscriptionsByBookings: vi.fn(),
  getLeasesWithGuest: vi.fn(),
  getLeases: vi.fn(),
  getScheduleForLeases: vi.fn(),
  getLateFeesForLeases: vi.fn(),
  getLeaseRoomsForLeases: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { buildPaymentsByProperty, PAYMENTS_VIEW_WINDOW_DAYS } from "./paymentsByProperty";

const ASOF = "2026-09-27T12:00:00.000Z";

// --- row factories: only the fields the builder reads ---------------------
const prop = (o: Record<string, unknown> = {}) => ({
  id: "prop-1", name: "Old Bill Cook", type: "COLIVING", entity: "BNP",
  location: "Atlanta", active: true, isPlaceholder: false, ...o,
});
const room = (o: Record<string, unknown> = {}) => ({
  id: "r1", propertyId: "prop-1", name: "Room 1", roomNumber: "1", status: "AVAILABLE", ...o,
});
const guest = (o: Record<string, unknown> = {}) => ({
  id: "g1", name: "Jordan Reyes", email: "jordan@example.com", phone: "+15551112222", ...o,
});
const booking = (o: Record<string, unknown> = {}) => ({
  id: "b1", propertyId: "prop-1", roomId: "r1", guestId: "g1", model: "COLIVING",
  reference: "BNP-AAA111", status: "CONFIRMED", checkIn: "2026-09-20", checkOut: "2026-09-25",
  quotedTotal: "1000", createdAt: new Date("2026-09-19"),
  guest: guest(), property: prop(), room: room(), ...o,
});
const payment = (o: Record<string, unknown> = {}) => ({
  id: "p1", bookingId: "b1", type: "ONE_TIME", method: "STRIPE", amount: "1000",
  surcharge: "29", status: "PAID", stripeRef: "pi_1",
  paidAt: new Date("2026-09-19"), createdAt: new Date("2026-09-19"), ...o,
});
const lease = (o: Record<string, unknown> = {}) => ({
  id: "lease-1", propertyId: "prop-1", guestId: "g2",
  startDate: "2026-08-01", endDate: "2026-10-01", paymentCadence: "WEEKLY",
  totalLeaseValue: "5000", status: "ACTIVE", portalToken: "tok-1",
  depositAmountSnapshot: null, depositStatus: "PENDING", depositPaidAt: null,
  cleaningFeeSnapshot: null, cleaningFeeStatus: "PENDING", cleaningFeePaidAt: null,
  createdAt: new Date("2026-07-25"),
  guest: guest({ id: "g2", name: "Maya Lindqvist", email: "maya@example.com", phone: null }),
  property: prop(), ...o,
});
const sched = (o: Record<string, unknown> = {}) => ({
  id: "s1", leaseId: "lease-1", scheduleSeq: 1, dueDate: "2026-08-01", amount: "500",
  status: "PAID", paidAt: new Date("2026-08-01"), paymentMethod: "CARD_ON_FILE",
  stripePaymentIntentId: "pi_s1", manualNote: null, ...o,
});
const fee = (o: Record<string, unknown> = {}) => ({
  id: "f1", leaseId: "lease-1", scheduleSeq: 6, accrualDate: "2026-09-20",
  amount: "25", status: "ACCRUED", stripePaymentIntentId: null, ...o,
});
const leaseRoom = (o: Record<string, unknown> = {}) => ({
  id: "lr1", leaseId: "lease-1", roomId: "r1",
  roomNumberSnapshot: "1", roomNameSnapshot: "Room 1", ...o,
});

function given(o: Record<string, unknown[] | undefined> = {}) {
  mockStorage.getProperties.mockResolvedValue(o.properties ?? []);
  mockStorage.getRoomsByProperties.mockResolvedValue(o.rooms ?? []);
  mockStorage.getBookingsWithGuest.mockResolvedValue(o.bookingsWithGuest ?? []);
  mockStorage.getBookings.mockResolvedValue(o.allBookings ?? o.bookingsWithGuest ?? []);
  mockStorage.getPaymentsByBookings.mockResolvedValue(o.payments ?? []);
  mockStorage.getSubscriptionsByBookings.mockResolvedValue(o.subscriptions ?? []);
  mockStorage.getLeasesWithGuest.mockResolvedValue(o.leasesWithGuest ?? []);
  mockStorage.getLeases.mockResolvedValue(o.allLeases ?? o.leasesWithGuest ?? []);
  mockStorage.getScheduleForLeases.mockResolvedValue(o.schedule ?? []);
  mockStorage.getLateFeesForLeases.mockResolvedValue(o.lateFees ?? []);
  mockStorage.getLeaseRoomsForLeases.mockResolvedValue(o.leaseRooms ?? []);
}

beforeEach(() => vi.clearAllMocks());

// =========================================================================
describe("bucketing: property → room", () => {
  it("puts an STR booking with no roomId in a lazily-created Whole property bucket", async () => {
    given({
      properties: [prop({ id: "p-str", type: "STR", name: "The Retreat" })],
      bookingsWithGuest: [booking({ propertyId: "p-str", roomId: null, room: null, model: "STR" })],
      payments: [payment()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const p = v.properties[0];
    expect(p.rooms).toHaveLength(1);
    expect(p.rooms[0].roomId).toBeNull();
    expect(p.rooms[0].roomName).toBe("Whole property");
    expect(p.rooms[0].roomStatus).toBeNull();
    expect(p.rooms[0].stays).toHaveLength(1);
  });

  it("does NOT invent a Whole property bucket for a co-living house", async () => {
    given({
      properties: [prop()],
      rooms: [room()],
      bookingsWithGuest: [booking()],
      payments: [payment()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms.map((r) => r.roomId)).toEqual(["r1"]);
  });

  it("pre-seeds every room even with zero stays, so vacancy is visible", async () => {
    given({
      properties: [prop()],
      rooms: [room(), room({ id: "r2", name: "Room 2", roomNumber: "2" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const rooms = v.properties[0].rooms;
    expect(rooms).toHaveLength(2);
    expect(rooms[1].stays).toEqual([]);
    expect(rooms[1].totals.collected).toBe(0);
  });

  it("keeps a null-room booking on a co-living property instead of dropping it", async () => {
    given({
      properties: [prop()],
      rooms: [room()],
      bookingsWithGuest: [booking({ roomId: null, room: null })],
      payments: [payment()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const whole = v.properties[0].rooms.find((r) => r.roomId === null)!;
    expect(whole.stays).toHaveLength(1);
    expect(v.grand.collected).toBe(1029);
  });
});

// =========================================================================
describe("lease money", () => {
  it("turns schedule rows into RENT lines in seq order", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      schedule: [
        sched({ id: "s2", scheduleSeq: 2, dueDate: "2026-08-08", status: "SCHEDULED", paidAt: null }),
        sched(),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stay = v.properties[0].rooms[0].stays[0];
    const rent = stay.lines.filter((l) => l.kind === "RENT");
    expect(rent.map((l) => l.scheduleSeq)).toEqual([1, 2]);
    expect(rent[0].label).toBe("Rent");
    expect(stay.kind).toBe("LEASE");
    expect(stay.cadence).toBe("WEEKLY");
  });

  it("aggregates late fees per installment+status into one line, counted as lateFees", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      schedule: [sched({ scheduleSeq: 6, status: "LATE", dueDate: "2026-09-19", amount: "500", paidAt: null })],
      lateFees: [
        fee({ id: "f1", accrualDate: "2026-09-20" }),
        fee({ id: "f2", accrualDate: "2026-09-21" }),
        fee({ id: "f3", accrualDate: "2026-09-22" }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stay = v.properties[0].rooms[0].stays[0];
    const feeLines = stay.lines.filter((l) => l.kind === "LATE_FEE");
    expect(feeLines).toHaveLength(1);
    expect(feeLines[0].amount).toBe(75);
    expect(feeLines[0].scheduleSeq).toBe(6);
    expect(feeLines[0].label).toContain("#6");
    expect(feeLines[0].label).toContain("3 days");
    expect(stay.totals.lateFees).toBe(75);
    expect(stay.totals.collected).toBe(0);
  });

  it("splits late fees into separate lines per status", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      lateFees: [
        fee({ id: "f1", status: "BILLED" }),
        fee({ id: "f2", status: "ACCRUED", accrualDate: "2026-09-21" }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const feeLines = v.properties[0].rooms[0].stays[0].lines.filter((l) => l.kind === "LATE_FEE");
    expect(feeLines).toHaveLength(2);
    expect(feeLines.map((l) => l.status).sort()).toEqual(["ACCRUED", "BILLED"]);
  });

  it("counts a PAID late fee as collected, not as an outstanding late fee", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      lateFees: [fee({ status: "PAID" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.collected).toBe(25);
    expect(t.lateFees).toBe(0);
  });

  it("ignores WAIVED late fees entirely", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      lateFees: [fee({ status: "WAIVED" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.lateFees).toBe(0);
    expect(t.collected).toBe(0);
  });

  it("emits deposit and cleaning-fee lines from the lease snapshots, apart from rent", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({
        depositAmountSnapshot: "600", depositStatus: "PAID", depositPaidAt: new Date("2026-08-01"),
        cleaningFeeSnapshot: "150", cleaningFeeStatus: "PAID", cleaningFeePaidAt: new Date("2026-08-01"),
      })],
      leaseRooms: [leaseRoom()],
      schedule: [sched({ amount: "500" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stay = v.properties[0].rooms[0].stays[0];
    expect(stay.lines.find((l) => l.kind === "DEPOSIT")!.amount).toBe(600);
    expect(stay.lines.find((l) => l.kind === "CLEANING_FEE")!.amount).toBe(150);
    expect(stay.lines.filter((l) => l.kind === "RENT")).toHaveLength(1);
    expect(stay.totals.collected).toBe(1250);
  });

  it("omits a zero or absent deposit / cleaning fee rather than showing $0 lines", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({ cleaningFeeSnapshot: "0" })],
      leaseRooms: [leaseRoom()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const kinds = v.properties[0].rooms[0].stays[0].lines.map((l) => l.kind);
    expect(kinds).not.toContain("DEPOSIT");
    expect(kinds).not.toContain("CLEANING_FEE");
  });

  it("surfaces portalToken on a lease stay and never on a booking stay", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()], payments: [payment()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()], schedule: [sched()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stays = v.properties[0].rooms[0].stays;
    expect(stays.find((s) => s.kind === "LEASE")!.portalToken).toBe("tok-1");
    expect(stays.find((s) => s.kind === "BOOKING")!.portalToken).toBeNull();
  });

  it("gives a lease a short handle because leases carry no human reference", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({ id: "8f31c0a4-dead-beef-0000-111122223333" })],
      leaseRooms: [leaseRoom({ leaseId: "8f31c0a4-dead-beef-0000-111122223333" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stay = v.properties[0].rooms[0].stays[0];
    expect(stay.reference).toBeNull();
    expect(stay.handle).toBe("8f31c0a4");
  });
});

// =========================================================================
describe("multi-room leases: listed under every room, counted once", () => {
  const twoRoomSetup = () => given({
    properties: [prop()],
    rooms: [room({ id: "r2", name: "Room 2 — Studio", roomNumber: "2" }),
            room({ id: "r3", name: "Room 3 — Loft", roomNumber: "3" })],
    leasesWithGuest: [lease({ guestId: "g3" })],
    leaseRooms: [
      leaseRoom({ id: "lr2", roomId: "r2", roomNumberSnapshot: "2", roomNameSnapshot: "Room 2 — Studio" }),
      leaseRoom({ id: "lr3", roomId: "r3", roomNumberSnapshot: "3", roomNameSnapshot: "Room 3 — Loft" }),
    ],
    schedule: [sched({ amount: "4000" })],
  });

  it("lists the stay under both rooms and flags it multiRoom", async () => {
    twoRoomSetup();
    const v = await buildPaymentsByProperty(ASOF);
    const rooms = v.properties[0].rooms;
    expect(rooms.map((r) => r.stays.length)).toEqual([1, 1]);
    expect(rooms[0].stays[0].multiRoom).toBe(true);
    expect(rooms[0].stays[0].rooms.map((r) => r.name))
      .toEqual(["Room 2 — Studio", "Room 3 — Loft"]);
  });

  it("puts multi-room money in sharedTotals, never in a room's own totals", async () => {
    twoRoomSetup();
    const v = await buildPaymentsByProperty(ASOF);
    for (const r of v.properties[0].rooms) {
      expect(r.totals.collected).toBe(0);
      expect(r.sharedTotals.collected).toBe(4000);
    }
  });

  it("counts a multi-room lease exactly once at property level", async () => {
    twoRoomSetup();
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].totals.collected).toBe(4000);
    expect(v.properties[0].stayCount).toBe(1);
    expect(v.grand.collected).toBe(4000);
  });

  it("holds the invariant: room totals + distinct multi-room stays === property totals", async () => {
    given({
      properties: [prop()],
      rooms: [room(), room({ id: "r2", name: "Room 2", roomNumber: "2" }),
              room({ id: "r3", name: "Room 3", roomNumber: "3" })],
      bookingsWithGuest: [booking({ roomId: "r1" })],
      payments: [payment({ amount: "1275", surcharge: "0" })],
      leasesWithGuest: [lease()],
      leaseRooms: [
        leaseRoom({ id: "lr2", roomId: "r2" }),
        leaseRoom({ id: "lr3", roomId: "r3" }),
      ],
      schedule: [sched({ amount: "4000" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const p = v.properties[0];
    const roomExclusive = p.rooms.reduce((n, r) => n + r.totals.collected, 0);
    const distinctShared = 4000;
    expect(roomExclusive).toBe(1275);
    expect(roomExclusive + distinctShared).toBe(p.totals.collected);
  });

  it("leaves sharedTotals at zero for a single-room lease", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()], schedule: [sched()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const r = v.properties[0].rooms[0];
    expect(r.stays[0].multiRoom).toBe(false);
    expect(r.sharedTotals.collected).toBe(0);
    expect(r.totals.collected).toBe(500);
  });
});

// =========================================================================
describe("status classification", () => {
  it("treats a REFUNDED payment as refunded, never collected", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ status: "CANCELLED" })],
      payments: [payment({ status: "REFUNDED" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.grand.refunded).toBe(1029);
    expect(v.grand.collected).toBe(0);
  });

  it("splits DUE on the asOf boundary: past is overdue, future is scheduled", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      schedule: [
        sched({ id: "s1", scheduleSeq: 1, status: "DUE", dueDate: "2026-09-26", amount: "100", paidAt: null }),
        sched({ id: "s2", scheduleSeq: 2, status: "DUE", dueDate: "2026-09-28", amount: "200", paidAt: null }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.overdue).toBe(100);
    expect(t.scheduled).toBe(200);
  });

  it("classifies LATE and FAILED as overdue, WAIVED as neither, SCHEDULED as scheduled", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      schedule: [
        sched({ id: "s1", scheduleSeq: 1, status: "LATE", amount: "10", paidAt: null }),
        sched({ id: "s2", scheduleSeq: 2, status: "FAILED", amount: "20", paidAt: null }),
        sched({ id: "s3", scheduleSeq: 3, status: "WAIVED", amount: "40", paidAt: null }),
        sched({ id: "s4", scheduleSeq: 4, status: "SCHEDULED", dueDate: "2026-10-05", amount: "80", paidAt: null }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.overdue).toBe(30);
    expect(t.scheduled).toBe(80);
    expect(t.collected).toBe(0);
    expect(t.expected).toBe(110);
  });

  it("folds surcharge into a booking payment's amount but still reports it separately", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()],
      payments: [payment({ amount: "1000", surcharge: "29" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const line = v.properties[0].rooms[0].stays[0].lines[0];
    expect(line.amount).toBe(1029);
    expect(line.surcharge).toBe(29);
    expect(line.label).toBe("ONE_TIME · STRIPE");
  });

  it("renders a legacy Stripe subscription as its own labelled line", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()],
      payments: [payment()],
      subscriptions: [{ id: "sub1", bookingId: "b1", weeklyAmount: "300", status: "active" }],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const sub = v.properties[0].rooms[0].stays[0].lines.find((l) => l.kind === "SUBSCRIPTION")!;
    expect(sub.label).toContain("legacy");
    expect(sub.amount).toBe(300);
  });
});

// =========================================================================
describe("placeholders, exclusions and completeness", () => {
  it("excludes placeholder properties from the tree and counts them", async () => {
    given({
      properties: [prop(), prop({ id: "ph", name: "Fake House", isPlaceholder: true })],
      rooms: [room()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties.map((p) => p.propertyId)).toEqual(["prop-1"]);
    expect(v.excluded.placeholderProperties).toBe(1);
  });

  it("does not silently swallow money sitting on a placeholder property", async () => {
    given({
      properties: [prop({ id: "ph", name: "Fake House", isPlaceholder: true })],
      bookingsWithGuest: [booking({ propertyId: "ph", property: prop({ id: "ph", isPlaceholder: true }) })],
      payments: [payment({ amount: "500", surcharge: "0" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties).toEqual([]);
    expect(v.unattributed.totals.collected).toBe(500);
    expect(v.grand.collected).toBe(500);
  });

  it("drops a PENDING_PAYMENT booking with no payments and counts it as abandoned", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ id: "b9", status: "PENDING_PAYMENT" })],
      payments: [],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays).toEqual([]);
    expect(v.excluded.abandonedCheckouts).toBe(1);
  });

  it("KEEPS a PENDING_PAYMENT booking that actually took money", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ status: "PENDING_PAYMENT" })],
      payments: [payment()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays).toHaveLength(1);
    expect(v.excluded.abandonedCheckouts).toBe(0);
  });

  it("shows a live stay with no money at all as a loud MISSING line", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ status: "CONFIRMED" })],
      payments: [],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stay = v.properties[0].rooms[0].stays[0];
    expect(stay.lines).toHaveLength(1);
    expect(stay.lines[0].kind).toBe("MISSING");
    expect(stay.totals.collected).toBe(0);
  });

  it("puts a booking whose guest/property join vanished into unattributed, money intact", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [],
      allBookings: [{ id: "b1", propertyId: "gone", status: "CONFIRMED", reference: "BNP-ORPHAN" }],
      payments: [payment({ amount: "700", surcharge: "0" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.unattributed.stays).toHaveLength(1);
    expect(v.unattributed.totals.collected).toBe(700);
    expect(v.properties[0].totals.collected).toBe(0);
    expect(v.grand.collected).toBe(700);
  });

  it("holds the invariant: property totals + unattributed === grand", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()],
      allBookings: [booking(), { id: "b2", propertyId: "gone", status: "CONFIRMED", reference: "X" }],
      payments: [payment({ amount: "100", surcharge: "0" }),
                 payment({ id: "p2", bookingId: "b2", amount: "50", surcharge: "0" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const tree = v.properties.reduce((n, p) => n + p.totals.collected, 0);
    expect(tree).toBe(100);
    expect(v.unattributed.totals.collected).toBe(50);
    expect(tree + v.unattributed.totals.collected).toBe(v.grand.collected);
  });

  it("ages out a long-finished stay but keeps one just inside the window", async () => {
    const asOfMs = Date.parse(ASOF);
    const day = 86400000;
    const inside = new Date(asOfMs - (PAYMENTS_VIEW_WINDOW_DAYS - 2) * day).toISOString().slice(0, 10);
    const outside = new Date(asOfMs - (PAYMENTS_VIEW_WINDOW_DAYS + 2) * day).toISOString().slice(0, 10);
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [
        booking({ id: "b-in", reference: "IN", status: "COMPLETED", checkIn: inside, checkOut: inside }),
        booking({ id: "b-out", reference: "OUT", status: "COMPLETED", checkIn: outside, checkOut: outside }),
      ],
      payments: [
        payment({ id: "pi", bookingId: "b-in", amount: "10", surcharge: "0" }),
        payment({ id: "po", bookingId: "b-out", amount: "20", surcharge: "0" }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays.map((s) => s.reference)).toEqual(["IN"]);
    expect(v.excluded.agedOut).toBe(1);
  });

  it("excludes DRAFT leases and counts them", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [],
      allLeases: [{ id: "lease-draft", propertyId: "prop-1", status: "DRAFT" }],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays).toEqual([]);
    expect(v.excluded.draftLeases).toBe(1);
    expect(v.unattributed.stays).toEqual([]);
  });
});

// =========================================================================
describe("shape, sorting and determinism", () => {
  it("echoes the injected asOf and is deterministic", async () => {
    given({ properties: [prop()], rooms: [room()] });
    const a = await buildPaymentsByProperty(ASOF);
    given({ properties: [prop()], rooms: [room()] });
    const b = await buildPaymentsByProperty(ASOF);
    expect(a.asOf).toBe(ASOF);
    expect(a).toEqual(b);
  });

  it("returns an empty, all-zero view with no properties", async () => {
    given({});
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties).toEqual([]);
    expect(v.grand).toEqual({
      collected: 0, scheduled: 0, overdue: 0, lateFees: 0, refunded: 0, expected: 0,
    });
  });

  it("rounds money to cents", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()],
      payments: [payment({ amount: "100.005", surcharge: "0.001" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.grand.collected).toBe(100.01);
  });

  it("sorts properties by name and rooms numerically, nulls last", async () => {
    given({
      properties: [prop({ id: "pz", name: "Zeta House" }), prop({ id: "pa", name: "Alpha House" })],
      rooms: [
        room({ id: "r10", propertyId: "pa", name: "Room 10", roomNumber: "10" }),
        room({ id: "rx", propertyId: "pa", name: "Attic", roomNumber: null }),
        room({ id: "r2", propertyId: "pa", name: "Room 2", roomNumber: "2" }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties.map((p) => p.propertyName)).toEqual(["Alpha House", "Zeta House"]);
    expect(v.properties[0].rooms.map((r) => r.roomName)).toEqual(["Room 2", "Room 10", "Attic"]);
  });

  it("keeps an inactive property that still holds money", async () => {
    given({
      properties: [prop({ active: false })], rooms: [room()],
      bookingsWithGuest: [booking()], payments: [payment()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties).toHaveLength(1);
    expect(v.properties[0].active).toBe(false);
    expect(v.properties[0].totals.collected).toBe(1029);
  });

  it("orders lines deposit → cleaning → rent → late fee", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({
        depositAmountSnapshot: "600", depositStatus: "PAID",
        cleaningFeeSnapshot: "150", cleaningFeeStatus: "PAID",
      })],
      leaseRooms: [leaseRoom()],
      schedule: [sched()],
      lateFees: [fee()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays[0].lines.map((l) => l.kind))
      .toEqual(["DEPOSIT", "CLEANING_FEE", "RENT", "LATE_FEE"]);
  });

  it("sorts stays newest first within a room", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [
        booking({ id: "old", reference: "OLD", checkIn: "2026-09-01", checkOut: "2026-09-05" }),
        booking({ id: "new", reference: "NEW", checkIn: "2026-09-20", checkOut: "2026-09-25" }),
      ],
      payments: [payment({ id: "p1", bookingId: "old" }), payment({ id: "p2", bookingId: "new" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.properties[0].rooms[0].stays.map((s) => s.reference)).toEqual(["NEW", "OLD"]);
  });

  it("asks storage for lease statuses that include historical money, minus DRAFT", async () => {
    given({ properties: [prop()] });
    await buildPaymentsByProperty(ASOF);
    const statuses = mockStorage.getLeasesWithGuest.mock.calls[0][0].statuses as string[];
    expect(statuses).toContain("COMPLETED");
    expect(statuses).toContain("TERMINATED");
    expect(statuses).toContain("DEFAULTED");
    expect(statuses).not.toContain("DRAFT");
  });
});

// =========================================================================
describe("closed stays: money that will never arrive is not a forecast", () => {
  it("does not count a CANCELLED booking's unpaid row as scheduled", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ status: "CANCELLED" })],
      payments: [payment({ status: "PENDING", amount: "435", surcharge: "0" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.grand.scheduled).toBe(0);
    expect(v.grand.expected).toBe(0);
    const line = v.properties[0].rooms[0].stays[0].lines[0];
    expect(line.amount).toBe(435);      // still SHOWN
    expect(line.counted).toBe(false);   // but counted nowhere
  });

  it("does not count an abandoned PENDING_PAYMENT checkout's PENDING row", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking({ status: "PENDING_PAYMENT" })],
      payments: [payment({ status: "PENDING", amount: "1961.35", surcharge: "0" })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.grand.scheduled).toBe(0);
    expect(v.properties[0].rooms[0].stays).toHaveLength(1); // kept: it has a row
  });

  it("does not count a TERMINATED lease's remaining rent as scheduled or overdue", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({ status: "TERMINATED", endDate: "2026-09-15" })],
      leaseRooms: [leaseRoom()],
      schedule: [
        sched({ id: "s1", scheduleSeq: 1, amount: "500", status: "PAID" }),
        sched({ id: "s2", scheduleSeq: 2, amount: "500", status: "SCHEDULED", dueDate: "2026-10-05", paidAt: null }),
        sched({ id: "s3", scheduleSeq: 3, amount: "500", status: "DUE", dueDate: "2026-09-10", paidAt: null }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.collected).toBe(500);
    expect(t.scheduled).toBe(0);
    expect(t.overdue).toBe(0);
    expect(t.expected).toBe(500);
  });

  it("STILL counts a DEFAULTED lease's unpaid rent as overdue — that is real debt", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({ status: "DEFAULTED" })],
      leaseRooms: [leaseRoom()],
      schedule: [sched({ status: "LATE", amount: "500", paidAt: null })],
      lateFees: [fee()],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const t = v.properties[0].rooms[0].stays[0].totals;
    expect(t.overdue).toBe(500);
    expect(t.lateFees).toBe(25);
  });

  it("keeps collected and refunded money on a closed stay — history is real", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [
        booking({ id: "b1", reference: "PAID1", status: "COMPLETED" }),
        booking({ id: "b2", reference: "REF1", status: "CANCELLED" }),
      ],
      payments: [
        payment({ id: "p1", bookingId: "b1", status: "PAID", amount: "300", surcharge: "0" }),
        payment({ id: "p2", bookingId: "b2", status: "REFUNDED", amount: "200", surcharge: "0" }),
      ],
    });
    const v = await buildPaymentsByProperty(ASOF);
    expect(v.grand.collected).toBe(300);
    expect(v.grand.refunded).toBe(200);
  });

  it("marks WAIVED rows and legacy subscriptions uncounted too", async () => {
    given({
      properties: [prop()], rooms: [room()],
      bookingsWithGuest: [booking()],
      payments: [payment()],
      subscriptions: [{ id: "sub1", bookingId: "b1", weeklyAmount: "300", status: "active" }],
      leasesWithGuest: [lease()], leaseRooms: [leaseRoom()],
      schedule: [sched({ status: "WAIVED", amount: "500", paidAt: null })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const stays = v.properties[0].rooms[0].stays;
    const sub = stays.flatMap((s) => s.lines).find((l) => l.kind === "SUBSCRIPTION")!;
    const waived = stays.flatMap((s) => s.lines).find((l) => l.status === "WAIVED")!;
    expect(sub.counted).toBe(false);
    expect(waived.counted).toBe(false);
  });

  it("marks a live stay's real upcoming rent as counted", async () => {
    given({
      properties: [prop()], rooms: [room()],
      leasesWithGuest: [lease({ status: "ACTIVE" })],
      leaseRooms: [leaseRoom()],
      schedule: [sched({ status: "SCHEDULED", dueDate: "2026-10-05", amount: "500", paidAt: null })],
    });
    const v = await buildPaymentsByProperty(ASOF);
    const line = v.properties[0].rooms[0].stays[0].lines[0];
    expect(line.counted).toBe(true);
    expect(v.grand.scheduled).toBe(500);
  });
});

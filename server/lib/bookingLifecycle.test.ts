// server/lib/bookingLifecycle.test.ts
// The daily booking-status sync. The decision itself is pinned in
// shared/bookingStatus.test.ts; what matters here is that the job writes only
// what changed, counts what it did, and is safe to run twice — it runs against
// production rows unattended.

import { describe, it, expect, vi, beforeEach } from "vitest";

const store = {
  bookings: [] as any[],
  updates: [] as { id: string; updates: any }[],
};

vi.mock("../storage", () => ({
  storage: {
    getBookings: vi.fn(async () => store.bookings),
    updateBooking: vi.fn(async (id: string, updates: any) => {
      store.updates.push({ id, updates });
      const row = store.bookings.find((b) => b.id === id);
      if (row) Object.assign(row, updates);
      return row;
    }),
  },
}));

import { syncBookingStatuses } from "./bookingLifecycle";

const TODAY = "2026-09-28";
const booking = (id: string, status: string, checkIn: string, checkOut: string | null = null) => ({
  id,
  status,
  checkIn,
  checkOut,
});

beforeEach(() => {
  store.bookings = [];
  store.updates = [];
  vi.clearAllMocks();
});

describe("syncBookingStatuses", () => {
  it("activates a stay that started, completes one that ended, expires one never paid", () => {
    store.bookings = [
      booking("started", "CONFIRMED", "2026-09-27", "2026-10-02"),
      booking("ended", "ACTIVE", "2026-09-01", "2026-09-08"),
      booking("unpaid", "PENDING_PAYMENT", "2026-09-01", "2026-09-04"),
    ];

    return syncBookingStatuses(TODAY).then((r) => {
      expect(r).toMatchObject({ activated: 1, completed: 1, expired: 1, changed: 3, scanned: 3 });
      expect(store.updates).toEqual([
        { id: "started", updates: { status: "ACTIVE" } },
        { id: "ended", updates: { status: "COMPLETED" } },
        { id: "unpaid", updates: { status: "EXPIRED" } },
      ]);
    });
  });

  it("demotes a future stay that was wrongly left ACTIVE", async () => {
    // The original bug: every paid co-living booking was written ACTIVE at
    // payment, months before anyone arrived.
    store.bookings = [booking("future", "ACTIVE", "2027-03-01", "2027-03-08")];

    const r = await syncBookingStatuses(TODAY);

    expect(r).toMatchObject({ deferred: 1, changed: 1 });
    expect(store.updates).toEqual([{ id: "future", updates: { status: "CONFIRMED" } }]);
  });

  it("writes nothing when every status is already right", async () => {
    store.bookings = [
      booking("now", "ACTIVE", "2026-09-27", "2026-10-02"),
      booking("soon", "CONFIRMED", "2026-10-05", "2026-10-08"),
      booking("past", "COMPLETED", "2026-08-01", "2026-08-05"),
      booking("gone", "CANCELLED", "2026-08-01", "2026-08-05"),
    ];

    const r = await syncBookingStatuses(TODAY);

    expect(r.changed).toBe(0);
    expect(store.updates).toEqual([]);
  });

  it("is idempotent — a second run writes nothing", async () => {
    store.bookings = [
      booking("a", "CONFIRMED", "2026-09-27", "2026-10-02"),
      booking("b", "ACTIVE", "2026-09-01", "2026-09-08"),
      booking("c", "PENDING_PAYMENT", "2026-09-01", "2026-09-04"),
    ];

    const first = await syncBookingStatuses(TODAY);
    expect(first.changed).toBe(3);

    store.updates = [];
    const second = await syncBookingStatuses(TODAY);

    expect(second.changed).toBe(0);
    expect(store.updates).toEqual([]);
  });

  it("never touches PENDING_APPROVAL, however old", async () => {
    // Those bookings are PAID and the gate's ghost sweep refunds them on
    // decline. Expiring one here would strand the guest's money.
    store.bookings = [
      booking("waiting-old", "PENDING_APPROVAL", "2026-01-01", "2026-01-08"),
      booking("waiting-now", "PENDING_APPROVAL", "2026-09-27", "2026-10-02"),
    ];

    const r = await syncBookingStatuses(TODAY);

    expect(r.changed).toBe(0);
    expect(store.updates).toEqual([]);
  });

  it("never reopens CANCELLED, CONFLICT, EXPIRED or COMPLETED", async () => {
    store.bookings = [
      booking("x", "CANCELLED", "2026-09-27", "2026-10-02"),
      booking("y", "CONFLICT", "2026-09-27", "2026-10-02"),
      booking("z", "EXPIRED", "2026-09-27", "2026-10-02"),
      booking("w", "COMPLETED", "2026-09-27", "2026-10-02"),
    ];

    const r = await syncBookingStatuses(TODAY);

    expect(r.changed).toBe(0);
    expect(store.updates).toEqual([]);
  });

  it("keeps an open-ended co-living stay ACTIVE and never completes it", async () => {
    store.bookings = [booking("open", "ACTIVE", "2026-01-01", null)];

    const r = await syncBookingStatuses(TODAY);

    expect(r.changed).toBe(0);
  });

  it("reports scanned even when nothing changes", async () => {
    store.bookings = [booking("a", "COMPLETED", "2026-01-01", "2026-01-05")];
    expect((await syncBookingStatuses(TODAY)).scanned).toBe(1);
  });

  it("handles an empty table", async () => {
    const r = await syncBookingStatuses(TODAY);
    expect(r).toMatchObject({ changed: 0, scanned: 0 });
  });
});

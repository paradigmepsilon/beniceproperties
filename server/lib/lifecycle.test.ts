// server/lib/lifecycle.test.ts
// Phase 7 — lifecycle automation over mocked storage + notifications. Covers
// activation emails (once each), payment receipts (idempotent per installment),
// and lease-ending notices (window + dedupe).

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getLease: vi.fn(),
  getLeases: vi.fn(),
  getProperty: vi.fn(),
  getGuest: vi.fn(),
  getScheduleByLease: vi.fn(),
  hasLifecycleEvent: vi.fn(),
  recordLifecycleEvent: vi.fn(),
  getSetting: vi.fn(),
}));
const mockNotify = vi.hoisted(() => ({
  notifyGuest: vi.fn(),
  sendEmail: vi.fn(),
  notifyAdmin: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);

import { GUEST_AUTO_NOTIFICATIONS_SETTING } from "@shared/schema";
import { readFileSync } from "node:fs";
import {
  onLeaseActivated,
  onPaymentReceived,
  onBookingConfirmed,
  runLeaseEndingNotices,
  daysUntil,
} from "./lifecycle";

const PROP = { id: "prop-1", name: "Old Bill Cook", location: "Atlanta" };
const GUEST = { id: "g1", name: "Jane", email: "jane@example.com", phone: "+15551234567" };

function lease(overrides = {}) {
  return {
    id: "lease-1",
    propertyId: "prop-1",
    guestId: "g1",
    status: "ACTIVE",
    startDate: "2026-07-01",
    endDate: "2026-07-28",
    totalLeaseValue: "1000",
    portalToken: "tok",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getProperty.mockResolvedValue(PROP);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getScheduleByLease.mockResolvedValue([
    { scheduleSeq: 1, dueDate: "2026-07-01", amount: "250" },
  ]);
  mockStorage.hasLifecycleEvent.mockResolvedValue(false);
  mockStorage.recordLifecycleEvent.mockResolvedValue({});
  mockStorage.getSetting.mockResolvedValue(undefined); // unset → guest sends ON
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.sendEmail.mockResolvedValue({ sent: true });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
});

describe("daysUntil", () => {
  it("computes signed forward day offset", () => {
    expect(daysUntil("2026-07-28", "2026-07-14")).toBe(14);
    expect(daysUntil("2026-07-10", "2026-07-10")).toBe(0);
  });
});

describe("onLeaseActivated", () => {
  it("sends welcome + schedule recap + admin notice, each recorded once", async () => {
    mockStorage.getLease.mockResolvedValue(lease());
    process.env.ADMIN_EMAIL = "admin@beniceproperties.com";

    await onLeaseActivated("lease-1");

    const kinds = mockStorage.recordLifecycleEvent.mock.calls.map((c) => c[0].eventType);
    expect(kinds).toContain("COLIVING_WELCOME");
    expect(kinds).toContain("COLIVING_SCHEDULE_RECAP");
    expect(kinds).toContain("COLIVING_ADMIN_NEW_LEASE");
    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(2); // welcome + recap
    // The admin notice fans out over email + Telegram via notifyAdmin (one call,
    // NOT a second raw sendEmail — no double-send).
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
    expect(mockNotify.sendEmail).not.toHaveBeenCalled();
  });

  it("does not resend an event already recorded (idempotent)", async () => {
    mockStorage.getLease.mockResolvedValue(lease());
    mockStorage.hasLifecycleEvent.mockResolvedValue(true); // all already sent
    await onLeaseActivated("lease-1");
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockStorage.recordLifecycleEvent).not.toHaveBeenCalled();
  });
});

describe("onPaymentReceived", () => {
  it("sends a receipt once per installment", async () => {
    await onPaymentReceived({
      lease: lease(),
      property: PROP,
      guest: GUEST,
      scheduleRow: { scheduleSeq: 2, amount: "250" },
    });
    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    const rec = mockStorage.recordLifecycleEvent.mock.calls[0][0];
    expect(rec.eventType).toBe("PAYMENT_RECEIPT");
    expect(rec.scheduleSeq).toBe(2);
  });

  it("skips a receipt already sent for that installment", async () => {
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    await onPaymentReceived({
      lease: lease(),
      property: PROP,
      guest: GUEST,
      scheduleRow: { scheduleSeq: 2, amount: "250" },
    });
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
  });
});

describe("onBookingConfirmed", () => {
  const BOOKING = {
    id: "bk-1",
    propertyId: "prop-1",
    roomId: "r1",
    guestId: "g1",
    model: "COLIVING",
    checkIn: "2026-07-01",
    checkOut: "2026-07-10",
    status: "ACTIVE",
    reference: "BNP-7QK4-2F9X",
    quotedTotal: "980.00",
  };
  const ROOM = { id: "r1", name: "Garden", roomNumber: "2" };

  it("sends the guest confirmation + the admin alert, each recorded once", async () => {
    await onBookingConfirmed({ booking: BOOKING, property: PROP, room: ROOM, guest: GUEST });

    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);

    const guestCall = mockNotify.notifyGuest.mock.calls[0][0];
    expect(guestCall.subject).toContain("BNP-7QK4-2F9X");
    expect(guestCall.body).toContain("/lookup");
    expect(guestCall.context).toMatchObject({ bookingId: "bk-1", kind: "BOOKING_CONFIRMED" });

    const kinds = mockStorage.recordLifecycleEvent.mock.calls.map((c) => c[0].eventType);
    expect(kinds).toEqual(["BOOKING_CONFIRMED", "ADMIN_NEW_BOOKING"]);
    // Idempotency is keyed on the BOOKING, never a lease.
    for (const call of mockStorage.recordLifecycleEvent.mock.calls) {
      expect(call[0].bookingId).toBe("bk-1");
      expect(call[0].leaseId ?? null).toBeNull();
      expect(call[0].scheduleSeq).toBeNull();
    }
    // The dedupe lookup uses the object ref form, scoped to the booking.
    expect(mockStorage.hasLifecycleEvent).toHaveBeenCalledWith(
      { bookingId: "bk-1" },
      "BOOKING_CONFIRMED",
      null,
    );
  });

  it("skips the guest send when guest_auto_notifications is disabled, but still alerts admin", async () => {
    // KEY-SENSITIVE on purpose: the "false" row is only returned for the exact
    // shared constant. If onBookingConfirmed ever reads a differently-spelled
    // key again (the bug that made this toggle inert), it gets `undefined`,
    // guest sends stay ON, and this test fails.
    mockStorage.getSetting.mockImplementation(async (key: string) =>
      key === GUEST_AUTO_NOTIFICATIONS_SETTING
        ? { key: GUEST_AUTO_NOTIFICATIONS_SETTING, value: "false" }
        : undefined,
    );

    await onBookingConfirmed({ booking: BOOKING, property: PROP, room: ROOM, guest: GUEST });

    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
    const guestRec = mockStorage.recordLifecycleEvent.mock.calls.find(
      (c) => c[0].eventType === "BOOKING_CONFIRMED",
    );
    expect(guestRec?.[0].status).toBe("SKIPPED");
  });

  it("keeps guest email + phone OUT of the Telegram text but IN the admin email body", async () => {
    await onBookingConfirmed({ booking: BOOKING, property: PROP, room: ROOM, guest: GUEST });

    const alert = mockNotify.notifyAdmin.mock.calls[0][0];
    // Email body: the operator needs to be able to reach the guest.
    expect(alert.body).toContain(GUEST.email);
    expect(alert.body).toContain(GUEST.phone);
    // Telegram (third party): name + listing + dates + reference + amount only.
    expect(alert.telegramText).toBeTruthy();
    expect(alert.telegramText).not.toContain(GUEST.email);
    expect(alert.telegramText).not.toContain(GUEST.phone);
    expect(alert.telegramText).toContain(GUEST.name);
    expect(alert.telegramText).toContain("BNP-7QK4-2F9X");
  });

  it("builds the lookup URL from the one shared public base URL", async () => {
    delete process.env.PUBLIC_BASE_URL;
    await onBookingConfirmed({ booking: BOOKING, property: PROP, room: ROOM, guest: GUEST });
    expect(mockNotify.notifyGuest.mock.calls[0][0].body).toContain(
      "https://www.beniceproperties.com/lookup",
    );
  });

  it("is a no-op on a second call (already recorded)", async () => {
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    await onBookingConfirmed({ booking: BOOKING, property: PROP, room: ROOM, guest: GUEST });
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockNotify.notifyAdmin).not.toHaveBeenCalled();
    expect(mockStorage.recordLifecycleEvent).not.toHaveBeenCalled();
  });

  it("flags a CONFLICT booking in the admin subject and never emails the guest", async () => {
    await onBookingConfirmed({
      booking: { ...BOOKING, status: "CONFLICT" },
      property: PROP,
      room: ROOM,
      guest: GUEST,
    });
    // A CONFLICT booking is not a confirmation — guest stays silent.
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockNotify.notifyAdmin.mock.calls[0][0].subject).toContain("CONFLICT");
  });
});

describe("runLeaseEndingNotices", () => {
  it("sends within the 14-day window and records it", async () => {
    mockStorage.getLeases.mockResolvedValue([lease({ endDate: "2026-07-28" })]);
    const sent = await runLeaseEndingNotices("2026-07-20"); // 8 days out
    expect(sent).toBe(1);
    expect(mockStorage.recordLifecycleEvent.mock.calls[0][0].eventType).toBe("LEASE_ENDING_SOON");
  });

  it("does not send when the lease ends far in the future", async () => {
    mockStorage.getLeases.mockResolvedValue([lease({ endDate: "2026-09-01" })]);
    const sent = await runLeaseEndingNotices("2026-07-20"); // >14 days out
    expect(sent).toBe(0);
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
  });

  it("does not resend if already notified (dedupe)", async () => {
    mockStorage.getLeases.mockResolvedValue([lease({ endDate: "2026-07-28" })]);
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    const sent = await runLeaseEndingNotices("2026-07-20");
    expect(sent).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// The auto-notification toggle spans three files that cannot import each other
// (a route module, this send gate, and a plain-node push script). The constant
// is the contract; these assertions are what keep the three spellings identical.
// ---------------------------------------------------------------------------
describe("guest_auto_notifications setting key", () => {
  const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), "utf8");

  it("is the literal the push script seeds into app_settings", () => {
    expect(GUEST_AUTO_NOTIFICATIONS_SETTING).toBe("guest_auto_notifications");
    const script = read("../../scripts/push-deconfliction-messaging.mjs");
    expect(script).toContain(`VALUES ('${GUEST_AUTO_NOTIFICATIONS_SETTING}', 'true')`);
  });

  it("is read and written by routes.ts through the shared constant, not a literal", () => {
    const routes = read("../routes.ts");
    expect(routes).toContain("storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING)");
    expect(routes).toContain("storage.setSetting(GUEST_AUTO_NOTIFICATIONS_SETTING,");
    // No stale hand-spelled key left anywhere in the route layer.
    expect(routes).not.toContain("guest_auto_notifications_enabled");
  });

  it("is read by the lifecycle send gate through the same constant", () => {
    const gate = read("./lifecycle.ts");
    expect(gate).toContain("storage.getSetting(GUEST_AUTO_NOTIFICATIONS_SETTING)");
    expect(gate).not.toContain('getSetting("guest_auto_notifications');
  });
});

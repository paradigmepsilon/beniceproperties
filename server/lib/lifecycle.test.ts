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
}));
const mockNotify = vi.hoisted(() => ({
  notifyGuest: vi.fn(),
  sendEmail: vi.fn(),
}));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);

import {
  onLeaseActivated,
  onPaymentReceived,
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
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.sendEmail.mockResolvedValue({ sent: true });
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
    expect(mockNotify.sendEmail).toHaveBeenCalledTimes(1); // admin
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

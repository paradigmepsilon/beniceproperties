// server/lib/adminMessages.test.ts
// Task 6 — staff→guest messaging over mocked storage/notifications. Locks:
//   - a new thread on a booking or lease creates a STAFF root row and sends via
//     the requested channels, carrying the full guest/booking/lease context,
//   - a reply on an existing thread creates a child row and marks the root
//     ANSWERED,
//   - channel selection is exact: EMAIL-only never hands a phone number to
//     notifyGuest, SMS-only calls sendSms directly (no notifyGuest call),
//   - a thread/booking/lease with neither an id nor a threadId is rejected (400)
//     rather than silently guessing a target,
//   - listThreads/getThread enrich roots with guest/property/booking context and
//     the message_log delivery trail.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getBooking: vi.fn(),
  getLease: vi.fn(),
  getGuest: vi.fn(),
  getProperty: vi.fn(),
  getMessagesByThread: vi.fn(),
  getMessageThreadRoots: vi.fn(),
  createMessage: vi.fn(),
  updateMessage: vi.fn(),
  getMessageLog: vi.fn(),
  getGuestsByIds: vi.fn(),
  getBookingsByIds: vi.fn(),
  getLeasesByIds: vi.fn(),
  getPropertiesByIds: vi.fn(),
  getThreadStats: vi.fn(),
}));
const mockNotify = vi.hoisted(() => ({
  notifyGuest: vi.fn(),
  sendSms: vi.fn(),
}));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);

import { sendStaffMessage, listThreads, getThread } from "./adminMessages";
import { LeaseError } from "./lease";

const BOOKING = { id: "b1", guestId: "g1", propertyId: "p1", reference: "BNP-1001" };
const LEASE = { id: "lease-1", guestId: "g1", propertyId: "p1" };
const GUEST = { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" };
const PROPERTY = { id: "p1", name: "Old Bill Cook" };

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getBooking.mockResolvedValue(BOOKING);
  mockStorage.getLease.mockResolvedValue(LEASE);
  mockStorage.getGuest.mockResolvedValue(GUEST);
  mockStorage.getProperty.mockResolvedValue(PROPERTY);
  mockNotify.notifyGuest.mockResolvedValue({
    email: { sent: true, channel: "email" },
    sms: { sent: true, channel: "sms" },
  });
  mockNotify.sendSms.mockResolvedValue({ sent: true, channel: "sms" });
});

describe("sendStaffMessage — new thread", () => {
  it("creates a root STAFF row tagged with bookingId and notifies over EMAIL+SMS with full context", async () => {
    mockStorage.createMessage.mockResolvedValue({
      id: "msg-1",
      threadId: "msg-1",
      bookingId: "b1",
      guestId: "g1",
      authorRole: "STAFF",
      status: "ANSWERED",
    });

    const result = await sendStaffMessage({
      bookingId: "b1",
      body: "Your check-in is confirmed.",
      channels: ["EMAIL", "SMS"],
      actor: "alex@example.com",
    });

    const created = mockStorage.createMessage.mock.calls[0][0];
    expect(created.bookingId).toBe("b1");
    expect(created.authorRole).toBe("STAFF");
    expect(created.status).toBe("ANSWERED");

    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    const call = mockNotify.notifyGuest.mock.calls[0][0];
    expect(call.email).toBe("jane@example.com");
    expect(call.phone).toBe("+15551234567");
    expect(call.context.kind).toBe("MANUAL");
    expect(call.context.audience).toBe("GUEST");
    expect(call.context.bookingId).toBe("b1");
    expect(call.context.guestId).toBe("g1");
    expect(call.context.sentBy).toBe("alex@example.com");

    expect(result.messageId).toBe("msg-1");
    expect(result.threadId).toBe("msg-1");
    expect(result.delivery.email.sent).toBe(true);
    expect(result.delivery.sms.sent).toBe(true);
  });

  it("resolves the guest via the lease when leaseId is given instead of bookingId", async () => {
    mockStorage.createMessage.mockResolvedValue({
      id: "msg-2",
      threadId: "msg-2",
      leaseId: "lease-1",
      guestId: "g1",
      authorRole: "STAFF",
      status: "ANSWERED",
    });

    await sendStaffMessage({
      leaseId: "lease-1",
      body: "Reminder: rent is due Friday.",
      channels: ["EMAIL"],
      actor: "alex@example.com",
    });

    expect(mockStorage.getLease).toHaveBeenCalledWith("lease-1");
    const created = mockStorage.createMessage.mock.calls[0][0];
    expect(created.leaseId).toBe("lease-1");
  });

  it("EMAIL-only never passes a phone number to notifyGuest", async () => {
    mockStorage.createMessage.mockResolvedValue({
      id: "msg-3",
      threadId: "msg-3",
      bookingId: "b1",
      guestId: "g1",
      authorRole: "STAFF",
      status: "ANSWERED",
    });

    await sendStaffMessage({
      bookingId: "b1",
      body: "Email only.",
      channels: ["EMAIL"],
      actor: "alex",
    });

    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    const call = mockNotify.notifyGuest.mock.calls[0][0];
    expect(call.phone).toBeNull();
    expect(mockNotify.sendSms).not.toHaveBeenCalled();
  });

  it("SMS-only calls sendSms directly instead of notifyGuest", async () => {
    mockStorage.createMessage.mockResolvedValue({
      id: "msg-4",
      threadId: "msg-4",
      bookingId: "b1",
      guestId: "g1",
      authorRole: "STAFF",
      status: "ANSWERED",
    });

    const result = await sendStaffMessage({
      bookingId: "b1",
      body: "SMS only.",
      channels: ["SMS"],
      actor: "alex",
    });

    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockNotify.sendSms).toHaveBeenCalledTimes(1);
    const call = mockNotify.sendSms.mock.calls[0][0];
    expect(call.to).toBe("+15551234567");
    expect(call.context.kind).toBe("MANUAL");
    expect(result.delivery.email).toEqual(expect.objectContaining({ sent: false, reason: "not-requested" }));
  });

  it("throws a 400 LeaseError when neither bookingId nor leaseId is given", async () => {
    await expect(
      sendStaffMessage({ body: "hi", channels: ["EMAIL"], actor: "alex" }),
    ).rejects.toBeInstanceOf(LeaseError);
    try {
      await sendStaffMessage({ body: "hi", channels: ["EMAIL"], actor: "alex" });
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as LeaseError).status).toBe(400);
    }
    expect(mockStorage.createMessage).not.toHaveBeenCalled();
  });
});

describe("sendStaffMessage — reply", () => {
  it("creates a child row on the existing thread and marks the root ANSWERED", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([
      {
        id: "t1",
        threadId: "t1",
        bookingId: "b1",
        leaseId: null,
        guestId: "g1",
        category: "QUESTION",
        status: "OPEN",
        subject: "Question about check-in",
      },
    ]);
    mockStorage.createMessage.mockResolvedValue({
      id: "reply-1",
      threadId: "t1",
      bookingId: "b1",
      guestId: "g1",
      authorRole: "STAFF",
      status: "ANSWERED",
    });

    const result = await sendStaffMessage({
      threadId: "t1",
      body: "We're on it.",
      channels: ["EMAIL", "SMS"],
      actor: "alex",
    });

    const created = mockStorage.createMessage.mock.calls[0][0];
    expect(created.threadId).toBe("t1");
    expect(created.authorRole).toBe("STAFF");
    expect(mockStorage.updateMessage).toHaveBeenCalledWith("t1", { status: "ANSWERED" });
    expect(result.threadId).toBe("t1");
  });

  it("404s an unknown thread", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([]);
    await expect(
      sendStaffMessage({ threadId: "nope", body: "x", channels: ["EMAIL"], actor: "alex" }),
    ).rejects.toBeInstanceOf(LeaseError);
  });
});

describe("listThreads", () => {
  const ROOT_1 = {
    id: "t1",
    threadId: "t1",
    bookingId: "b1",
    leaseId: null,
    guestId: "g1",
    status: "OPEN",
    category: "QUESTION",
    subject: "Question",
    createdAt: new Date("2026-01-01T00:00:00Z"),
  };
  const ROOT_2 = {
    id: "t2",
    threadId: "t2",
    bookingId: null,
    leaseId: "lease-1",
    guestId: "g1",
    status: "OPEN",
    category: "OTHER",
    subject: null,
    createdAt: new Date("2026-01-03T00:00:00Z"),
  };

  beforeEach(() => {
    mockStorage.getMessageThreadRoots.mockResolvedValue([ROOT_1, ROOT_2]);
    mockStorage.getGuestsByIds.mockResolvedValue([GUEST]);
    mockStorage.getBookingsByIds.mockResolvedValue([BOOKING]);
    mockStorage.getLeasesByIds.mockResolvedValue([LEASE]);
    mockStorage.getPropertiesByIds.mockResolvedValue([PROPERTY]);
    mockStorage.getThreadStats.mockResolvedValue([
      { threadId: "t1", messageCount: 2, lastMessageAt: new Date("2026-01-02T00:00:00Z") },
      { threadId: "t2", messageCount: 1, lastMessageAt: new Date("2026-01-03T00:00:00Z") },
    ]);
  });

  it("enriches each root with guest/property/booking-or-lease context via ONE batched call per lookup (not per row)", async () => {
    const threads = await listThreads();
    expect(threads).toHaveLength(2);
    expect(threads[0]).toMatchObject({
      id: "t1",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      propertyName: "Old Bill Cook",
      bookingReference: "BNP-1001",
      leaseId: null,
      bookingId: "b1",
      messageCount: 2,
      lastMessageAt: new Date("2026-01-02T00:00:00Z"),
    });
    expect(threads[1]).toMatchObject({
      id: "t2",
      propertyName: "Old Bill Cook",
      bookingReference: null,
      leaseId: "lease-1",
      bookingId: null,
      messageCount: 1,
    });

    // Two roots, but every enrichment lookup fired exactly ONCE — the N+1 fix.
    expect(mockStorage.getGuestsByIds).toHaveBeenCalledTimes(1);
    expect(mockStorage.getBookingsByIds).toHaveBeenCalledTimes(1);
    expect(mockStorage.getLeasesByIds).toHaveBeenCalledTimes(1);
    expect(mockStorage.getPropertiesByIds).toHaveBeenCalledTimes(1);
    expect(mockStorage.getThreadStats).toHaveBeenCalledTimes(1);
    expect(mockStorage.getThreadStats).toHaveBeenCalledWith(["t1", "t2"]);
    // The old N+1 path (a getMessagesByThread call per root) must be gone.
    expect(mockStorage.getMessagesByThread).not.toHaveBeenCalled();
  });

  it("returns [] without any enrichment queries when there are no roots", async () => {
    mockStorage.getMessageThreadRoots.mockResolvedValue([]);
    const threads = await listThreads();
    expect(threads).toEqual([]);
    expect(mockStorage.getGuestsByIds).not.toHaveBeenCalled();
  });

  it("defaults the page limit to 100 and clamps an oversized limit to 500", async () => {
    await listThreads();
    expect(mockStorage.getMessageThreadRoots).toHaveBeenCalledWith({ status: undefined, limit: 100 });

    await listThreads({ limit: 10_000 });
    expect(mockStorage.getMessageThreadRoots).toHaveBeenLastCalledWith({ status: undefined, limit: 500 });
  });
});

describe("getThread", () => {
  it("returns messages plus MANUAL delivery rows from message_log", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "t1", threadId: "t1", bookingId: "b1", leaseId: null, guestId: "g1", status: "ANSWERED" },
      { id: "m2", threadId: "t1", bookingId: "b1", leaseId: null, guestId: "g1", status: "ANSWERED" },
    ]);
    mockStorage.getMessageLog.mockResolvedValue([
      { id: "log-2", bookingId: "b1", kind: "MANUAL", createdAt: new Date("2026-01-02T00:00:00Z") },
      { id: "log-1", bookingId: "b1", kind: "MANUAL", createdAt: new Date("2026-01-01T00:00:00Z") },
      { id: "log-x", bookingId: "b1", kind: "BOOKING_CONFIRMED", createdAt: new Date("2026-01-01T00:00:00Z") },
    ]);

    const result = await getThread("t1");
    expect(result.root.id).toBe("t1");
    expect(result.messages).toHaveLength(2);
    expect(result.deliveries.map((d) => d.id)).toEqual(["log-1", "log-2"]);
  });

  it("scopes the delivery-trail read to the thread's booking id", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "t1", threadId: "t1", bookingId: "b1", leaseId: null, guestId: "g1", status: "OPEN" },
    ]);
    mockStorage.getMessageLog.mockResolvedValue([]);
    await getThread("t1");
    expect(mockStorage.getMessageLog).toHaveBeenCalledWith({ bookingId: "b1" });
  });

  // storage.getMessageLog returns [] for a scope-less read, but this module must
  // not even ask: an unscoped read would splice another guest's sends into this
  // thread's delivery trail the day someone adds an `all` default.
  it("never reads the message log for a thread with neither a lease nor a booking", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "t1", threadId: "t1", bookingId: null, leaseId: null, guestId: "g1", status: "OPEN" },
    ]);
    const result = await getThread("t1");
    expect(mockStorage.getMessageLog).not.toHaveBeenCalled();
    expect(result.deliveries).toEqual([]);
  });

  it("404s an unknown thread", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([]);
    await expect(getThread("nope")).rejects.toBeInstanceOf(LeaseError);
  });
});

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
  it("enriches each root with guest, property, and booking/lease context", async () => {
    mockStorage.getMessageThreadRoots.mockResolvedValue([
      {
        id: "t1",
        threadId: "t1",
        bookingId: "b1",
        leaseId: null,
        guestId: "g1",
        status: "OPEN",
        category: "QUESTION",
        subject: "Question",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    ]);
    mockStorage.getMessagesByThread.mockResolvedValue([
      { id: "t1", threadId: "t1", createdAt: new Date("2026-01-01T00:00:00Z") },
      { id: "m2", threadId: "t1", createdAt: new Date("2026-01-02T00:00:00Z") },
    ]);

    const threads = await listThreads();
    expect(threads).toHaveLength(1);
    expect(threads[0]).toMatchObject({
      id: "t1",
      guestName: "Jane Doe",
      guestEmail: "jane@example.com",
      propertyName: "Old Bill Cook",
      bookingReference: "BNP-1001",
      leaseId: null,
      bookingId: "b1",
      messageCount: 2,
    });
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

  it("404s an unknown thread", async () => {
    mockStorage.getMessagesByThread.mockResolvedValue([]);
    await expect(getThread("nope")).rejects.toBeInstanceOf(LeaseError);
  });
});

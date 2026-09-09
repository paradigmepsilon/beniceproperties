// server/lib/stayLifecycle.test.ts
// The dispatcher: guard -> compose -> send -> record. What matters here is not
// the copy (bookingMessageLinks.test.ts owns that) but the CONTROL FLOW —
// what fires once, what re-arms, what is suppressed, and what never reaches
// a third party.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  hasLifecycleEvent: vi.fn(),
  recordLifecycleEvent: vi.fn(),
  getSetting: vi.fn(),
  getPropertyAccessInfo: vi.fn(),
  getRoomAccessInfo: vi.fn(),
}));
const mockNotify = vi.hoisted(() => ({ notifyGuest: vi.fn(), notifyAdmin: vi.fn() }));
vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./notifications", () => mockNotify);

import {
  onStayBookingConfirmed,
  onStayDocsComplete,
  onStayApproved,
  onStayFixRequested,
  onStayDeclined,
  onStayExtended,
  onStayCheckoutReminder,
  outstandingItems,
  guestDocsSubmitted,
  type StayContext,
} from "./stayLifecycle";
import type { BookingGate } from "@shared/schema";

const DOOR_CODE = "1357";
const WIFI_PW = "synthetic-pw-42";

const gate = (over: Partial<BookingGate> = {}) =>
  ({
    bookingId: "bk-1",
    gateToken: "a1B2c3D4e5F6g7H8i9J0kLmN",
    agreementSignedAt: new Date("2026-09-28T10:00:00Z"),
    agreementSignedName: "Jane Doe",
    verificationStatus: "PENDING_REVIEW",
    fixRequestCount: 0,
    extensionCount: 0,
    doorCode: DOOR_CODE,
    ...over,
  }) as unknown as BookingGate;

const ctx = (over: Partial<StayContext> = {}): StayContext => ({
  booking: {
    id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1",
    checkIn: "2026-10-01", checkOut: "2026-10-12", quotedTotal: "980.00",
  } as StayContext["booking"],
  gate: gate(),
  guest: { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" } as StayContext["guest"],
  property: { id: "prop-1", name: "Old Bill Cook" } as StayContext["property"],
  room: { id: "r1", name: "Garden", roomNumber: "2" } as StayContext["room"],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.hasLifecycleEvent.mockResolvedValue(false);
  mockStorage.recordLifecycleEvent.mockResolvedValue(undefined);
  mockStorage.getSetting.mockResolvedValue(undefined); // guest sends ON by default
  mockStorage.getPropertyAccessInfo.mockResolvedValue({
    wifiSsid: "BNP-Guest", wifiPassword: WIFI_PW, directions: "Off Highway 5.",
    checkInFrom: "4:00 PM", checkOutBy: "11:00 AM",
  });
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs." });
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
});

const guestCall = () => mockNotify.notifyGuest.mock.calls[0][0];
const adminCall = () => mockNotify.notifyAdmin.mock.calls[0][0];

describe("outstandingItems / guestDocsSubmitted", () => {
  it("lists only what is actually missing", () => {
    expect(outstandingItems(gate())).toEqual([]);
    expect(outstandingItems(gate({ agreementSignedAt: null }))).toEqual([
      "your signed rental agreement",
    ]);
    expect(outstandingItems(gate({ verificationStatus: "NOT_SUBMITTED" }))).toEqual([
      "a photo of your driver's licence",
    ]);
  });

  it("counts a REJECTED licence as still outstanding", () => {
    expect(outstandingItems(gate({ verificationStatus: "REJECTED" }))).toContain(
      "a photo of your driver's licence",
    );
  });

  // THE guard that stops the ghost sweep refunding a guest who did their part
  // and is waiting on an admin: PENDING_REVIEW means the GUEST is finished.
  it("treats PENDING_REVIEW as submitted — the admin is the one still to act", () => {
    expect(guestDocsSubmitted(gate({ verificationStatus: "PENDING_REVIEW" }))).toBe(true);
    expect(guestDocsSubmitted(gate({ verificationStatus: "APPROVED" }))).toBe(true);
    expect(guestDocsSubmitted(gate({ verificationStatus: "REJECTED" }))).toBe(false);
  });

  it("treats a missing gate row as everything outstanding", () => {
    expect(outstandingItems(null)).toHaveLength(2);
    expect(guestDocsSubmitted(null)).toBe(false);
  });
});

describe("the dedupe guard", () => {
  it("does not send when the event is already recorded", async () => {
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    await onStayBookingConfirmed(ctx());
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockStorage.recordLifecycleEvent).not.toHaveBeenCalled();
  });

  // Inherited from lifecycle.ts and deliberate: a dry-run consumes the slot, so
  // an unconfigured environment cannot queue a burst of real messages the first
  // time credentials appear.
  it("records even when the send did not go out", async () => {
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: false }, sms: { sent: false } });
    await onStayBookingConfirmed(ctx());
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SKIPPED" }),
    );
  });
});

describe("operator suppression (guest_auto_notifications)", () => {
  it("sends nothing but still records a SKIPPED row", async () => {
    mockStorage.getSetting.mockResolvedValue({ value: "false" });
    await onStayBookingConfirmed(ctx());
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ status: "SKIPPED", emailSent: false }),
    );
  });

  it("fails OPEN — any value other than the literal \"false\" still sends", async () => {
    for (const value of [undefined, "", "true", "1", "banana"]) {
      vi.clearAllMocks();
      mockStorage.hasLifecycleEvent.mockResolvedValue(false);
      mockStorage.getSetting.mockResolvedValue(value === undefined ? undefined : { value });
      mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
      await onStayBookingConfirmed(ctx());
      expect(mockNotify.notifyGuest, String(value)).toHaveBeenCalled();
    }
  });
});

describe("onStayDocsComplete", () => {
  it("tells the guest and pages an admin", async () => {
    await onStayDocsComplete(ctx());
    expect(mockNotify.notifyGuest).toHaveBeenCalledTimes(1);
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("flags a name mismatch between the signature and the guest record", async () => {
    await onStayDocsComplete(ctx({ gate: gate({ agreementSignedName: "Someone Else" }) }));
    expect(adminCall().subject).toContain("NAME MISMATCH");
  });

  it("does not cry mismatch over casing or stray whitespace", async () => {
    await onStayDocsComplete(ctx({ gate: gate({ agreementSignedName: "  jane doe " }) }));
    expect(adminCall().subject).not.toContain("NAME MISMATCH");
  });

  // Keyed on the fix-request ROUND. Without this a guest bounced once and
  // resubmitting would be deduped against their first submission, and no admin
  // would ever be told the corrected document had arrived.
  it("re-alerts on a later round after a fix request", async () => {
    await onStayDocsComplete(ctx({ gate: gate({ fixRequestCount: 0 }) }));
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_DOCS_COMPLETE", scheduleSeq: 1 }),
    );
    vi.clearAllMocks();
    mockStorage.hasLifecycleEvent.mockResolvedValue(false);
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
    mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
    await onStayDocsComplete(ctx({ gate: gate({ fixRequestCount: 1 }) }));
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_DOCS_COMPLETE", scheduleSeq: 2 }),
    );
  });

  it("keeps guest contact details out of Telegram", async () => {
    await onStayDocsComplete(ctx());
    const { body, telegramText } = adminCall();
    expect(body).toContain("jane@example.com");
    expect(telegramText).not.toContain("jane@example.com");
    expect(telegramText).not.toContain("+15551234567");
  });
});

describe("onStayApproved — the only message carrying credentials", () => {
  it("emails the real door code and wifi password", async () => {
    await onStayApproved(ctx());
    expect(guestCall().body).toContain(DOOR_CODE);
    expect(guestCall().body).toContain(WIFI_PW);
  });

  it("keeps them out of the SMS entirely", async () => {
    await onStayApproved(ctx());
    expect(guestCall().smsBody).not.toContain(DOOR_CODE);
    expect(guestCall().smsBody).not.toContain(WIFI_PW);
    expect(guestCall().smsBody).toMatch(/in your email/i);
  });

  it("supplies a redacted logBody, and never pages an admin with the code", async () => {
    await onStayApproved(ctx());
    expect(guestCall().logBody).toBeTruthy();
    expect(guestCall().logBody).not.toContain(DOOR_CODE);
    expect(guestCall().logBody).toContain("[redacted]");
    expect(mockNotify.notifyAdmin).not.toHaveBeenCalled();
  });

  it("still sends when a property has no wifi configured", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({ directions: "Off Highway 5." });
    await onStayApproved(ctx());
    expect(mockNotify.notifyGuest).toHaveBeenCalled();
    expect(guestCall().body).toContain(DOOR_CODE);
  });
});

describe("onStayDeclined", () => {
  it("tells the guest the amount refunded", async () => {
    await onStayDeclined(ctx(), { reason: "Name mismatch.", refundAmount: 980, auto: false });
    expect(guestCall().body).toContain("$980.00");
  });

  // A human who just clicked decline does not need to be told they clicked it.
  it("pages an admin ONLY when the sweep did it with no human in the loop", async () => {
    await onStayDeclined(ctx(), { reason: null, refundAmount: 980, auto: false });
    expect(mockNotify.notifyAdmin).not.toHaveBeenCalled();

    vi.clearAllMocks();
    mockStorage.hasLifecycleEvent.mockResolvedValue(false);
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
    mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
    await onStayDeclined(ctx(), { reason: null, refundAmount: 980, auto: true });
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("explains itself when automatic, and quotes the admin's reason when not", async () => {
    await onStayDeclined(ctx(), { reason: null, refundAmount: 980, auto: true });
    expect(guestCall().body).toMatch(/did not receive/i);
    vi.clearAllMocks();
    mockStorage.hasLifecycleEvent.mockResolvedValue(false);
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
    await onStayDeclined(ctx(), { reason: "Licence unreadable.", refundAmount: 980, auto: false });
    expect(guestCall().body).toContain("Licence unreadable.");
  });
});

describe("onStayExtended", () => {
  it("keys on the extension ordinal so a SECOND extension also sends", async () => {
    await onStayExtended(ctx(), {
      previousCheckOut: "2026-10-12", newCheckOut: "2026-10-19", amount: 400, extensionSeq: 2,
    });
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_EXTENDED", scheduleSeq: 2 }),
    );
  });

  it("states the added nights and the new end date", async () => {
    await onStayExtended(ctx(), {
      previousCheckOut: "2026-10-12", newCheckOut: "2026-10-19", amount: 400, extensionSeq: 1,
    });
    expect(guestCall().body).toContain("2026-10-19");
    expect(guestCall().body).toContain("7 night");
    expect(guestCall().body).toContain("$400.00");
  });
});

describe("onStayCheckoutReminder", () => {
  // Keyed on extension_count so extending a stay RE-ARMS both reminders — without
  // it, an extended guest would never be reminded again, and so never offered a
  // further extension.
  it("keys on the extension count", async () => {
    await onStayCheckoutReminder(ctx({ gate: gate({ extensionCount: 3 }) }), {
      kind: "STAY_CHECKOUT_48H", checkOutBy: "11:00 AM", extendAvailable: true, maxExtraNights: 5,
    });
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_CHECKOUT_48H", scheduleSeq: 3 }),
    );
  });

  it("offers the extension when nights are free and stays quiet when they are not", async () => {
    await onStayCheckoutReminder(ctx(), {
      kind: "STAY_CHECKOUT_48H", checkOutBy: "11:00 AM", extendAvailable: true, maxExtraNights: 5,
    });
    expect(guestCall().body).toContain("/extend");

    vi.clearAllMocks();
    mockStorage.hasLifecycleEvent.mockResolvedValue(false);
    mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
    await onStayCheckoutReminder(ctx(), {
      kind: "STAY_CHECKOUT_48H", checkOutBy: "11:00 AM", extendAvailable: false, maxExtraNights: 0,
    });
    expect(guestCall().body).not.toContain("/extend");
  });
});

describe("onStayFixRequested", () => {
  it("passes the admin's reason to the guest and keys on the round", async () => {
    await onStayFixRequested(ctx({ gate: gate({ fixRequestCount: 2 }) }), "Too blurry to read.");
    expect(guestCall().body).toContain("Too blurry to read.");
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_FIX_REQUESTED", scheduleSeq: 2 }),
    );
  });

  it("reassures the guest their dates are still held", async () => {
    await onStayFixRequested(ctx(), "Too blurry.");
    expect(guestCall().body).toMatch(/still held/i);
  });
});

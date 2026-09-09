// server/lib/stayReminders.test.ts
// The scheduled passes. The centrepiece is the TWO CLOCKS: nudges use a day
// window so a skipped cron run loses nothing, while the auto-decline uses strict
// elapsed hours so it can never fire EARLY against a promise made to the guest.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  getStaysAwaitingDocs: vi.fn(),
  getStaysCheckingOutBetween: vi.fn(),
  getStaysCheckingInBetween: vi.fn(),
  getSetting: vi.fn(),
  hasLifecycleEvent: vi.fn(),
  recordLifecycleEvent: vi.fn(),
  raiseEscalationOnce: vi.fn(),
  isRoomAvailableForRange: vi.fn(),
  getPropertyAccessInfo: vi.fn(),
  getRoomAccessInfo: vi.fn(),
}));
const mockDecline = vi.hoisted(() => ({ declineAndRefundBooking: vi.fn() }));
const mockNotify = vi.hoisted(() => ({ notifyGuest: vi.fn(), notifyAdmin: vi.fn() }));
const mockLifecycle = vi.hoisted(() => ({
  onStayCheckoutReminder: vi.fn(),
  onStrPreArrival: vi.fn(),
}));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./bookingGateDecline", () => mockDecline);
vi.mock("./notifications", () => mockNotify);
vi.mock("./stayLifecycle", async (orig) => ({
  ...(await orig<typeof import("./stayLifecycle")>()),
  ...mockLifecycle,
}));

import { runStayGhostSweep, runStayCheckoutReminders, runStayPreArrival, friendlyDate } from "./stayReminders";

const TODAY = "2026-10-01";
const HOUR = 60 * 60 * 1000;
const at = (hoursAgo: number) => new Date(Date.parse(`${TODAY}T12:00:00Z`) - hoursAgo * HOUR);
const NOW = new Date(`${TODAY}T12:00:00Z`);

const stay = (over: Record<string, unknown> = {}) => ({
  id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1", roomId: "r1",
  model: "COLIVING", checkIn: "2026-10-20", checkOut: "2026-10-31",
  status: "PENDING_APPROVAL", quotedTotal: "980.00", createdAt: at(80),
  gate: {
    bookingId: "bk-1", gateToken: "a1B2c3D4e5F6g7H8i9J0kLmN",
    docsDeadlineAt: new Date(Date.parse(`${TODAY}T12:00:00Z`) + 10 * HOUR),
    agreementSignedAt: null, verificationStatus: "NOT_SUBMITTED",
    fixRequestCount: 0, extensionCount: 0, fixRequestedAt: null, createdAt: at(80),
  },
  guest: { id: "g1", name: "Jane Doe", email: "jane@example.com", phone: "+15551234567" },
  property: { id: "prop-1", name: "Old Bill Cook" },
  room: { id: "r1", name: "Garden", roomNumber: "2" },
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getStaysAwaitingDocs.mockResolvedValue([]);
  mockStorage.getStaysCheckingOutBetween.mockResolvedValue([]);
  mockStorage.getStaysCheckingInBetween.mockResolvedValue([]);
  mockStorage.getSetting.mockResolvedValue(undefined);
  mockStorage.hasLifecycleEvent.mockResolvedValue(false);
  mockStorage.recordLifecycleEvent.mockResolvedValue(undefined);
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStorage.getPropertyAccessInfo.mockResolvedValue({
    wifiSsid: "BNP-Guest", directions: "Off Highway 5.", checkOutBy: "11:00 AM",
    buildingEntry: "9042",
  });
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs." });
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockDecline.declineAndRefundBooking.mockResolvedValue({ failed: [], refunded: [{}] });
  mockLifecycle.onStayCheckoutReminder.mockResolvedValue(true);
  mockLifecycle.onStrPreArrival.mockResolvedValue(true);
});

describe("friendlyDate", () => {
  it("names a day rather than counting hours", () => {
    expect(friendlyDate("2026-10-02")).toBe("Friday 2 October");
  });
});

describe("the auto-decline clock is STRICT — never early", () => {
  it("does not decline at 71 hours", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(71) } })]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
    expect(res.declined).toBe(0);
  });

  it("declines at exactly 72 hours", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(72) } })]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).toHaveBeenCalledTimes(1);
    expect(res.declined).toBe(1);
  });

  it("declines as the system, with the reference as its own confirmation", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(90) } })]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).toHaveBeenCalledWith(
      expect.objectContaining({
        actor: "system:gate-sweep",
        kind: "GATE_AUTO_DECLINE",
        confirm: "BNP-7QK4-2F9X",
      }),
    );
  });

  // A fix request restarts the clock: silence means since WE last asked, so a
  // guest bounced at hour 60 gets a fresh 72 hours, not 12.
  it("restarts the clock from the last fix request", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ gate: { ...stay().gate, createdAt: at(200), fixRequestedAt: at(10) } }),
    ]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
  });

  it("does nothing when no clock was ever started", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ gate: { ...stay().gate, docsDeadlineAt: null, createdAt: at(200) } }),
    ]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
    expect(res.declined).toBe(0);
  });
});

describe("Guard 2 — check-in has arrived", () => {
  // Its own trigger, NOT an else on the deadline: a booking made today for
  // tomorrow reaches check-in at ~24h, long before hour 72.
  it("escalates instead of refunding, even well before the deadline", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ checkIn: TODAY, gate: { ...stay().gate, createdAt: at(24) } }),
    ]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });

    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "GATE_INCOMPLETE_AT_CHECKIN", severity: "HIGH" }),
    );
    expect(res.escalatedAtCheckIn).toBe(1);
  });

  it("NEVER moves money once the stay has started, however long the silence", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ checkIn: "2026-09-25", gate: { ...stay().gate, createdAt: at(500) } }),
    ]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
  });

  it("keeps guest contact details out of the Telegram alert", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ checkIn: TODAY })]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    const { telegramText } = mockNotify.notifyAdmin.mock.calls[0][0];
    expect(telegramText).not.toContain("jane@example.com");
    expect(telegramText).not.toContain("+15551234567");
  });
});

describe("Guard 3 — operator suppression stops the money too", () => {
  it("suppresses BOTH the nudge and the auto-decline", async () => {
    mockStorage.getSetting.mockResolvedValue({ value: "false" });
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ gate: { ...stay().gate, createdAt: at(100) } }),
    ]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });

    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
    expect(res.suppressed).toBe(1);
  });
});

describe("nudges use a day WINDOW so a skipped run loses nothing", () => {
  it("sends nothing in the first day", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(5) } })]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(res.nudged).toBe(0);
  });

  it("nudges once on day 1 and again on day 2", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(26) } })]);
    let res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(res.nudged).toBe(1);
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_GHOST_NUDGE_1" }),
    );

    vi.clearAllMocks();
    beforeEachState();
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(50) } })]);
    res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_GHOST_NUDGE_2" }),
    );
  });

  it("does not re-nudge what is already recorded", async () => {
    mockStorage.hasLifecycleEvent.mockResolvedValue(true);
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(26) } })]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(res.nudged).toBe(0);
    expect(mockNotify.notifyGuest).not.toHaveBeenCalled();
  });

  // The round counter: without it a guest bounced once and going quiet again
  // would get no warning at all before being auto-declined.
  it("re-arms the nudges after a fix request", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ gate: { ...stay().gate, fixRequestCount: 1, fixRequestedAt: at(26), createdAt: at(200) } }),
    ]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockStorage.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: "STAY_GHOST_NUDGE_1", scheduleSeq: 2 }),
    );
  });

  it("names a date in the nudge, never an hour count", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([stay({ gate: { ...stay().gate, createdAt: at(26) } })]);
    await runStayGhostSweep({ now: NOW, today: TODAY });
    const { body, smsBody } = mockNotify.notifyGuest.mock.calls[0][0];
    expect(`${body} ${smsBody}`).not.toMatch(/\b72 hours\b/i);
    expect(body).toMatch(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\b/);
  });
});

describe("a guest waiting on an ADMIN is never touched", () => {
  // The query excludes them structurally, but this is the money path, so the
  // sweep re-checks rather than assuming.
  it("skips a stay whose documents are all in", async () => {
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({
        gate: {
          ...stay().gate,
          createdAt: at(200),
          agreementSignedAt: at(100),
          verificationStatus: "PENDING_REVIEW",
        },
      }),
    ]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(mockDecline.declineAndRefundBooking).not.toHaveBeenCalled();
    expect(res.nudged).toBe(0);
  });
});

describe("one bad stay does not abandon the sweep", () => {
  it("logs a refused decline and carries on", async () => {
    mockDecline.declineAndRefundBooking
      .mockRejectedValueOnce(new Error("no settled card payment"))
      .mockResolvedValueOnce({ failed: [], refunded: [{}] });
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([
      stay({ id: "bk-1", gate: { ...stay().gate, createdAt: at(100) } }),
      stay({ id: "bk-2", reference: "BNP-AAAA-BBBB", gate: { ...stay().gate, createdAt: at(100) } }),
    ]);
    const res = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(res.declined).toBe(1);
    expect(res.refundFailed).toBe(1);
  });
});

describe("checkout reminders", () => {
  const outStay = (over: Record<string, unknown> = {}) =>
    stay({ status: "ACTIVE", checkIn: "2026-09-20", checkOut: "2026-10-03", ...over });

  it("sends the 48h at 2 days out and the 24h at 1 day out", async () => {
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: "2026-10-03" })]);
    let res = await runStayCheckoutReminders(TODAY);
    expect(res.sent48).toBe(1);
    expect(mockLifecycle.onStayCheckoutReminder.mock.calls[0][1].kind).toBe("STAY_CHECKOUT_48H");

    vi.clearAllMocks();
    beforeEachState();
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: "2026-10-02" })]);
    mockStorage.hasLifecycleEvent.mockImplementation(async (_r, kind) => kind === "STAY_CHECKOUT_48H");
    res = await runStayCheckoutReminders(TODAY);
    expect(res.sent24).toBe(1);
  });

  // The overlapping windows: if yesterday's run was skipped, the guest is now at
  // d=1 having received nothing. The 48h fires — because it carries the
  // money-bearing extension offer — and the 24h follows tomorrow.
  it("recovers a skipped day without losing the extension offer", async () => {
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: "2026-10-02" })]);
    const res = await runStayCheckoutReminders(TODAY);
    expect(res.sent48).toBe(1);
    expect(res.sent24).toBe(0);
  });

  it("never reminds about an open-ended stay", async () => {
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: null })]);
    const res = await runStayCheckoutReminders(TODAY);
    expect(res.sent48 + res.sent24).toBe(0);
  });

  // Owner decision: reminders are co-living only. STR gets pre-arrival and
  // nothing else.
  it("skips a whole-property STR stay", async () => {
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([
      outStay({ model: "STR", roomId: null, room: null, checkOut: "2026-10-03" }),
    ]);
    const res = await runStayCheckoutReminders(TODAY);
    expect(res.sent48 + res.sent24).toBe(0);
  });

  it("keys on the extension count, so extending re-arms both reminders", async () => {
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([
      outStay({ checkOut: "2026-10-03", gate: { ...stay().gate, extensionCount: 2 } }),
    ]);
    await runStayCheckoutReminders(TODAY);
    expect(mockStorage.hasLifecycleEvent).toHaveBeenCalledWith(
      { bookingId: "bk-1" }, "STAY_CHECKOUT_48H", 2,
    );
  });

  it("only offers an extension when the room is genuinely free after", async () => {
    mockStorage.isRoomAvailableForRange.mockResolvedValue(false);
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: "2026-10-03" })]);
    await runStayCheckoutReminders(TODAY);
    expect(mockLifecycle.onStayCheckoutReminder.mock.calls[0][1]).toMatchObject({
      extendAvailable: false,
      maxExtraNights: 0,
    });
  });

  it("caps the offered nights at what is actually available", async () => {
    let call = 0;
    mockStorage.isRoomAvailableForRange.mockImplementation(async () => ++call <= 3);
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([outStay({ checkOut: "2026-10-03" })]);
    await runStayCheckoutReminders(TODAY);
    expect(mockLifecycle.onStayCheckoutReminder.mock.calls[0][1].maxExtraNights).toBe(3);
  });
});

describe("pre-arrival", () => {
  const inStay = (over: Record<string, unknown> = {}) =>
    stay({ status: "CONFIRMED", model: "STR", roomId: null, room: null,
           checkIn: "2026-10-02", checkOut: "2026-10-05", gate: null, ...over });

  it("sends the day before arrival", async () => {
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([inStay()]);
    const res = await runStayPreArrival(TODAY);
    expect(res.sent).toBe(1);
  });

  it("skips a gated stay — its details came with the welcome letter", async () => {
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([
      stay({ model: "COLIVING", checkIn: "2026-10-02", checkOut: "2026-10-13",
             gate: { ...stay().gate, approvedAt: at(5) } }),
    ]);
    const res = await runStayPreArrival(TODAY);
    expect(res.sent).toBe(0);
    expect(mockLifecycle.onStrPreArrival).not.toHaveBeenCalled();
  });

  // THE subtle one. lifecycle_events has no date in its key, so recording a
  // SKIPPED row here would permanently burn the guest's slot and they would
  // never get check-in details even after an operator fills the property in.
  it("escalates on missing access info WITHOUT consuming the guest's slot", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({ wifiSsid: "BNP-Guest" }); // no directions
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([inStay()]);
    const res = await runStayPreArrival(TODAY);

    expect(res.blocked).toBe(1);
    expect(res.sent).toBe(0);
    expect(mockStorage.recordLifecycleEvent).not.toHaveBeenCalled();
    expect(mockStorage.raiseEscalationOnce).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "ACCESS_INFO_MISSING", severity: "HIGH" }),
    );
  });

  it("names the missing FIELDS in the alert, never the values that are set", async () => {
    mockStorage.getPropertyAccessInfo.mockResolvedValue({
      wifiSsid: "BNP-Guest", wifiPassword: "synthetic-pw-42", buildingEntry: "9042",
    });
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([inStay()]);
    await runStayPreArrival(TODAY);
    const { detail } = mockStorage.raiseEscalationOnce.mock.calls[0][0];
    expect(detail).toContain("directions");
    expect(detail).not.toContain("synthetic-pw-42");
    expect(detail).not.toContain("9042");
  });

  it("accepts a standing building entry code when there is no per-booking code", async () => {
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([inStay()]);
    const res = await runStayPreArrival(TODAY);
    expect(res.sent).toBe(1);
    expect(res.blocked).toBe(0);
  });

  it("ignores a stay that is neither today nor tomorrow", async () => {
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([inStay({ checkIn: "2026-10-09" })]);
    const res = await runStayPreArrival(TODAY);
    expect(res.sent).toBe(0);
  });
});

function beforeEachState() {
  mockStorage.getStaysAwaitingDocs.mockResolvedValue([]);
  mockStorage.getStaysCheckingOutBetween.mockResolvedValue([]);
  mockStorage.getStaysCheckingInBetween.mockResolvedValue([]);
  mockStorage.getSetting.mockResolvedValue(undefined);
  mockStorage.hasLifecycleEvent.mockResolvedValue(false);
  mockStorage.raiseEscalationOnce.mockResolvedValue({ id: "esc-1" });
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStorage.getPropertyAccessInfo.mockResolvedValue({
    wifiSsid: "BNP-Guest", directions: "Off Highway 5.", checkOutBy: "11:00 AM", buildingEntry: "9042",
  });
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs." });
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockLifecycle.onStayCheckoutReminder.mockResolvedValue(true);
  mockLifecycle.onStrPreArrival.mockResolvedValue(true);
}

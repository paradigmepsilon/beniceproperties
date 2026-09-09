// server/lib/stayGateHardening.test.ts
// =============================================================================
// The Phase 9 audit from the build spec, as executable tests rather than a
// checklist someone ticks:
//
//   1. IDEMPOTENCY — every sweep is run TWICE against the same state, and the
//      second pass must send nothing and move no money. Vercel can and does
//      invoke a cron twice, and Stripe retries webhooks for days.
//   2. SENSITIVE DATA — a repo-wide grep proving no access credential can reach
//      an SMS body, a Telegram string, or a log line, and that no real-looking
//      code is committed in a fixture.
//
// These are cross-module by nature, which is why they live in their own file
// rather than being scattered through the per-unit suites.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// 1. Idempotency — every sweep run twice
// ---------------------------------------------------------------------------

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

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./bookingGateDecline", () => mockDecline);
vi.mock("./notifications", () => mockNotify);

import { runStayGhostSweep, runStayCheckoutReminders, runStayPreArrival } from "./stayReminders";

const TODAY = "2026-10-01";
const NOW = new Date(`${TODAY}T12:00:00Z`);
const HOUR = 3_600_000;

/**
 * A ledger that behaves like the real one: recordLifecycleEvent writes, and
 * hasLifecycleEvent reads back. This is what makes a second pass meaningful —
 * mocking hasLifecycleEvent to a constant would prove nothing.
 */
function withLedger() {
  const recorded = new Set<string>();
  const key = (ref: { bookingId?: string }, type: string, seq: number | null) =>
    `${ref.bookingId}|${type}|${seq ?? "null"}`;
  mockStorage.hasLifecycleEvent.mockImplementation(async (ref, type, seq) =>
    recorded.has(key(ref, type, seq)),
  );
  mockStorage.recordLifecycleEvent.mockImplementation(async (row) => {
    recorded.add(key({ bookingId: row.bookingId }, row.eventType, row.scheduleSeq ?? null));
  });
  // raiseEscalationOnce returns a row the FIRST time and null after — the real
  // dedupe contract.
  const escalated = new Set<string>();
  mockStorage.raiseEscalationOnce.mockImplementation(async (e) => {
    const k = `${e.bookingId}|${e.kind}`;
    if (escalated.has(k)) return null;
    escalated.add(k);
    return { id: `esc-${escalated.size}` };
  });
  return { recorded, escalated };
}

const gatedStay = (over: Record<string, unknown> = {}) => ({
  id: "bk-1", reference: "BNP-7QK4-2F9X", propertyId: "prop-1", roomId: "r1",
  model: "COLIVING", checkIn: "2026-10-20", checkOut: "2026-10-31",
  status: "PENDING_APPROVAL", quotedTotal: "980.00", createdAt: new Date(NOW.getTime() - 30 * HOUR),
  gate: {
    bookingId: "bk-1", gateToken: "a1B2c3D4e5F6g7H8i9J0kLmN",
    docsDeadlineAt: new Date(NOW.getTime() + 40 * HOUR),
    agreementSignedAt: null, verificationStatus: "NOT_SUBMITTED",
    fixRequestCount: 0, extensionCount: 0, fixRequestedAt: null,
    createdAt: new Date(NOW.getTime() - 30 * HOUR),
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
  mockStorage.isRoomAvailableForRange.mockResolvedValue(true);
  mockStorage.getPropertyAccessInfo.mockResolvedValue({
    wifiSsid: "BNP-Guest", wifiPassword: "synthetic-pw-42", buildingEntry: "9042",
    directions: "Off Highway 5.", checkOutBy: "11:00 AM",
  });
  mockStorage.getRoomAccessInfo.mockResolvedValue({ findingNotes: "Upstairs." });
  mockNotify.notifyGuest.mockResolvedValue({ email: { sent: true }, sms: { sent: true } });
  mockNotify.notifyAdmin.mockResolvedValue({ email: { sent: true }, telegram: { sent: true } });
  mockDecline.declineAndRefundBooking.mockResolvedValue({ failed: [], refunded: [{}] });
});

describe("the ghost sweep is idempotent", () => {
  it("nudges on the first pass and says nothing on the second", async () => {
    withLedger();
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([gatedStay()]);

    const first = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(first.nudged).toBe(1);
    const sendsAfterFirst = mockNotify.notifyGuest.mock.calls.length;

    const second = await runStayGhostSweep({ now: NOW, today: TODAY });
    expect(second.nudged).toBe(0);
    expect(mockNotify.notifyGuest.mock.calls.length).toBe(sendsAfterFirst);
  });

  // The one that matters most: a cron invoked twice must not refund twice.
  it("declines ONCE across two passes over the same state", async () => {
    withLedger();
    const overdue = gatedStay({
      gate: { ...gatedStay().gate, createdAt: new Date(NOW.getTime() - 100 * HOUR) },
    });
    // After a real decline the booking is CANCELLED, so the query stops returning
    // it. Model that: the second pass sees nothing.
    mockStorage.getStaysAwaitingDocs
      .mockResolvedValueOnce([overdue])
      .mockResolvedValueOnce([]);

    await runStayGhostSweep({ now: NOW, today: TODAY });
    await runStayGhostSweep({ now: NOW, today: TODAY });

    expect(mockDecline.declineAndRefundBooking).toHaveBeenCalledTimes(1);
  });

  it("escalates a check-in-day stay once, not once per pass", async () => {
    withLedger();
    mockStorage.getStaysAwaitingDocs.mockResolvedValue([gatedStay({ checkIn: TODAY })]);

    const first = await runStayGhostSweep({ now: NOW, today: TODAY });
    const second = await runStayGhostSweep({ now: NOW, today: TODAY });

    expect(first.escalatedAtCheckIn).toBe(1);
    expect(second.escalatedAtCheckIn).toBe(0);
    expect(mockNotify.notifyAdmin).toHaveBeenCalledTimes(1);
  });
});

describe("the checkout reminders are idempotent", () => {
  it("sends the 48h once across two passes", async () => {
    withLedger();
    const stay = gatedStay({ status: "ACTIVE", checkIn: "2026-09-20", checkOut: "2026-10-03" });
    mockStorage.getStaysCheckingOutBetween.mockResolvedValue([stay]);

    const first = await runStayCheckoutReminders(TODAY);
    const second = await runStayCheckoutReminders(TODAY);

    expect(first.sent48).toBe(1);
    expect(second.sent48 + second.sent24).toBe(0);
  });
});

describe("pre-arrival is idempotent — but a blocked send is RETRIED", () => {
  const strStay = (over: Record<string, unknown> = {}) =>
    gatedStay({
      status: "CONFIRMED", model: "STR", roomId: null, room: null, gate: null,
      checkIn: "2026-10-02", checkOut: "2026-10-05", ...over,
    });

  it("sends once across two passes", async () => {
    withLedger();
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([strStay()]);
    const first = await runStayPreArrival(TODAY);
    const second = await runStayPreArrival(TODAY);
    expect(first.sent).toBe(1);
    expect(second.sent).toBe(0);
  });

  // The deliberate asymmetry. lifecycle_events has no date in its key, so a
  // SKIPPED row would permanently burn the slot. A blocked send must therefore
  // remain retryable — otherwise filling in the property later would never help.
  it("stays retryable after being blocked on missing access info", async () => {
    withLedger();
    mockStorage.getPropertyAccessInfo.mockResolvedValue({ wifiSsid: "BNP-Guest" }); // no directions
    mockStorage.getStaysCheckingInBetween.mockResolvedValue([strStay()]);

    const first = await runStayPreArrival(TODAY);
    expect(first.blocked).toBe(1);
    expect(mockStorage.recordLifecycleEvent).not.toHaveBeenCalled();

    // Operator fills it in; the very next pass sends.
    mockStorage.getPropertyAccessInfo.mockResolvedValue({
      wifiSsid: "BNP-Guest", buildingEntry: "9042", directions: "Off Highway 5.",
    });
    const second = await runStayPreArrival(TODAY);
    expect(second.sent).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 2. Sensitive-data audit — a repo-wide grep, not a per-module assertion
// ---------------------------------------------------------------------------

/** Every .ts/.tsx file under the given roots. */
function sourceFiles(roots: string[]): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry)) out.push(full);
    }
  };
  for (const root of roots) walk(root);
  return out;
}

const ROOT = new URL("../../", import.meta.url).pathname;
const FILES = sourceFiles([join(ROOT, "server"), join(ROOT, "shared"), join(ROOT, "client/src")]);

describe("access credentials cannot leave by the wrong channel", () => {
  it("the SMS field of every stay template is credential-free", () => {
    // stayTemplates is the ONLY place a guest SMS body is authored. If a door code
    // or wifi password were ever interpolated there, this catches it structurally
    // rather than relying on the value-based canary in the ratchet test.
    //
    // Line-based on purpose: a regex spanning property boundaries would sweep up
    // the `logBody:` line that legitimately follows, which DOES reference the
    // (redacted) access text.
    const src = readFileSync(join(ROOT, "server/lib/stayTemplates.ts"), "utf8");
    const lines = src.split("\n");
    const smsValues: string[] = [];
    for (let i = 0; i < lines.length; i += 1) {
      if (!/^\s*smsBody:/.test(lines[i])) continue;
      const value: string[] = [lines[i]];
      // Continuation lines until the next property key or the end of the object.
      for (let j = i + 1; j < lines.length; j += 1) {
        if (/^\s*(logBody|telegramText|subject|body)\s*:/.test(lines[j])) break;
        if (/^\s*\};?\s*$/.test(lines[j])) break;
        value.push(lines[j]);
      }
      smsValues.push(value.join("\n"));
    }
    expect(smsValues.length).toBeGreaterThan(5);
    for (const value of smsValues) {
      expect(value).not.toMatch(/\bdoorCode\b/);
      expect(value).not.toMatch(/\bwifiPassword\b/);
      expect(value).not.toMatch(/\baccessText\b/);
      expect(value).not.toMatch(/\bbuildingEntry\b/);
    }
  });

  it("no telegramText anywhere interpolates a credential", () => {
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/telegramText:\s*([\s\S]{0,400}?)(?=\n\s{0,6}\}|\n\s{0,6}context:)/g)) {
        expect(m[1], file).not.toMatch(/\bdoorCode\b|\bwifiPassword\b|\baccessText\b|\bbuildingEntry\b/);
      }
    }
  });

  it("no log() call interpolates a door code", () => {
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/\blog\(\s*([\s\S]{0,300}?)\)\s*;/g)) {
        expect(m[1], `${file}: ${m[1].slice(0, 80)}`).not.toMatch(
          /\bdoorCode\b|\bwifiPassword\b|\bbuildingEntry\b/,
        );
      }
    }
  });

  it("no PostHog event carries a door code", () => {
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/posthog\.capture\(\s*\{([\s\S]{0,600}?)\}\s*\)/g)) {
        expect(m[1], file).not.toMatch(/\bdoorCode\b|\bwifiPassword\b/);
      }
    }
  });

  it("no escalation detail interpolates a credential", () => {
    // missingAccessFields deliberately returns FIELD NAMES so an alert can say what
    // is absent without printing what is set. This proves nothing bypasses that.
    for (const file of FILES) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/detail:\s*([\s\S]{0,600}?)(?=\n\s{0,6}\}\)|\n\s{0,6}\},)/g)) {
        expect(m[1], file).not.toMatch(/\bdoorCode\b|\bwifiPassword\b|\baccessText\b/);
      }
    }
  });

  it("the credential-bearing templates supply a redacted logBody", () => {
    const src = readFileSync(join(ROOT, "server/lib/stayTemplates.ts"), "utf8");
    // Split on the export boundary rather than regex-matching a function body —
    // a lazy [\s\S]*? stops at the first `\n}` inside the body, which for these
    // templates lands before the return object.
    const fns = src
      .split(/\nexport function /)
      .slice(1)
      .map((chunk) => ({ name: chunk.slice(0, chunk.indexOf("(")), src: chunk }));
    const accessUsers = fns.filter((f) => /\baccessText\b/.test(f.src));
    // Exactly two messages carry live credentials: the welcome letter and the
    // STR pre-arrival note. If a third ever appears it must be deliberate.
    expect(accessUsers.map((f) => f.name).sort()).toEqual([
      "stayApprovedWelcome",
      "strPreArrival",
    ]);
    for (const fn of accessUsers) {
      expect(fn.src, fn.name).toContain("logBody");
      expect(fn.src, fn.name).toContain("accessTextRedacted");
    }
  });
});

describe("no real-looking access code is committed", () => {
  it("every door code in a test fixture is one of the known synthetic values", () => {
    // Synthetic values used deliberately across the suites. Anything else looking
    // like a code assignment in a test is a real one that slipped in.
    const ALLOWED = new Set(["1357", "9042", "905txt", "A1B2C3", "12#45*", "13#57*", "13-57", "4821", "7", "12", "135"]);
    for (const file of FILES.filter((f) => /\.test\.tsx?$/.test(f))) {
      const src = readFileSync(file, "utf8");
      for (const m of src.matchAll(/doorCode:\s*"([^"]+)"/g)) {
        const value = m[1];
        if (value.includes("redacted") || value.trim() === "" || /^\s+$/.test(value)) continue;
        expect(ALLOWED.has(value) || /^1+$/.test(value) || /^a+$/.test(value), `${file}: "${value}"`).toBe(true);
      }
    }
  });

  it("the door-code validator never echoes the value it rejected", () => {
    const src = readFileSync(join(ROOT, "shared/doorCode.ts"), "utf8");
    // An error message that quoted the input would put a near-miss of a real code
    // into any log that captures API errors.
    const errorBody = src.slice(src.indexOf("export function doorCodeError"));
    expect(errorBody).not.toMatch(/\$\{code\}/);
    expect(errorBody).not.toMatch(/\$\{raw\}/);
  });
});

describe("the money path stays reachable only where it should be", () => {
  it("materialize.ts still cannot refund", () => {
    // The original invariant, re-asserted here because this feature added a refund
    // path elsewhere in the app and the two must not converge.
    const src = readFileSync(join(ROOT, "server/lib/materialize.ts"), "utf8");
    expect(src).not.toContain("refundPaymentIntent");
  });

  it("exactly one module calls the Stripe refund helper for a gated stay", () => {
    const callers = FILES.filter((f) => !/\.test\.tsx?$/.test(f)).filter((f) =>
      /refundPaymentIntent\(/.test(readFileSync(f, "utf8")),
    );
    const names = callers.map((f) => f.split("/").pop()).sort();
    // stripe.ts defines it; bookingConflicts (admin cancel) and leasePayments
    // (deposit return) predate this work; bookingGateDecline is the new one.
    expect(names).toEqual([
      "bookingConflicts.ts",
      "bookingGateDecline.ts",
      "leasePayments.ts",
      "stripe.ts",
    ]);
  });

  it("the sweep reaches money only through the guarded decline service", () => {
    const src = readFileSync(join(ROOT, "server/lib/stayReminders.ts"), "utf8");
    expect(src).not.toContain("refundPaymentIntent");
    expect(src).toContain("declineAndRefundBooking");
  });
});

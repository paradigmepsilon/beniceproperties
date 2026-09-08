// server/lib/notifications.test.ts
// Task 4 — Telegram fan-out + message_log on every send. Mocks storage and
// telegram so no DB/network is touched; runs with no SMTP/Twilio/Telegram env
// set, so email/sms/telegram all take their dry-run/not-configured path.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockStorage = vi.hoisted(() => ({
  createMessageLog: vi.fn(),
}));
const mockTelegram = vi.hoisted(() => ({
  sendTelegram: vi.fn(),
  isTelegramConfigured: vi.fn(() => false),
  adminChatIds: vi.fn(() => []),
}));

vi.mock("../storage", () => ({ storage: mockStorage }));
vi.mock("./telegram", () => mockTelegram);

import { sendEmail, sendSms, notifyAdmin, notifyGuest, textToHtml } from "./notifications";

const ADMIN_ENV_KEYS = [
  "ADMIN_NOTIFY_EMAIL",
  "ADMIN_EMAIL",
  "SENDGRID_API_KEY",
  "SMTP_HOST",
  "SMTP_USER",
  "SMTP_PASS",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_FROM_NUMBER",
];

beforeEach(() => {
  vi.clearAllMocks();
  mockTelegram.isTelegramConfigured.mockReturnValue(false);
  mockTelegram.adminChatIds.mockReturnValue([]);
  mockTelegram.sendTelegram.mockResolvedValue({ sent: false, channel: "telegram", reason: "not-configured" });
  mockStorage.createMessageLog.mockResolvedValue({ id: "log-1" });
  for (const key of ADMIN_ENV_KEYS) delete process.env[key];
});

afterEach(() => {
  for (const key of ADMIN_ENV_KEYS) delete process.env[key];
});

describe("notifyAdmin", () => {
  it("picks ADMIN_NOTIFY_EMAIL over ADMIN_EMAIL", async () => {
    process.env.ADMIN_NOTIFY_EMAIL = "notify@example.com";
    process.env.ADMIN_EMAIL = "fallback@example.com";
    await notifyAdmin({ subject: "Alert", body: "something happened" });
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({ toAddress: "notify@example.com", channel: "EMAIL" }),
    );
  });

  it("falls back to ADMIN_EMAIL when ADMIN_NOTIFY_EMAIL is unset", async () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";
    await notifyAdmin({ subject: "Alert", body: "something happened" });
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({ toAddress: "fallback@example.com", channel: "EMAIL" }),
    );
  });

  it("returns no-admin-email when neither env var is set", async () => {
    const { email } = await notifyAdmin({ subject: "Alert", body: "body" });
    expect(email).toMatchObject({ sent: false, channel: "email", reason: "no-admin-email" });
  });

  it("calls sendTelegram with the subject + body", async () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";
    await notifyAdmin({ subject: "Alert", body: "something happened" });
    expect(mockTelegram.sendTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ text: "Alert\n\nsomething happened" }),
    );
  });

  // PRIVACY: Telegram is a third party. Anything with guest contact details in
  // the email body must pass a redacted `telegramText`, and that is what goes out.
  it("sends telegramText over Telegram while email keeps the full body", async () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";
    await notifyAdmin({
      subject: "New booking",
      body: "Jane Doe (jane@example.com, +15551234567) · BNP-1 · $100",
      telegramText: "Jane Doe · BNP-1 · $100",
    });
    expect(mockTelegram.sendTelegram).toHaveBeenCalledWith(
      expect.objectContaining({ text: "New booking\n\nJane Doe · BNP-1 · $100" }),
    );
    const telegramSent = mockTelegram.sendTelegram.mock.calls[0][0].text as string;
    expect(telegramSent).not.toContain("jane@example.com");
    expect(telegramSent).not.toContain("+15551234567");
    // The email still carries the contact details the operator needs.
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: "EMAIL",
        body: "Jane Doe (jane@example.com, +15551234567) · BNP-1 · $100",
      }),
    );
    // …and the message_log row for Telegram records the redacted text, not the body.
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "TELEGRAM", body: "New booking\n\nJane Doe · BNP-1 · $100" }),
    );
  });

  it("sends email and telegram in parallel and returns both results", async () => {
    process.env.ADMIN_EMAIL = "fallback@example.com";
    mockTelegram.sendTelegram.mockResolvedValue({ sent: true, channel: "telegram" });
    const result = await notifyAdmin({ subject: "Alert", body: "body" });
    expect(result.email.channel).toBe("email");
    expect(result.telegram).toMatchObject({ sent: true, channel: "telegram" });
  });
});

describe("sendEmail with context", () => {
  it("writes a DRY_RUN message_log row when email is not configured", async () => {
    const result = await sendEmail({
      to: "guest@example.com",
      subject: "Hi",
      text: "body",
      context: { bookingId: "b1", audience: "GUEST", kind: "BOOKING_CONFIRMED" },
    });
    expect(result).toMatchObject({ sent: false, channel: "email", reason: "not-configured" });
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({
        bookingId: "b1",
        audience: "GUEST",
        channel: "EMAIL",
        kind: "BOOKING_CONFIRMED",
        toAddress: "guest@example.com",
        status: "DRY_RUN",
      }),
    );
  });
});

describe("sendEmail with no context", () => {
  it("writes nothing to message_log", async () => {
    await sendEmail({ to: "guest@example.com", subject: "Hi", text: "body" });
    expect(mockStorage.createMessageLog).not.toHaveBeenCalled();
  });
});

describe("sendSms with context", () => {
  it("writes a SKIPPED message_log row when there is no phone", async () => {
    const result = await sendSms({
      to: "",
      body: "your rent is due",
      context: { leaseId: "l1", audience: "GUEST", kind: "RENT_DUE" },
    });
    expect(result).toMatchObject({ sent: false, channel: "sms", reason: "no-phone" });
    expect(mockStorage.createMessageLog).toHaveBeenCalledWith(
      expect.objectContaining({ leaseId: "l1", channel: "SMS", status: "SKIPPED" }),
    );
  });
});

describe("message_log write failures", () => {
  it("do not throw and do not block the send result", async () => {
    mockStorage.createMessageLog.mockRejectedValue(new Error("db down"));
    const result = await sendEmail({
      to: "guest@example.com",
      subject: "Hi",
      text: "body",
      context: { audience: "GUEST", kind: "MANUAL" },
    });
    expect(result).toMatchObject({ sent: false, channel: "email", reason: "not-configured" });
  });
});


describe("textToHtml", () => {
  it("turns a bare URL into a real anchor", () => {
    const html = textToHtml("Pay here: https://www.beniceproperties.com/portal/abc123");
    expect(html).toContain(
      '<a href="https://www.beniceproperties.com/portal/abc123">https://www.beniceproperties.com/portal/abc123</a>',
    );
  });

  it("escapes HTML before linkifying, so injected markup is inert", () => {
    // Guest names and admin-composed prose reach this unescaped. Before the fix
    // the email body was `<p>${text}</p>` — a raw interpolation.
    const html = textToHtml('<script>alert("x")</script>');
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("does not produce an anchor inside an escaped entity", () => {
    const html = textToHtml("a < b https://example.com/x");
    expect(html).toContain("&lt;");
    expect(html).toContain('<a href="https://example.com/x">');
  });

  it("renders newlines as line breaks", () => {
    expect(textToHtml("one\n\ntwo")).toContain("<br><br>");
  });
});

describe("notifyGuest smsBody", () => {
  beforeEach(() => {
    mockStorage.createMessageLog.mockResolvedValue({ id: "m1" });
  });

  it("sends the short variant to SMS and the full body to email", async () => {
    await notifyGuest({
      email: "jane@example.com",
      phone: "+15550001111",
      subject: "Rent reminder",
      body: "The long email body with a link: https://example.com/portal/abc",
      smsBody: "BNP: rent due. Pay: https://example.com/portal/abc",
      context: { leaseId: "lease-1", guestId: "g1", kind: "REMINDER_DUE" },
    });
    const channels = mockStorage.createMessageLog.mock.calls.map((c) => c[0]);
    const email = channels.find((c) => c.channel === "EMAIL");
    const sms = channels.find((c) => c.channel === "SMS");
    expect(email.body).toContain("The long email body");
    expect(sms.body).toBe("BNP: rent due. Pay: https://example.com/portal/abc");
  });

  it("falls back to `body` for SMS when no short variant is given", async () => {
    await notifyGuest({
      email: "jane@example.com",
      phone: "+15550001111",
      subject: "s",
      body: "only one body",
      context: { leaseId: "lease-1", guestId: "g1", kind: "X" },
    });
    const sms = mockStorage.createMessageLog.mock.calls
      .map((c) => c[0])
      .find((c) => c.channel === "SMS");
    expect(sms.body).toBe("only one body");
  });
});

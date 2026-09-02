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

import { sendEmail, sendSms, notifyAdmin } from "./notifications";

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

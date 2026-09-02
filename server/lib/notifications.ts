// server/lib/notifications.ts
// =============================================================================
// Guest notifications — email (Nodemailer/SMTP, incl. SendGrid SMTP) + SMS
// (Twilio). Gated on env, EXACTLY like the Stripe + UO modules: with creds set
// it sends for real; without them it logs a dry-run line and returns
// { sent:false, reason:"not-configured" } instead of throwing. This keeps the
// Phase 5 dunning state machine fully exercisable without live creds, and real
// sends light up the moment creds land.
//
// ENV:
//   Email (any one transport):
//     SENDGRID_API_KEY                 → SendGrid SMTP (apikey/<key> on smtp.sendgrid.net)
//     or SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS → generic SMTP
//     MAIL_FROM                        → From address (falls back to ADMIN_EMAIL)
//   SMS:
//     TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER
//
// No secrets are ever logged.
// =============================================================================

import { log } from "../server-log";
import { sendTelegram as sendTelegramRaw, adminChatIds } from "./telegram";

export interface SendResult {
  sent: boolean;
  channel: "email" | "sms" | "telegram";
  reason?: string;
}

/** Attaches a send to a booking/lease/guest for the message_log audit trail. */
export interface MessageContext {
  bookingId?: string | null;
  leaseId?: string | null;
  guestId?: string | null;
  audience: "GUEST" | "ADMIN";
  kind: string;
  sentBy?: string;
}

function statusFor(result: SendResult): "SENT" | "FAILED" | "DRY_RUN" | "SKIPPED" {
  if (result.sent) return "SENT";
  if (result.reason === "not-configured") return "DRY_RUN";
  if (result.reason === "no-phone") return "SKIPPED";
  return "FAILED";
}

// `storage` is imported lazily (rather than at module top) so this send
// layer stays importable — and its dry-run behavior testable — from
// anything without dragging the DB layer into every module that just wants
// to send an email/sms, and to sidestep any load-order coupling with the
// storage module. Cached like getTransport/getTwilio above so concurrent
// callers (e.g. notifyAdmin's Promise.all of email + telegram) share one
// in-flight import instead of racing separate ones.
let storageModulePromise: Promise<typeof import("../storage")> | null = null;
function getStorageModule(): Promise<typeof import("../storage")> {
  if (!storageModulePromise) storageModulePromise = import("../storage");
  return storageModulePromise;
}

/**
 * Writes one message_log row per send when a MessageContext is supplied.
 * A logging failure must never block or fail the send itself, so this is
 * always wrapped in try/catch.
 */
async function record(
  channel: "EMAIL" | "SMS" | "TELEGRAM",
  ctx: MessageContext,
  to: string,
  subject: string | undefined,
  body: string,
  result: SendResult,
): Promise<void> {
  try {
    const { storage } = await getStorageModule();
    await storage.createMessageLog({
      bookingId: ctx.bookingId ?? null,
      leaseId: ctx.leaseId ?? null,
      guestId: ctx.guestId ?? null,
      audience: ctx.audience,
      channel,
      kind: ctx.kind,
      toAddress: to,
      subject,
      body,
      status: statusFor(result),
      error: result.sent ? undefined : result.reason,
      sentBy: ctx.sentBy ?? "system",
    });
  } catch (err) {
    log(`message_log write FAILED: ${(err as Error).message}`, "notify");
  }
}

// ---------------------------------------------------------------------------
// Configuration probes
// ---------------------------------------------------------------------------

export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.SENDGRID_API_KEY ||
      (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS),
  );
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

const mailFrom = (): string =>
  process.env.MAIL_FROM || process.env.ADMIN_EMAIL || "no-reply@beniceproperties.com";

// ---------------------------------------------------------------------------
// Email (lazy transport so the SDK only loads when actually sending)
// ---------------------------------------------------------------------------

let transportPromise: Promise<import("nodemailer").Transporter> | null = null;

async function getTransport(): Promise<import("nodemailer").Transporter> {
  if (!transportPromise) {
    transportPromise = (async () => {
      const nodemailer = (await import("nodemailer")).default;
      if (process.env.SENDGRID_API_KEY) {
        return nodemailer.createTransport({
          host: "smtp.sendgrid.net",
          port: 587,
          auth: { user: "apikey", pass: process.env.SENDGRID_API_KEY },
        });
      }
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587", 10),
        secure: process.env.SMTP_PORT === "465",
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
    })();
  }
  return transportPromise;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  context?: MessageContext;
}): Promise<SendResult> {
  let result: SendResult;
  if (!isEmailConfigured()) {
    log(`[dry-run email] to=${opts.to} subject="${opts.subject}" (email not configured)`, "notify");
    result = { sent: false, channel: "email", reason: "not-configured" };
  } else {
    try {
      const transport = await getTransport();
      await transport.sendMail({
        from: mailFrom(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html ?? `<p>${opts.text}</p>`,
      });
      log(`email sent to=${opts.to} subject="${opts.subject}"`, "notify");
      result = { sent: true, channel: "email" };
    } catch (err) {
      log(`email FAILED to=${opts.to}: ${(err as Error).message}`, "notify");
      result = { sent: false, channel: "email", reason: (err as Error).message };
    }
  }
  if (opts.context) await record("EMAIL", opts.context, opts.to, opts.subject, opts.text, result);
  return result;
}

// ---------------------------------------------------------------------------
// SMS (Twilio)
// ---------------------------------------------------------------------------

let twilioClientPromise: Promise<import("twilio").Twilio> | null = null;

async function getTwilio(): Promise<import("twilio").Twilio> {
  if (!twilioClientPromise) {
    twilioClientPromise = (async () => {
      const twilio = (await import("twilio")).default;
      return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    })();
  }
  return twilioClientPromise;
}

export async function sendSms(opts: { to: string; body: string; context?: MessageContext }): Promise<SendResult> {
  let result: SendResult;
  if (!opts.to) {
    result = { sent: false, channel: "sms", reason: "no-phone" };
  } else if (!isSmsConfigured()) {
    log(`[dry-run sms] to=${opts.to} body="${opts.body.slice(0, 40)}…" (sms not configured)`, "notify");
    result = { sent: false, channel: "sms", reason: "not-configured" };
  } else {
    try {
      const client = await getTwilio();
      await client.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to: opts.to,
        body: opts.body,
      });
      log(`sms sent to=${opts.to}`, "notify");
      result = { sent: true, channel: "sms" };
    } catch (err) {
      log(`sms FAILED to=${opts.to}: ${(err as Error).message}`, "notify");
      result = { sent: false, channel: "sms", reason: (err as Error).message };
    }
  }
  if (opts.context) await record("SMS", opts.context, opts.to, undefined, opts.body, result);
  return result;
}

// ---------------------------------------------------------------------------
// Telegram (logged wrapper — the raw transport lives in ./telegram)
// ---------------------------------------------------------------------------

export { isTelegramConfigured } from "./telegram";

/** Logged Telegram send, used by notifyAdmin and anything else that wants a message_log row. */
export async function sendTelegramLogged(opts: {
  text: string;
  chatIds?: string[];
  context?: MessageContext;
}): Promise<SendResult> {
  const result = await sendTelegramRaw({ text: opts.text, chatIds: opts.chatIds });
  if (opts.context) {
    const to = (opts.chatIds ?? adminChatIds()).join(",");
    await record("TELEGRAM", opts.context, to, undefined, opts.text, result);
  }
  return result;
}

/** Send the same message over both channels (SMS only if a phone is present). */
export async function notifyGuest(opts: {
  email: string;
  phone?: string | null;
  subject: string;
  body: string;
  html?: string;
  context?: Omit<MessageContext, "audience">;
}): Promise<{ email: SendResult; sms: SendResult }> {
  const ctx: MessageContext | undefined = opts.context
    ? { ...opts.context, audience: "GUEST" }
    : undefined;
  const [email, sms] = await Promise.all([
    sendEmail({ to: opts.email, subject: opts.subject, text: opts.body, html: opts.html, context: ctx }),
    // sendSms already returns/records "no-phone" as SKIPPED when `to` is empty,
    // so route both branches through it rather than short-circuiting here.
    sendSms({ to: opts.phone ?? "", body: opts.body, context: ctx }),
  ]);
  return { email, sms };
}

/**
 * Fan out an admin alert over email (ADMIN_NOTIFY_EMAIL, falling back to
 * ADMIN_EMAIL) and Telegram in parallel. Used for anything an operator needs
 * to see immediately — failed charges, escalations, defaults.
 */
export async function notifyAdmin(opts: {
  subject: string;
  body: string;
  context?: Omit<MessageContext, "audience">;
}): Promise<{ email: SendResult; telegram: SendResult }> {
  const to = process.env.ADMIN_NOTIFY_EMAIL || process.env.ADMIN_EMAIL;
  const ctx: MessageContext = { ...(opts.context ?? { kind: "ADMIN_ALERT" }), audience: "ADMIN" };
  const [email, telegram] = await Promise.all([
    to
      ? sendEmail({ to, subject: opts.subject, text: opts.body, context: ctx })
      : Promise.resolve<SendResult>({ sent: false, channel: "email", reason: "no-admin-email" }),
    sendTelegramLogged({ text: `${opts.subject}\n\n${opts.body}`, context: ctx }),
  ]);
  return { email, telegram };
}

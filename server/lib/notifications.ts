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

export interface SendResult {
  sent: boolean;
  channel: "email" | "sms";
  reason?: string;
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
}): Promise<SendResult> {
  if (!isEmailConfigured()) {
    log(`[dry-run email] to=${opts.to} subject="${opts.subject}" (email not configured)`, "notify");
    return { sent: false, channel: "email", reason: "not-configured" };
  }
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
    return { sent: true, channel: "email" };
  } catch (err) {
    log(`email FAILED to=${opts.to}: ${(err as Error).message}`, "notify");
    return { sent: false, channel: "email", reason: (err as Error).message };
  }
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

export async function sendSms(opts: { to: string; body: string }): Promise<SendResult> {
  if (!opts.to) {
    return { sent: false, channel: "sms", reason: "no-phone" };
  }
  if (!isSmsConfigured()) {
    log(`[dry-run sms] to=${opts.to} body="${opts.body.slice(0, 40)}…" (sms not configured)`, "notify");
    return { sent: false, channel: "sms", reason: "not-configured" };
  }
  try {
    const client = await getTwilio();
    await client.messages.create({
      from: process.env.TWILIO_FROM_NUMBER,
      to: opts.to,
      body: opts.body,
    });
    log(`sms sent to=${opts.to}`, "notify");
    return { sent: true, channel: "sms" };
  } catch (err) {
    log(`sms FAILED to=${opts.to}: ${(err as Error).message}`, "notify");
    return { sent: false, channel: "sms", reason: (err as Error).message };
  }
}

/** Send the same message over both channels (SMS only if a phone is present). */
export async function notifyGuest(opts: {
  email: string;
  phone?: string | null;
  subject: string;
  body: string;
  html?: string;
}): Promise<{ email: SendResult; sms: SendResult }> {
  const [email, sms] = await Promise.all([
    sendEmail({ to: opts.email, subject: opts.subject, text: opts.body, html: opts.html }),
    opts.phone
      ? sendSms({ to: opts.phone, body: opts.body })
      : Promise.resolve<SendResult>({ sent: false, channel: "sms", reason: "no-phone" }),
  ]);
  return { email, sms };
}

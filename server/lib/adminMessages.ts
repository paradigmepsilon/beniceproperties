// server/lib/adminMessages.ts
// =============================================================================
// Staff → guest messaging (Task 6). Shared by the admin UI and the UO
// write-back — a human (or UO, on a human's behalf) composes a message tied to
// a booking or lease and it either starts a new thread or replies on an
// existing one, then delivers over the requested channel(s). Every send is
// recorded to message_log by the notification layer itself (see
// server/lib/notifications.ts), so this module never writes message_log
// directly — it only writes guest_messages (the thread) and reads message_log
// back for the delivery trail (getThread).
//
// Channel selection is deliberate, not "send everything available":
//   EMAIL + SMS → notifyGuest(...) with the guest's phone.
//   EMAIL only  → notifyGuest(...) with phone:null (no phone leaves this module).
//   SMS only    → sendSms(...) directly (no email attempt at all).
//   neither     → nothing is sent; both delivery results report "not-requested".
// =============================================================================

import { storage } from "../storage";
import { notifyGuest, sendSms, type SendResult } from "./notifications";
import { LeaseError } from "./lease";
import type { Guest, GuestMessage, MessageLogRow } from "@shared/schema";

const DEFAULT_SUBJECT = "Message from Be Nice Properties";
const NOT_REQUESTED = (channel: "email" | "sms"): SendResult => ({
  sent: false,
  channel,
  reason: "not-requested",
});

export interface SendStaffMessageArgs {
  bookingId?: string;
  leaseId?: string;
  threadId?: string;
  subject?: string;
  body: string;
  channels: Array<"EMAIL" | "SMS">;
  actor: string;
}

export interface SendStaffMessageResult {
  messageId: string;
  threadId: string;
  delivery: { email: SendResult; sms: SendResult };
}

interface ResolvedTarget {
  bookingId: string | null;
  leaseId: string | null;
  guestId: string;
  category: "QUESTION" | "MAINTENANCE" | "OTHER";
  root: GuestMessage | null;
}

/** Resolve who this message is to and (for a reply) the thread it replies on. */
async function resolveTarget(args: SendStaffMessageArgs): Promise<ResolvedTarget> {
  if (args.threadId) {
    const messages = await storage.getMessagesByThread(args.threadId);
    const root = messages.find((m) => m.id === args.threadId);
    if (!root) throw new LeaseError("Thread not found", 404);
    return {
      bookingId: root.bookingId ?? null,
      leaseId: root.leaseId ?? null,
      guestId: root.guestId,
      category: (root.category as ResolvedTarget["category"]) ?? "OTHER",
      root,
    };
  }

  const bookingId = args.bookingId ?? null;
  const leaseId = args.leaseId ?? null;
  if (!bookingId && !leaseId) {
    throw new LeaseError("bookingId or leaseId is required to start a new thread", 400);
  }

  let guestId: string;
  if (leaseId) {
    const lease = await storage.getLease(leaseId);
    if (!lease) throw new LeaseError("Lease not found", 404);
    guestId = lease.guestId;
  } else {
    const booking = await storage.getBooking(bookingId!);
    if (!booking) throw new LeaseError("Booking not found", 404);
    guestId = booking.guestId;
  }
  return { bookingId, leaseId, guestId, category: "OTHER", root: null };
}

export async function sendStaffMessage(args: SendStaffMessageArgs): Promise<SendStaffMessageResult> {
  const target = await resolveTarget(args);
  const guest: Guest | undefined = await storage.getGuest(target.guestId);
  if (!guest) throw new LeaseError("Guest not found", 404);

  const subject = args.subject ?? DEFAULT_SUBJECT;

  const message = await storage.createMessage({
    leaseId: target.leaseId,
    bookingId: target.bookingId,
    guestId: target.guestId,
    threadId: args.threadId ?? "", // "" → storage assigns a self-referential root id
    authorRole: "STAFF",
    category: target.category,
    subject: target.root ? target.root.subject : subject,
    body: args.body,
    status: "ANSWERED",
  });

  if (target.root) {
    await storage.updateMessage(target.root.id, { status: "ANSWERED" });
  }

  const context = {
    bookingId: target.bookingId,
    leaseId: target.leaseId,
    guestId: target.guestId,
    audience: "GUEST" as const,
    kind: "MANUAL",
    sentBy: args.actor,
  };

  const wantsEmail = args.channels.includes("EMAIL");
  const wantsSms = args.channels.includes("SMS");

  let email: SendResult = NOT_REQUESTED("email");
  let sms: SendResult = NOT_REQUESTED("sms");

  if (wantsEmail) {
    const delivery = await notifyGuest({
      email: guest.email,
      phone: wantsSms ? guest.phone : null,
      subject,
      body: args.body,
      context,
    });
    email = delivery.email;
    sms = delivery.sms;
  } else if (wantsSms) {
    sms = await sendSms({ to: guest.phone ?? "", body: args.body, context });
  }

  return { messageId: message.id, threadId: message.threadId, delivery: { email, sms } };
}

// ---------------------------------------------------------------------------
// Reads — the admin/UO message inbox.
// ---------------------------------------------------------------------------

export interface ThreadSummary {
  id: string;
  status: string;
  category: string;
  subject: string | null;
  createdAt: Date;
  guestName: string | null;
  guestEmail: string | null;
  propertyName: string | null;
  bookingReference: string | null;
  leaseId: string | null;
  bookingId: string | null;
  lastMessageAt: Date;
  messageCount: number;
}

export async function listThreads(opts?: { status?: string }): Promise<ThreadSummary[]> {
  const roots = await storage.getMessageThreadRoots(opts);
  const out: ThreadSummary[] = [];

  for (const root of roots) {
    const [guest, messages] = await Promise.all([
      storage.getGuest(root.guestId),
      storage.getMessagesByThread(root.threadId),
    ]);

    let propertyName: string | null = null;
    let bookingReference: string | null = null;
    if (root.bookingId) {
      const booking = await storage.getBooking(root.bookingId);
      if (booking) {
        bookingReference = booking.reference;
        const property = await storage.getProperty(booking.propertyId);
        propertyName = property?.name ?? null;
      }
    } else if (root.leaseId) {
      const lease = await storage.getLease(root.leaseId);
      if (lease) {
        const property = await storage.getProperty(lease.propertyId);
        propertyName = property?.name ?? null;
      }
    }

    const lastMessage = messages[messages.length - 1] ?? root;
    out.push({
      id: root.id,
      status: root.status,
      category: root.category,
      subject: root.subject,
      createdAt: root.createdAt,
      guestName: guest?.name ?? null,
      guestEmail: guest?.email ?? null,
      propertyName,
      bookingReference,
      leaseId: root.leaseId ?? null,
      bookingId: root.bookingId ?? null,
      lastMessageAt: lastMessage.createdAt,
      messageCount: messages.length,
    });
  }

  return out;
}

export interface ThreadDetail {
  root: GuestMessage;
  messages: GuestMessage[];
  deliveries: MessageLogRow[];
}

export async function getThread(threadId: string): Promise<ThreadDetail> {
  const messages = await storage.getMessagesByThread(threadId);
  const root = messages.find((m) => m.id === threadId);
  if (!root) throw new LeaseError("Thread not found", 404);

  const logs = await storage.getMessageLog(
    root.leaseId ? { leaseId: root.leaseId } : { bookingId: root.bookingId ?? undefined },
  );
  const deliveries = logs
    .filter((l) => l.kind === "MANUAL")
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return { root, messages, deliveries };
}

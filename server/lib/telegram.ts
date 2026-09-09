// server/lib/telegram.ts — admin-only Telegram alerts. Same env-gated, dry-run,
// never-throw shape as notifications.ts. ENV: TELEGRAM_BOT_TOKEN,
// TELEGRAM_ADMIN_CHAT_ID (comma-separated chat ids). Token never logged.
import { log } from "../server-log";

export interface TelegramResult {
  sent: boolean;
  channel: "telegram";
  reason?: string;
}

export function isTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_ADMIN_CHAT_ID);
}

/**
 * TELEGRAM_ADMIN_CHAT_ID entries are either a bare chat id ("6112545054") or a
 * "Name:id" pair ("Alex:6112545054") — the same variable, same shape, and same
 * bot as Unified Ops. Names are dropped; anything that is not an integer chat id
 * (negative ids are groups) is dropped too, so a typo can never reach the API.
 */
export function adminChatIds(): string[] {
  return (process.env.TELEGRAM_ADMIN_CHAT_ID ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => (entry.includes(":") ? entry.slice(entry.lastIndexOf(":") + 1).trim() : entry))
    .filter((id) => /^-?\d+$/.test(id));
}

export async function sendTelegram(opts: {
  text: string;
  chatIds?: string[];
}): Promise<TelegramResult> {
  if (!isTelegramConfigured()) {
    log(`[dry-run telegram] "${opts.text.slice(0, 60)}…" (telegram not configured)`, "notify");
    return { sent: false, channel: "telegram", reason: "not-configured" };
  }
  const ids = opts.chatIds ?? adminChatIds();
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  let failure: string | undefined;
  for (const chat_id of ids) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ chat_id, text: opts.text.slice(0, 4000), disable_web_page_preview: true }),
        signal: AbortSignal.timeout(20_000),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
      if (!res.ok || json.ok === false) failure = json.description || `HTTP ${res.status}`;
    } catch (err) {
      failure = (err as Error).message;
    }
  }
  if (failure) {
    log(`telegram FAILED: ${failure}`, "notify");
    return { sent: false, channel: "telegram", reason: failure };
  }
  log(`telegram sent to ${ids.length} chat(s)`, "notify");
  return { sent: true, channel: "telegram" };
}

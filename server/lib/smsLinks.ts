// server/lib/smsLinks.ts
// =============================================================================
// The A2P 10DLC kill switch for links in outbound SMS.
//
// US carriers filter link-bearing SMS hard when the sending number has no
// registered A2P 10DLC campaign — the message is silently dropped, so the guest
// never learns they owe anything. The `sms_include_links` setting (default ON)
// lets an operator strip links from SMS while EMAIL keeps them, turning a
// silently-dropped message into a delivered one.
//
// Extracted from dunning.ts so every new SMS — checkout reminders, ghost nudges,
// extension offers — goes through the same switch. An SMS built with a raw URL
// bypasses the switch and can vanish without trace, which is why the stay
// message templates are ratchet-tested for it.
// =============================================================================

import { storage } from "../storage";

export const SETTING_SMS_LINKS = "sms_include_links";

/**
 * Whether SMS bodies may carry links right now. Default ON — only the explicit
 * strings "false" and "0" disable it, so a missing or malformed setting fails
 * open rather than silently stripping every link.
 */
export async function smsLinksEnabled(): Promise<boolean> {
  const value = (await storage.getSetting(SETTING_SMS_LINKS))?.value;
  return !(value === "false" || value === "0");
}

/**
 * `url` when SMS links are on, "" when they are off.
 *
 * Await ONCE and reuse the result — `smsLink()` hits the settings table, so
 * calling it twice inside one template literal doubles the query for no reason
 * (dunning.ts did exactly that before this extraction).
 */
export async function smsLink(url: string): Promise<string> {
  return (await smsLinksEnabled()) ? url : "";
}

/**
 * A ready-to-append SMS clause: " Pay: https://…" when links are on, "" when
 * off. Keeps the awkward conditional-space-and-label out of every call site.
 *
 * Pass a `label` without trailing punctuation ("Pay", "Extend", "Finish").
 */
export async function smsLinkClause(label: string, url: string): Promise<string> {
  const link = await smsLink(url);
  return link ? ` ${label}: ${link}` : "";
}

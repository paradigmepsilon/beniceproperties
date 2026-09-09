// server/lib/bookingMessageLinks.test.ts
// =============================================================================
// THE RATCHET for every short-stay message. Modeled on paymentLinks.test.ts, but
// deliberately a separate file so the lease-side ratchet's exhaustive kind list
// does not churn every time a stay message is added.
//
// It exists because four rules cannot be enforced by memory:
//
//   1. SMS is ASCII-only and <= 160 chars. One curly quote forces UCS-2 and the
//      segment halves to 70 — the message silently splits or truncates.
//   2. No credential ever leaves by SMS, Telegram, or a subject line.
//   3. A message that asks for money or action carries a link.
//   4. An admin message naming contact details supplies a redacted telegramText.
//
// Every value here is SYNTHETIC. The door code and wifi password below are the
// canaries: if either ever appears in an SMS body, a Telegram string, a subject,
// or a logBody, a test fails.
// =============================================================================

import { describe, it, expect } from "vitest";
import * as T from "./stayTemplates";
import type { StayTemplate } from "./stayTemplates";

// --- synthetic secrets -------------------------------------------------------
const DOOR_CODE = "1357";
const WIFI_PW = "synthetic-pw-42";
const GATE_CODE = "9042";
const SECRETS = [DOOR_CODE, WIFI_PW, GATE_CODE];

const ACCESS_TEXT =
  `Door code: ${DOOR_CODE}\nBuilding/gate entry: ${GATE_CODE}\n` +
  `Wi-Fi: BNP-Guest - password ${WIFI_PW}\nGetting here: Off Highway 5.`;
const ACCESS_REDACTED =
  `Door code: [redacted]\nBuilding/gate entry: [redacted]\n` +
  `Wi-Fi: BNP-Guest - password [redacted]\nGetting here: Off Highway 5.`;

// Realistic lengths matter: a reference is 13 chars and a gate token 24, so the
// 160-char SMS assertions below are only honest with real-shaped values.
const REFERENCE = "BNP-7QK4-2F9X";
const TOKEN = "a1B2c3D4e5F6g7H8i9J0kLmN";
const BASE = "https://www.beniceproperties.com";
const STAY_URL = `${BASE}/stay/${TOKEN}`;
const EXTEND_URL = `${BASE}/stay/${TOKEN}/extend`;
const HOUSE_RULES = `${BASE}/house-rules`;
const GUEST_EMAIL = "jane@example.com";
const GUEST_PHONE = "+15551234567";

/** Every template, built with realistic vars. The exhaustive set is the ratchet. */
const ALL: Record<string, StayTemplate> = {
  stayDocsRequired: T.stayDocsRequired({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden",
    checkIn: "2026-10-01", checkOut: "2026-10-12", reference: REFERENCE, total: "$980.00",
    outstanding: ["a photo of your driver's licence", "your signed rental agreement"],
    stayUrl: STAY_URL, smsUrl: STAY_URL,
  }),
  stayDocsComplete: T.stayDocsComplete({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden",
    checkIn: "2026-10-01", reference: REFERENCE, stayUrl: STAY_URL, smsUrl: STAY_URL,
  }),
  adminStayAwaitingApproval: T.adminStayAwaitingApproval({
    property: "Old Bill Cook", room: "Room 2 - Garden", guest: "Jane Resident",
    email: GUEST_EMAIL, phone: GUEST_PHONE, checkIn: "2026-10-01", checkOut: "2026-10-12",
    nights: 11, reference: REFERENCE, total: "$980.00", signedName: "Jane Q. Resident",
    nameMismatch: true, adminUrl: `${BASE}/admin`,
  }),
  stayFixRequested: T.stayFixRequested({
    name: "Jane", property: "Old Bill Cook", reference: REFERENCE,
    reason: "The photo of your licence is too blurry to read.",
    stayUrl: STAY_URL, smsUrl: STAY_URL,
  }),
  stayApprovedWelcome: T.stayApprovedWelcome({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden",
    checkIn: "2026-10-01", checkOut: "2026-10-12", reference: REFERENCE,
    accessText: ACCESS_TEXT, accessTextRedacted: ACCESS_REDACTED,
    houseRulesUrl: HOUSE_RULES, stayUrl: STAY_URL, smsUrl: STAY_URL,
  }),
  strPreArrival: T.strPreArrival({
    name: "Jane", property: "The Retreat", checkIn: "2026-10-01", reference: REFERENCE,
    accessText: ACCESS_TEXT, accessTextRedacted: ACCESS_REDACTED,
    houseRulesUrl: HOUSE_RULES, stayUrl: STAY_URL,
  }),
  stayGhostNudge1: T.stayGhostNudge({
    name: "Jane", property: "Old Bill Cook", reference: REFERENCE,
    outstanding: ["a photo of your driver's licence"], stayUrl: STAY_URL, smsUrl: STAY_URL,
    attempt: 1, deadlineDate: "Friday 2 October",
  }),
  stayGhostNudge2: T.stayGhostNudge({
    name: "Jane", property: "Old Bill Cook", reference: REFERENCE,
    outstanding: ["a photo of your driver's licence", "your signed rental agreement"],
    stayUrl: STAY_URL, smsUrl: STAY_URL, attempt: 2, deadlineDate: "Friday 2 October",
  }),
  stayDeclinedRefunded: T.stayDeclinedRefunded({
    name: "Jane", property: "Old Bill Cook", reference: REFERENCE,
    reason: "The name on the licence did not match the booking.",
    refundAmount: "$980.00", auto: false, rebookUrl: `${BASE}/property/p1`,
  }),
  adminStayAutoDeclined: T.adminStayAutoDeclined({
    property: "Old Bill Cook", room: "Room 2 - Garden", guest: "Jane Resident",
    checkIn: "2026-10-01", checkOut: "2026-10-12", reference: REFERENCE, refundAmount: "$980.00",
  }),
  stayCheckout48h: T.stayCheckout48h({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden", checkOut: "2026-10-12",
    checkOutBy: "11:00 AM", reference: REFERENCE, extendAvailable: true, maxExtraNights: 7,
    extendUrl: EXTEND_URL, smsExtendUrl: EXTEND_URL, stayUrl: STAY_URL,
  }),
  stayCheckout24h: T.stayCheckout24h({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden", checkOut: "2026-10-12",
    checkOutBy: "11:00 AM", reference: REFERENCE, extendAvailable: true,
    extendUrl: EXTEND_URL, smsExtendUrl: EXTEND_URL, houseRulesUrl: HOUSE_RULES,
  }),
  stayExtended: T.stayExtended({
    name: "Jane", property: "Old Bill Cook", room: "Room 2 - Garden",
    previousCheckOut: "2026-10-12", newCheckOut: "2026-10-19", addedNights: 7,
    reference: REFERENCE, amount: "$400.00", stayUrl: STAY_URL,
  }),
  adminStayExtended: T.adminStayExtended({
    property: "Old Bill Cook", room: "Room 2 - Garden", guest: "Jane Resident",
    previousCheckOut: "2026-10-12", newCheckOut: "2026-10-19", reference: REFERENCE,
    amount: "$400.00",
  }),
  adminStayExtensionConflict: T.adminStayExtensionConflict({
    property: "Old Bill Cook", room: "Room 2 - Garden", guest: "Jane Resident",
    reference: REFERENCE, requestedCheckOut: "2026-10-19", amount: "$400.00",
    reason: "another booking now covers those nights",
  }),
};

const entries = Object.entries(ALL);
const guestEntries = entries.filter(([k]) => !k.startsWith("admin"));
const adminEntries = entries.filter(([k]) => k.startsWith("admin"));

// Every exported template function must appear above. This is what makes the
// suite a RATCHET: add a message without a fixture and this fails.
describe("the fixture set is exhaustive", () => {
  it("covers every exported template function", () => {
    const exported = Object.entries(T)
      .filter(([, v]) => typeof v === "function")
      .map(([k]) => k);
    const covered = new Set(entries.map(([k]) => k.replace(/[0-9]+$/, "")));
    expect(exported.filter((fn) => !covered.has(fn))).toEqual([]);
  });
});

describe("Rule 1 — SMS is ASCII and fits one segment", () => {
  it.each(guestEntries)("%s has an SMS body", (_name, tpl) => {
    expect(tpl.smsBody, "guest messages must be reachable by SMS").toBeTruthy();
  });

  it.each(entries.filter(([, t]) => t.smsBody))("%s SMS is pure ASCII", (_name, tpl) => {
    // Anything outside printable ASCII forces UCS-2 encoding.
    expect(tpl.smsBody!).toMatch(/^[\x20-\x7E]*$/);
  });

  it.each(entries.filter(([, t]) => t.smsBody))("%s SMS fits 160 chars", (name, tpl) => {
    expect(tpl.smsBody!.length, `${name}: ${tpl.smsBody!.length} chars`).toBeLessThanOrEqual(160);
  });
});

describe("Rule 2 — credentials never leave except in an email body", () => {
  it.each(entries)("%s keeps secrets out of the subject", (_name, tpl) => {
    for (const s of SECRETS) expect(tpl.subject).not.toContain(s);
  });

  it.each(entries.filter(([, t]) => t.smsBody))("%s keeps secrets out of SMS", (_name, tpl) => {
    for (const s of SECRETS) expect(tpl.smsBody!).not.toContain(s);
  });

  it.each(entries.filter(([, t]) => t.telegramText))(
    "%s keeps secrets out of Telegram",
    (_name, tpl) => {
      for (const s of SECRETS) expect(tpl.telegramText!).not.toContain(s);
    },
  );

  it.each(entries.filter(([, t]) => t.logBody))("%s keeps secrets out of logBody", (_name, tpl) => {
    for (const s of SECRETS) expect(tpl.logBody!).not.toContain(s);
  });

  // The two messages that DO carry credentials must actually deliver them by
  // email, and must supply a redacted audit copy. Both halves matter.
  it.each([["stayApprovedWelcome"], ["strPreArrival"]])(
    "%s delivers the real credentials by email AND supplies a redacted logBody",
    (name) => {
      const tpl = ALL[name];
      expect(tpl.body).toContain(DOOR_CODE);
      expect(tpl.body).toContain(WIFI_PW);
      expect(tpl.logBody, "a credential-bearing message must have a logBody").toBeTruthy();
      expect(tpl.logBody).toContain("[redacted]");
      expect(tpl.smsBody).toMatch(/in your email/i);
    },
  );

  it("no other template carries a credential in its body", () => {
    for (const [name, tpl] of entries) {
      if (name === "stayApprovedWelcome" || name === "strPreArrival") continue;
      for (const s of SECRETS) expect(tpl.body, name).not.toContain(s);
    }
  });
});

describe("Rule 3 — action messages carry a link", () => {
  // Each guest message is classified explicitly rather than by exclusion, so
  // adding one forces a decision about whether it asks the guest to DO anything.
  //
  //   ACTION — the guest must act, so the SMS must be clickable.
  //   INFORMATIONAL — nothing to do. A link in the SMS would be noise, and for
  //   the two credential-bearing messages Rule 2 actively forbids one: they say
  //   "it is in your email" precisely so a code never rides an SMS.
  const ACTION_MESSAGES = [
    "stayDocsRequired",
    "stayFixRequested",
    "stayGhostNudge1",
    "stayGhostNudge2",
    "stayCheckout48h",
    "stayCheckout24h",
  ];
  const INFORMATIONAL_MESSAGES = [
    "stayDocsComplete", // "we are reviewing" — nothing to do
    "stayApprovedWelcome", // credentials are in the email
    "strPreArrival", // credentials are in the email
    "stayExtended", // a receipt
    "stayDeclinedRefunded", // terminal
  ];

  it("classifies every guest message as action or informational", () => {
    const classified = [...ACTION_MESSAGES, ...INFORMATIONAL_MESSAGES].sort();
    expect(guestEntries.map(([k]) => k).sort()).toEqual(classified);
  });

  it.each(ACTION_MESSAGES)("%s SMS carries a link", (name) => {
    expect(ALL[name].smsBody!).toContain(BASE);
  });

  it.each(ACTION_MESSAGES)("%s email body links somewhere actionable", (name) => {
    expect(ALL[name].body).toContain(BASE);
  });

  // Informational messages still give the guest somewhere to go from the email —
  // just not a call to action in a text message.
  it.each(INFORMATIONAL_MESSAGES.filter((n) => n !== "stayDeclinedRefunded"))(
    "%s email still links to the stay page",
    (name) => {
      expect(ALL[name].body).toContain(BASE);
    },
  );

  it("stayDeclinedRefunded asks for nothing but still offers a way back", () => {
    const tpl = ALL.stayDeclinedRefunded;
    expect(tpl.body).toContain(`${BASE}/property/p1`);
    expect(tpl.smsBody).not.toContain(BASE); // nothing to click; it is over
  });
});

describe("Rule 4 — admin messages redact contact details for Telegram", () => {
  it.each(adminEntries)("%s supplies telegramText", (_name, tpl) => {
    expect(tpl.telegramText).toBeTruthy();
  });

  it.each(adminEntries)("%s Telegram carries no guest email or phone", (_name, tpl) => {
    expect(tpl.telegramText!).not.toContain(GUEST_EMAIL);
    expect(tpl.telegramText!).not.toContain(GUEST_PHONE);
  });

  // The approval alert is the one that legitimately needs contact details in the
  // email — so it is the case that proves the split is real, not incidental.
  it("adminStayAwaitingApproval puts contact details in the email but not Telegram", () => {
    const tpl = ALL.adminStayAwaitingApproval;
    expect(tpl.body).toContain(GUEST_EMAIL);
    expect(tpl.body).toContain(GUEST_PHONE);
    expect(tpl.telegramText).not.toContain(GUEST_EMAIL);
    expect(tpl.telegramText).not.toContain(GUEST_PHONE);
    expect(tpl.telegramText).toContain("Jane Resident");
    expect(tpl.telegramText).toContain(REFERENCE);
    expect(tpl.telegramText).toContain("$980.00");
  });

  it("surfaces a name mismatch in both channels — it is the point of the review", () => {
    const tpl = ALL.adminStayAwaitingApproval;
    expect(tpl.subject).toContain("NAME MISMATCH");
    expect(tpl.telegramText).toContain("NAME MISMATCH");
  });
});

describe("deadline copy reflects the DAILY cron, not an exact hour", () => {
  // Production sweeps run once at 08:00 UTC, so the 72h deadline actually lands
  // between 72 and 96 hours. Promising "72 hours" would be a promise we break.
  //
  // The 24-hour APPROVAL promise is deliberately exempt: that is a human SLA the
  // owner chose to make and we control it. What must never appear is the SWEEP
  // deadline expressed in hours, because the cron cadence makes it unkeepable.
  it.each(entries)("%s never states the sweep deadline in hours", (_name, tpl) => {
    const all = [tpl.subject, tpl.body, tpl.smsBody ?? "", tpl.telegramText ?? ""].join(" ");
    expect(all).not.toMatch(/\b(48|72|96) hours\b/i);
  });

  it("24 hours is the ONLY hour figure any message may state", () => {
    for (const [name, tpl] of entries) {
      const all = [tpl.subject, tpl.body, tpl.smsBody ?? "", tpl.telegramText ?? ""].join(" ");
      for (const m of all.matchAll(/\b(\d+)\s*hours?\b/gi)) {
        expect(Number(m[1]), `${name} states "${m[0]}"`).toBe(24);
      }
    }
  });

  it("the nudges name a date and the fix request says 3 days", () => {
    expect(ALL.stayGhostNudge1.body).toContain("Friday 2 October");
    expect(ALL.stayGhostNudge2.subject).toContain("Friday 2 October");
    expect(ALL.stayFixRequested.body).toContain("3 days");
  });

  it("the 24-hour approval promise is still allowed — that one we control", () => {
    expect(ALL.stayDocsRequired.body).toMatch(/24 hours/);
  });
});

describe("both checkout reminders carry the extension offer", () => {
  // On a daily cron a skipped run can mean only the 24h message lands. If the
  // money-bearing offer lived only in the 48h one, that guest would never be
  // offered an extension at all.
  it("48h and 24h both link to extend when nights are available", () => {
    expect(ALL.stayCheckout48h.body).toContain(EXTEND_URL);
    expect(ALL.stayCheckout48h.smsBody).toContain(EXTEND_URL);
    expect(ALL.stayCheckout24h.body).toContain(EXTEND_URL);
    expect(ALL.stayCheckout24h.smsBody).toContain(EXTEND_URL);
  });

  it("neither dangles a broken offer when the room is not free", () => {
    const t48 = T.stayCheckout48h({
      name: "Jane", property: "Old Bill Cook", room: null, checkOut: "2026-10-12",
      checkOutBy: "11:00 AM", reference: REFERENCE, extendAvailable: false, maxExtraNights: 0,
      extendUrl: EXTEND_URL, smsExtendUrl: EXTEND_URL, stayUrl: STAY_URL,
    });
    expect(t48.body).not.toContain(EXTEND_URL);
    expect(t48.smsBody).not.toContain(EXTEND_URL);
    // And does not leave the guest at a dead end.
    expect(t48.body).toMatch(/reply/i);
  });
});

describe("copy quality", () => {
  it("every template has a non-empty subject and body", () => {
    for (const [name, tpl] of entries) {
      expect(tpl.subject.trim().length, name).toBeGreaterThan(0);
      expect(tpl.body.trim().length, name).toBeGreaterThan(0);
    }
  });

  it("no template leaks an unsubstituted token or a stray undefined", () => {
    for (const [name, tpl] of entries) {
      const all = [tpl.subject, tpl.body, tpl.smsBody ?? "", tpl.telegramText ?? "", tpl.logBody ?? ""].join(" ");
      expect(all, name).not.toMatch(/\{\{|\bundefined\b|\bNaN\b|\bnull\b/);
    }
  });

  it("omits the room clause cleanly for a whole-property stay", () => {
    const tpl = T.stayDocsRequired({
      name: "Jane", property: "The Retreat", room: null,
      checkIn: "2026-10-01", checkOut: "2026-10-12", reference: REFERENCE, total: "$980.00",
      outstanding: ["your signed rental agreement"], stayUrl: STAY_URL, smsUrl: STAY_URL,
    });
    expect(tpl.body).not.toContain("()");
    expect(tpl.body).toContain("The Retreat from");
  });

  it("pluralises the outstanding-items count", () => {
    expect(ALL.stayDocsRequired.subject).toContain("2 things left");
    expect(ALL.stayGhostNudge1.subject).toContain("1 thing left");
  });

  it("reads the outstanding list as a sentence, not an array", () => {
    expect(ALL.stayDocsRequired.body).toContain(
      "a photo of your driver's licence and your signed rental agreement",
    );
  });
});

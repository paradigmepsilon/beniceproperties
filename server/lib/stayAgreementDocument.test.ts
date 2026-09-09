// server/lib/stayAgreementDocument.test.ts
// The signed output of this module is the record of what a guest agreed to, so
// the tests are about EVIDENCE and SAFETY, not prose: no unsubstituted token
// reaches a guest, a hostile name cannot inject markup, the artifact is
// self-contained, the executed copy carries name + timestamp + IP, and the body
// is the OWNER'S document (BNP-RBA-2026.3), not something invented here.

import { describe, it, expect } from "vitest";
import {
  renderStayAgreementHtml,
  renderSignedStayAgreementHtml,
  stayAgreementTokens,
  stayAgreementTemplateStrings,
  DEFAULT_STAY_AGREEMENT_TEMPLATE,
  type StayAgreementData,
} from "./stayAgreementDocument";
import { ESIGN_ATTESTATION } from "./documentHtml";

const data = (over: Partial<StayAgreementData> = {}): StayAgreementData => ({
  guestName: "Jane Q. Resident",
  propertyName: "Old Bill Cook",
  propertyLocation: "123 Example Rd, Douglasville, GA 30134",
  roomLabel: "Room 2 — Garden",
  checkIn: "2026-10-01",
  checkOut: "2026-10-12",
  totalPaid: 980,
  houseRulesUrl: "https://www.beniceproperties.com/house-rules",
  checkInFrom: "4:00 PM",
  checkOutBy: "11:00 AM",
  reference: "BNP-TEST01",
  ...over,
});

const signature = {
  signedName: "Jane Q. Resident",
  signedAt: new Date("2026-09-28T15:04:05.000Z"),
  signedIp: "203.0.113.42",
};

describe("token substitution", () => {
  it("computes nights from the dates rather than trusting a passed value", () => {
    expect(stayAgreementTokens(data()).nights).toBe("11");
    expect(stayAgreementTokens(data({ checkOut: "2026-10-08" })).nights).toBe("7");
  });

  it("formats the total as money, not a bare number", () => {
    expect(stayAgreementTokens(data()).totalPaid).toBe("$980.00");
  });

  // An unsubstituted {{token}} on a signed legal document is the worst possible
  // output — it is both unprofessional and ambiguous about what was agreed.
  it("leaves NO unsubstituted token in either rendering", () => {
    expect(renderStayAgreementHtml(data())).not.toMatch(/\{\{/);
    expect(renderSignedStayAgreementHtml(data(), signature)).not.toMatch(/\{\{/);
  });

  it("covers every token the template actually references — details, bullets, footer included", () => {
    const referenced = new Set<string>();
    for (const text of stayAgreementTemplateStrings(DEFAULT_STAY_AGREEMENT_TEMPLATE)) {
      for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) referenced.add(m[1]);
    }
    const provided = Object.keys(stayAgreementTokens(data()));
    expect([...referenced].filter((t) => !provided.includes(t))).toEqual([]);
    // And the strings helper really does see every part of the template.
    expect(referenced.has("reference")).toBe(true);
    expect(referenced.has("version")).toBe(true);
    expect(referenced.has("houseRulesUrl")).toBe(true);
  });

  it("degrades to plain language when a property has no arrival times set", () => {
    const tokens = stayAgreementTokens(data({ checkInFrom: "", checkOutBy: "" }));
    expect(tokens.checkInFrom).toBe("check-in time as advised");
    expect(tokens.checkOutBy).toBe("the stated checkout time");
    // And never renders an empty parenthetical to the guest.
    expect(renderStayAgreementHtml(data({ checkInFrom: "", checkOutBy: "" }))).not.toContain("()");
  });
});

describe("escaping", () => {
  it("neutralises markup in a guest-supplied name", () => {
    const html = renderStayAgreementHtml(data({ guestName: '<script>alert(1)</script>' }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("neutralises markup in a bullet or detail value too", () => {
    const html = renderStayAgreementHtml(data({ roomLabel: "Room <img src=x onerror=alert(1)>" }));
    expect(html).not.toMatch(/<img\b/i);
    expect(html).toContain("&lt;img");
  });

  it("escapes the signed name in the executed block too", () => {
    const html = renderSignedStayAgreementHtml(data(), {
      ...signature,
      signedName: 'Jane "JQ" <b>Resident</b>',
    });
    expect(html).not.toContain("<b>Resident</b>");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("the executed acknowledgment carries the evidence", () => {
  it("records who signed, exactly when, and from where", () => {
    const html = renderSignedStayAgreementHtml(data(), signature);
    expect(html).toContain("Jane Q. Resident");
    expect(html).toContain("2026-09-28T15:04:05.000Z"); // ISO 8601, UTC, verbatim
    expect(html).toContain("203.0.113.42");
  });

  it("prints the document version and the reservation reference on every copy", () => {
    for (const html of [renderStayAgreementHtml(data()), renderSignedStayAgreementHtml(data(), signature)]) {
      expect(html).toContain("BNP-RBA-2026.3");
      expect(html).toContain("Reservation # BNP-TEST01");
      expect(html).toContain("Version BNP-RBA-2026.3");
    }
  });

  it("reuses the reviewed E-SIGN/UETA attestation verbatim", () => {
    expect(renderSignedStayAgreementHtml(data(), signature)).toContain(
      "legally binding electronic signature under the U.S. E-SIGN Act and UETA",
    );
    expect(DEFAULT_STAY_AGREEMENT_TEMPLATE.signatureStatement).toBe(ESIGN_ATTESTATION);
  });

  it("carries the owner's acknowledgment statement above the signature", () => {
    const html = renderSignedStayAgreementHtml(data(), signature);
    const ack = html.indexOf("I have read and agree to the Be Nice Properties Room Booking");
    const sig = html.indexOf("legally binding electronic signature");
    expect(ack).toBeGreaterThan(-1);
    expect(sig).toBeGreaterThan(ack);
  });

  it("marks the unsigned copy as unsigned, and the signed copy not at all", () => {
    expect(renderStayAgreementHtml(data())).toContain("Awaiting signature");
    expect(renderSignedStayAgreementHtml(data(), signature)).not.toContain("Awaiting signature");
  });
});

describe("the artifact is self-contained", () => {
  // It is stored inline in Postgres and printed to PDF by the guest's browser
  // years later. An external stylesheet or script would break that, and would
  // also defeat the `<iframe sandbox="">` the signing page displays it in.
  it("references no external stylesheet, script, or image", () => {
    const html = renderSignedStayAgreementHtml(data(), signature);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/<script\b/i);
    expect(html).not.toMatch(/<img\b/i);
    expect(html).not.toMatch(/https?:\/\/(?!www\.beniceproperties\.com)/);
  });

  it("is a complete document, not a fragment", () => {
    const html = renderSignedStayAgreementHtml(data(), signature);
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<title>Room Booking &amp; Resident Acknowledgment</title>");
  });
});

describe("the body is the owner's BNP-RBA-2026.3, not invented terms", () => {
  const html = () => renderStayAgreementHtml(data());

  it("renders every section heading of the owner's document, in its order", () => {
    const headings = [
      "Payment &amp; Reservation",
      "Room &amp; Common Areas",
      "House &amp; Community Rules",
      "Move-Out",
      "Violations, Nonpayment &amp; Communications",
    ];
    let last = -1;
    for (const h of headings) {
      const at = html().indexOf(h);
      expect(at, h).toBeGreaterThan(last);
      last = at;
    }
  });

  it("keeps the owner's load-bearing sentences verbatim", () => {
    const h = html();
    expect(h).toContain("No security deposit or reservation hold is required for weekly stays.");
    expect(h).toContain("Any cancellation/refund follows the terms shown at booking.");
    expect(h).toContain(
      "Nothing in this acknowledgment permits BNP to bypass any notice, possession, " +
        "dispossessory, or other process required by Georgia law.",
    );
    expect(h).toContain("Your property access code will automatically become inactive");
  });

  // A paid-in-full stay has no cadence, no installments, and no saved card.
  // The owner's text never promises any of them, and this pins that.
  it.each(["cadence", "installment", "card on file", "biweekly", "monthly rent"])(
    "never mentions %s at all",
    (term) => {
      expect(html().toLowerCase()).not.toContain(term);
    },
  );

  it("shows the amount as paid in full at booking", () => {
    expect(html()).toContain("$980.00 — paid in full at booking");
  });

  it("makes approval a condition of confirmation, and access personal to the guest", () => {
    const h = html();
    expect(h).toContain("confirmed only after");
    expect(h).toContain("may not share, copy, or");
  });

  it("links the house rules it incorporates", () => {
    expect(html()).toContain("https://www.beniceproperties.com/house-rules");
  });
});

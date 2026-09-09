// server/lib/stayAgreementDocument.test.ts
// The signed output of this module is the record of what a guest agreed to, so
// the tests are about EVIDENCE and SAFETY, not prose: no unsubstituted token
// reaches a guest, a hostile name cannot inject markup, the artifact is
// self-contained, and the executed copy carries name + timestamp + IP.

import { describe, it, expect } from "vitest";
import {
  renderStayAgreementHtml,
  renderSignedStayAgreementHtml,
  stayAgreementTokens,
  DEFAULT_STAY_AGREEMENT_TEMPLATE,
  type StayAgreementData,
} from "./stayAgreementDocument";
import { ESIGN_ATTESTATION } from "./documentHtml";

const data = (over: Partial<StayAgreementData> = {}): StayAgreementData => ({
  guestName: "Jane Q. Resident",
  propertyName: "Old Bill Cook",
  propertyLocation: "Douglasville, GA",
  roomLabel: "Room 2 — Garden",
  checkIn: "2026-10-01",
  checkOut: "2026-10-12",
  totalPaid: 980,
  houseRulesUrl: "https://www.beniceproperties.com/house-rules",
  checkInFrom: "4:00 PM",
  checkOutBy: "11:00 AM",
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

  it("covers every token the template actually references", () => {
    const template = DEFAULT_STAY_AGREEMENT_TEMPLATE;
    const referenced = new Set<string>();
    for (const text of [template.intro, ...template.sections.map((s) => s.body)]) {
      for (const m of text.matchAll(/\{\{(\w+)\}\}/g)) referenced.add(m[1]);
    }
    const provided = Object.keys(stayAgreementTokens(data()));
    expect([...referenced].filter((t) => !provided.includes(t))).toEqual([]);
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

  it("escapes the signed name in the executed block too", () => {
    const html = renderSignedStayAgreementHtml(data(), {
      ...signature,
      signedName: 'Jane "JQ" <b>Resident</b>',
    });
    expect(html).not.toContain("<b>Resident</b>");
    expect(html).toContain("&lt;b&gt;");
  });
});

describe("the executed agreement carries the evidence", () => {
  it("records who signed, exactly when, and from where", () => {
    const html = renderSignedStayAgreementHtml(data(), signature);
    expect(html).toContain("Jane Q. Resident");
    expect(html).toContain("2026-09-28T15:04:05.000Z"); // ISO 8601, UTC, verbatim
    expect(html).toContain("203.0.113.42");
  });

  it("reuses the reviewed E-SIGN/UETA attestation verbatim", () => {
    expect(renderSignedStayAgreementHtml(data(), signature)).toContain(
      "legally binding electronic signature under the U.S. E-SIGN Act and UETA",
    );
    expect(DEFAULT_STAY_AGREEMENT_TEMPLATE.signatureStatement).toBe(ESIGN_ATTESTATION);
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
    expect(html).toContain("<title>Short-Stay Rental Agreement</title>");
  });
});

describe("it does not promise terms a short stay does not have", () => {
  // The whole reason this template exists instead of reusing the lease one: a
  // paid-in-full stay has no cadence, no installments, no deposit, no late fee,
  // and no saved card. Promising any of those would be a false statement.
  //
  // The document may still NAME them — it explicitly says there are none, which
  // is better than silence — so the assertion is that they are negated, never
  // that the words are absent.
  it("explicitly negates the recurring-payment terms rather than staying silent", () => {
    const html = renderStayAgreementHtml(data()).toLowerCase();
    expect(html).toContain("no recurring payment");
    expect(html).toContain("no installment schedule");
    expect(html).toContain("no security deposit");
    expect(html).toContain("charged in full at the time of booking");
  });

  it.each(["cadence", "late fee", "card on file", "biweekly", "monthly rent"])(
    "never mentions %s at all",
    (term) => {
      expect(renderStayAgreementHtml(data()).toLowerCase()).not.toContain(term);
    },
  );

  it("states plainly that it is not a tenancy or lease", () => {
    expect(renderStayAgreementHtml(data())).toContain("does not create a tenancy or a lease");
  });

  it("makes approval a condition of confirmation, and access personal to the guest", () => {
    const html = renderStayAgreementHtml(data());
    expect(html).toContain("confirmed only after");
    expect(html).toContain("may not share, copy, or");
  });

  it("links the house rules it incorporates", () => {
    expect(renderStayAgreementHtml(data())).toContain(
      "https://www.beniceproperties.com/house-rules",
    );
  });
});

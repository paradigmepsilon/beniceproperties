// client/src/lib/stayFlow.test.ts
// The pure client-side logic behind the stay pages. vitest runs node-only here
// (no jsdom, no testing-library), which is exactly why this logic lives in lib/
// rather than inside a component — it is the part worth testing.

import { describe, it, expect } from "vitest";
import { cleanError } from "./portalFetch";
import { canSign, MIN_SIGNED_NAME_LENGTH } from "./esign";
import { nameMismatch } from "./nameMatch";

describe("cleanError", () => {
  it("unwraps the server's guest-facing message", () => {
    expect(cleanError(new Error('409: {"message":"Those dates have just been taken."}'))).toBe(
      "Those dates have just been taken.",
    );
  });

  it("handles a multi-line JSON body", () => {
    expect(cleanError(new Error('400: {\n  "message": "Enter your full legal name."\n}'))).toBe(
      "Enter your full legal name.",
    );
  });

  it("passes a plain error through unchanged", () => {
    expect(cleanError(new Error("Network request failed"))).toBe("Network request failed");
  });

  // A guest must never see an empty error box, so anything unrecognised falls
  // back to the raw text rather than to undefined.
  it("survives malformed JSON and a non-Error throw", () => {
    expect(cleanError(new Error("500: {not json"))).toBe("500: {not json");
    expect(cleanError("just a string")).toBe("just a string");
    expect(cleanError(new Error('502: {"code":"x"}'))).toBe('502: {"code":"x"}');
  });
});

describe("canSign — the gate on a legally binding act", () => {
  const ok = { documentHtml: "<html>agreement</html>", signedName: "Jane Doe", affirmed: true, busy: false };

  it("allows signing only when everything is satisfied", () => {
    expect(canSign(ok)).toBe(true);
  });

  // Nothing may be signed before the guest has actually been shown the document.
  it("refuses before the agreement has loaded", () => {
    expect(canSign({ ...ok, documentHtml: null })).toBe(false);
    expect(canSign({ ...ok, documentHtml: "" })).toBe(false);
    expect(canSign({ ...ok, documentHtml: undefined })).toBe(false);
  });

  it("refuses without the affirmation tick", () => {
    expect(canSign({ ...ok, affirmed: false })).toBe(false);
  });

  it("refuses a name that is blank or too short, ignoring whitespace", () => {
    expect(canSign({ ...ok, signedName: "" })).toBe(false);
    expect(canSign({ ...ok, signedName: "   " })).toBe(false);
    expect(canSign({ ...ok, signedName: "J" })).toBe(false);
    expect(canSign({ ...ok, signedName: "  Jo  " })).toBe(true); // 2 chars after trim
    expect(MIN_SIGNED_NAME_LENGTH).toBe(2);
  });

  // Prevents a double-tap producing two differently-timestamped agreements. The
  // server is idempotent too, but the button should not invite it.
  it("refuses while a submission is already in flight", () => {
    expect(canSign({ ...ok, busy: true })).toBe(false);
  });
});

describe("nameMismatch", () => {
  it("ignores casing and surrounding whitespace", () => {
    expect(nameMismatch("Jane Doe", "  jane doe ")).toBe(false);
    expect(nameMismatch("JANE DOE", "Jane Doe")).toBe(false);
  });

  it("flags a genuinely different name", () => {
    expect(nameMismatch("Someone Else", "Jane Doe")).toBe(true);
  });

  // Do not cry mismatch over what we do not know — an unsigned agreement is
  // already surfaced as its own state.
  it("is not a mismatch when either side is blank", () => {
    expect(nameMismatch(null, "Jane Doe")).toBe(false);
    expect(nameMismatch("Jane Doe", undefined)).toBe(false);
    expect(nameMismatch("", "")).toBe(false);
    expect(nameMismatch("   ", "Jane Doe")).toBe(false);
  });

  // Documenting current behaviour rather than asserting it is ideal: a middle
  // name DOES flag today. Loosening it would change the live lease queue, so it
  // is a deliberate follow-up.
  it("currently flags a middle name (known limitation, matches the lease queue)", () => {
    expect(nameMismatch("Jane Q. Doe", "Jane Doe")).toBe(true);
  });
});

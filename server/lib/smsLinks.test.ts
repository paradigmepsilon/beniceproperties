// server/lib/smsLinks.test.ts
// The A2P 10DLC kill switch. Getting the DEFAULT wrong here is the dangerous
// case: fail-closed would silently strip links from every payment SMS and the
// only symptom would be guests not paying.

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStorage = vi.hoisted(() => ({ getSetting: vi.fn() }));
vi.mock("../storage", () => ({ storage: mockStorage }));

import { smsLinksEnabled, smsLink, smsLinkClause, SETTING_SMS_LINKS } from "./smsLinks";

const URL = "https://www.beniceproperties.com/stay/abc123";

beforeEach(() => {
  vi.clearAllMocks();
  mockStorage.getSetting.mockResolvedValue(undefined);
});

describe("smsLinksEnabled — fails OPEN", () => {
  it("is on when the setting has never been written", async () => {
    await expect(smsLinksEnabled()).resolves.toBe(true);
    expect(mockStorage.getSetting).toHaveBeenCalledWith(SETTING_SMS_LINKS);
  });

  it("is on for an empty or unrecognised value rather than guessing off", async () => {
    for (const value of ["", "yes", "true", "1", "on", "banana"]) {
      mockStorage.getSetting.mockResolvedValue({ key: SETTING_SMS_LINKS, value });
      await expect(smsLinksEnabled(), value).resolves.toBe(true);
    }
  });

  it("is off only for the two explicit disable values", async () => {
    for (const value of ["false", "0"]) {
      mockStorage.getSetting.mockResolvedValue({ key: SETTING_SMS_LINKS, value });
      await expect(smsLinksEnabled(), value).resolves.toBe(false);
    }
  });
});

describe("smsLink", () => {
  it("returns the URL when links are on", async () => {
    await expect(smsLink(URL)).resolves.toBe(URL);
  });

  it("returns an empty string when links are off — never a placeholder", async () => {
    mockStorage.getSetting.mockResolvedValue({ key: SETTING_SMS_LINKS, value: "false" });
    await expect(smsLink(URL)).resolves.toBe("");
  });
});

describe("smsLinkClause", () => {
  it("builds a leading-space clause when links are on", async () => {
    await expect(smsLinkClause("Extend", URL)).resolves.toBe(` Extend: ${URL}`);
  });

  it("collapses to nothing when links are off, leaving no dangling label", async () => {
    mockStorage.getSetting.mockResolvedValue({ key: SETTING_SMS_LINKS, value: "0" });
    const clause = await smsLinkClause("Extend", URL);
    expect(clause).toBe("");
    expect(clause).not.toContain("Extend");
    expect(clause).not.toContain(":");
  });

  // A message built as `${body}${clause}` must not end in a stray space when the
  // clause is empty, and must not run words together when it is not.
  it("composes cleanly in both states", async () => {
    const body = "BNP: checkout is tomorrow.";
    await expect(smsLinkClause("Extend", URL).then((c) => body + c)).resolves.toBe(
      `${body} Extend: ${URL}`,
    );
    mockStorage.getSetting.mockResolvedValue({ key: SETTING_SMS_LINKS, value: "false" });
    await expect(smsLinkClause("Extend", URL).then((c) => body + c)).resolves.toBe(body);
  });
});

import { describe, it, expect } from "vitest";
import { cityOf, dateTime, fromNightly, fullDate, shortDate, roomLabel } from "./format";

describe("cityOf", () => {
  it("extracts the city from a full street address", () => {
    expect(cityOf("5870 Old Bill Cook Rd. Atlanta, GA 30349")).toBe("Atlanta");
  });

  it("passes through a bare city", () => {
    expect(cityOf("Atlanta")).toBe("Atlanta");
  });

  it("falls back to the trimmed input for a name-only location", () => {
    expect(cityOf("ANTIGUAN VILLAGE RETREAT")).toBe("ANTIGUAN VILLAGE RETREAT");
  });

  it("handles a multi-word city before the comma", () => {
    expect(cityOf("123 Main St. San Diego, CA 92101")).toBe("San Diego");
  });

  it("handles a city with a comma but no street part", () => {
    expect(cityOf("Atlanta, GA")).toBe("Atlanta");
  });

  it("preserves an abbreviation inside the city name (not a street prefix)", () => {
    expect(cityOf("St. John's, Antigua")).toBe("St. John's");
  });

  it("preserves a saint-city with no country suffix", () => {
    expect(cityOf("St. Louis")).toBe("St. Louis");
  });

  it("is safe on empty input", () => {
    expect(cityOf("")).toBe("");
  });
});

describe("shortDate", () => {
  it("formats an ISO date as 'MMM d'", () => {
    expect(shortDate("2026-08-14")).toBe("Aug 14");
  });
});

describe("fullDate", () => {
  it("formats an ISO date as 'MMM d, yyyy'", () => {
    expect(fullDate("2026-08-14")).toBe("Aug 14, 2026");
  });

  it("is stable across a year boundary", () => {
    expect(fullDate("2026-12-31")).toBe("Dec 31, 2026");
    expect(fullDate("2027-01-01")).toBe("Jan 1, 2027");
  });
});

describe("dateTime", () => {
  it("formats an ISO timestamp with a local time-of-day", () => {
    expect(dateTime("2026-08-14T09:15:00.000Z")).toMatch(/^Aug 14, 2026, \d{1,2}:\d{2} (AM|PM)$/);
  });
});

describe("fromNightly", () => {
  it("returns null when no positive rate is configured", () => {
    expect(fromNightly({})).toBeNull();
    expect(fromNightly({ dailyRate: "0" })).toBeNull();
  });

  it("uses the daily rate (or basePrice fallback) as a single tier", () => {
    expect(fromNightly({ dailyRate: "210" })).toEqual({ from: 210, multiTier: false });
    expect(fromNightly({ basePrice: "185" })).toEqual({ from: 185, multiTier: false });
  });

  it("picks the lowest effective nightly across tiers and flags multiTier", () => {
    const result = fromNightly({ dailyRate: "210", weeklyRate: "1260", monthlyRate: "4760" });
    // weekly 1260/7 = 180, monthly 4760/28 = 170 → lowest
    expect(result).toEqual({ from: 170, multiTier: true });
  });
});

describe("roomLabel", () => {
  it("leads with the number so a list scans down a fixed position", () => {
    expect(roomLabel({ name: "Furnished Room Near ATL Airport", roomNumber: "3" })).toBe(
      "Room 3 · Furnished Room Near ATL Airport",
    );
  });

  it("disambiguates the same room name in two properties", () => {
    // Beauclerc and Dilworth both have a "Primary Suite with Private Bath";
    // without the number the two reservations read identically.
    const a = roomLabel({ name: "Primary Suite with Private Bath", roomNumber: "1" });
    const b = roomLabel({ name: "Primary Suite with Private Bath", roomNumber: "5" });
    expect(a).not.toBe(b);
  });

  it("falls back to the bare name when there is no number", () => {
    expect(roomLabel({ name: "Garden Room", roomNumber: null })).toBe("Garden Room");
    expect(roomLabel({ name: "Garden Room" })).toBe("Garden Room");
    expect(roomLabel({ name: "Garden Room", roomNumber: "  " })).toBe("Garden Room");
  });

  it("returns an empty string for a whole-property (STR) booking with no room", () => {
    expect(roomLabel(null)).toBe("");
    expect(roomLabel(undefined)).toBe("");
  });

  it("keeps a non-numeric room number, since the column is free text", () => {
    expect(roomLabel({ name: "Loft", roomNumber: "2B" })).toBe("Room 2B · Loft");
  });
});

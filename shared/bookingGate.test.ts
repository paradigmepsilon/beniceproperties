// shared/bookingGate.test.ts
// Locks the short-stay APPROVAL GATE (owner rule 2026-09-08):
//   a paid co-living stay of 7–28 nights lands PENDING_APPROVAL, not ACTIVE,
//   until a human has seen the guest's ID and signed agreement.
//
// Two things this file exists to prevent:
//   1. PENDING_APPROVAL leaking into NON_BLOCKING_BOOKING_STATUSES. The guest
//      PAID — those dates must stay held. If it ever joins that set, every
//      availability source silently resells an occupied room.
//   2. The post-payment status being recomputed inline anywhere. Five separate
//      sites used to do `model === "COLIVING" ? "ACTIVE" : "CONFIRMED"`, so a
//      CashApp settlement, a conflict resolution, or the legacy Checkout webhook
//      would each walk a guest straight to ACTIVE with no ID and no door code.
//      The source-grep block at the bottom is the ratchet on that.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { stayNights, isGatedStay, postPaymentStatusFor } from "./bookingGate";
import {
  NON_BLOCKING_BOOKING_STATUSES,
  BOOKING_STATUSES,
  COLIVING_MIN_DAYS,
  LEASE_REQUIRED_ABOVE_DAYS,
} from "./schema";

const COLIVING = (checkIn: string, checkOut: string | null) =>
  ({ model: "COLIVING", checkIn, checkOut }) as const;
const STR = (checkIn: string, checkOut: string | null) =>
  ({ model: "STR", checkIn, checkOut }) as const;

describe("stayNights", () => {
  it("counts nights, not calendar days touched", () => {
    expect(stayNights("2026-10-01", "2026-10-08")).toBe(7);
    expect(stayNights("2026-10-01", "2026-10-02")).toBe(1);
  });

  it("is 0 for a same-day or inverted range rather than negative", () => {
    expect(stayNights("2026-10-01", "2026-10-01")).toBe(0);
    expect(stayNights("2026-10-08", "2026-10-01")).toBe(0);
  });

  it("counts DST transitions as whole nights", () => {
    // US DST ends 2026-11-01. A 25-hour night is still one night.
    expect(stayNights("2026-10-31", "2026-11-02")).toBe(2);
    // DST begins 2026-03-08. A 23-hour night is still one night.
    expect(stayNights("2026-03-07", "2026-03-09")).toBe(2);
  });
});

describe("isGatedStay — co-living 7–28 nights only", () => {
  it("gates a co-living stay at both ends of the window", () => {
    expect(isGatedStay(COLIVING("2026-10-01", "2026-10-08"))).toBe(true); // 7
    expect(isGatedStay(COLIVING("2026-10-01", "2026-10-29"))).toBe(true); // 28
  });

  it("gates the middle of the window", () => {
    expect(isGatedStay(COLIVING("2026-10-01", "2026-10-15"))).toBe(true); // 14
  });

  it("does NOT gate below the co-living minimum", () => {
    expect(isGatedStay(COLIVING("2026-10-01", "2026-10-07"))).toBe(false); // 6
  });

  it("does NOT gate above the lease boundary — that stay is a lease", () => {
    expect(isGatedStay(COLIVING("2026-10-01", "2026-10-30"))).toBe(false); // 29
  });

  it("never gates a whole-property STR stay, at any length", () => {
    expect(isGatedStay(STR("2026-10-01", "2026-10-02"))).toBe(false);
    expect(isGatedStay(STR("2026-10-01", "2026-10-15"))).toBe(false);
    expect(isGatedStay(STR("2026-10-01", "2026-12-01"))).toBe(false);
  });

  it("does NOT gate an open-ended co-living stay (null checkOut)", () => {
    // bookings.check_out is nullable for open-ended stays; nights are unknowable,
    // so the gate cannot apply and today's behaviour is preserved.
    expect(isGatedStay(COLIVING("2026-10-01", null))).toBe(false);
  });

  it("tracks the schema constants rather than hard-coded 7/28", () => {
    const gateOpens = COLIVING("2026-10-01", isoPlus("2026-10-01", COLIVING_MIN_DAYS));
    const gateCloses = COLIVING("2026-10-01", isoPlus("2026-10-01", LEASE_REQUIRED_ABOVE_DAYS));
    const justPast = COLIVING("2026-10-01", isoPlus("2026-10-01", LEASE_REQUIRED_ABOVE_DAYS + 1));
    expect(isGatedStay(gateOpens)).toBe(true);
    expect(isGatedStay(gateCloses)).toBe(true);
    expect(isGatedStay(justPast)).toBe(false);
  });
});

describe("postPaymentStatusFor — the single post-payment status decision", () => {
  it("gated co-living lands PENDING_APPROVAL, NOT ACTIVE", () => {
    expect(postPaymentStatusFor(COLIVING("2026-10-01", "2026-10-12"))).toBe("PENDING_APPROVAL");
  });

  it("STR keeps landing CONFIRMED", () => {
    expect(postPaymentStatusFor(STR("2026-10-01", "2026-10-03"))).toBe("CONFIRMED");
  });

  // Changed 2026-09-28: this used to assert ungated co-living always lands
  // ACTIVE. That was the bug — ACTIVE was a MODEL discriminator, so a stay
  // booked for next March went live on payment and never moved again. The
  // calendar decides now, and `today` is injected so these never rot.
  it("ungated co-living lands CONFIRMED when the stay is still ahead", () => {
    const today = "2026-09-28";
    expect(postPaymentStatusFor(COLIVING("2026-10-01", null), today)).toBe("CONFIRMED");
    expect(postPaymentStatusFor(COLIVING("2026-10-01", "2026-10-07"), today)).toBe("CONFIRMED"); // 6 nights
    expect(postPaymentStatusFor(COLIVING("2026-10-01", "2026-10-30"), today)).toBe("CONFIRMED"); // 29 nights
  });

  it("ungated co-living lands ACTIVE when the stay is already under way", () => {
    const today = "2026-10-03";
    expect(postPaymentStatusFor(COLIVING("2026-10-01", null), today)).toBe("ACTIVE");
    expect(postPaymentStatusFor(COLIVING("2026-10-01", "2026-10-07"), today)).toBe("ACTIVE");
  });

  it("an STR paid for mid-stay is ACTIVE too — the model no longer decides", () => {
    expect(postPaymentStatusFor(STR("2026-10-01", "2026-10-05"), "2026-10-02")).toBe("ACTIVE");
  });

  it("only ever returns a real booking status", () => {
    const cases = [
      COLIVING("2026-10-01", "2026-10-12"),
      COLIVING("2026-10-01", null),
      STR("2026-10-01", "2026-10-03"),
    ];
    for (const c of cases) {
      expect(BOOKING_STATUSES).toContain(postPaymentStatusFor(c));
    }
  });

  it("never throws — it runs inside the Stripe webhook, where a throw means infinite retries", () => {
    expect(() => postPaymentStatusFor(COLIVING("not-a-date", "also-not"))).not.toThrow();
    expect(() => postPaymentStatusFor({ model: "MYSTERY", checkIn: "2026-10-01", checkOut: null })).not.toThrow();
  });

  it("treats an unknown model as whole-property (CONFIRMED), never as gated", () => {
    expect(postPaymentStatusFor({ model: "MYSTERY", checkIn: "2026-10-01", checkOut: "2026-10-12" })).toBe(
      "CONFIRMED",
    );
  });
});

describe("PENDING_APPROVAL blocks the calendar", () => {
  it("is a known booking status", () => {
    expect(BOOKING_STATUSES).toContain("PENDING_APPROVAL");
  });

  // THE load-bearing assertion of this feature. A paid-but-unapproved booking
  // must occupy its dates. The Postgres exclusion constraints read
  // `status NOT IN (...)`, so membership in this array is exactly what decides
  // whether the app and the database agree.
  it("is NOT in NON_BLOCKING_BOOKING_STATUSES", () => {
    expect(NON_BLOCKING_BOOKING_STATUSES).not.toContain("PENDING_APPROVAL");
  });

  it("NON_BLOCKING_BOOKING_STATUSES is exactly CANCELLED + CONFLICT + EXPIRED", () => {
    // A regression fence, not a formality: this list also exists in SQL, in the
    // two EXCLUDE constraints on `bookings`. Adding a status here without
    // rebuilding them (scripts/push-expired-status.mjs) leaves the app offering
    // dates Postgres then rejects with a 23P01 — a booking that fails for no
    // visible reason. EXPIRED was added 2026-09-28 together with that script.
    expect([...NON_BLOCKING_BOOKING_STATUSES]).toEqual(["CANCELLED", "CONFLICT", "EXPIRED"]);
  });

  it("an EXPIRED booking never holds dates — it was never paid for", () => {
    expect(NON_BLOCKING_BOOKING_STATUSES).toContain("EXPIRED");
  });
});

describe("no module recomputes the post-payment status inline", () => {
  // The five sites that used to. If any of these regresses, a paid co-living
  // guest reaches ACTIVE without an ID, a signed agreement, or a door code.
  const sites = [
    "../server/lib/materialize.ts",
    "../server/lib/manualSettle.ts",
    "../server/lib/bookingConflicts.ts",
    "../server/routes.ts",
  ];

  for (const rel of sites) {
    it(`${rel} defers to postPaymentStatusFor`, () => {
      const src = readFileSync(new URL(rel, import.meta.url), "utf8");
      expect(src).not.toMatch(/"COLIVING"\s*\?\s*\(?\s*"ACTIVE"/);
      expect(src).toContain("postPaymentStatusFor");
    });
  }
});

/** Add `days` to a YYYY-MM-DD string in UTC, so DST never shifts the result. */
function isoPlus(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + days * 86_400_000).toISOString().slice(0, 10);
}

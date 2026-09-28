// client/src/lib/reservationsQuery.test.ts
// The admin reservations pager. These are the failures that would look like a
// data bug rather than a URL bug: a filter silently dropped, a stale page
// index after narrowing, or an off-by-one page count.

import { describe, it, expect } from "vitest";
import {
  reservationsQueryString,
  withFilter,
  pageCount,
  DEFAULT_RESERVATION_FILTERS as BASE,
  RESERVATIONS_PAGE_SIZE,
  ANY,
} from "./reservationsQuery";

describe("reservationsQueryString", () => {
  it("sends only paging and sort when nothing is filtered", () => {
    expect(reservationsQueryString(BASE)).toBe("?page=0&pageSize=10&sort=created&dir=desc");
  });

  it("includes each filter once it is set", () => {
    const qs = reservationsQueryString({
      ...BASE,
      page: 2,
      status: "CONFIRMED",
      propertyId: "prop-1",
      q: "hutchens",
    });
    const p = new URLSearchParams(qs);
    expect(p.get("page")).toBe("2");
    expect(p.get("status")).toBe("CONFIRMED");
    expect(p.get("propertyId")).toBe("prop-1");
    expect(p.get("q")).toBe("hutchens");
  });

  it("omits the ANY sentinel rather than sending it as a value", () => {
    // Sending status=ALL would filter for a status literally named ALL and
    // return nothing.
    const p = new URLSearchParams(reservationsQueryString({ ...BASE, status: ANY, propertyId: ANY }));
    expect(p.has("status")).toBe(false);
    expect(p.has("propertyId")).toBe(false);
  });

  it("trims the search box and omits it when only whitespace", () => {
    expect(new URLSearchParams(reservationsQueryString({ ...BASE, q: "  BNP-2548  " })).get("q")).toBe(
      "BNP-2548",
    );
    expect(new URLSearchParams(reservationsQueryString({ ...BASE, q: "   " })).has("q")).toBe(false);
  });

  it("never emits a negative or fractional page", () => {
    expect(new URLSearchParams(reservationsQueryString({ ...BASE, page: -3 })).get("page")).toBe("0");
    expect(new URLSearchParams(reservationsQueryString({ ...BASE, page: 2.7 })).get("page")).toBe("2");
  });

  it("URL-encodes a search term with spaces and symbols", () => {
    const p = new URLSearchParams(reservationsQueryString({ ...BASE, q: "jane doe & co" }));
    expect(p.get("q")).toBe("jane doe & co");
  });
});

describe("withFilter", () => {
  it("resets to page 0 whenever the matching set changes", () => {
    // Narrowing a long list while deep in it would otherwise show an empty
    // card, which reads as "no bookings" instead of "no page 7".
    const deep = { ...BASE, page: 7 };
    for (const patch of [
      { status: "CANCELLED" },
      { propertyId: "p1" },
      { q: "smith" },
      { sort: "checkIn" as const },
      { dir: "asc" as const },
    ]) {
      expect(withFilter(deep, patch).page).toBe(0);
    }
  });

  it("leaves the page alone when only paging", () => {
    expect(withFilter({ ...BASE, page: 3 }, { page: 4 }).page).toBe(4);
  });

  it("keeps an explicit page even alongside a filter change", () => {
    expect(withFilter(BASE, { status: "ACTIVE", page: 2 }).page).toBe(2);
  });

  it("does not mutate the object it was given", () => {
    const before = { ...BASE, page: 5 };
    withFilter(before, { status: "ACTIVE" });
    expect(before.page).toBe(5);
    expect(before.status).toBe(ANY);
  });
});

describe("pageCount", () => {
  it("counts partial pages", () => {
    expect(pageCount(0)).toBe(1);
    expect(pageCount(1)).toBe(1);
    expect(pageCount(10)).toBe(1);
    expect(pageCount(11)).toBe(2);
    expect(pageCount(95)).toBe(10);
  });

  it("returns 1 for an empty result so the pager reads '1 of 1', not '1 of 0'", () => {
    expect(pageCount(0, RESERVATIONS_PAGE_SIZE)).toBe(1);
  });
});

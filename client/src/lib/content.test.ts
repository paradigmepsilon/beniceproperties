import { describe, it, expect } from "vitest";
import { selectTestimonials, neighborhoodFor, postBySlug } from "./content";
import { TESTIMONIALS } from "@/content/testimonials";
import { JOURNAL_POSTS } from "@/content/journal";

describe("selectTestimonials", () => {
  it("returns all testimonials when given no options", () => {
    expect(selectTestimonials()).toHaveLength(TESTIMONIALS.length);
  });

  it("filters to a matching city", () => {
    const atl = selectTestimonials({ city: "Atlanta" });
    expect(atl.length).toBeGreaterThan(0);
    expect(atl.every((t) => t.city === "Atlanta")).toBe(true);
  });

  it("matches city case-insensitively", () => {
    expect(selectTestimonials({ city: "atlanta" })).toEqual(selectTestimonials({ city: "Atlanta" }));
  });

  it("returns an empty array for an unknown city", () => {
    expect(selectTestimonials({ city: "Nowhere" })).toEqual([]);
  });

  it("caps the result to the given limit", () => {
    expect(selectTestimonials({ limit: 2 })).toHaveLength(2);
  });

  it("applies city filter and limit together", () => {
    const out = selectTestimonials({ city: "Atlanta", limit: 1 });
    expect(out).toHaveLength(1);
    expect(out[0].city).toBe("Atlanta");
  });
});

describe("neighborhoodFor", () => {
  it("returns the entry for a known city", () => {
    expect(neighborhoodFor("Atlanta")?.city).toBe("Atlanta");
  });

  it("matches city case-insensitively", () => {
    expect(neighborhoodFor("atlanta")?.city).toBe("Atlanta");
  });

  it("returns undefined for a city with no entry", () => {
    expect(neighborhoodFor("Denver")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(neighborhoodFor("")).toBeUndefined();
  });
});

describe("postBySlug", () => {
  it("returns the matching post", () => {
    const slug = JOURNAL_POSTS[0].slug;
    expect(postBySlug(slug)?.slug).toBe(slug);
  });

  it("returns undefined for an unknown slug", () => {
    expect(postBySlug("does-not-exist")).toBeUndefined();
  });

  it("returns undefined for an empty slug", () => {
    expect(postBySlug("")).toBeUndefined();
  });
});

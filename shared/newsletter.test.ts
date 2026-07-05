import { describe, it, expect } from "vitest";
import { insertNewsletterSubscriberSchema } from "./schema";

// The newsletter endpoint's validation contract lives entirely in this schema
// (the route calls .safeParse and 400s on failure). Testing the schema directly
// is the pure-logic, no-DB way to lock down that contract — matching how the
// rest of the suite tests shared logic without a live database.
describe("insertNewsletterSubscriberSchema", () => {
  it("accepts a valid email with a name", () => {
    const r = insertNewsletterSubscriberSchema.safeParse({ email: "jane@example.com", name: "Jane" });
    expect(r.success).toBe(true);
  });

  it("accepts a valid email with no name (name is optional)", () => {
    const r = insertNewsletterSubscriberSchema.safeParse({ email: "jane@example.com" });
    expect(r.success).toBe(true);
  });

  it("rejects a missing email", () => {
    const r = insertNewsletterSubscriberSchema.safeParse({ name: "Jane" });
    expect(r.success).toBe(false);
  });

  it("rejects a malformed email", () => {
    const r = insertNewsletterSubscriberSchema.safeParse({ email: "not-an-email" });
    expect(r.success).toBe(false);
  });

  it("does not accept an id or createdAt (they are omitted from the insert shape)", () => {
    // Extra keys are stripped by Zod object parsing; the parsed data must not
    // carry a caller-supplied id.
    const r = insertNewsletterSubscriberSchema.safeParse({
      email: "jane@example.com",
      id: "attacker-supplied",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect("id" in r.data).toBe(false);
    }
  });
});

// server/lib/errorResponse.test.ts
// A 500 must never echo the internal error to the client in production: a
// failed Drizzle query puts the full SQL + params in err.message, and that was
// going straight into the JSON body. 4xx messages are ours and stay.

import { describe, it, expect } from "vitest";
import { clientErrorMessage } from "./errorResponse";

describe("clientErrorMessage", () => {
  it("passes a 4xx message through", () => {
    expect(clientErrorMessage({ message: "Room not found" }, 404, false)).toBe("Room not found");
  });
  it("replaces a 5xx message in production", () => {
    expect(clientErrorMessage({ message: 'Failed query: select * from "manual_blocks"' }, 500, false)).toBe("Internal Server Error");
  });
  it("keeps the real 5xx message in development", () => {
    expect(clientErrorMessage({ message: "Failed query: x" }, 500, true)).toBe("Failed query: x");
  });
  it("falls back to a generic message when there is none", () => {
    expect(clientErrorMessage({}, 400, false)).toBe("Internal Server Error");
  });
});

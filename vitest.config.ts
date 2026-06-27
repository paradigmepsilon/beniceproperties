// vitest.config.ts
// Unit-test runner config. Tests target the PURE shared logic (pricing, lease
// schedule generation) and pure server helpers — no live database required.
// The @shared / @ aliases mirror tsconfig.json so test imports resolve the same
// way the app does.

import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "shared"),
      "@": path.resolve(__dirname, "client/src"),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", "build", ".vercel"],
  },
});

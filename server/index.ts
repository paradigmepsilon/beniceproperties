// server/index.ts
// Local dev / self-hosted entry point. Builds the shared Express app, then adds
// Vite (dev) or static serving (prod node), binds a port, and starts the
// background scheduler with graceful shutdown.
//
// On Vercel this file is NOT used — api/index.ts wraps the same app as a
// serverless function and Vercel Cron drives the scheduler (api/cron/sweep.ts).

import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { applyBaseMiddleware, applyErrorHandler } from "./app";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log } from "./server-log";
import { backgroundScheduler } from "./scheduler";

const app = express();
const isDev = process.env.NODE_ENV !== "production";

applyBaseMiddleware(app);

(async () => {
  await registerRoutes(app);
  const server = createServer(app);

  // Centralized error handler (shared with the Vercel handler — never echoes a
  // 5xx internal message to the client outside dev).
  applyErrorHandler(app);

  if (isDev) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5060", 10);
  const host = process.env.HOST || "127.0.0.1";
  const instance = server.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
    backgroundScheduler.start();
  });

  const shutdown = async (signal: string) => {
    log(`${signal} received, shutting down…`);
    backgroundScheduler.stop();
    instance.close(() => log("HTTP server closed"));
    await new Promise((r) => setTimeout(r, 2000));
    process.exit(0);
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("uncaughtException", (e) => console.error("uncaughtException", e));
  process.on("unhandledRejection", (e) => console.error("unhandledRejection", e));
})();

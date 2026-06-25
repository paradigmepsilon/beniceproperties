// server/index.ts
// Express entry point. Mirrors the TRAD app: security headers, compression,
// JSON body parsing, request logging, route registration, Vite (dev) or static
// (prod), then start the server + background scheduler with graceful shutdown.

import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import { log } from "./server-log";
import { backgroundScheduler } from "./scheduler";

const app = express();
const isDev = process.env.NODE_ENV !== "production";

app.set("trust proxy", 1);
app.use(compression());

// Security headers. CSP allows Stripe (js + frames + api) since checkout/elements
// load from js.stripe.com. Disabled in dev for easier local network access.
app.use(
  helmet({
    contentSecurityPolicy: isDev
      ? false
      : {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            connectSrc: ["'self'", "https://api.stripe.com", "https://*.stripe.com"],
            frameSrc: ["'self'", "https://js.stripe.com", "https://hooks.stripe.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
          },
        },
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));

// Concise /api request logging.
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    if (!req.path.startsWith("/api")) return;
    let line = `${req.method} ${req.path} ${res.statusCode} in ${Date.now() - start}ms`;
    if (line.length > 80) line = line.slice(0, 79) + "…";
    log(line);
  });
  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Centralized error handler.
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
    console.error(err);
  });

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

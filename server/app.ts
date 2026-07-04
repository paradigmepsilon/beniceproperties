// server/app.ts
// =============================================================================
// Builds the configured Express app — security headers, compression, body
// parsing, request logging, and the full route surface — WITHOUT binding a
// port or mounting Vite/static. Shared by:
//   - server/index.ts  → local dev (adds Vite + listen + scheduler)
//   - api/index.ts     → Vercel serverless handler (SPA is served by the CDN)
// =============================================================================

import express, { type Express, type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import { registerRoutes } from "./routes";
import { log } from "./server-log";
import { posthog } from "./lib/posthog";

const isDev = process.env.NODE_ENV !== "production";

/** Apply shared middleware (everything except routes + error handler). */
export function applyBaseMiddleware(app: Express): void {
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

  // The Stripe webhook needs its RAW body for signature verification (it mounts
  // its own express.raw in registerRoutes). Skip the global JSON/urlencoded
  // parsers for that path so the raw bytes survive — otherwise express.json()
  // consumes the stream first and every webhook signature check fails.
  const STRIPE_WEBHOOK_PATH = "/api/stripe/webhook";
  const skipWebhook =
    (parser: express.RequestHandler): express.RequestHandler =>
    (req, res, next) =>
      req.path === STRIPE_WEBHOOK_PATH ? next() : parser(req, res, next);

  app.use(skipWebhook(express.json({ limit: "10mb" })));
  app.use(skipWebhook(express.urlencoded({ extended: false, limit: "10mb" })));

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
}

/** Centralized JSON error handler. Mount AFTER all routes. */
export function applyErrorHandler(app: Express): void {
  app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    if (status >= 500) {
      const user = req.user as { email?: string } | undefined;
      posthog.captureException(err, user?.email ?? "anonymous");
    }
    res.status(status).json({ message: err.message || "Internal Server Error" });
    console.error(err);
  });
}

/**
 * Build a fully configured Express app with no port binding and no Vite/static.
 * Used by the Vercel serverless handler. `registerRoutes` also wires auth and
 * returns an http.Server we don't need here (no listen on serverless).
 */
export async function createApp(): Promise<Express> {
  const app = express();
  applyBaseMiddleware(app);
  await registerRoutes(app);
  applyErrorHandler(app);
  return app;
}

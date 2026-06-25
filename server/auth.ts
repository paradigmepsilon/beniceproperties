// server/auth.ts
// =============================================================================
// Session-based admin auth. passport-local + express-session, with sessions
// persisted in Postgres via connect-pg-simple (createTableIfMissing). Mirrors
// the TRAD app's setupAuth pattern.
//
// Passwords are hashed with Node's built-in scrypt (no extra dependency). The
// bootstrap admin from ADMIN_EMAIL / ADMIN_PASSWORD is upserted on startup so
// there's always a way in during development.
// =============================================================================

import { randomBytes, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { storage } from "./storage";
import type { AdminUser } from "@shared/schema";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  if (hashedBuf.length !== suppliedBuf.length) return false;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Shape stored in the session (no password, no PII beyond email).
type SessionAdmin = Pick<AdminUser, "id" | "email" | "name">;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User extends SessionAdmin {}
  }
}

/** Seed the bootstrap admin from env if it doesn't exist yet. */
async function ensureBootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await storage.getAdminByEmail(email);
  if (existing) return;
  await storage.createAdmin({
    email,
    password: await hashPassword(password),
    name: "BNP Admin",
  });
}

export async function setupAuth(app: Express) {
  const PgStore = connectPg(session);
  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    tableName: "admin_sessions",
  });

  app.set("trust proxy", 1);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "bnp-dev-only-secret",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 24 * 60 * 60 * 1000, // 24h
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const admin = await storage.getAdminByEmail(email);
          if (!admin) return done(null, false);
          const ok = await verifyPassword(password, admin.password);
          if (!ok) return done(null, false);
          return done(null, { id: admin.id, email: admin.email, name: admin.name });
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user: Express.User, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const admin = await storage.getAdmin(id);
      if (!admin) return done(null, false);
      done(null, { id: admin.id, email: admin.email, name: admin.name });
    } catch (err) {
      done(err);
    }
  });

  // Best-effort bootstrap; don't crash startup if the DB isn't reachable yet
  // (e.g. DATABASE_URL not pointed at a live branch during early scaffolding).
  ensureBootstrapAdmin().catch((err) =>
    console.warn("[auth] bootstrap admin skipped:", err?.message ?? err),
  );

  // --- Auth routes ---
  app.post("/api/admin/login", passport.authenticate("local"), (req, res) => {
    res.json({ user: req.user });
  });

  app.post("/api/admin/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ ok: true });
    });
  });

  app.get("/api/admin/me", (req, res) => {
    if (!req.isAuthenticated?.()) return res.status(401).json({ message: "Not authenticated" });
    res.json({ user: req.user });
  });
}

/** Guard for admin-only routes. */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated?.()) return next();
  res.status(401).json({ message: "Admin authentication required" });
};

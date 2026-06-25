// server/db.ts
// Drizzle client over Neon serverless Postgres. BNP owns its OWN thin database.
// Uses the Neon HTTP driver (drizzle-orm/neon-http) — matches the TRAD app.

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Point it at a Neon test branch (see .env.example).",
  );
}

const sql = neon(databaseUrl);

export const db = drizzle({ client: sql, schema });

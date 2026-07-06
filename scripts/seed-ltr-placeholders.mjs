// scripts/seed-ltr-placeholders.mjs
// Seeds a few PLACEHOLDER long-term-rental (LTR) properties so the /ltr page and
// inquiry flow are testable before real inventory exists. DATA ONLY — plain SQL
// INSERTs against the EXISTING properties table (LTR is a free-text `type`, so no
// schema/migration change). Idempotent: keyed off property name, skips if present.
// LTR properties have NO rooms (whole-home, inquiry-only). Swap these for real
// listings via admin/seed later; delete them by name when you do.
//
//   node scripts/seed-ltr-placeholders.mjs

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// Placeholder LTR inventory — DATA ONLY. No basePrice (LTR is priced off-platform).
const LTR_PROPERTIES = [
  {
    name: "[PLACEHOLDER] Magnolia House — Long-Term",
    location: "Atlanta",
    type: "LTR",
    entity: "BNP",
    description:
      "A fully furnished 3-bedroom home in a quiet Atlanta neighborhood, available for extended stays. Placeholder listing — contact us for real terms and availability.",
  },
  {
    name: "[PLACEHOLDER] Cedar Lane Bungalow — Long-Term",
    location: "Atlanta",
    type: "LTR",
    entity: "BNP",
    description:
      "A cozy 2-bedroom bungalow set up for long-term living: full kitchen, workspace, and off-street parking. Placeholder listing — reach out to learn more.",
  },
  {
    name: "[PLACEHOLDER] Harbour View Flat — Long-Term",
    location: "Antigua",
    type: "LTR",
    entity: "BNP",
    description:
      "A bright seaside flat available for a season or longer, walking distance to the water. Placeholder listing — inquire for pricing and move-in windows.",
  },
];

async function getPropertyIdByName(name) {
  const r = await db.execute(raw`SELECT id FROM properties WHERE name = ${name} LIMIT 1`);
  const rows = r.rows ?? r;
  return rows[0]?.id;
}

async function run() {
  let created = 0;
  for (const p of LTR_PROPERTIES) {
    const existing = await getPropertyIdByName(p.name);
    if (existing) {
      console.log(`skip (exists): ${p.name}`);
      continue;
    }
    await db.execute(raw`
      INSERT INTO properties (name, location, type, entity, description, active)
      VALUES (${p.name}, ${p.location}, ${p.type}, ${p.entity}, ${p.description}, true)
    `);
    console.log(`created LTR property (data only): ${p.name}`);
    created += 1;
  }

  const ltr = await db.execute(raw`SELECT count(*)::int AS n FROM properties WHERE type='LTR'`);
  console.log(`\nVERIFY — LTR properties present: ${(ltr.rows ?? ltr)[0].n}`);
  console.log(`Seeded ${created} placeholder LTR propert(ies) with ZERO schema change.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("LTR seed FAILED:", err.message);
    process.exit(1);
  });

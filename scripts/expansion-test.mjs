// scripts/expansion-test.mjs
// Phase 9 EXPANSION TEST — proves rule #4 (build for expansion): adding a third
// co-living property and a fourth STR property must require ZERO schema/migration
// change — DATA ONLY. This script inserts them via plain SQL INSERTs against the
// EXISTING tables (no DDL whatsoever) and verifies they land. Idempotent: keyed
// off property name, skips if present.
//
//   node scripts/expansion-test.mjs
//
// If this script ever needs a schema change to add a property/room, the model
// failed rule #4 and must be fixed.

import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql as raw } from "drizzle-orm";

const db = drizzle({ client: neon(process.env.DATABASE_URL) });

// New inventory — DATA ONLY. A 3rd co-living house (with rooms) + a 4th STR.
const NEW_PROPERTIES = [
  {
    name: "[EXPANSION TEST] Third Co-Living House",
    location: "Atlanta",
    type: "COLIVING",
    entity: "BNP",
    description: "Expansion test — added as data only, no migration.",
    rooms: [
      { name: "[EXPANSION TEST] Room X", roomNumber: "X", weeklyRent: "300.00", depositAmount: "300.00" },
      { name: "[EXPANSION TEST] Room Y", roomNumber: "Y", weeklyRent: "280.00", depositAmount: "280.00" },
    ],
  },
  {
    name: "[EXPANSION TEST] Fourth STR Villa",
    location: "Savannah",
    type: "STR",
    entity: "BNP",
    description: "Expansion test — added as data only, no migration.",
    basePrice: "375.00",
    cleaningFee: "120.00",
    rooms: [],
  },
];

async function one(stmt, params) {
  return db.execute(raw.raw(stmt), params);
}

async function getPropertyIdByName(name) {
  const r = await db.execute(raw`SELECT id FROM properties WHERE name = ${name} LIMIT 1`);
  const rows = r.rows ?? r;
  return rows[0]?.id;
}

async function run() {
  let created = 0;
  for (const p of NEW_PROPERTIES) {
    const existing = await getPropertyIdByName(p.name);
    if (existing) {
      console.log(`skip (exists): ${p.name}`);
      continue;
    }
    const res = await db.execute(raw`
      INSERT INTO properties (name, location, type, entity, description, base_price, cleaning_fee, active)
      VALUES (${p.name}, ${p.location}, ${p.type}, ${p.entity}, ${p.description},
              ${p.basePrice ?? null}, ${p.cleaningFee ?? "0"}, true)
      RETURNING id
    `);
    const propId = (res.rows ?? res)[0].id;
    console.log(`created property (data only): ${p.name}`);
    created += 1;

    for (const room of p.rooms) {
      await db.execute(raw`
        INSERT INTO rooms (property_id, name, room_number, weekly_rent, deposit_amount, status)
        VALUES (${propId}, ${room.name}, ${room.roomNumber}, ${room.weeklyRent}, ${room.depositAmount}, 'AVAILABLE')
      `);
      console.log(`  created room: ${room.name}`);
    }
  }

  // Verify: count BNP co-living + STR properties now present.
  const coliving = await db.execute(raw`SELECT count(*)::int AS n FROM properties WHERE type='COLIVING'`);
  const str = await db.execute(raw`SELECT count(*)::int AS n FROM properties WHERE type='STR'`);
  console.log(
    `\nVERIFY — co-living properties: ${(coliving.rows ?? coliving)[0].n}, STR properties: ${(str.rows ?? str)[0].n}`,
  );
  console.log(`EXPANSION TEST PASSED: ${created} new propert(ies) added with ZERO schema change.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("EXPANSION TEST FAILED:", err.message);
    process.exit(1);
  });

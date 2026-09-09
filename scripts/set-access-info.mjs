// scripts/set-access-info.mjs
// =============================================================================
// Owner step 6 of the booking-approval gate: per-property (and optional per-room)
// ARRIVAL INFO. `approve` returns 409 for any property that lacks a wifi SSID
// and directions (the door code is per-booking and typed at approval), so every
// property that takes short stays needs a row before the first approval.
//
// DATA ONLY. Upserts into `property_access_info` / `room_access_info` — the two
// jsonb tables that live apart from `properties`/`rooms` precisely so a public
// endpoint can never publish a wifi password. No schema change; adding a
// property needs no change here (EXPANSION RULE).
//
// SENSITIVE. wifiPassword and buildingEntry are access credentials. This script
// never prints a value — the report lists field NAMES set / still missing, the
// same discipline as server/lib/accessInfo.ts. The input file is gitignored.
//
// MERGE semantics: keys you supply are set, keys you omit are left as they are
// (unlike the admin API, which replaces the whole object). To clear a field,
// set it to "" explicitly.
//
// Usage:
//   node scripts/set-access-info.mjs                       # dry run: inventory + validate + report
//   node scripts/set-access-info.mjs --apply               # write
//   node scripts/set-access-info.mjs --file other.json --apply
//
// Input (default scripts/access-info.local.json — see scripts/access-info.example.json):
//   { "properties": [ { "property": "<name or id>", "info": { ...PropertyAccessInfo } } ],
//     "rooms":      [ { "room": "<room id>",         "info": { ...RoomAccessInfo } } ] }
// =============================================================================

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

// Mirrors propertyAccessInfoSchema / roomAccessInfoSchema in shared/schema.ts
// (strict keys + max lengths). Kept in sync by scripts/set-access-info.test.ts.
export const PROPERTY_FIELDS = {
  wifiSsid: 200,
  wifiPassword: 200,
  buildingEntry: 200,
  directions: 4000,
  parking: 2000,
  checkInFrom: 50,
  checkOutBy: 50,
  notes: 4000,
};
export const ROOM_FIELDS = { findingNotes: 2000, floor: 50, doorLabel: 100, notes: 2000 };

/** Property-level fields the welcome letter cannot go out without (doorCode is per-booking). */
export const REQUIRED_PROPERTY_FIELDS = ["wifiSsid", "directions"];
/** Never printed, even in a dry run. */
export const SENSITIVE_FIELDS = ["wifiPassword", "buildingEntry"];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validate one info object against an allowlist. Returns the cleaned object:
 * strings trimmed, "" kept as an explicit CLEAR marker (resolved by mergeInfo).
 * Throws on an unknown key, a non-string, or an over-length value.
 */
export function validateInfo(info, fields, label) {
  if (!info || typeof info !== "object" || Array.isArray(info)) {
    throw new Error(`${label}: "info" must be an object`);
  }
  const out = {};
  for (const [key, value] of Object.entries(info)) {
    if (!(key in fields)) {
      throw new Error(`${label}: unknown field "${key}" (allowed: ${Object.keys(fields).join(", ")})`);
    }
    if (typeof value !== "string") throw new Error(`${label}: "${key}" must be a string`);
    const trimmed = value.trim();
    if (trimmed.length > fields[key]) {
      throw new Error(`${label}: "${key}" is ${trimmed.length} chars; max ${fields[key]}`);
    }
    out[key] = trimmed;
  }
  return out;
}

/** Existing row + validated input → the object to store. "" removes a key. */
export function mergeInfo(existing, incoming) {
  const merged = { ...(existing ?? {}) };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === "") delete merged[key];
    else merged[key] = value;
  }
  return merged;
}

/** Field NAMES a welcome letter would still lack after this write. Never values. */
export function missingRequired(info) {
  return REQUIRED_PROPERTY_FIELDS.filter((f) => !(typeof info[f] === "string" && info[f].length > 0));
}

/** Names of the keys set on an info object, sensitive ones marked but never valued. */
export function describeKeys(info) {
  return Object.keys(info)
    .sort()
    .map((k) => (SENSITIVE_FIELDS.includes(k) ? `${k}(set, hidden)` : k))
    .join(", ") || "(none)";
}

function parseArgs(argv) {
  const args = { apply: false, file: "scripts/access-info.local.json" };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--apply") args.apply = true;
    else if (argv[i] === "--file") args.file = argv[++i];
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  // Inventory first, so a dry run with no input file still tells the owner what
  // ids/names exist and which properties are currently blocking approval.
  const properties = await sql`select id, name, type from properties where active = true order by name`;
  const rooms = await sql`select id, property_id, name, room_number from rooms order by property_id, room_number, name`;
  const existingProps = await sql`select property_id, info from property_access_info`;
  const existingRooms = await sql`select room_id, info from room_access_info`;
  const propInfo = new Map(existingProps.map((r) => [r.property_id, r.info ?? {}]));
  const roomInfo = new Map(existingRooms.map((r) => [r.room_id, r.info ?? {}]));

  console.log(`\nInventory (${properties.length} active properties):`);
  for (const p of properties) {
    const info = propInfo.get(p.id) ?? {};
    const missing = missingRequired(info);
    console.log(
      `  ${p.name} [${p.type}] ${p.id}\n    set: ${describeKeys(info)}\n    ${
        missing.length ? `MISSING for approval: ${missing.join(", ")}` : "ready for approval"
      }`,
    );
    for (const r of rooms.filter((r) => r.property_id === p.id)) {
      console.log(`    room ${r.room_number ?? "-"} ${r.name} ${r.id}  set: ${describeKeys(roomInfo.get(r.id) ?? {})}`);
    }
  }

  if (!existsSync(args.file)) {
    console.log(`\nNo input file at ${args.file} — nothing to write. Copy scripts/access-info.example.json to start.`);
    return;
  }
  const input = JSON.parse(readFileSync(args.file, "utf8"));
  const plan = [];

  for (const [i, entry] of (input.properties ?? []).entries()) {
    const label = `properties[${i}]`;
    const ref = String(entry.property ?? "");
    const match = UUID_RE.test(ref)
      ? properties.find((p) => p.id.toLowerCase() === ref.toLowerCase())
      : properties.find((p) => p.name.toLowerCase() === ref.toLowerCase());
    if (!match) {
      throw new Error(`${label}: no active property "${ref}". Known: ${properties.map((p) => p.name).join(" | ")}`);
    }
    const incoming = validateInfo(entry.info, PROPERTY_FIELDS, label);
    const merged = mergeInfo(propInfo.get(match.id), incoming);
    plan.push({ kind: "property", id: match.id, name: match.name, merged });
  }
  for (const [i, entry] of (input.rooms ?? []).entries()) {
    const label = `rooms[${i}]`;
    const ref = String(entry.room ?? "");
    const match = rooms.find((r) => r.id.toLowerCase() === ref.toLowerCase());
    if (!match) throw new Error(`${label}: no room with id "${ref}" (ids are listed in the inventory above)`);
    const incoming = validateInfo(entry.info, ROOM_FIELDS, label);
    const merged = mergeInfo(roomInfo.get(match.id), incoming);
    plan.push({ kind: "room", id: match.id, name: match.name, merged });
  }

  console.log(`\nPlan (${args.apply ? "APPLY" : "DRY RUN"}):`);
  for (const step of plan) {
    const after = step.kind === "property" ? missingRequired(step.merged) : [];
    console.log(
      `  ${step.kind} ${step.name} → ${describeKeys(step.merged)}${
        after.length ? `  (still missing: ${after.join(", ")})` : step.kind === "property" ? "  (ready)" : ""
      }`,
    );
  }
  if (!args.apply) {
    console.log("\nDry run only. Re-run with --apply to write.");
    return;
  }

  const actor = "script:set-access-info";
  for (const step of plan) {
    const json = JSON.stringify(step.merged);
    if (step.kind === "property") {
      await sql`insert into property_access_info (property_id, info, updated_by)
                values (${step.id}, ${json}::jsonb, ${actor})
                on conflict (property_id) do update
                set info = excluded.info, updated_by = excluded.updated_by, updated_at = now()`;
    } else {
      await sql`insert into room_access_info (room_id, info, updated_by)
                values (${step.id}, ${json}::jsonb, ${actor})
                on conflict (room_id) do update
                set info = excluded.info, updated_by = excluded.updated_by, updated_at = now()`;
    }
  }
  console.log(`\nWrote ${plan.length} row(s). Re-run without --apply to confirm.`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

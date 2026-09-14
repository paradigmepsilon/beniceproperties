// scripts/seed-market-experiment.mjs
// =============================================================================
// Market-test inventory (2026-09): six co-living properties + their rooms,
// modeled on public for-sale listings in Charlotte, Charleston, and Jacksonville,
// priced with the BNHG Co-Living Profitability Worksheet model. DATA ONLY —
// plain INSERTs into the existing `properties` / `rooms` tables, no DDL, in the
// same idiom as scripts/expansion-test.mjs. Adding these must need zero schema
// change (CLAUDE.md EXPANSION RULE); if it ever does, the model failed rule #4.
//
// Owner identification (nothing renders these publicly):
//   - properties.prior_names / rooms.prior_names carry the tag list from the
//     data file (e.g. ["market-test-2026-09", "src:zillow:6187957"]). No code
//     reads prior_names, so the tag is inert on the site but visible in the
//     admin / UO / any SQL. `--list` prints every tagged row.
//   - properties.address is the real listing address.
//   - docs/market-experiment-2026-09.md is the manifest with prices + sources.
//
// Idempotent: keyed off property name. A property that already exists is
// skipped along with its rooms (no partial re-inserts, no duplicate rooms on a
// re-run). `--remove` deletes ONLY rows carrying the tag (never anything else)
// and refuses if any tagged room has a booking or lease.
//
// Photos: with --photos, each listing photo in scripts/data/market-experiment-photos/
// (gitignored) is uploaded to R2 under the same key shape production uses
// (bnp/properties/<uuid>.jpg, bnp/rooms/<uuid>.jpg) and the public URL is stored
// on the row. Needs the four R2_* vars plus R2_PUBLIC_BASE_URL (UO's spelling
// R2_PUBLIC_URL_BASE is accepted). BNP's local .env does not carry them; pass
// `--r2-env "<path to Unified-Ops/.env>"` and ONLY the R2_* keys are read from
// that file — its DATABASE_URL is never touched. Without --photos the rows get
// photos: [] and the site shows its branded "photo coming soon" placeholder.
//
// Usage:
//   node scripts/seed-market-experiment.mjs                # DRY RUN: validate + print the plan. No DB connection.
//   node scripts/seed-market-experiment.mjs --apply        # insert (needs DATABASE_URL)
//   node scripts/seed-market-experiment.mjs --apply --photos --r2-env "../Unified Ops Folder/Unified-Ops/.env"   # insert + upload photos
//   node scripts/seed-market-experiment.mjs --apply --inactive # insert with active=false (hidden until flipped)
//   node scripts/seed-market-experiment.mjs --list         # show every row carrying the tag
//   node scripts/seed-market-experiment.mjs --remove       # delete tagged rows (refuses if booked/leased)
//   node scripts/seed-market-experiment.mjs --file other.json ...
//
// No secrets are ever printed.
// =============================================================================

import "dotenv/config";
import { readFileSync, existsSync } from "node:fs";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

export const DEFAULT_FILE = "scripts/data/market_experiment_2026_09.json";
export const DEFAULT_PHOTO_DIR = "scripts/data/market-experiment-photos";

/** Icon names client/src/components/listing-story.tsx knows. Unknown names render a dot, not an error — but we want them right. */
export const KNOWN_ICONS = [
  "wifi", "bed", "bath", "private-bath", "kitchen", "laundry", "housekeeping", "coffee",
  "yard", "parking", "car", "transit", "key", "furnished", "plane", "location",
];

const MONEY_RE = /^\d+\.\d{2}$/;

/** The production rate convention observed on live rooms: monthly = weekly x 4, daily = round(weekly / 7). */
export function derivedTiers(weeklyRent) {
  const weekly = Number(weeklyRent);
  return { monthly: weekly * 4, daily: Math.round(weekly / 7) };
}

/**
 * Validate the data file's shape against what shared/schema.ts insert schemas
 * accept (mirrored here so the script cannot write a row the API would reject).
 * Returns a list of problems; empty means valid.
 */
export function validateData(data) {
  const problems = [];
  if (!data || typeof data !== "object") return ["data file is not an object"];
  if (typeof data.tag !== "string" || !data.tag) problems.push("missing top-level tag");
  if (!Array.isArray(data.properties) || data.properties.length === 0) {
    problems.push("properties must be a non-empty array");
    return problems;
  }
  const names = new Set();
  data.properties.forEach((p, pi) => {
    const label = `property[${pi}] ${p?.name ?? "?"}`;
    if (!p || typeof p.name !== "string" || !p.name.trim()) problems.push(`${label}: name required`);
    else if (names.has(p.name)) problems.push(`${label}: duplicate name`);
    else names.add(p.name);
    if (typeof p.location !== "string" || !p.location.trim()) problems.push(`${label}: location required`);
    if (typeof p.address !== "string" || !p.address.trim()) problems.push(`${label}: address required (owner identification)`);
    if (typeof p.description !== "string" || !p.description.trim()) problems.push(`${label}: description required`);
    if (!Array.isArray(p.ownerTags) || !p.ownerTags.includes(data.tag)) problems.push(`${label}: ownerTags must include "${data.tag}"`);
    problems.push(...validateListingContent(p.listingContent, label));
    if (!Array.isArray(p.photoFiles)) problems.push(`${label}: photoFiles must be an array`);
    if (!Array.isArray(p.rooms) || p.rooms.length === 0) {
      problems.push(`${label}: rooms must be a non-empty array (co-living)`);
      return;
    }
    const roomNumbers = new Set();
    p.rooms.forEach((r, ri) => {
      const rl = `${label} room[${ri}] ${r?.name ?? "?"}`;
      if (!r || typeof r.name !== "string" || !r.name.trim()) problems.push(`${rl}: name required`);
      if (typeof r.roomNumber !== "string" || !r.roomNumber.trim()) problems.push(`${rl}: roomNumber required (Stripe metadata)`);
      else if (roomNumbers.has(r.roomNumber)) problems.push(`${rl}: duplicate roomNumber`);
      else roomNumbers.add(r.roomNumber);
      for (const k of ["weeklyRent", "depositAmount", "cleaningFee", "monthlyRate", "dailyRate"]) {
        if (typeof r[k] !== "string" || !MONEY_RE.test(r[k])) problems.push(`${rl}: ${k} must be a "0.00"-style string`);
      }
      if (typeof r.weeklyRent === "string" && MONEY_RE.test(r.weeklyRent)) {
        const t = derivedTiers(r.weeklyRent);
        if (Number(r.monthlyRate) !== t.monthly) problems.push(`${rl}: monthlyRate ${r.monthlyRate} != weekly x 4 (${t.monthly})`);
        if (Number(r.dailyRate) !== t.daily) problems.push(`${rl}: dailyRate ${r.dailyRate} != round(weekly / 7) (${t.daily})`);
        if (Number(r.weeklyRent) <= 0) problems.push(`${rl}: weeklyRent must be positive`);
      }
      if (typeof r.description !== "string" || !r.description.trim()) problems.push(`${rl}: description required`);
      problems.push(...validateListingContent(r.listingContent, rl));
      if (!Array.isArray(r.photoFiles)) problems.push(`${rl}: photoFiles must be an array`);
      if (!r.pricing || typeof r.pricing.modelMonthly !== "number") problems.push(`${rl}: pricing.modelMonthly (provenance) required`);
    });
  });
  return problems;
}

function validateListingContent(lc, label) {
  const out = [];
  if (lc == null) return out;
  if (typeof lc !== "object") return [`${label}: listingContent must be an object`];
  for (const k of Object.keys(lc)) {
    if (!["hook", "essentials", "gettingAround", "whoFor"].includes(k)) out.push(`${label}: listingContent.${k} is not a known key`);
  }
  if (lc.hook != null && typeof lc.hook !== "string") out.push(`${label}: listingContent.hook must be a string`);
  if (lc.whoFor != null && typeof lc.whoFor !== "string") out.push(`${label}: listingContent.whoFor must be a string`);
  if (lc.essentials != null) {
    if (!Array.isArray(lc.essentials)) out.push(`${label}: essentials must be an array`);
    else lc.essentials.forEach((e, i) => {
      if (!e || typeof e.label !== "string" || !e.label) out.push(`${label}: essentials[${i}].label required`);
      if (e?.icon != null && !KNOWN_ICONS.includes(e.icon)) out.push(`${label}: essentials[${i}].icon "${e.icon}" unknown`);
    });
  }
  if (lc.gettingAround != null) {
    if (!Array.isArray(lc.gettingAround)) out.push(`${label}: gettingAround must be an array`);
    else lc.gettingAround.forEach((g, i) => {
      if (!g || typeof g.place !== "string" || typeof g.time !== "string") out.push(`${label}: gettingAround[${i}] needs place + time`);
    });
  }
  return out;
}

/** Every photo file referenced by the data, deduplicated. */
export function referencedPhotoFiles(data) {
  const set = new Set();
  for (const p of data.properties) {
    for (const f of p.photoFiles ?? []) set.add(f);
    for (const r of p.rooms ?? []) for (const f of r.photoFiles ?? []) set.add(f);
  }
  return [...set].sort();
}

/** R2 object key in the shape production already uses for listing photos. */
export function r2KeyFor(kind, file) {
  const ext = extname(file).toLowerCase() || ".jpg";
  return `bnp/${kind}/${randomUUID()}${ext}`;
}

export function parseArgs(argv) {
  const args = { apply: false, photos: false, inactive: false, list: false, remove: false, file: DEFAULT_FILE, photoDir: DEFAULT_PHOTO_DIR, r2Env: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--apply") args.apply = true;
    else if (a === "--photos") args.photos = true;
    else if (a === "--inactive") args.inactive = true;
    else if (a === "--list") args.list = true;
    else if (a === "--remove") args.remove = true;
    else if (a === "--file") args.file = argv[++i];
    else if (a === "--photo-dir") args.photoDir = argv[++i];
    else if (a === "--r2-env") args.r2Env = argv[++i];
    else throw new Error(`unknown argument ${a}`);
  }
  if ((args.apply ? 1 : 0) + (args.list ? 1 : 0) + (args.remove ? 1 : 0) > 1) throw new Error("--apply, --list and --remove are mutually exclusive");
  return args;
}

function loadData(file) {
  if (!existsSync(file)) throw new Error(`data file not found: ${file}`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function printPlan(data, args) {
  let rooms = 0;
  for (const p of data.properties) {
    rooms += p.rooms.length;
    console.log(`\n${p.name}  (${p.location}; ${p.address})  tags=${JSON.stringify(p.ownerTags)}  photos=${p.photoFiles.length}`);
    for (const r of p.rooms) {
      console.log(`   #${r.roomNumber.padEnd(2)} ${r.name.padEnd(40)} weekly $${r.weeklyRent}  monthly $${r.monthlyRate}  daily $${r.dailyRate}  deposit $${r.depositAmount}  model $${r.pricing.modelMonthly}/mo  photos=${r.photoFiles.length}`);
    }
  }
  console.log(`\nPLAN: ${data.properties.length} properties, ${rooms} rooms, type=COLIVING entity=BNP active=${!args.inactive} photos=${args.photos ? "upload to R2" : "none (placeholder art)"}`);
}

async function connect() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
    process.exit(1);
  }
  const { neon } = await import("@neondatabase/serverless");
  return neon(process.env.DATABASE_URL);
}

/** R2 variable names, with UO's spelling of the public base accepted as an alias. */
export const R2_KEYS = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_BASE_URL", "R2_PUBLIC_URL_BASE"];

/**
 * Pull ONLY the R2_* keys out of another env file (e.g. Unified Ops' .env, which
 * holds the same bucket's credentials) into process.env, without touching
 * DATABASE_URL or anything else in that file. Returns the key NAMES loaded.
 */
export function loadR2Env(path, env = process.env) {
  if (!existsSync(path)) throw new Error(`--r2-env file not found: ${path}`);
  const loaded = [];
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!R2_KEYS.includes(key)) continue;
    let value = line.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (value && !env[key]) {
      env[key] = value;
      loaded.push(key);
    }
  }
  return loaded;
}

export function r2PublicBase(env = process.env) {
  return (env.R2_PUBLIC_BASE_URL || env.R2_PUBLIC_URL_BASE || "").replace(/\/+$/, "");
}

async function makeUploader(photoDir) {
  const missing = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"].filter((k) => !process.env[k]);
  if (!r2PublicBase()) missing.push("R2_PUBLIC_BASE_URL (or R2_PUBLIC_URL_BASE)");
  if (missing.length) throw new Error(`--photos needs env: ${missing.join(", ")} (values never printed; pass --r2-env <path to an env file holding them>)`);
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  });
  const base = r2PublicBase();
  const cache = new Map(); // file -> public url (same photo reused across property + rooms uploads once)
  return async function upload(kind, file) {
    const cacheKey = `${kind}:${file}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);
    const path = join(photoDir, file);
    if (!existsSync(path)) throw new Error(`photo not found: ${path}`);
    const key = r2KeyFor(kind, file);
    const ext = extname(file).toLowerCase();
    const contentType = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
    await client.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: key, Body: readFileSync(path), ContentType: contentType }));
    const url = `${base}/${key}`;
    cache.set(cacheKey, url);
    return url;
  };
}

async function listTagged(sql, tag) {
  const props = await sql`SELECT id, name, location, address, active, prior_names, jsonb_array_length(photos) AS photo_count FROM properties WHERE prior_names ? ${tag} ORDER BY name`;
  if (props.length === 0) {
    console.log(`No properties carry tag "${tag}".`);
    return;
  }
  for (const p of props) {
    console.log(`\n${p.name}  id=${p.id}  active=${p.active}  ${p.location}; ${p.address}  photos=${p.photo_count}  tags=${JSON.stringify(p.prior_names)}`);
    const rooms = await sql`SELECT id, room_number, name, status, weekly_rent, monthly_rate, jsonb_array_length(photos) AS photo_count FROM rooms WHERE property_id = ${p.id} ORDER BY room_number`;
    for (const r of rooms) console.log(`   #${r.room_number} ${r.name}  id=${r.id}  ${r.status}  weekly $${r.weekly_rent}  monthly $${r.monthly_rate}  photos=${r.photo_count}`);
  }
}

async function removeTagged(sql, tag) {
  const props = await sql`SELECT id, name FROM properties WHERE prior_names ? ${tag}`;
  if (props.length === 0) {
    console.log(`Nothing to remove: no properties carry tag "${tag}".`);
    return;
  }
  const ids = props.map((p) => p.id);
  const booked = await sql`SELECT count(*)::int AS n FROM bookings WHERE property_id = ANY(${ids})`;
  const leased = await sql`SELECT count(*)::int AS n FROM leases WHERE property_id = ANY(${ids})`;
  if (booked[0].n > 0 || leased[0].n > 0) {
    console.error(`REFUSING to remove: ${booked[0].n} booking(s) and ${leased[0].n} lease(s) reference tagged properties. Resolve those first.`);
    process.exit(1);
  }
  for (const p of props) {
    await sql`DELETE FROM room_access_info WHERE room_id IN (SELECT id FROM rooms WHERE property_id = ${p.id})`;
    await sql`DELETE FROM property_access_info WHERE property_id = ${p.id}`;
    await sql`DELETE FROM manual_blocks WHERE property_id = ${p.id}`;
    const r = await sql`DELETE FROM rooms WHERE property_id = ${p.id} RETURNING id`;
    await sql`DELETE FROM properties WHERE id = ${p.id}`;
    console.log(`removed ${p.name} (+${r.length} rooms)`);
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const data = loadData(args.file);
  const problems = validateData(data);
  if (problems.length) {
    console.error(`Data file ${args.file} has ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exit(1);
  }

  if (args.list || args.remove) {
    const sql = await connect();
    if (args.list) await listTagged(sql, data.tag);
    else await removeTagged(sql, data.tag);
    return;
  }

  printPlan(data, args);

  if (args.r2Env) {
    const loaded = loadR2Env(args.r2Env);
    console.log(`\nLoaded ${loaded.length} R2 key(s) from ${args.r2Env}: ${loaded.join(", ") || "(none — all already set or absent)"}`);
  }

  if (args.photos) {
    const missing = referencedPhotoFiles(data).filter((f) => !existsSync(join(args.photoDir, f)));
    if (missing.length) {
      console.error(`\n${missing.length} referenced photo file(s) missing from ${args.photoDir}: ${missing.join(", ")}`);
      process.exit(1);
    }
    console.log(`\nAll ${referencedPhotoFiles(data).length} referenced photo files present in ${args.photoDir}.`);
  }

  if (!args.apply) {
    console.log("\nDRY RUN — nothing written, no DB connection made. Re-run with --apply to insert.");
    return;
  }

  const sql = await connect();
  const upload = args.photos ? await makeUploader(args.photoDir) : null;
  let created = 0;
  let createdRooms = 0;
  for (const p of data.properties) {
    const existing = await sql`SELECT id FROM properties WHERE name = ${p.name} LIMIT 1`;
    if (existing.length) {
      console.log(`skip (exists): ${p.name} (${existing[0].id})`);
      continue;
    }
    const photos = upload ? await Promise.all(p.photoFiles.map((f) => upload("properties", f))) : [];
    const inserted = await sql`
      INSERT INTO properties (name, location, type, entity, description, listing_content, photos, address, prior_names, base_price, cleaning_fee, active)
      VALUES (${p.name}, ${p.location}, 'COLIVING', 'BNP', ${p.description}, ${JSON.stringify(p.listingContent ?? null)}::jsonb,
              ${JSON.stringify(photos)}::jsonb, ${p.address}, ${JSON.stringify(p.ownerTags)}::jsonb, NULL, '0', ${!args.inactive})
      RETURNING id
    `;
    const propId = inserted[0].id;
    created += 1;
    console.log(`created property: ${p.name} (${propId})`);
    for (const r of p.rooms) {
      const rphotos = upload ? await Promise.all(r.photoFiles.map((f) => upload("rooms", f))) : [];
      const ri = await sql`
        INSERT INTO rooms (property_id, name, room_number, description, listing_content, photos, weekly_rent, deposit_amount, cleaning_fee, daily_rate, monthly_rate, prior_names, status)
        VALUES (${propId}, ${r.name}, ${r.roomNumber}, ${r.description}, ${JSON.stringify(r.listingContent ?? null)}::jsonb, ${JSON.stringify(rphotos)}::jsonb,
                ${r.weeklyRent}, ${r.depositAmount}, ${r.cleaningFee}, ${r.dailyRate}, ${r.monthlyRate}, ${JSON.stringify(p.ownerTags)}::jsonb, 'AVAILABLE')
        RETURNING id
      `;
      createdRooms += 1;
      console.log(`   created room #${r.roomNumber}: ${r.name} (${ri[0].id})`);
    }
  }
  const verify = await sql`SELECT count(*)::int AS n FROM properties WHERE prior_names ? ${data.tag}`;
  const verifyRooms = await sql`SELECT count(*)::int AS n FROM rooms WHERE prior_names ? ${data.tag}`;
  console.log(`\nVERIFY — tagged properties in DB: ${verify[0].n} (expected ${data.properties.length}); tagged rooms: ${verifyRooms[0].n}`);
  console.log(`DONE: ${created} propert(ies) + ${createdRooms} room(s) added with ZERO schema change.`);
}

const isDirectRun = process.argv[1] && basename(fileURLToPath(import.meta.url)) === basename(process.argv[1]);
if (isDirectRun) {
  main().catch((err) => {
    console.error("FAILED:", err.message);
    process.exit(1);
  });
}

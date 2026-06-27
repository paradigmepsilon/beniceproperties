// scripts/build-api.mjs
// Bundle each Vercel serverless function from api-src/**/*.ts into a
// self-contained ESM .js under api/ (same relative path). Node's ESM runtime on
// Vercel can't resolve our extensionless relative imports (./routes,
// ../server/app, …), and the server/ tree isn't otherwise compiled into the
// function, so we inline the whole local import chain here and keep
// node_modules external (Vercel installs them).
//
// The bundled api/**/*.js files are committed so Vercel serves them directly —
// no build-time mutation of the function tree (which Vercel's function manifest
// rejects). Re-run `npm run build:api` and commit whenever server/ or api-src/
// changes. CI guard: `npm run check:api` fails if api/ is stale.

import { build } from "esbuild";
import { readdirSync, statSync } from "fs";
import { join, relative } from "path";

const SRC = "api-src";
const OUT = "api";

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (entry.endsWith(".ts")) out.push(full);
  }
  return out;
}

const entries = walk(SRC);
if (entries.length === 0) {
  console.warn(`[build-api] no ${SRC}/**/*.ts entry points found`);
  process.exit(0);
}

await build({
  entryPoints: entries,
  outbase: SRC,
  outdir: OUT,
  platform: "node",
  format: "esm",
  target: "node20",
  bundle: true,
  // Keep node_modules external (Vercel provides them); only inline our own code.
  packages: "external",
  logLevel: "info",
});

console.log(
  `[build-api] bundled ${entries.length} function(s) → ${OUT}/: ` +
    entries.map((e) => relative(SRC, e)).join(", "),
);

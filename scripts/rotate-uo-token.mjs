// scripts/rotate-uo-token.mjs
// =============================================================================
// Rotate the shared BNP <-> Unified Ops service token.
//
// ONE secret, TWO names, opposite ends of the same wire:
//   BNP reads it as UO_BNP_API_TOKEN  (server/lib/serviceAuth.ts) — unset => the
//                                      whole /api/uo/* surface 503s (fail closed),
//                                      wrong => 401.
//   UO  sends it as BNP_API_TOKEN     (src/lib/bnp/api-client.ts) as
//                                      `authorization: Bearer <token>`.
// There is no BNP_SERVICE_TOKEN and no X-Service-Token. UO_SERVICE_TOKEN in this
// repo's env is the unrelated OUTBOUND KPI-push stub — this script never touches it.
//
// Also pins BNP_API_URL on the UO side. It must be the ORIGIN of the canonical
// host, with a scheme: a bare `beniceproperties.com` is unparseable by fetch, and
// the apex 308-redirects to www — a CROSS-ORIGIN redirect, on which undici strips
// the Authorization header, so the call fails 401 with no useful error.
//
// SENSITIVE. The token is a production credential. This script NEVER prints it —
// not in a dry run, not on success. All reporting is by sha256 fingerprint, the
// same discipline as scripts/set-access-info.mjs. The only place the raw value is
// written is the two gitignored .env files and (optionally) a 0600 --token-file
// outside both repos, which exists so the `vercel env add` step can read it from
// stdin instead of a shell argument that would land in shell history.
//
// This script does NOT talk to Vercel and does NOT deploy. It prints the exact
// commands for the owner to run — production env writes are a human step.
//
// Usage:
//   node scripts/rotate-uo-token.mjs                          # dry run: fingerprint + plan + commands
//   node scripts/rotate-uo-token.mjs --verify                 # compare what the two .env files hold now
//   node scripts/rotate-uo-token.mjs --write-local --token-file=/tmp/x/uo-token.txt
//   node scripts/rotate-uo-token.mjs --write-local --token=<existing>   # adopt a token instead of generating
//   node scripts/rotate-uo-token.mjs --emit-token-file --token-file=/tmp/uo-token.txt
//                                                             # rewrite the scratch file, no rotation
// =============================================================================

import { randomBytes, createHash } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** Canonical origin of the BNP site. Scheme + www, no trailing slash, no path. */
export const CANONICAL_BNP_API_URL = "https://www.beniceproperties.com";

/** The key each side reads. Same value, different name. */
export const BNP_TOKEN_KEY = "UO_BNP_API_TOKEN";
export const UO_TOKEN_KEY = "BNP_API_TOKEN";
export const UO_URL_KEY = "BNP_API_URL";

/** Default location of the UO checkout, relative to this repo. */
const DEFAULT_UO_ENV = resolve(REPO_ROOT, "../../Unified Ops Folder/Unified-Ops/.env");

/**
 * Short, non-reversible identifier for a secret. Enough to prove two files hold
 * the SAME value, or that a value CHANGED, without disclosing any of it.
 */
export function fingerprint(token) {
  if (typeof token !== "string" || token.length === 0) return "(empty)";
  return createHash("sha256").update(token).digest("hex").slice(0, 12);
}

/** 64 hex chars from the CSPRNG — matches the `openssl rand -hex 32` guidance in .env.example. */
export function generateToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Read one key out of .env text. Ignores commented-out lines and strips matched
 * surrounding quotes. Returns "" when the key is absent OR present-but-empty —
 * the caller distinguishes those with hasEnvKey().
 */
export function readEnvValue(contents, key) {
  const line = matchEnvLine(contents, key);
  if (!line) return "";
  const raw = line.text.slice(line.text.indexOf("=") + 1).trim();
  const quoted = /^(["'])([\s\S]*)\1$/.exec(raw);
  return quoted ? quoted[2] : raw;
}

/** True when the key is assigned at all, even to an empty string. */
export function hasEnvKey(contents, key) {
  return matchEnvLine(contents, key) !== null;
}

function matchEnvLine(contents, key) {
  const lines = contents.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    // Uncommented `KEY=` only. `export KEY=` is accepted; `# KEY=` is not.
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(lines[i]);
    if (m && m[1] === key) return { index: i, text: lines[i] };
  }
  return null;
}

/**
 * Set KEY=value in .env text, in place. Replaces the existing assignment where
 * there is one (preserving its position, so a reviewer's diff is one line) and
 * appends otherwise. Every other line — comments, blanks, ordering, the trailing
 * newline — survives byte-identical. Never creates a duplicate key.
 */
export function upsertEnvLine(contents, key, value) {
  const line = `${key}=${value}`;
  const found = matchEnvLine(contents, key);
  if (found) {
    const lines = contents.split("\n");
    lines[found.index] = line;
    return lines.join("\n");
  }
  if (contents.length === 0) return `${line}\n`;
  return contents.endsWith("\n") ? `${contents}${line}\n` : `${contents}\n${line}\n`;
}

/**
 * A --token-file must sit OUTSIDE both checkouts. Inside, a stray `git add -f`
 * or a tool that ignores .gitignore could commit a live production credential.
 */
export function assertTokenFilePathSafe(path, repoRoots) {
  const abs = resolve(path);
  for (const root of repoRoots) {
    const rootAbs = resolve(root);
    if (abs === rootAbs || abs.startsWith(`${rootAbs}/`)) {
      throw new Error(
        `--token-file must live outside the repos (got ${abs}, inside ${rootAbs}). ` +
          `Use a scratch path such as /tmp/uo-token.txt.`,
      );
    }
  }
  return abs;
}

export function parseArgs(argv) {
  const args = { writeLocal: false, verify: false, emit: false, token: null, tokenFile: null, uoEnv: null };
  for (const arg of argv) {
    if (arg === "--write-local") args.writeLocal = true;
    else if (arg === "--verify") args.verify = true;
    else if (arg === "--emit-token-file") args.emit = true;
    else if (arg.startsWith("--token=")) args.token = arg.slice("--token=".length).trim();
    else if (arg.startsWith("--token-file=")) args.tokenFile = arg.slice("--token-file=".length);
    else if (arg.startsWith("--uo-env=")) args.uoEnv = arg.slice("--uo-env=".length);
    else throw new Error(`unknown argument ${arg}`);
  }
  if ([args.verify, args.writeLocal, args.emit].filter(Boolean).length > 1) {
    throw new Error("--verify, --write-local and --emit-token-file are mutually exclusive");
  }
  if (args.emit && !args.tokenFile) {
    throw new Error("--emit-token-file requires --token-file=<path outside both repos>");
  }
  if (args.token !== null && args.token.length < 32) {
    throw new Error("--token must be at least 32 characters");
  }
  return args;
}

/** Origin of a URL string, or a reason it is unusable. Never throws. */
export function describeUrl(value) {
  if (!value) return { ok: false, detail: "(empty)" };
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return { ok: false, detail: `no scheme: "${value}"` };
  try {
    const u = new URL(value);
    const trailing = value.endsWith("/") ? " (trailing slash — strip it)" : "";
    const path = u.pathname !== "/" ? ` (has a path "${u.pathname}" — must be the origin only)` : "";
    return { ok: !trailing && !path, detail: `${u.origin}${trailing}${path}` };
  } catch {
    return { ok: false, detail: `unparseable: "${value}"` };
  }
}

function loadEnv(path, label) {
  if (!existsSync(path)) {
    throw new Error(`${label} not found at ${path} — this script edits an existing .env, it never creates one.`);
  }
  return readFileSync(path, "utf8");
}

function backup(path, contents) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dest = `${path}.bak-${stamp}`;
  writeFileSync(dest, contents, { mode: 0o600 });
  return dest;
}

function reportVerify(bnpEnvPath, uoEnvPath) {
  const bnp = loadEnv(bnpEnvPath, "BNP .env");
  const uo = loadEnv(uoEnvPath, "UO .env");
  const bnpToken = readEnvValue(bnp, BNP_TOKEN_KEY);
  const uoToken = readEnvValue(uo, UO_TOKEN_KEY);
  const url = describeUrl(readEnvValue(uo, UO_URL_KEY));

  console.log("\nLocal token parity");
  console.log(`  BNP  ${BNP_TOKEN_KEY.padEnd(16)} ${fingerprint(bnpToken)}  ${bnpEnvPath}`);
  console.log(`  UO   ${UO_TOKEN_KEY.padEnd(16)} ${fingerprint(uoToken)}  ${uoEnvPath}`);
  const match = bnpToken.length > 0 && bnpToken === uoToken;
  console.log(`  => ${match ? "MATCH" : "MISMATCH — UO calls to BNP will 401 (or 503 if BNP's is unset)"}`);
  console.log(`\n  UO   ${UO_URL_KEY.padEnd(16)} ${url.detail}`);
  if (!url.ok) console.log(`  => expected exactly ${CANONICAL_BNP_API_URL}`);
  return match && url.ok;
}

function printVercelSteps(tokenFile) {
  const src = tokenFile ?? "<token-file>";
  console.log(`
Production rotation — run these yourself; this script does not touch Vercel.
BNP validates exactly ONE token, so writes 401 between steps 1 and 2. Do them
back to back (~3-5 min). READS are unaffected throughout: they go straight to
BNP_DATABASE_URL, not through this API.

  # 1. BNP production
  cd ${REPO_ROOT}
  vercel env rm  ${BNP_TOKEN_KEY} production --yes
  vercel env add ${BNP_TOKEN_KEY} production < ${src}
  vercel redeploy <latest BNP production URL>

  # 2. UO production — immediately after step 1
  cd "$(dirname "${DEFAULT_UO_ENV}")"
  vercel env rm  ${UO_TOKEN_KEY} production --yes
  vercel env add ${UO_TOKEN_KEY} production < ${src}
  vercel env rm  ${UO_URL_KEY} production --yes
  printf '${CANONICAL_BNP_API_URL}' | vercel env add ${UO_URL_KEY} production
  vercel redeploy <latest UO production URL>

  # 3. Prove it took — new token 200, OLD token 401
  curl -s -o /dev/null -w '%{http_code}\\n' \\
    -H "Authorization: Bearer $(cat ${src})" \\
    ${CANONICAL_BNP_API_URL}/api/uo/properties

  # 4. Destroy the scratch copy
  rm -P ${src}

Vercel reads env at DEPLOY time — both redeploys are mandatory, an env edit alone
changes nothing.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const bnpEnvPath = resolve(REPO_ROOT, ".env");
  const uoEnvPath = args.uoEnv ? resolve(args.uoEnv) : DEFAULT_UO_ENV;

  if (args.verify) {
    process.exitCode = reportVerify(bnpEnvPath, uoEnvPath) ? 0 : 1;
    return;
  }

  // Re-materialize the token ALREADY in local .env, without rotating. The scratch
  // file is meant to be destroyed after `vercel env add`, so needing it again
  // (a retry, an interrupted rotation) must not force a second rotation and a
  // second window of 401s.
  if (args.emit) {
    const token = readEnvValue(loadEnv(bnpEnvPath, "BNP .env"), BNP_TOKEN_KEY);
    if (!token) {
      throw new Error(`${BNP_TOKEN_KEY} is not set in ${bnpEnvPath} — run --write-local first.`);
    }
    const dest = assertTokenFilePathSafe(args.tokenFile, [REPO_ROOT, resolve(uoEnvPath, "..")]);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, token, { mode: 0o600 });
    console.log(`\nRe-materialized the CURRENT local token — nothing was rotated.`);
    console.log(`  ${fingerprint(token)}  ->  ${dest}  (mode 0600)`);
    printVercelSteps(dest);
    return;
  }

  // Fail before generating anything if a target is missing.
  const bnpContents = loadEnv(bnpEnvPath, "BNP .env");
  const uoContents = loadEnv(uoEnvPath, "UO .env");

  const tokenFile = args.tokenFile
    ? assertTokenFilePathSafe(args.tokenFile, [REPO_ROOT, resolve(uoEnvPath, "..")])
    : null;

  const token = args.token ?? generateToken();
  const before = {
    bnp: readEnvValue(bnpContents, BNP_TOKEN_KEY),
    uo: readEnvValue(uoContents, UO_TOKEN_KEY),
    url: readEnvValue(uoContents, UO_URL_KEY),
  };

  console.log(`\n${args.writeLocal ? "ROTATE" : "DRY RUN"} — BNP <-> UO service token`);
  console.log(`  new token       ${fingerprint(token)}  (${token.length} chars, ${args.token ? "supplied" : "generated"})`);
  console.log(`  replaces (BNP)  ${fingerprint(before.bnp)}${hasEnvKey(bnpContents, BNP_TOKEN_KEY) ? "" : "  [key absent — will be appended]"}`);
  console.log(`  replaces (UO)   ${fingerprint(before.uo)}${hasEnvKey(uoContents, UO_TOKEN_KEY) ? "" : "  [key absent — will be appended]"}`);
  console.log("\nFiles:");
  console.log(`  ${bnpEnvPath}\n    ${BNP_TOKEN_KEY}=<new token>`);
  console.log(`  ${uoEnvPath}\n    ${UO_TOKEN_KEY}=<new token>`);
  const urlNow = describeUrl(before.url);
  console.log(
    `    ${UO_URL_KEY}=${CANONICAL_BNP_API_URL}` +
      (before.url === CANONICAL_BNP_API_URL ? "   (already correct)" : `   (was: ${urlNow.detail})`),
  );
  if (tokenFile) console.log(`  ${tokenFile}   (mode 0600, raw token, for \`vercel env add\`)`);

  if (!args.writeLocal) {
    printVercelSteps(tokenFile);
    console.log("\nDry run only — nothing was written. Re-run with --write-local to apply.");
    return;
  }

  const bnpBackup = backup(bnpEnvPath, bnpContents);
  const uoBackup = backup(uoEnvPath, uoContents);

  writeFileSync(bnpEnvPath, upsertEnvLine(bnpContents, BNP_TOKEN_KEY, token), { mode: 0o600 });
  let nextUo = upsertEnvLine(uoContents, UO_TOKEN_KEY, token);
  nextUo = upsertEnvLine(nextUo, UO_URL_KEY, CANONICAL_BNP_API_URL);
  writeFileSync(uoEnvPath, nextUo, { mode: 0o600 });

  if (tokenFile) {
    mkdirSync(dirname(tokenFile), { recursive: true });
    // No trailing newline: `vercel env add` stores stdin verbatim, and a stray
    // "\n" inside the secret would make every comparison fail by one byte.
    writeFileSync(tokenFile, token, { mode: 0o600 });
  }

  console.log("\nWrote local env. Backups (also gitignored):");
  console.log(`  ${bnpBackup}\n  ${uoBackup}`);
  printVercelSteps(tokenFile);
  console.log("\nRestart both dev servers — env is read at process start.");
  console.log("Then: node scripts/rotate-uo-token.mjs --verify");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}

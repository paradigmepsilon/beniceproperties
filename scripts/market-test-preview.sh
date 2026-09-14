#!/usr/bin/env bash
# scripts/market-test-preview.sh
# =============================================================================
# Local preview of the 2026-09 market-test inventory WITHOUT touching production:
#   1. creates (or reuses) a Neon branch off the project's default branch,
#   2. seeds the six properties / 22 rooms into that branch,
#   3. starts the BNP dev server on :3008 against the branch.
#
# Production is never written. The branch connection string is held in a shell
# variable and passed via the environment; it is never echoed or written to disk.
# dotenv does not override a variable that is already set, so the .env
# DATABASE_URL (production) is ignored for the lifetime of this process.
#
# One-time: `npx neonctl auth` (opens a browser). Then:
#   bash scripts/market-test-preview.sh                          # placeholder art
#   bash scripts/market-test-preview.sh --photos --r2-env "../Unified Ops Folder/Unified-Ops/.env"
#
# Env knobs: NEON_PROJECT_ID (required when the account has >1 project),
#            BRANCH_NAME (default market-test-preview), PORT (default 3008).
# Clean up when done: npx neonctl branches delete market-test-preview --project-id <id>
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."

BRANCH="${BRANCH_NAME:-market-test-preview}"
PORT="${PORT:-3008}"
PROJECT_ID="${NEON_PROJECT_ID:-}"

if [ -z "$PROJECT_ID" ]; then
  PROJECT_ID=$(npx --yes neonctl projects list --output json | node -e '
    let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
      const a = JSON.parse(s); const list = Array.isArray(a) ? a : (a.projects ?? []);
      if (list.length !== 1) { console.error("Set NEON_PROJECT_ID. Projects: " + list.map((p) => `${p.id} (${p.name})`).join(", ")); process.exit(1); }
      console.log(list[0].id);
    });')
fi
echo "Neon project: $PROJECT_ID"

if npx neonctl branches get "$BRANCH" --project-id "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Reusing Neon branch '$BRANCH'."
else
  echo "Creating Neon branch '$BRANCH' off the default branch..."
  npx neonctl branches create --project-id "$PROJECT_ID" --name "$BRANCH" --output json >/dev/null
fi

BRANCH_URL=$(npx neonctl connection-string "$BRANCH" --project-id "$PROJECT_ID" --pooled false)
if [ -z "$BRANCH_URL" ]; then echo "Could not obtain the branch connection string."; exit 1; fi

echo "Seeding the market-test inventory into branch '$BRANCH' (idempotent)..."
DATABASE_URL="$BRANCH_URL" node scripts/seed-market-experiment.mjs --apply "$@"

EXISTING=$(lsof -tiTCP:"$PORT" -sTCP:LISTEN || true)
if [ -n "$EXISTING" ]; then
  echo "Stopping the server already on :$PORT (pid $EXISTING)..."
  kill "$EXISTING"; sleep 1
fi

echo "Starting the dev server on :$PORT against Neon branch '$BRANCH'. Production untouched."
echo "Open http://127.0.0.1:$PORT/#stays and pick Charlotte, Charleston, or Jacksonville."
DATABASE_URL="$BRANCH_URL" PORT="$PORT" npm run dev

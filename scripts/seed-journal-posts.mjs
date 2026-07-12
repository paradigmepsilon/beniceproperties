// scripts/seed-journal-posts.mjs
// Seeds the July 2026 journal content drop (35 SEO/AEO-shaped posts covering
// co-living, short-term rentals, vacation rentals, and long-term rentals) into
// journal_posts. DATA ONLY — no schema change. Idempotent: keyed off slug with
// ON CONFLICT DO NOTHING, so re-running never duplicates or overwrites posts
// (including any later edits made in Unified Ops, which owns authoring).
//
// Content lives in scripts/data/journal_posts_2026_07.json. Each post is
// validated before any insert: 2000-2500 chars of block text, no em/en dashes,
// kebab-case slug, first block is a paragraph. Publish dates are staggered
// deterministically (newest yesterday, one post every 2 days going back) so the
// journal reads as an ongoing publication rather than a single-day dump.
//
//   node scripts/seed-journal-posts.mjs            # validate + insert
//   node scripts/seed-journal-posts.mjs --dry-run  # validate only
//   node scripts/seed-journal-posts.mjs --start-date 2026-07-11  # newest post date

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "data", "journal_posts_2026_07.json");

const DRY_RUN = process.argv.includes("--dry-run");
const startIdx = process.argv.indexOf("--start-date");
const START_DATE =
  startIdx !== -1 ? process.argv[startIdx + 1] : new Date(Date.now() - 24 * 3600 * 1000).toISOString().slice(0, 10);

const MIN_CHARS = 2000;
const MAX_CHARS = 2500;
const GAP_DAYS = 2;

function blockChars(post) {
  return post.blocks.reduce((n, b) => n + (b.text ?? "").length, 0);
}

function validate(post, i) {
  const errors = [];
  if (!/^[a-z0-9-]+$/.test(post.slug ?? "")) errors.push(`bad slug`);
  if (!post.title) errors.push("missing title");
  if (!post.excerpt) errors.push("missing excerpt");
  if (!Array.isArray(post.blocks) || post.blocks.length === 0) errors.push("no blocks");
  else {
    if (post.blocks[0].type !== "paragraph") errors.push("first block is not a paragraph");
    for (const b of post.blocks) {
      if (!["heading", "paragraph"].includes(b.type)) errors.push(`bad block type ${b.type}`);
    }
    const chars = blockChars(post);
    if (chars < MIN_CHARS || chars > MAX_CHARS) errors.push(`block chars ${chars} outside ${MIN_CHARS}-${MAX_CHARS}`);
  }
  const everything = JSON.stringify(post);
  if (/[—–]/.test(everything)) errors.push("contains em/en dash");
  return errors.map((e) => `post[${i}] ${post.slug ?? "?"}: ${e}`);
}

const posts = JSON.parse(await readFile(DATA_FILE, "utf-8"));
if (!Array.isArray(posts) || posts.length === 0) {
  console.error("No posts found in", DATA_FILE);
  process.exit(1);
}

const problems = posts.flatMap(validate);
const slugs = new Set(posts.map((p) => p.slug));
if (slugs.size !== posts.length) problems.push("duplicate slugs in data file");
if (problems.length) {
  console.error(`VALIDATION FAILED (${problems.length}):`);
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
console.log(`Validated ${posts.length} posts (chars ${Math.min(...posts.map(blockChars))}-${Math.max(...posts.map(blockChars))}).`);

if (DRY_RUN) {
  console.log("Dry run — no inserts.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

const base = new Date(`${START_DATE}T15:00:00Z`); // ~11am ET display time
let inserted = 0;
let skipped = 0;
for (let i = 0; i < posts.length; i++) {
  const p = posts[i];
  // Newest first in the file → publish dates walk backward from START_DATE.
  const publishedAt = new Date(base.getTime() - i * GAP_DAYS * 24 * 3600 * 1000);
  const rows = await sql`
    INSERT INTO journal_posts (slug, title, excerpt, cover_url, blocks, published, published_at)
    VALUES (${p.slug}, ${p.title}, ${p.excerpt}, ${p.coverUrl ?? null},
            ${JSON.stringify(p.blocks)}::jsonb, true, ${publishedAt.toISOString()})
    ON CONFLICT (slug) DO NOTHING
    RETURNING slug
  `;
  if (rows.length) {
    inserted++;
    console.log(`+ ${p.slug} (${publishedAt.toISOString().slice(0, 10)})`);
  } else {
    skipped++;
    console.log(`= ${p.slug} already exists, skipped`);
  }
}
console.log(`Done: ${inserted} inserted, ${skipped} skipped (already present).`);

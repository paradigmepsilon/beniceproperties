// scripts/update-journal-posts-v2.mjs
// July 2026 journal content v2: replaces the body of the 35 seeded posts with
// long-form rewrites (1800-2500 WORDS each, SEO/AEO-shaped, humanized) and
// attaches the generated cover images served from /journal-covers/<slug>.jpg.
// DATA ONLY, UPDATE-only by slug: rows keep their id, slug, title, published
// state, and staggered published_at from the v1 seed; excerpt/blocks/cover_url
// are replaced and updated_at bumped. A slug not present in the DB is reported
// and skipped, never inserted (UO remains the authoring system of record).
//
// Validation before any write: 1800-2500 words of block text, no em/en dashes,
// no curly quotes, no banned AI-tell phrases, first block is a paragraph,
// unique slugs. Fails closed: any violation aborts the whole run.
//
//   node scripts/update-journal-posts-v2.mjs            # validate + update
//   node scripts/update-journal-posts-v2.mjs --dry-run  # validate only

import "dotenv/config";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_FILE = join(__dirname, "data", "journal_posts_2026_07_v2.json");
const COVER_BASE = "https://www.beniceproperties.com/journal-covers";

const DRY_RUN = process.argv.includes("--dry-run");
const MIN_WORDS = 1800;
const MAX_WORDS = 2500;

// AI-tell strings that must not appear anywhere in a post (case-insensitive).
const BANNED = [
  "isn't just", "is not just", "not only", "whether you're", "whether you are",
  "let's dive", "it's important to note", "in today's", "delve", "vibrant",
  "tapestry", "testament", "pivotal", "seamless", "elevate", "unlock",
  "empower", "foster", "showcase", "underscore", "game-chang", "nestled",
  "breathtaking", "stunning", "serves as", "stands as", "acts as a",
  "experts say", "studies show", "the future looks bright",
];

function words(post) {
  return post.blocks
    .map((b) => b.text ?? "")
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}

function validate(post, i) {
  const errors = [];
  if (!/^[a-z0-9-]+$/.test(post.slug ?? "")) errors.push("bad slug");
  if (!post.title) errors.push("missing title");
  if (!post.excerpt || post.excerpt.length < 100 || post.excerpt.length > 180)
    errors.push(`excerpt length ${post.excerpt?.length ?? 0} outside 100-180`);
  if (!Array.isArray(post.blocks) || post.blocks.length === 0) errors.push("no blocks");
  else {
    if (post.blocks[0].type !== "paragraph") errors.push("first block is not a paragraph");
    for (const b of post.blocks) {
      if (!["heading", "paragraph"].includes(b.type)) errors.push(`bad block type ${b.type}`);
    }
    const w = words(post);
    if (w < MIN_WORDS || w > MAX_WORDS) errors.push(`word count ${w} outside ${MIN_WORDS}-${MAX_WORDS}`);
  }
  const everything = JSON.stringify(post);
  if (/[—–]/.test(everything)) errors.push("contains em/en dash");
  if (/[‘’“”]/.test(everything)) errors.push("contains curly quotes");
  const lower = everything.toLowerCase();
  for (const ban of BANNED) {
    if (lower.includes(ban)) errors.push(`banned phrase: "${ban}"`);
  }
  return errors.map((e) => `post[${i}] ${post.slug ?? "?"}: ${e}`);
}

const posts = JSON.parse(await readFile(DATA_FILE, "utf-8"));
if (!Array.isArray(posts) || posts.length === 0) {
  console.error("No posts found in", DATA_FILE);
  process.exit(1);
}

const problems = posts.flatMap(validate);
if (new Set(posts.map((p) => p.slug)).size !== posts.length) problems.push("duplicate slugs");
if (problems.length) {
  console.error(`VALIDATION FAILED (${problems.length}):`);
  for (const p of problems) console.error(" -", p);
  process.exit(1);
}
const counts = posts.map(words);
console.log(
  `Validated ${posts.length} posts (words ${Math.min(...counts)}-${Math.max(...counts)}, ` +
    `total ${counts.reduce((a, b) => a + b, 0)}).`,
);

if (DRY_RUN) {
  console.log("Dry run — no updates.");
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set — point it at the target Neon DB first.");
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

let updated = 0;
let missing = 0;
for (const p of posts) {
  const rows = await sql`
    UPDATE journal_posts
       SET excerpt = ${p.excerpt},
           blocks = ${JSON.stringify(p.blocks)}::jsonb,
           cover_url = ${`${COVER_BASE}/${p.slug}.jpg`},
           updated_at = now()
     WHERE slug = ${p.slug}
     RETURNING slug
  `;
  if (rows.length) {
    updated++;
    console.log(`~ ${p.slug} (${words(p)} words, cover set)`);
  } else {
    missing++;
    console.warn(`! ${p.slug} not found in DB — skipped (no insert)`);
  }
}
console.log(`Done: ${updated} updated, ${missing} missing.`);

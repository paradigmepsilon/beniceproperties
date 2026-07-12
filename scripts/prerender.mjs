// scripts/prerender.mjs
// Build-time prerender of the crawlable routes. Vite ships a client-only SPA
// whose initial HTML is an empty <div id="root"> with one generic <title> —
// invisible to non-JS crawlers (social scrapers + AI answer engines like
// GPTBot/PerplexityBot/ClaudeBot) and handicapped on Google's first pass. This
// script fixes that: it serves the built dist/public over a local http server
// (with /api/* proxied to the live API so pages render with real data), opens
// each route in a headless Chrome (so React fully renders and the useSeo hook
// writes per-route <title>/meta/canonical/OG/JSON-LD), then writes the rendered
// HTML back as dist/public/<route>/index.html. Vercel's SPA rewrite (source
// excludes anything with a dot / an existing file) serves those static files,
// so a crawler hitting /str or /journal/<slug> gets real content, not the shell.
//
// Routes covered:
//   - The stable marketing set (ROUTES below, keep in sync with the sitemap).
//   - Every published journal article, discovered from GET /api/journal at
//     build time. New posts published in UO appear for non-JS crawlers on the
//     next deploy; humans and Google always get them immediately via the SPA.
// /property/:id and /room/:id are NOT prerendered (inventory pages churn with
// availability; they keep the runtime useSeo behavior, which Google renders).
//
// Chrome discovery, in order:
//   1. PLAYWRIGHT_CHROME_PATH / PUPPETEER_EXECUTABLE_PATH env, then common OS
//      install paths (local builds).
//   2. @sparticuz/chromium — a Lambda/CI-compatible headless Chromium that works
//      on Vercel's build image, where no system Chrome exists. This is what
//      makes prerendering actually run in production deploys.
// If neither yields a browser we SKIP prerendering and exit 0 with a clear
// message (falling back to the runtime meta layer) instead of failing the build.
//
// Analytics: PostHog requests are aborted inside the headless browser so every
// deploy doesn't pollute product analytics with phantom pageviews.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist", "public");
const PORT = 4178; // arbitrary, local-only

// Live API origin used two ways: (a) the local static server proxies /api/* to
// it so data-driven pages (hero images, journal, site-config) render for real;
// (b) the published journal slugs are fetched from it to build the route list.
const API_ORIGIN = (process.env.PRERENDER_API_ORIGIN || "https://www.beniceproperties.com").replace(/\/$/, "");

// The static marketing routes to prerender. Keep in sync with the sitemap.
const ROUTES = ["/", "/str", "/ltr", "/community", "/about", "/partner", "/journal"];

// Hosts the headless browser must not talk to (analytics noise per deploy).
const BLOCKED_HOSTS = ["posthog.com", "i.posthog.com"];

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

function findSystemChrome() {
  const envPath =
    process.env.PLAYWRIGHT_CHROME_PATH || process.env.PUPPETEER_EXECUTABLE_PATH;
  const candidates = [
    envPath,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  return candidates.find((p) => existsSync(p));
}

// Resolve a launchable browser: system Chrome first, else @sparticuz/chromium
// (present as a devDependency so Vercel builds can prerender). Returns
// { executablePath, args } or null.
async function resolveBrowser() {
  const system = findSystemChrome();
  if (system) return { executablePath: system, args: [] };
  try {
    const mod = await import("@sparticuz/chromium");
    const sparticuz = mod.default ?? mod;
    const executablePath = await sparticuz.executablePath();
    return { executablePath, args: sparticuz.args ?? [] };
  } catch (err) {
    console.warn(`[prerender] @sparticuz/chromium unavailable: ${err?.message || err}`);
    return null;
  }
}

// Minimal static file server over dist/public with an /api proxy to the live
// API and SPA fallback to index.html, mirroring the Vercel rewrites so client
// routing AND data fetching both resolve during rendering.
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const rawUrl = req.url || "/";
      const urlPath = decodeURIComponent(rawUrl.split("?")[0]);

      if (urlPath.startsWith("/api/")) {
        try {
          const upstream = await fetch(`${API_ORIGIN}${rawUrl}`, {
            headers: { accept: "application/json" },
          });
          const body = Buffer.from(await upstream.arrayBuffer());
          res.statusCode = upstream.status;
          res.setHeader(
            "Content-Type",
            upstream.headers.get("content-type") || "application/json",
          );
          res.end(body);
        } catch (err) {
          console.warn(`[prerender] API proxy failed for ${rawUrl}: ${err?.message || err}`);
          res.statusCode = 502;
          res.end("{}");
        }
        return;
      }

      let filePath = join(DIST, urlPath);
      let isFile = false;
      try {
        isFile = (await stat(filePath)).isFile();
      } catch {
        isFile = false;
      }
      if (!isFile) filePath = join(DIST, "index.html"); // SPA fallback
      const body = await readFile(filePath);
      res.setHeader("Content-Type", MIME[extname(filePath)] || "application/octet-stream");
      res.end(body);
    } catch {
      res.statusCode = 404;
      res.end("Not found");
    }
  });
  return new Promise((resolve) => server.listen(PORT, () => resolve(server)));
}

// Published journal slugs from the live API → prerender routes. Non-fatal: on
// any failure we just skip article prerendering (runtime layer still covers it).
async function journalRoutes() {
  try {
    const resp = await fetch(`${API_ORIGIN}/api/journal`, {
      headers: { accept: "application/json" },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const posts = await resp.json();
    if (!Array.isArray(posts)) return [];
    return posts
      .map((p) => p?.slug)
      .filter((s) => typeof s === "string" && /^[a-z0-9-]+$/.test(s))
      .map((s) => `/journal/${s}`);
  } catch (err) {
    console.warn(`[prerender] could not list journal posts (${err?.message || err}) — skipping article prerender.`);
    return [];
  }
}

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("[prerender] dist/public/index.html missing — run `vite build` first. Skipping.");
    return;
  }

  const browserSpec = await resolveBrowser();
  if (!browserSpec) {
    console.warn(
      "[prerender] No launchable Chrome/Chromium found. Skipping prerender " +
        "(routes still work via the runtime SEO meta layer). " +
        "Set PLAYWRIGHT_CHROME_PATH or install @sparticuz/chromium to enable.",
    );
    return;
  }

  const routes = [...ROUTES, ...(await journalRoutes())];

  const server = await startServer();
  const browser = await chromium.launch({
    executablePath: browserSpec.executablePath,
    args: browserSpec.args,
    headless: true,
  });
  const page = await browser.newPage();

  // Keep deploys out of product analytics.
  await page.route("**/*", (route) => {
    const host = new URL(route.request().url()).hostname;
    if (BLOCKED_HOSTS.some((b) => host === b || host.endsWith(`.${b}`))) {
      return route.abort();
    }
    return route.continue();
  });

  let ok = 0;
  try {
    for (const route of routes) {
      try {
        await page.goto(`http://localhost:${PORT}${route}`, {
          waitUntil: "networkidle",
          timeout: 30000,
        });
        // Give the useSeo effect + any first paint a beat to settle.
        await page.waitForSelector("#root > *", { timeout: 15000 });
        const html = await page.content();

        const outDir = route === "/" ? DIST : join(DIST, route);
        await mkdir(outDir, { recursive: true });
        await writeFile(join(outDir, "index.html"), html, "utf-8");
        ok++;
        console.log(`[prerender] ${route} -> ${join(outDir.replace(DIST, "dist/public"), "index.html")}`);
      } catch (err) {
        // One bad route must not sink the rest — that route just keeps the
        // runtime meta layer.
        console.warn(`[prerender] ${route} failed (skipped): ${err?.message || err}`);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`[prerender] done — ${ok}/${routes.length} routes prerendered.`);
}

main().catch((err) => {
  // Never fail the build on a prerender error — the runtime meta layer is the
  // fallback. Log loudly so it's visible in CI, but exit 0.
  console.error("[prerender] failed (non-fatal, SPA still ships):", err?.message || err);
});

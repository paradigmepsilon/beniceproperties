// scripts/prerender.mjs
// Build-time prerender of the stable marketing routes. Vite ships a client-only
// SPA whose initial HTML is an empty <div id="root"> with one generic <title> —
// invisible to non-JS crawlers (social + AI answer engines) and handicapped on
// Google's first pass. This script fixes that for the static marketing pages:
// it serves the built dist/public over a local http server, opens each route in
// a headless Chrome via playwright-core (so React fully renders and the useSeo
// hook writes per-route <title>/meta/canonical/OG/JSON-LD), then writes the
// rendered HTML back as dist/public/<route>/index.html. Vercel's SPA rewrite
// (source excludes anything with a dot / an existing file) serves those static
// files, so a crawler hitting /str gets real content, not the empty shell.
//
// Dynamic routes (/property/:id, /room/:id, /journal/:slug) are NOT prerendered
// here — they need per-record data. They keep the runtime useSeo behavior, which
// is enough for Google. This is intentionally scoped to the known static set.
//
// Chrome discovery: playwright-core does not bundle a browser, so we locate a
// system Chrome/Chromium (PLAYWRIGHT_CHROME_PATH / PUPPETEER_EXECUTABLE_PATH env,
// then common OS paths). If none is found we SKIP prerendering and exit 0 with a
// clear message, so a build environment without Chrome still succeeds (falling
// back to the runtime meta layer) instead of failing the whole build.

import { createServer } from "node:http";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist", "public");
const PORT = 4178; // arbitrary, local-only

// The static marketing routes to prerender. Keep in sync with the sitemap.
const ROUTES = ["/", "/str", "/ltr", "/community", "/about", "/partner", "/journal"];

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

function findChrome() {
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

// Minimal static file server over dist/public with SPA fallback to index.html,
// mirroring the Vercel rewrite so client routing resolves during rendering.
function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
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

async function main() {
  if (!existsSync(join(DIST, "index.html"))) {
    console.error("[prerender] dist/public/index.html missing — run `vite build` first. Skipping.");
    return;
  }

  const executablePath = findChrome();
  if (!executablePath) {
    console.warn(
      "[prerender] No system Chrome/Chromium found. Skipping prerender " +
        "(routes still work via the runtime SEO meta layer). " +
        "Set PLAYWRIGHT_CHROME_PATH to enable.",
    );
    return;
  }

  const server = await startServer();
  const browser = await chromium.launch({ executablePath, headless: true });
  const page = await browser.newPage();

  let ok = 0;
  try {
    for (const route of ROUTES) {
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
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log(`[prerender] done — ${ok}/${ROUTES.length} routes prerendered.`);
}

main().catch((err) => {
  // Never fail the build on a prerender error — the runtime meta layer is the
  // fallback. Log loudly so it's visible in CI, but exit 0.
  console.error("[prerender] failed (non-fatal, SPA still ships):", err?.message || err);
});

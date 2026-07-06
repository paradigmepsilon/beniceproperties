// server/vite.ts
// Dev: mount Vite as Express middleware (SPA). Prod: serve the built client.
// Mirrors the TRAD app's setupVite / serveStatic pattern.

import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { type Server } from "http";
import { nanoid } from "nanoid";
import { fileURLToPath, pathToFileURL } from "url";

const moduleDir =
  typeof import.meta.dirname === "string"
    ? import.meta.dirname
    : path.dirname(fileURLToPath(import.meta.url));

export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer, createLogger } = await import("vite");
  const configUrl = pathToFileURL(path.resolve(moduleDir, "..", "vite.config.ts")).href;
  const { default: viteConfig } = await import(configUrl);
  const resolvedConfig =
    typeof viteConfig === "object" && viteConfig !== null
      ? (viteConfig as Record<string, unknown>)
      : {};

  const viteLogger = createLogger();
  const vite = await createViteServer({
    ...resolvedConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: {
      middlewareMode: true,
      hmr: { server },
      allowedHosts: true as const,
      host: true,
    },
    appType: "custom",
  });

  app.use(vite.middlewares);

  // Kill any service worker left over from an earlier build that ran the PWA in
  // dev. Without this, requests for /sw.js fall through to the catch-all below
  // and get served index.html (HTTP 200) — so the browser's SW update check
  // never sees a dead worker and the zombie keeps serving a stale precached
  // shell, blanking the page until a hard refresh. Serve a self-unregistering
  // tombstone instead so the SW removes itself on its next update fetch.
  app.get(/^\/(sw\.js|workbox-.*\.js)$/, (_req, res) => {
    res
      .status(200)
      .set({ "Content-Type": "application/javascript", "Cache-Control": "no-store" })
      .end(
        "self.addEventListener('install',()=>self.skipWaiting());" +
          "self.addEventListener('activate',(e)=>{e.waitUntil((async()=>{" +
          "await self.registration.unregister();" +
          "if(self.caches){for(const k of await caches.keys())await caches.delete(k);}" +
          "const cs=await self.clients.matchAll();for(const c of cs)c.navigate(c.url);" +
          "})());});",
      );
  });

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(moduleDir, "..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  const distPath = path.resolve(moduleDir, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run \`npm run build\` first.`,
    );
  }
  app.use(
    express.static(distPath, {
      setHeaders(res, filePath) {
        // Never cache the service worker or manifest so PWA updates ship.
        if (/(?:sw\.js|workbox-.*\.js|manifest\.webmanifest)$/.test(filePath)) {
          res.setHeader("Cache-Control", "no-cache");
        }
      },
    }),
  );
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

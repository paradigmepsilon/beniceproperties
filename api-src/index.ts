// api/index.ts
// Vercel serverless entry. Wraps the shared Express app as a single function;
// vercel.json rewrites every /api/* request here. The SPA is served by Vercel's
// CDN from dist/public (see vercel.json), so this function never touches static
// assets or Vite.
//
// The Express app is built once per warm instance (lazy singleton) so cold
// starts pay the setup cost only once.

import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { Express } from "express";
import { createApp } from "../server/app";

let appPromise: Promise<Express> | null = null;

function getApp(): Promise<Express> {
  if (!appPromise) appPromise = createApp();
  return appPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const app = await getApp();
  // Express apps are request handlers — hand the raw req/res straight through.
  return (app as unknown as (req: VercelRequest, res: VercelResponse) => void)(req, res);
}

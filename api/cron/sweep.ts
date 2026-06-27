// api/cron/sweep.ts
// Vercel Cron target. Replaces the long-lived setInterval scheduler (which
// can't run on serverless). vercel.json schedules a daily GET here; Vercel
// sends an Authorization: Bearer <CRON_SECRET> header we verify.
//
// Mirrors BackgroundScheduler.sweep(): a safety pass over active co-living
// bookings, surfacing pending manual payments, then the daily KPI rollup/push.

import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { storage } from "../../server/storage";
import { buildAndPushSnapshot } from "../../server/integrations/kpiRollup";
import { log } from "../../server/server-log";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Reject anything else.
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const active = (await storage.getBookings({ status: "ACTIVE" })).length;
    if (active > 0) log(`weeklyRentRun: ${active} active co-living booking(s) checked`, "cron");

    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "cron");
    }

    const snapshot = await buildAndPushSnapshot();
    return res.json({ ok: true, active, pending: pending.length, snapshot });
  } catch (err) {
    log(`sweep error: ${(err as Error).message}`, "cron");
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
}

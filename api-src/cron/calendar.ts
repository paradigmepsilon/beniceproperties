// api/cron/calendar.ts
// Vercel Cron target — refreshes every active Airbnb iCal feed into
// external_bookings so the guest calendar + booking/lease guards stay current.
// vercel.json schedules this hourly (Vercel Pro allows sub-daily crons); Vercel
// sends an Authorization: Bearer <CRON_SECRET> header we verify. Idempotent —
// safe on every run; a per-feed fetch failure is captured, never thrown.

import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { refreshExternalCalendars, checkCalendarSyncHealth } from "../../server/lib/icalSync";
import { log } from "../../server/server-log";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await refreshExternalCalendars();
    if (result.totalListings > 0) {
      log(
        `calendar cron: ${result.totalListings} listing(s), ${result.created} new, ${result.removed} removed, ${result.failed} failed`,
        "cron",
      );
    }

    // Runs hourly (unlike the daily sweep) so a stale/failed calendar sync
    // is noticed within the hour. Own try/catch — never blocks the response.
    try {
      await checkCalendarSyncHealth();
    } catch (err) {
      log(`calendar sync health check failed: ${(err as Error).message}`, "cron");
    }

    return res.json({ ...result, ok: true });
  } catch (err) {
    log(`calendar cron error: ${(err as Error).message}`, "cron");
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
}

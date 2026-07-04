// api/cron/calendar.ts
// Vercel Cron target — refreshes every active Airbnb iCal feed into
// external_bookings so the guest calendar + booking/lease guards stay current.
// vercel.json schedules this hourly (Vercel Pro allows sub-daily crons); Vercel
// sends an Authorization: Bearer <CRON_SECRET> header we verify. Idempotent —
// safe on every run; a per-feed fetch failure is captured, never thrown.

import "dotenv/config";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { refreshExternalCalendars } from "../../server/lib/icalSync";
import { log } from "../../server/server-log";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await refreshExternalCalendars();
    const created = result.listings.reduce((n, l) => n + l.created, 0);
    const removed = result.listings.reduce((n, l) => n + l.removed, 0);
    const failed = result.listings.filter((l) => !l.ok).length;
    if (result.totalListings > 0) {
      log(
        `calendar cron: ${result.totalListings} listing(s), ${created} new, ${removed} removed, ${failed} failed`,
        "cron",
      );
    }
    return res.json({ ok: true, ...result });
  } catch (err) {
    log(`calendar cron error: ${(err as Error).message}`, "cron");
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
}

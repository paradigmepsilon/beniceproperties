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
import { cronAuthFailure } from "../../server/lib/cronAuth";
import { runLeaseHoldExpiry } from "../../server/lib/leaseHolds";
import { syncRoomOccupancyStatus } from "../../server/lib/occupancy";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Fails CLOSED on
  // Vercel when the secret is unset — see server/lib/cronAuth.ts.
  const denied = cronAuthFailure(req.headers.authorization);
  if (denied) return res.status(denied.status).json({ message: denied.message });

  try {
    const result = await refreshExternalCalendars();
    if (result.totalListings > 0) {
      log(
        `calendar cron: ${result.totalListings} listing(s), ${result.created} new, ${result.removed} removed, ${result.failed} failed`,
        "cron",
      );
    }

    // Hourly, unlike the daily sweep: a hold that should lapse the day after
    // move-in must not wait for 08:00 UTC. Freeing a room can change today's
    // occupancy, and this handler has no occupancy sync of its own, so run one
    // only when something was actually released.
    try {
      const released = await runLeaseHoldExpiry();
      if (released.movedIn > 0 || released.abandoned > 0) {
        await syncRoomOccupancyStatus();
      }
    } catch (err) {
      log(`lease hold expiry failed: ${(err as Error).message}`, "cron");
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

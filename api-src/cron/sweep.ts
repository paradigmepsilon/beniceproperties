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
import { runScheduledRentSweep } from "../../server/lib/leasePayments";
import { runDunningSweep } from "../../server/lib/dunning";
import { runLeaseEndingNotices } from "../../server/lib/lifecycle";
import { refreshExternalCalendars, checkCalendarSyncHealth } from "../../server/lib/icalSync";
import { syncRoomOccupancyStatus } from "../../server/lib/occupancy";
import { log } from "../../server/server-log";
import { cronAuthFailure } from "../../server/lib/cronAuth";
import { runLeaseHoldExpiry } from "../../server/lib/leaseHolds";
import {
  runStayGhostSweep,
  runStayCheckoutReminders,
  runStayPreArrival,
} from "../../server/lib/stayReminders";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Fails CLOSED on
  // Vercel when the secret is unset — see server/lib/cronAuth.ts.
  const denied = cronAuthFailure(req.headers.authorization);
  if (denied) return res.status(denied.status).json({ message: denied.message });

  try {
    // Refresh Airbnb iCal blocks first so the guest calendar + guards are fresh
    // even on days the dedicated hourly calendar cron didn't cover something.
    const calendar = await refreshExternalCalendars();

    // Release expired room holds BEFORE the occupancy sync, so a room freed
    // here has its status corrected in the same pass.
    try {
      await runLeaseHoldExpiry();
    } catch (err) {
      log(`lease hold expiry failed: ${(err as Error).message}`, "cron");
    }

    // Daily room-occupancy status sync + calendar-sync health check. Each
    // wrapped separately so one failing never blocks the rest of the sweep.
    let occupancy: Awaited<ReturnType<typeof syncRoomOccupancyStatus>> | undefined;
    try {
      occupancy = await syncRoomOccupancyStatus();
    } catch (err) {
      log(`room occupancy sync failed: ${(err as Error).message}`, "cron");
    }
    try {
      await checkCalendarSyncHealth();
    } catch (err) {
      log(`calendar sync health check failed: ${(err as Error).message}`, "cron");
    }

    // Phase 4: charge due CARD_ON_FILE rent installments (idempotent).
    const rent = await runScheduledRentSweep();
    // Phase 5: reminders, overdue messaging, late fees, defaults (idempotent/day).
    const dunning = await runDunningSweep();
    // Phase 7: lease-ending notices ~14 days out (idempotent).
    const endingNotices = await runLeaseEndingNotices();

    // --- Short-stay approval gate. THIS is the scheduler that runs in
    // production; server/scheduler.ts cannot (no long-lived process on Vercel).
    // Each job is wrapped individually: the rent/dunning/lifecycle calls above
    // sit in the outer try only, so a throw there 500s the whole cron and skips
    // the KPI push. The new jobs must never be able to do that — especially the
    // one that refunds money.
    let stayGate: Awaited<ReturnType<typeof runStayGhostSweep>> | undefined;
    try {
      stayGate = await runStayGhostSweep();
    } catch (err) {
      log(`stay gate sweep failed: ${(err as Error).message}`, "cron");
    }
    let stayReminders: Awaited<ReturnType<typeof runStayCheckoutReminders>> | undefined;
    try {
      stayReminders = await runStayCheckoutReminders();
    } catch (err) {
      log(`stay checkout reminders failed: ${(err as Error).message}`, "cron");
    }
    let stayArrival: Awaited<ReturnType<typeof runStayPreArrival>> | undefined;
    try {
      stayArrival = await runStayPreArrival();
    } catch (err) {
      log(`stay pre-arrival failed: ${(err as Error).message}`, "cron");
    }

    const active = (await storage.getBookings({ status: "ACTIVE" })).length;
    if (active > 0) log(`weeklyRentRun: ${active} active co-living booking(s) checked`, "cron");

    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "cron");
    }

    const snapshot = await buildAndPushSnapshot();
    return res.json({
      ok: true,
      calendar,
      occupancy,
      rent,
      dunning,
      endingNotices,
      stayGate,
      stayReminders,
      stayArrival,
      active,
      pending: pending.length,
      snapshot,
    });
  } catch (err) {
    log(`sweep error: ${(err as Error).message}`, "cron");
    return res.status(500).json({ ok: false, message: (err as Error).message });
  }
}

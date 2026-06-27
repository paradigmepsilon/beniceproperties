// server/scheduler.ts
// =============================================================================
// Background scheduler for recurring jobs. Mirrors the TRAD app's
// setInterval-with-locking pattern (no external queue).
//
// Phase 1: the loop exists and logs, but the jobs are STUBS. Real work lands in
// later phases:
//   - weeklyRentRun()        → Phase 4 (Stripe subscription reconciliation)
//   - paymentStatusCheck()   → Phase 4 (poll/settle pending payments)
//   - dailyKpiRollupAndPush()→ Phase 6 (build snapshot + push to Unified Ops)
// =============================================================================

import { log } from "./server-log";
import { storage } from "./storage";
import { buildAndPushSnapshot } from "./integrations/kpiRollup";
import { runScheduledRentSweep } from "./lib/leasePayments";
import { runDunningSweep } from "./lib/dunning";
import { runLeaseEndingNotices } from "./lib/lifecycle";

interface SchedulerConfig {
  /** How often to run the recurring sweep. Default: 1h. */
  intervalMs: number;
  enableLogging: boolean;
}

class BackgroundScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly config: SchedulerConfig;

  constructor(config?: Partial<SchedulerConfig>) {
    this.config = {
      intervalMs: config?.intervalMs ?? 60 * 60 * 1000,
      enableLogging: config?.enableLogging ?? true,
    };
  }

  start(): void {
    if (this.intervalId) return;
    if (this.config.enableLogging) log("scheduler started (jobs are stubs in Phase 1)", "scheduler");
    // First sweep shortly after boot, then on the interval.
    setTimeout(() => this.sweep(), 30_000);
    this.intervalId = setInterval(() => this.sweep(), this.config.intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.config.enableLogging) log("scheduler stopped", "scheduler");
  }

  /** One pass over all recurring jobs, guarded against overlap. */
  private async sweep(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      await this.weeklyRentRun();
      await this.dunningRun();
      await this.lifecycleRun();
      await this.paymentStatusCheck();
      await this.dailyKpiRollupAndPush();
    } catch (err) {
      log(`sweep error: ${(err as Error).message}`, "scheduler");
    } finally {
      this.isRunning = false;
    }
  }

  // ---- Recurring jobs ----

  private async weeklyRentRun(): Promise<void> {
    // Phase 4: OUR OWN scheduler drives recurring rent (not Stripe Subscriptions).
    // Charge every due CARD_ON_FILE installment against the saved card. Idempotent
    // — safe to run on every sweep; already-charged rows are skipped.
    await runScheduledRentSweep();
  }

  private async dunningRun(): Promise<void> {
    // Phase 5: reminders, overdue messaging, late-fee accrual, default detection.
    // Idempotent per day via notification_log + the unique late-fee accrual guard.
    await runDunningSweep();
  }

  private async lifecycleRun(): Promise<void> {
    // Phase 7: lease-ending notices (~14 days out). Idempotent via lifecycle_events.
    await runLeaseEndingNotices();
  }

  private async paymentStatusCheck(): Promise<void> {
    // Surface CashApp/Zelle payments still pending so they don't get forgotten.
    const pending = await storage.getPendingManualPayments();
    if (pending.length > 0) {
      log(`paymentStatusCheck: ${pending.length} payment(s) awaiting reconciliation`, "scheduler");
    }
  }

  private async dailyKpiRollupAndPush(): Promise<void> {
    try {
      await buildAndPushSnapshot();
    } catch (err) {
      log(`KPI rollup failed: ${(err as Error).message}`, "scheduler");
    }
  }
}

export const backgroundScheduler = new BackgroundScheduler();

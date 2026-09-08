// client/src/components/date-range-picker.tsx
// Mobile-first check-in / check-out range picker built on the shadcn Calendar
// (react-day-picker v8, mode="range"). Disabled days come from the caller (busy
// ranges → matchers) and can't be picked as endpoints. v8 has no
// `excludeDisabled`, so a range CAN still span a disabled day — the caller's
// `rangeHitsBusy` guard rejects that (and the server re-validates on submit).
// Emits ISO `YYYY-MM-DD` strings so it drops into the existing checkIn/checkOut
// string state without Date/TZ juggling.

import { useEffect, useState } from "react";
import { addDays, addMonths, format, isSameMonth, parseISO, startOfMonth } from "date-fns";
import type { DateRange, Matcher } from "react-day-picker";
import { CalendarDays } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { shortDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const iso = (d: Date) => format(d, "yyyy-MM-dd");

interface DateRangePickerProps {
  checkIn: string;
  checkOut: string;
  onChange: (next: { checkIn: string; checkOut: string }) => void;
  /** Disabled-day matchers (from busyToDisabledMatchers). */
  disabled?: Matcher[];
  /**
   * Minimum number of NIGHTS in the range. When set, a checkout fewer than this
   * many nights after the check-in won't commit — the too-short pick resets. (We
   * convert to react-day-picker's selected-day count internally, since its `min`
   * counts days inclusive of both endpoints = nights + 1.) Used by co-living
   * (7-night minimum); omit for STR (no minimum).
   */
  minNights?: number;
  /** Labels above the two cells. */
  startLabel?: string;
  endLabel?: string;
  className?: string;
  "data-testid"?: string;
}

export function DateRangePicker({
  checkIn,
  checkOut,
  onChange,
  disabled = [],
  minNights,
  startLabel = "Check-in",
  endLabel = "Check-out",
  className,
  "data-testid": testId,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selected: DateRange | undefined = checkIn
    ? { from: parseISO(checkIn), to: checkOut ? parseISO(checkOut) : undefined }
    : undefined;

  // The month the calendar is showing. Controlled (not just `defaultMonth`) so we
  // can move it after a check-in is picked — see the effect below.
  const [month, setMonth] = useState<Date>(() => startOfMonth(checkIn ? parseISO(checkIn) : new Date()));

  // Two months side by side once there's room, one on phones. A minimum-stay
  // floor usually lands the first valid checkout in the NEXT month, so showing
  // only one month is what left guests staring at a fully greyed calendar.
  const [monthCount, setMonthCount] = useState(1);
  useEffect(() => {
    const mq = window.matchMedia?.("(min-width: 640px)");
    if (!mq) return;
    const apply = () => setMonthCount(mq.matches ? 2 : 1);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Once a check-in is chosen and the guest is picking a move-out, make sure the
  // earliest date they're ALLOWED to pick is actually on screen. With a 7-night
  // co-living minimum, picking Sep 29 puts every selectable move-out in October;
  // without this the calendar sat on September with every day disabled and the
  // guest had no way to tell the site wasn't broken.
  useEffect(() => {
    if (!open || !checkIn || checkOut) return;
    const floor = startOfMonth(addDays(parseISO(checkIn), Math.max(1, minNights ?? 1)));
    setMonth((current) => {
      // Months already on screen: `current`, plus the next one when showing two.
      const visible = monthCount > 1 ? [current, addMonths(current, 1)] : [current];
      return visible.some((m) => isSameMonth(floor, m)) ? current : floor;
    });
  }, [open, checkIn, checkOut, minNights, monthCount]);

  // Reopening with no dates should land on the current month, not wherever the
  // guest last scrolled to.
  useEffect(() => {
    if (open && !checkIn) setMonth(startOfMonth(new Date()));
  }, [open, checkIn]);

  function handleSelect(range: DateRange | undefined) {
    const from = range?.from ? iso(range.from) : "";
    const to = range?.to ? iso(range.to) : "";
    onChange({ checkIn: from, checkOut: to });
    // Close once a full range is chosen; keep open while only check-in is set.
    if (from && to) setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          data-testid={testId}
          className={cn(
            "grid w-full grid-cols-2 gap-3 rounded-lg border border-input bg-background p-1 text-left",
            className,
          )}
        >
          <span className="rounded-md px-3 py-2">
            <Label className="pointer-events-none text-xs text-muted-foreground">{startLabel}</Label>
            <span className="mt-0.5 flex min-h-6 items-center gap-1.5 text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {checkIn ? shortDate(checkIn) : "Add date"}
            </span>
          </span>
          <span className="rounded-md px-3 py-2">
            <Label className="pointer-events-none text-xs text-muted-foreground">{endLabel}</Label>
            <span className="mt-0.5 flex min-h-6 items-center gap-1.5 text-sm">
              <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              {checkOut ? shortDate(checkOut) : "Add date"}
            </span>
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* react-day-picker v8 has no `excludeDisabled`, so a selected range can
            span a disabled day. The caller's `rangeHitsBusy` guard rejects such a
            range (disables Continue) and the server re-validates on submit. */}
        <Calendar
          mode="range"
          numberOfMonths={monthCount}
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          // Minimum-nights guard. react-day-picker v8's range `min` counts
          // SELECTED DAYS (both endpoints inclusive), which is nights + 1 — so a
          // 7-night floor needs min=8. We convert here so the prop stays in
          // guest-facing NIGHTS. A checkout closer than this won't commit; the
          // pick resets. Omitted (undefined) for callers without a minimum (STR).
          min={minNights ? minNights + 1 : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

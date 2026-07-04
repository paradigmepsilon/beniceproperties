// client/src/components/date-range-picker.tsx
// Mobile-first check-in / check-out range picker built on the shadcn Calendar
// (react-day-picker v8, mode="range"). Disabled days come from the caller (busy
// ranges → matchers) and can't be picked as endpoints. v8 has no
// `excludeDisabled`, so a range CAN still span a disabled day — the caller's
// `rangeHitsBusy` guard rejects that (and the server re-validates on submit).
// Emits ISO `YYYY-MM-DD` strings so it drops into the existing checkIn/checkOut
// string state without Date/TZ juggling.

import { useState } from "react";
import { format, parseISO } from "date-fns";
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
          numberOfMonths={1}
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
          // Minimum-nights guard. react-day-picker v8's range `min` counts
          // SELECTED DAYS (both endpoints inclusive), which is nights + 1 — so a
          // 7-night floor needs min=8. We convert here so the prop stays in
          // guest-facing NIGHTS. A checkout closer than this won't commit; the
          // pick resets. Omitted (undefined) for callers without a minimum (STR).
          min={minNights ? minNights + 1 : undefined}
          defaultMonth={checkIn ? parseISO(checkIn) : undefined}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}

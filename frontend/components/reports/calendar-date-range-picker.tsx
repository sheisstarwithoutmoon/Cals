"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "cn";

export interface CustomDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

export interface CalendarDateRangePickerProps {
  value?: CustomDateRange;
  onChange: (range: CustomDateRange) => void;
  onClose?: () => void;
  requireApply?: boolean;
  onApply?: (range: CustomDateRange) => void;
}

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatHumanRange(startStr: string, endStr: string): string {
  if (!startStr && !endStr) return "Select date range";
  if (startStr && !endStr) {
    const s = new Date(`${startStr}T00:00:00`);
    return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  if (startStr === endStr) {
    const s = new Date(`${startStr}T00:00:00`);
    return s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  const s = new Date(`${startStr}T00:00:00`);
  const e = new Date(`${endStr}T00:00:00`);
  const sYear = s.getFullYear();
  const eYear = e.getFullYear();
  if (sYear === eYear) {
    return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `${s.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} – ${e.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  dayIndex: number; // 0=Mo ... 6=Su
}

export function CalendarDateRangePicker({
  value,
  onChange,
  onClose,
  requireApply = false,
  onApply,
}: CalendarDateRangePickerProps) {
  // Initialize view month to currently selected endDate (or startDate/today)
  const initialDate = useMemo(() => {
    if (value?.endDate) {
      return new Date(`${value.endDate}T00:00:00`);
    }
    if (value?.startDate) {
      return new Date(`${value.startDate}T00:00:00`);
    }
    return new Date();
  }, [value?.startDate, value?.endDate]);

  const [viewDate, setViewDate] = useState<Date>(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1)
  );

  useEffect(() => {
    if (value?.endDate) {
      const d = new Date(`${value.endDate}T00:00:00`);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    } else if (value?.startDate) {
      const d = new Date(`${value.startDate}T00:00:00`);
      setViewDate(new Date(d.getFullYear(), d.getMonth(), 1));
    }
  }, [value?.startDate, value?.endDate]);

  const [selectingStart, setSelectingStart] = useState<string | null>(null);
  const [hoverDateKey, setHoverDateKey] = useState<string | null>(null);
  const [stagedRange, setStagedRange] = useState<CustomDateRange>({
    startDate: value?.startDate ?? "",
    endDate: value?.endDate ?? "",
  });

  useEffect(() => {
    setStagedRange({
      startDate: value?.startDate ?? "",
      endDate: value?.endDate ?? "",
    });
  }, [value?.startDate, value?.endDate]);

  const todayKey = useMemo(() => toDateKey(new Date()), []);

  const currentStart = selectingStart ?? stagedRange.startDate;
  const currentEnd = selectingStart ? (hoverDateKey ?? selectingStart) : stagedRange.endDate;

  const [effectiveStart, effectiveEnd] = useMemo(() => {
    if (!currentStart && !currentEnd) return ["", ""];
    if (currentStart && !currentEnd) return [currentStart, currentStart];
    if (!currentStart && currentEnd) return [currentEnd, currentEnd];
    return currentStart <= currentEnd
      ? [currentStart, currentEnd]
      : [currentEnd, currentStart];
  }, [currentStart, currentEnd]);

  const daysGrid = useMemo<CalendarDay[]>(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    // Monday-first weekday for the 1st of this month (0=Mo, 6=Su)
    const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: CalendarDay[] = [];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDate = new Date(year, month - 1, daysInPrevMonth - i);
      const key = toDateKey(prevDate);
      days.push({
        date: prevDate,
        dateKey: key,
        dayNumber: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dayIndex: (prevDate.getDay() + 6) % 7,
      });
    }

    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const curDate = new Date(year, month, d);
      const key = toDateKey(curDate);
      days.push({
        date: curDate,
        dateKey: key,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: key === todayKey,
        dayIndex: (curDate.getDay() + 6) % 7,
      });
    }

    // Leading days from next month to complete 7-day rows
    const remaining = (7 - (days.length % 7)) % 7;
    for (let n = 1; n <= remaining; n++) {
      const nextDate = new Date(year, month + 1, n);
      const key = toDateKey(nextDate);
      days.push({
        date: nextDate,
        dateKey: key,
        dayNumber: n,
        isCurrentMonth: false,
        isToday: key === todayKey,
        dayIndex: (nextDate.getDay() + 6) % 7,
      });
    }

    return days;
  }, [viewDate, todayKey]);

  const now = new Date();
  const isCurrentOrFutureMonth =
    viewDate.getFullYear() > now.getFullYear() ||
    (viewDate.getFullYear() === now.getFullYear() &&
      viewDate.getMonth() >= now.getMonth());

  function handlePrevMonth() {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  }

  function handleNextMonth() {
    if (isCurrentOrFutureMonth) return;
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  }

  function handleDayClick(day: CalendarDay) {
    if (day.dateKey > todayKey) return; // Future dates are not allowed!

    if (!selectingStart) {
      // First click: start selecting range
      setSelectingStart(day.dateKey);
      setHoverDateKey(null);
    } else {
      // Second click: complete range selection
      const rawStart = selectingStart <= day.dateKey ? selectingStart : day.dateKey;
      const rawEnd = selectingStart <= day.dateKey ? day.dateKey : selectingStart;
      const start = rawStart > todayKey ? todayKey : rawStart;
      const end = rawEnd > todayKey ? todayKey : rawEnd;
      setSelectingStart(null);
      setHoverDateKey(null);
      setStagedRange({ startDate: start, endDate: end });

      if (!requireApply) {
        onChange({ startDate: start, endDate: end });
        onClose?.();
      }
    }
  }

  const monthTitle = viewDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-[285px] select-none p-2 text-sm">
      {/* Month header & navigation */}
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="font-semibold text-foreground">{monthTitle}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handlePrevMonth}
            aria-label="Previous month"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ChevronLeftIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={handleNextMonth}
            disabled={isCurrentOrFutureMonth}
            aria-label="Next month"
            className={cn(
              "flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors",
              isCurrentOrFutureMonth
                ? "opacity-25 cursor-not-allowed"
                : "hover:bg-muted hover:text-foreground"
            )}
          >
            <ChevronRightIcon className="size-4" />
          </button>
        </div>
      </div>

      {/* Weekday headers: Mo, Tu, We, Th, Fr, Sa, Su */}
      <div className="mb-1.5 grid grid-cols-7 text-center">
        {WEEKDAYS.map((day) => (
          <div
            key={day}
            className="text-[12px] font-medium text-muted-foreground/70"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-y-1 text-center">
        {daysGrid.map((day) => {
          const isFuture = day.dateKey > todayKey;
          const isSelectedStart = day.dateKey === effectiveStart;
          const isSelectedEnd = day.dateKey === effectiveEnd;
          const isEndpoint = !isFuture && (isSelectedStart || isSelectedEnd);
          const hasRange = effectiveStart && effectiveEnd && effectiveStart !== effectiveEnd;
          const isInRange =
            !isFuture &&
            hasRange &&
            day.dateKey >= effectiveStart &&
            day.dateKey <= effectiveEnd;

          // Connecting light emerald pill background logic
          const showLeftPill = isInRange && !isSelectedStart;
          const showRightPill = isInRange && !isSelectedEnd;
          const isMonday = day.dayIndex === 0;
          const isSunday = day.dayIndex === 6;

          return (
            <div
              key={day.dateKey}
              className="relative flex h-8 items-center justify-center"
              onMouseEnter={() => {
                if (selectingStart && !isFuture) {
                  setHoverDateKey(day.dateKey);
                }
              }}
            >
              {/* Very light emerald range background pill */}
              {showLeftPill && (
                <div
                  className={cn(
                    "absolute left-0 top-0 bottom-0 w-1/2 bg-emerald-50 dark:bg-emerald-950/40",
                    isMonday && "rounded-l-full"
                  )}
                />
              )}
              {showRightPill && (
                <div
                  className={cn(
                    "absolute right-0 top-0 bottom-0 w-1/2 bg-emerald-50 dark:bg-emerald-950/40",
                    isSunday && "rounded-r-full"
                  )}
                />
              )}

              {/* Day button */}
              <button
                type="button"
                onClick={() => handleDayClick(day)}
                disabled={isFuture}
                className={cn(
                  "relative z-10 flex size-7 items-center justify-center text-xs font-normal transition-colors outline-none",
                  // Future disabled styling: light neutral gray, but readable
                  isFuture &&
                    "pointer-events-none cursor-not-allowed text-stone-300 dark:text-stone-600 hover:bg-transparent",
                  // Outside month text color
                  !isFuture && !day.isCurrentMonth && "text-stone-400 dark:text-stone-500",
                  // Current month normal day
                  !isFuture && day.isCurrentMonth && "text-stone-800 dark:text-stone-200",
                  // Range in-between text color (dark emerald on light emerald pill)
                  !isFuture && isInRange && !isEndpoint && "font-medium text-emerald-900 dark:text-emerald-200",
                  // Endpoint (start or end) solid emerald circle only
                  isEndpoint &&
                    "rounded-full bg-emerald-700 font-medium text-white shadow-xs hover:bg-emerald-800",
                  // Hover when not selected
                  !isFuture && !isEndpoint && "rounded-full hover:bg-muted/80",
                  // Today font emphasis (no orange ring)
                  day.isToday && !isEndpoint && "font-semibold text-foreground"
                )}
              >
                {day.dayNumber}
              </button>
            </div>
          );
        })}
      </div>

      {/* Selected range and Apply button (Clean professional footer, no duplicate or numeric labels) */}
      <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
        <span className="text-xs font-medium text-foreground">
          {formatHumanRange(effectiveStart, effectiveEnd)}
        </span>
        {requireApply && (
          <button
            type="button"
            disabled={!effectiveStart || !effectiveEnd}
            onClick={() => {
              if (effectiveStart && effectiveEnd) {
                const finalRange = { startDate: effectiveStart, endDate: effectiveEnd };
                onApply ? onApply(finalRange) : onChange(finalRange);
                onClose?.();
              }
            }}
            className={cn(
              "rounded-full bg-emerald-700 px-3 py-1 text-xs font-medium text-white shadow-xs transition-colors hover:bg-emerald-800 outline-none",
              (!effectiveStart || !effectiveEnd) &&
                "pointer-events-none opacity-40 cursor-not-allowed"
            )}
          >
            Apply
          </button>
        )}
      </div>
    </div>
  );
}

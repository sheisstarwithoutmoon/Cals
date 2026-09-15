"use client";

import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "cn";

import {
  CalendarDateRangePicker,
  type CustomDateRange,
} from "./calendar-date-range-picker";
import { toLocalDateKey } from "@/lib/nutrition";

export const REPORT_PRESET_RANGES = [7, 14, 30] as const;
export type ReportPresetRange = (typeof REPORT_PRESET_RANGES)[number];
export type ReportRange = ReportPresetRange | "custom";
export type { CustomDateRange };

interface RangeTabsProps {
  value: ReportRange;
  onChange: (value: ReportRange) => void;
  customRange?: CustomDateRange;
  onCustomRangeChange?: (range: CustomDateRange) => void;
}

function getPresetDateRange(days: number): CustomDateRange {
  const now = new Date();
  const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (days - 1));
  return {
    startDate: toLocalDateKey(past),
    endDate: toLocalDateKey(now),
  };
}

export function RangeTabs({
  value,
  onChange,
  customRange,
  onCustomRangeChange,
}: RangeTabsProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // If 14d, 30d, or 7d was selected, prefill the custom calendar with those exact days
  const effectiveCalendarValue = useMemo(() => {
    if (value === "custom" && customRange?.startDate && customRange?.endDate) {
      return customRange;
    }
    if (typeof value === "number") {
      return getPresetDateRange(value);
    }
    return customRange;
  }, [value, customRange]);

  return (
    <div className="inline-flex h-8 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground">
      {REPORT_PRESET_RANGES.map((range) => {
        const isActive = value === range;
        return (
          <button
            key={range}
            type="button"
            onClick={() => {
              setIsPopoverOpen(false);
              onChange(range);
            }}
            className={cn(
              "relative inline-flex h-[calc(100%-1px)] items-center justify-center rounded-md px-2.5 py-0.5 text-xs font-medium transition-all outline-none",
              isActive
                ? "bg-background text-foreground shadow-xs font-semibold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {range}d
          </button>
        );
      })}

      {/* Custom option with calendar Popover */}
      <Popover.Root open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <Popover.Trigger
          type="button"
          onClick={() => {
            setIsPopoverOpen((prev) => !prev);
          }}
          className={cn(
            "relative inline-flex h-[calc(100%-1px)] items-center justify-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium transition-all outline-none",
            value === "custom"
              ? "bg-background text-foreground shadow-xs font-semibold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <CalendarIcon className="size-3" />
          <span>Custom</span>
        </Popover.Trigger>

        <Popover.Portal>
          <Popover.Positioner side="bottom" sideOffset={6} align="end" collisionPadding={12} className="isolate z-50">
            <Popover.Popup className="origin-(--transform-origin) rounded-2xl border border-border bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
              <CalendarDateRangePicker
                value={effectiveCalendarValue}
                onChange={(nextRange) => {
                  onCustomRangeChange?.(nextRange);
                  onChange("custom");
                  setIsPopoverOpen(false);
                }}
                onClose={() => setIsPopoverOpen(false)}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}

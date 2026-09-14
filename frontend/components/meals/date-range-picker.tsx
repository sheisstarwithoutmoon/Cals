"use client";

import { useMemo, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { CalendarIcon, ChevronDownIcon } from "lucide-react";
import { cn } from "cn";

import {
  CalendarDateRangePicker,
  type CustomDateRange,
} from "@/components/reports/calendar-date-range-picker";
import { formatDate } from "@/lib/format";

export interface DateRangeValue {
  startDate: string;
  endDate: string;
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
}

export function thisMonthRange(): DateRangeValue {
  const now = new Date();
  return {
    startDate: toDateKey(new Date(now.getFullYear(), now.getMonth(), 1)),
    endDate: toDateKey(now),
  };
}

export function parseDateKey(key: string) {
  return new Date(`${key}T00:00:00`);
}

export { toDateKey };

function formatRangeLabel({ startDate, endDate }: DateRangeValue) {
  if (!startDate && !endDate) return "All time";
  if (startDate && !endDate) return `From ${formatDate(parseDateKey(startDate))}`;
  if (!startDate && endDate) return `Until ${formatDate(parseDateKey(endDate))}`;
  if (startDate === endDate) return formatDate(parseDateKey(startDate));
  return `${formatDate(parseDateKey(startDate))} – ${formatDate(parseDateKey(endDate))}`;
}

interface QuickOption {
  id: string;
  label: string;
  getRange?: () => DateRangeValue;
}

const QUICK_OPTIONS: QuickOption[] = [
  {
    id: "today",
    label: "Today",
    getRange: () => ({ startDate: toDateKey(new Date()), endDate: toDateKey(new Date()) }),
  },
  {
    id: "7d",
    label: "Last 7 days",
    getRange: () => ({ startDate: toDateKey(daysAgo(6)), endDate: toDateKey(new Date()) }),
  },
  {
    id: "30d",
    label: "Last 30 days",
    getRange: () => ({ startDate: toDateKey(daysAgo(29)), endDate: toDateKey(new Date()) }),
  },
  {
    id: "this-month",
    label: "This month",
    getRange: () => thisMonthRange(),
  },
  {
    id: "custom",
    label: "Custom",
  },
];

interface DateRangePickerProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  align?: "start" | "end" | "center";
}

export function DateRangePicker({
  value,
  onChange,
  align = "end",
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCustomActive, setIsCustomActive] = useState(false);

  // Identify matching preset, if any
  const activePresetId = useMemo(() => {
    if (isCustomActive) return "custom";
    for (const opt of QUICK_OPTIONS) {
      if (!opt.getRange) continue;
      const r = opt.getRange();
      if (r.startDate === value.startDate && r.endDate === value.endDate) {
        return opt.id;
      }
    }
    return "custom";
  }, [value, isCustomActive]);

  function handlePresetClick(opt: QuickOption) {
    if (opt.id === "custom") {
      setIsCustomActive(true);
      return;
    }
    if (opt.getRange) {
      setIsCustomActive(false);
      onChange(opt.getRange());
      setIsOpen(false);
    }
  }

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger
        className="inline-flex h-9 min-w-0 items-center gap-2 rounded-full border border-border bg-card px-3.5 text-xs font-medium text-foreground transition-colors hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring outline-none"
      >
        <CalendarIcon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{formatRangeLabel(value)}</span>
        <ChevronDownIcon
          className={cn(
            "size-3.5 shrink-0 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )}
        />
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Positioner
          side="bottom"
          sideOffset={6}
          align={align}
          collisionPadding={16}
          className="isolate z-50"
        >
          <Popover.Popup className="w-[305px] origin-(--transform-origin) rounded-2xl border border-border bg-popover p-2.5 text-popover-foreground shadow-xl ring-1 ring-foreground/10 outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95">
            {/* Quick-range options: Today, Last 7 days, Last 30 days, This month, Custom */}
            <div className="flex flex-wrap items-center gap-1.5 pb-2">
              {QUICK_OPTIONS.map((opt) => {
                const isActive = activePresetId === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handlePresetClick(opt)}
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none",
                      isActive
                        ? "bg-emerald-700 font-semibold text-white shadow-xs"
                        : "bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* Subtle divider */}
            <div className="border-t border-border/60" />

            {/* Clean single-month calendar for custom range selection */}
            <div className="pt-1">
              <CalendarDateRangePicker
                value={value}
                onChange={(nextRange) => {
                  onChange(nextRange);
                  setIsCustomActive(false);
                  setIsOpen(false);
                }}
                onClose={() => setIsOpen(false)}
                requireApply={true}
              />
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

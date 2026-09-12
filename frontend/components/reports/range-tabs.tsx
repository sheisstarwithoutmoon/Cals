"use client";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const REPORT_RANGES = [7, 14, 30] as const;
export type ReportRange = (typeof REPORT_RANGES)[number];

interface RangeTabsProps {
  value: ReportRange;
  onChange: (value: ReportRange) => void;
}

export function RangeTabs({ value, onChange }: RangeTabsProps) {
  return (
    <Tabs value={String(value)} onValueChange={(v) => onChange(Number(v) as ReportRange)}>
      <TabsList>
        {REPORT_RANGES.map((range) => (
          <TabsTrigger key={range} value={String(range)}>
            {range}d
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { LeafIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { NUTRIENT_DAILY_VALUES } from "@/lib/constants";
import type { NutritionTotals } from "@/lib/nutrition";

interface OtherNutrientsChartProps {
  totals: NutritionTotals;
}

const ROWS = [
  { key: "fiber", label: "Fiber", unit: "g", dvKey: "Fiber (g)" },
  { key: "sugar", label: "Sugar", unit: "g", dvKey: "Sugar (g)" },
  { key: "sodium", label: "Sodium", unit: "mg", dvKey: "Sodium (mg)" },
] as const;

export function OtherNutrientsChart({ totals }: OtherNutrientsChartProps) {
  const data = ROWS.map((row) => {
    const value = totals[row.key];
    const dailyValue = NUTRIENT_DAILY_VALUES[row.dvKey];

    return {
      name: `${row.label} (${row.unit})`,
      unit: row.unit,
      value: Math.round(value * 10) / 10,
      percent: Math.round((value / dailyValue) * 100),
    };
  });

  const hasData = data.some((entry) => entry.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Other nutrients</CardTitle>
      </CardHeader>
      <CardContent className="px-2">
        {!hasData ? (
          <div className="flex h-64 items-center justify-center">
            <EmptyState
              icon={LeafIcon}
              title="No data yet"
              description="Log fiber, sugar or sodium on your meals to see totals here."
            />
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="var(--muted-foreground)"
                  width={44}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                    fontSize: 12,
                  }}
                  formatter={(_value, _name, item) => {
                    const point = item.payload as (typeof data)[number];
                    return [
                      `${point.value}${point.unit} (${point.percent}% DV)`,
                      "Amount",
                    ];
                  }}
                />
                <Bar dataKey="percent" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <p className="mt-1 text-center text-[10px] text-muted-foreground">
          Shown as % of a general daily reference value
        </p>
      </CardContent>
    </Card>
  );
}

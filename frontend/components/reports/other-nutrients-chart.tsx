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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Other nutrients</CardTitle>
      </CardHeader>
      {!hasData ? (
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={LeafIcon}
            title="No data yet"
            description="Log fiber, sugar or sodium on your meals to see totals here."
          />
        </CardContent>
      ) : (
        <CardContent className="px-2 pt-2">
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(20, 33, 25, 0.08)" />
                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#5a6660"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#5a6660"
                  width={44}
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(20, 33, 25, 0.1)",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(_value, _name, item) => {
                    const point = item.payload as (typeof data)[number];
                    return [
                      `${point.value}${point.unit} (${point.percent}% DV)`,
                      "Amount",
                    ];
                  }}
                />
                <Bar dataKey="percent" fill="#ca8a04" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Shown as % of a general daily reference value
          </p>
        </CardContent>
      )}
    </Card>
  );
}

"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { PieChartIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { NutritionTotals } from "@/lib/nutrition";

interface MacroBreakdownChartProps {
  totals: NutritionTotals;
}

const COLORS = ["var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];

export function MacroBreakdownChart({ totals }: MacroBreakdownChartProps) {
  const data = [
    { name: "Protein", value: totals.protein },
    { name: "Carbs", value: totals.carbs },
    { name: "Fat", value: totals.fat },
  ];

  const hasData = data.some((entry) => entry.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Macro breakdown</CardTitle>
      </CardHeader>
      <CardContent className="h-72">
        {!hasData ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={PieChartIcon}
              title="No macro data yet"
              description="Log meals with protein, carbs and fat to see the breakdown."
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius="55%"
                outerRadius="80%"
                paddingAngle={2}
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                }}
                formatter={(value, name) => [
                  `${formatNumber(Number(value))} g`,
                  String(name),
                ]}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        <div className="mt-1 flex justify-center gap-4 text-xs text-muted-foreground">
          {data.map((entry, index) => (
            <span key={entry.name} className="flex items-center gap-1.5">
              <span
                className="size-2 rounded-full"
                style={{ background: COLORS[index % COLORS.length] }}
              />
              {entry.name} · {formatNumber(entry.value)}g
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

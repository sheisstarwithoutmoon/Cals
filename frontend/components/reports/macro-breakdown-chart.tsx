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

const COLORS = ["#2563eb", "#ca8a04", "#c1402e"];

export function MacroBreakdownChart({ totals }: MacroBreakdownChartProps) {
  const data = [
    { name: "Protein", value: totals.protein },
    { name: "Carbs", value: totals.carbs },
    { name: "Fat", value: totals.fat },
  ];

  const hasData = data.some((entry) => entry.value > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Macro breakdown</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-between">
        {!hasData ? (
          <div className="p-4 sm:p-6">
            <EmptyState
              icon={PieChartIcon}
              title="No macro data yet"
              description="Log meals with protein, carbs and fat to see the breakdown."
            />
          </div>
        ) : (
          <>
            <div className="h-[200px] w-full min-w-0">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {data.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "#ffffff",
                      border: "1px solid rgba(20, 33, 25, 0.1)",
                      borderRadius: "0.75rem",
                      fontSize: 12,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                    formatter={(value, name) => [
                      `${formatNumber(Number(value))} g`,
                      String(name),
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5 pb-2 text-xs text-muted-foreground">
              {data.map((entry, index) => (
                <span key={entry.name} className="flex items-center gap-1.5 whitespace-nowrap">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: COLORS[index % COLORS.length] }}
                  />
                  {entry.name} · {formatNumber(entry.value)}g
                </span>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

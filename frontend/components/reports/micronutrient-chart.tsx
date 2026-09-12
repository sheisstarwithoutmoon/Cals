"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConicalIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import type { NutritionTotals } from "@/lib/nutrition";

interface MicronutrientChartProps {
  totals: NutritionTotals;
}

export function MicronutrientChart({ totals }: MicronutrientChartProps) {
  const data = [
    { name: "Fiber (g)", value: Math.round(totals.fiber) },
    { name: "Sugar (g)", value: Math.round(totals.sugar) },
    { name: "Sodium (mg)", value: Math.round(totals.sodium) },
  ];

  const hasData = data.some((entry) => entry.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Micronutrients</CardTitle>
      </CardHeader>
      <CardContent className="h-72 px-2">
        {!hasData ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState
              icon={FlaskConicalIcon}
              title="No micronutrient data yet"
              description="Log fiber, sugar or sodium on your meals to see totals here."
            />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
                width={40}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="var(--chart-5)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

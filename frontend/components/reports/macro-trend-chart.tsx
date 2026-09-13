"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3Icon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import type { DailyTotal } from "@/lib/nutrition";

interface MacroTrendChartProps {
  data: DailyTotal[];
}

export function MacroTrendChart({ data }: MacroTrendChartProps) {
  const hasData = data.some((day) => day.protein > 0 || day.carbs > 0 || day.fat > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Macros by day</CardTitle>
      </CardHeader>
      {!hasData ? (
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={BarChart3Icon}
            title="No macro data yet"
            description="Log meals over a few days to see protein, carbs and fat by day."
          />
        </CardContent>
      ) : (
        <CardContent className="px-2 pt-2">
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(20, 33, 25, 0.08)" />
                <XAxis
                  dataKey="label"
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
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(20, 33, 25, 0.1)",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value, name) => [`${Math.round(Number(value))}g`, String(name)]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                <Bar dataKey="protein" name="Protein" stackId="macros" fill="#2563eb" />
                <Bar dataKey="carbs" name="Carbs" stackId="macros" fill="#ca8a04" />
                <Bar dataKey="fat" name="Fat" stackId="macros" fill="#c1402e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

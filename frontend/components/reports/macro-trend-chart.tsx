"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyTotal } from "@/lib/nutrition";

interface MacroTrendChartProps {
  data: DailyTotal[];
}

export function MacroTrendChart({ data }: MacroTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Macros by day</CardTitle>
      </CardHeader>
      <CardContent className="h-72 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="label"
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
            />
            <Tooltip
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                fontSize: 12,
              }}
              formatter={(value, name) => [`${Math.round(Number(value))}g`, String(name)]}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="protein" name="Protein" stackId="macros" fill="var(--chart-2)" />
            <Bar dataKey="carbs" name="Carbs" stackId="macros" fill="var(--chart-3)" />
            <Bar dataKey="fat" name="Fat" stackId="macros" fill="var(--chart-4)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

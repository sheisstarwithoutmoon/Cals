"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DailyTotal } from "@/lib/nutrition";

interface CalorieTrendChartProps {
  data: DailyTotal[];
  goalCalories?: number | null;
}

export function CalorieTrendChart({ data, goalCalories }: CalorieTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Calorie trend</CardTitle>
      </CardHeader>
      <CardContent className="h-72 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="calorieFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
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
              labelClassName="text-foreground"
              formatter={(value) => [`${Math.round(Number(value))} kcal`, "Calories"]}
            />
            {goalCalories ? (
              <ReferenceLine
                y={goalCalories}
                stroke="var(--chart-4)"
                strokeDasharray="4 4"
                label={{
                  value: "Goal",
                  position: "insideTopRight",
                  fill: "var(--muted-foreground)",
                  fontSize: 11,
                }}
              />
            ) : null}
            <Area
              type="monotone"
              dataKey="calories"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#calorieFill)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

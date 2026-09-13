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
import { EmptyState } from "@/components/common/empty-state";
import { TrendingUpIcon } from "lucide-react";
import type { DailyTotal } from "@/lib/nutrition";

interface CalorieTrendChartProps {
  data: DailyTotal[];
  goalCalories?: number | null;
}

export function CalorieTrendChart({ data, goalCalories }: CalorieTrendChartProps) {
  const hasData = data.some((day) => day.calories > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Calorie trend</CardTitle>
      </CardHeader>
      {!hasData ? (
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={TrendingUpIcon}
            title="No calorie data yet"
            description="Log meals over a few days to see your calorie trend here."
          />
        </CardContent>
      ) : (
      <CardContent className="px-2 pt-2">
        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="calorieFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2f6d4f" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#2f6d4f" stopOpacity={0.02} />
                </linearGradient>
              </defs>
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
                labelClassName="text-foreground font-semibold"
                formatter={(value) => [`${Math.round(Number(value))} kcal`, "Calories"]}
              />
              {goalCalories ? (
                <ReferenceLine
                  y={goalCalories}
                  stroke="#c1402e"
                  strokeDasharray="4 4"
                  label={{
                    value: "Goal",
                    position: "insideTopRight",
                    fill: "#5a6660",
                    fontSize: 11,
                  }}
                />
              ) : null}
              <Area
                type="monotone"
                dataKey="calories"
                stroke="#2f6d4f"
                strokeWidth={2.5}
                fill="url(#calorieFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      )}
    </Card>
  );
}

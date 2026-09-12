"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TargetIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import type { DailyTotal } from "@/lib/nutrition";

interface GoalVsActualChartProps {
  data: DailyTotal[];
  goalCalories?: number | null;
}

export function GoalVsActualChart({ data, goalCalories }: GoalVsActualChartProps) {
  if (!goalCalories) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Goal vs actual</CardTitle>
        </CardHeader>
        <CardContent className="flex h-72 items-center justify-center">
          <EmptyState
            icon={TargetIcon}
            title="No calorie goal set"
            description="Set a daily calorie goal to compare it against what you actually ate."
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map((day) => ({
    label: day.label,
    Actual: Math.round(day.calories),
    Goal: goalCalories,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goal vs actual</CardTitle>
      </CardHeader>
      <CardContent className="h-72 px-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
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
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Actual" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="Goal" fill="var(--chart-5)" radius={[6, 6, 0, 0]} opacity={0.5} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

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
  const hasData = data.some((day) => day.calories > 0);

  if (!goalCalories || !hasData) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Goal vs actual</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={TargetIcon}
            title={!goalCalories ? "No calorie goal set" : "No calorie data yet"}
            description={
              !goalCalories
                ? "Set a daily calorie goal to compare it against what you actually ate."
                : "Log meals to compare your actual intake against your goal."
            }
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
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Goal vs actual</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pt-2">
        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                formatter={(value, name) => [`${Math.round(Number(value))} kcal`, String(name)]}
              />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Bar dataKey="Actual" fill="#2f6d4f" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Goal" fill="#059669" radius={[6, 6, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

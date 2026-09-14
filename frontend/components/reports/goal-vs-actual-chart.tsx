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
import type { MacroTarget } from "@/lib/reports";

interface GoalVsActualChartProps {
  macros: MacroTarget[];
}

/**
 * Average daily protein, carbs and fat against the goal's macro targets.
 * (Daily calories against the calorie goal are already on the calorie trend.)
 */
export function GoalVsActualChart({ macros }: GoalVsActualChartProps) {
  const hasTargets = macros.some((macro) => macro.target);
  const hasData = macros.some((macro) => macro.average > 0);

  if (!hasTargets || !hasData) {
    return (
      <Card className="flex h-full flex-col">
        <CardHeader>
          <CardTitle>Macros vs goal</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={TargetIcon}
            title={!hasTargets ? "No macro targets set" : "No macro data yet"}
            description={
              !hasTargets
                ? "Set protein, carbs and fat targets in Goals to compare them against what you ate."
                : "Log meals to compare your average macros against your targets."
            }
          />
        </CardContent>
      </Card>
    );
  }

  const chartData = macros.map((macro) => ({
    label: macro.label,
    Actual: Math.round(macro.average),
    Goal: macro.target ?? 0,
  }));

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Macros vs goal</CardTitle>
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
                unit="g"
              />
              <Tooltip
                contentStyle={{
                  background: "#ffffff",
                  border: "1px solid rgba(20, 33, 25, 0.1)",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                }}
                formatter={(value, name) => [
                  `${Math.round(Number(value))} g`,
                  name === "Actual" ? "Daily average" : "Daily target",
                ]}
              />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
                formatter={(name) => (name === "Actual" ? "Daily average" : "Daily target")}
              />
              <Bar dataKey="Actual" fill="#2f6d4f" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Goal" fill="#059669" radius={[6, 6, 0, 0]} opacity={0.4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

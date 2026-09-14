"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { TrendingUpIcon } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { DailyPoint } from "@/lib/reports";

interface CalorieTrendChartProps {
  data: DailyPoint[];
  goalCalories?: number | null;
}

interface ChartPoint {
  label: string;
  /** 0 on days with nothing logged. */
  eaten: number;
  isLogged: boolean;
  goal: number | null;
}

function TrendTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ChartPoint }[];
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;

  const difference = point.isLogged && point.goal != null ? point.eaten - point.goal : null;

  return (
    <div className="rounded-xl border border-border bg-card px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-foreground">{point.label}</p>
      <p className="text-foreground">
        Eaten: {point.isLogged ? `${formatNumber(point.eaten)} kcal` : "0 kcal (nothing logged)"}
      </p>
      {point.goal != null && (
        <p className="text-muted-foreground">Goal: {formatNumber(point.goal)} kcal</p>
      )}
      {difference != null && (
        <p className="text-muted-foreground">
          {formatNumber(Math.abs(difference))} kcal {difference > 0 ? "over" : "under"} goal
        </p>
      )}
    </div>
  );
}

/** Calories eaten each day and the calorie goal, on one axis. */
export function CalorieTrendChart({ data, goalCalories }: CalorieTrendChartProps) {
  const hasData = data.some((day) => day.calories > 0);

  const chartData: ChartPoint[] = data.map((day) => {
    return {
      label: day.label,
      eaten: day.calories,
      isLogged: day.mealCount != null ? day.mealCount > 0 : day.calories > 0,
      goal: goalCalories ?? null,
    };
  });

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
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                // Always leave headroom above the higher of the goal and the
                // biggest day, so the goal line is never cut off.
                domain={[0, (dataMax: number) => Math.ceil((dataMax * 1.1) / 100) * 100]}
                tickFormatter={(value: number) => formatNumber(value)}
              />
              <Tooltip content={<TrendTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
              <Area
                type="monotone"
                dataKey="eaten"
                name="Calories eaten"
                stroke="#2f6d4f"
                strokeWidth={2.5}
                fill="url(#calorieFill)"
                activeDot={{ r: 5 }}
              />
              {goalCalories ? (
                <Line
                  type="linear"
                  dataKey="goal"
                  name="Goal"
                  stroke="#c1402e"
                  strokeWidth={2}
                  strokeDasharray="6 4"
                  dot={false}
                  activeDot={false}
                />
              ) : null}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
      )}
    </Card>
  );
}

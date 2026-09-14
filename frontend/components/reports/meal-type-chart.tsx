"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { UtensilsIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatNumber } from "@/lib/format";
import type { MealTypeCalories } from "@/lib/reports";

interface MealTypeChartProps {
  mealTypes: MealTypeCalories[];
}

/** Average calories each meal type adds per logged day. */
export function MealTypeChart({ mealTypes }: MealTypeChartProps) {
  const hasData = mealTypes.some((entry) => entry.averageCalories > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Calories by meal</CardTitle>
      </CardHeader>
      {!hasData ? (
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={UtensilsIcon}
            title="No meals logged yet"
            description="Log breakfast, lunch, dinner or snacks to see which meals add the most calories."
          />
        </CardContent>
      ) : (
        <CardContent className="px-2 pt-2">
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={mealTypes} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
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
                  cursor={{ fill: "rgba(20, 33, 25, 0.05)" }}
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(20, 33, 25, 0.1)",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value, _name, item) => [
                    `${formatNumber(Number(value))} kcal/day (${(item.payload as MealTypeCalories).percent}% of calories)`,
                    "Average",
                  ]}
                />
                <Bar dataKey="averageCalories" fill="#2f6d4f" radius={[6, 6, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Average per logged day
          </p>
        </CardContent>
      )}
    </Card>
  );
}

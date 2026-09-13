"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FlaskConicalIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { NUTRIENT_DAILY_VALUES, VITAMIN_MINERAL_KEYS } from "@/lib/constants";

interface MicronutrientChartProps {
  micronutrients: Record<string, number>;
}

export function MicronutrientChart({ micronutrients }: MicronutrientChartProps) {
  const data = VITAMIN_MINERAL_KEYS.map((key) => {
    const value = micronutrients[key] ?? 0;
    const dailyValue = NUTRIENT_DAILY_VALUES[key];

    return {
      name: key.replace(/\s*\(.+\)/, ""),
      unit: key.match(/\(([^)]+)\)/)?.[1] ?? "",
      value: Math.round(value * 10) / 10,
      percent: Math.round((value / dailyValue) * 100),
    };
  });

  const hasData = data.some((entry) => entry.value > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Micronutrients</CardTitle>
      </CardHeader>
      {!hasData ? (
        <CardContent className="p-4 sm:p-6">
          <EmptyState
            icon={FlaskConicalIcon}
            title="No micronutrient data yet"
            description="Log meals with vitamin and mineral values to see them here."
          />
        </CardContent>
      ) : (
        <CardContent className="px-2 pt-2">
          <div className="h-[240px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="rgba(20, 33, 25, 0.08)" />
                <XAxis
                  dataKey="name"
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
                  unit="%"
                />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(20, 33, 25, 0.1)",
                    borderRadius: "0.75rem",
                    fontSize: 12,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(_value, _name, item) => {
                    const point = item.payload as (typeof data)[number];
                    return [
                      `${point.value}${point.unit} (${point.percent}% DV)`,
                      "Amount",
                    ];
                  }}
                />
                <Bar dataKey="percent" fill="#059669" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Shown as % of a general daily reference value
          </p>
        </CardContent>
      )}
    </Card>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { FlaskConicalIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { formatNumber } from "@/lib/format";
import type { NutrientCoverage } from "@/lib/reports";

interface MicronutrientChartProps {
  nutrients: NutrientCoverage[];
}

const AIM_COLOR = "#059669";
const LIMIT_COLOR = "#ca8a04";
const OVER_LIMIT_COLOR = "#c1402e";

/**
 * Fiber, vitamins and minerals (aim to reach 100%) and sugar and sodium
 * (keep under 100%) in one chart: each is the average per logged day as a
 * percent of a general daily reference value.
 */
export function MicronutrientChart({ nutrients }: MicronutrientChartProps) {
  const hasData = nutrients.some((entry) => entry.average > 0);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Nutrient coverage</CardTitle>
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
          <div className="h-[260px] w-full min-w-0">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={nutrients}
                layout="vertical"
                margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
              >
                <CartesianGrid horizontal={false} stroke="rgba(20, 33, 25, 0.08)" />
                <XAxis
                  type="number"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#5a6660"
                  unit="%"
                  domain={[0, (dataMax: number) => Math.max(100, dataMax)]}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                  stroke="#5a6660"
                  width={72}
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
                  formatter={(_value, _name, item) => {
                    const point = item.payload as NutrientCoverage;
                    return [
                      `${formatNumber(point.average, 1)} ${point.unit} a day (${point.percent}% of ${formatNumber(point.dailyValue)} ${point.unit})`,
                      point.kind === "aim" ? "Aim to reach" : "Keep under",
                    ];
                  }}
                />
                <ReferenceLine x={100} stroke="#5a6660" strokeDasharray="4 4" />
                <Bar dataKey="percent" radius={[0, 6, 6, 0]} maxBarSize={18}>
                  {nutrients.map((entry) => (
                    <Cell
                      key={entry.label}
                      fill={
                        entry.kind === "aim"
                          ? AIM_COLOR
                          : entry.percent > 100
                            ? OVER_LIMIT_COLOR
                            : LIMIT_COLOR
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 px-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: AIM_COLOR }} />
              Aim to reach 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-full" style={{ background: LIMIT_COLOR }} />
              Keep under 100%
            </span>
            <span>Average per logged day, % of daily value</span>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CalorieRing } from "@/components/dashboard/calorie-ring";
import { NutrientBar } from "@/components/nutrition/nutrient-bar";
import { formatNumber } from "@/lib/format";
import type { NutritionTotals } from "@/lib/nutrition";
import type { Goal } from "@/lib/types/api";

interface NutritionSummaryProps {
  totals: NutritionTotals;
  goal: Goal | null;
}

export function NutritionSummary({ totals, goal }: NutritionSummaryProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-6 sm:flex-row sm:items-stretch">
        <div className="flex flex-col items-center gap-2">
          <CalorieRing consumed={totals.calories} goal={goal?.dailyCalories ?? null} />
          <p className="text-xs text-muted-foreground">
            {formatNumber(totals.calories)} kcal consumed
            {goal?.dailyCalories ? ` of ${formatNumber(goal.dailyCalories)}` : ""}
          </p>
        </div>

        <div className="hidden w-px self-stretch bg-border sm:block" />

        <div className="w-full flex-1 space-y-4">
          {goal ? (
            <>
              <NutrientBar
                label="Protein"
                consumed={totals.protein}
                target={goal.dailyProtein}
                unit="g"
                colorClassName="bg-chart-2"
              />
              <NutrientBar
                label="Carbs"
                consumed={totals.carbs}
                target={goal.dailyCarbs}
                unit="g"
                colorClassName="bg-chart-3"
              />
              <NutrientBar
                label="Fat"
                consumed={totals.fat}
                target={goal.dailyFat}
                unit="g"
                colorClassName="bg-chart-4"
              />
            </>
          ) : (
            <div className="flex h-full flex-col items-start justify-center gap-2 rounded-lg bg-muted/40 p-4">
              <p className="text-sm font-medium text-foreground">
                Set your daily goals
              </p>
              <p className="text-sm text-muted-foreground">
                Add a calorie and macro target to track progress against your
                goals.
              </p>
              <Button
                size="sm"
                variant="outline"
                nativeButton={false}
                render={<Link href="/goals" />}
              >
                Set goals
                <ArrowRightIcon />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

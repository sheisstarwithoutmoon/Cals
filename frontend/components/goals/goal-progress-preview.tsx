import { TargetIcon } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { NutrientBar } from "@/components/nutrition/nutrient-bar";
import type { NutritionTotals } from "@/lib/nutrition";
import type { Goal } from "@/lib/types/api";

interface GoalProgressPreviewProps {
  goal: Goal | null;
  totals: NutritionTotals;
}

export function GoalProgressPreview({ goal, totals }: GoalProgressPreviewProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Today&apos;s progress</CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        {!goal ? (
          <EmptyState
            icon={TargetIcon}
            title="No goals set yet"
            description="Save your daily targets to see how today measures up."
          />
        ) : (
          <div className="space-y-4">
            <NutrientBar
              label="Calories"
              consumed={totals.calories}
              target={goal.dailyCalories}
              unit="kcal"
              colorClassName="bg-chart-1"
            />
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}

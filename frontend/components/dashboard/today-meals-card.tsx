import { useMemo } from "react";
import Link from "next/link";
import { UtensilsCrossedIcon } from "lucide-react";

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/common/empty-state";
import { MealListItem } from "@/components/meals/meal-list-item";
import { MEAL_TYPE_SORT_ORDER } from "@/lib/constants";
import type { MealEntry } from "@/lib/types/api";

interface TodayMealsCardProps {
  meals: MealEntry[];
  onUpdated: (meal: MealEntry) => void;
  onDeleted: (mealId: string) => void;
}

export function TodayMealsCard({
  meals,
  onUpdated,
  onDeleted,
}: TodayMealsCardProps) {
  const sortedMeals = useMemo(() => {
    return [...meals].sort(
      (a, b) =>
        (MEAL_TYPE_SORT_ORDER[a.mealType] ?? 9) -
        (MEAL_TYPE_SORT_ORDER[b.mealType] ?? 9)
    );
  }, [meals]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today's meals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sortedMeals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossedIcon}
            title="No meals logged yet today"
            description="Log your first meal to start tracking today's nutrition."
          />
        ) : (
          <div className="space-y-2.5">
            {sortedMeals.map((meal) => (
              <MealListItem
                key={meal.id}
                meal={meal}
                onUpdated={onUpdated}
                onDeleted={onDeleted}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

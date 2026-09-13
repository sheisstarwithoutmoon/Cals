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
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealEntry, MealType } from "@/lib/types/api";

interface TodayMealsCardProps {
  meals: MealEntry[];
  onUpdated: (meal: MealEntry) => void;
  onDeleted: (mealId: string) => void;
}

const MEAL_TYPE_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

export function TodayMealsCard({
  meals,
  onUpdated,
  onDeleted,
}: TodayMealsCardProps) {
  const groups = MEAL_TYPE_ORDER.map((mealType) => ({
    mealType,
    meals: meals.filter((meal) => meal.mealType === mealType),
  })).filter((group) => group.meals.length > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s meals</CardTitle>
        <CardAction>
          <Link
            href="/meals"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossedIcon}
            title="No meals logged yet today"
            description="Log your first meal to start tracking today's nutrition."
          />
        ) : (
          groups.map((group) => (
            <div key={group.mealType} className="space-y-2.5">
              <h3 className="text-xs font-medium text-muted-foreground">
                {MEAL_TYPE_LABELS[group.mealType]}
              </h3>
              <div className="space-y-2.5">
                {group.meals.map((meal) => (
                  <MealListItem
                    key={meal.id}
                    meal={meal}
                    onUpdated={onUpdated}
                    onDeleted={onDeleted}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

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
      <CardContent className="space-y-2.5">
        {meals.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossedIcon}
            title="No meals logged yet today"
            description="Log your first meal to start tracking today's nutrition."
          />
        ) : (
          meals.map((meal) => (
            <MealListItem
              key={meal.id}
              meal={meal}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

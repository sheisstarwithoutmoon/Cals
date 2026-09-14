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
      <CardContent className="p-4 sm:p-6">
        <div className="grid grid-cols-2 items-center gap-4 md:grid-cols-[auto_1px_1fr_1px_auto] md:gap-6">
          {/* Part 1: Calorie Ring */}
          <div className="col-span-1 flex flex-col items-center justify-center gap-1.5 md:order-1 md:w-48">
            <CalorieRing consumed={totals.calories} goal={goal?.dailyCalories ?? null} />
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center">
              {formatNumber(totals.calories)} kcal consumed
              {goal?.dailyCalories ? ` of ${formatNumber(goal.dailyCalories)}` : ""}
            </p>
          </div>

          {/* Part 3: Avocado Mascot (side-by-side with ring on mobile, far right on desktop) */}
          <div className="col-span-1 flex flex-col items-center justify-center md:order-5 md:w-44">
            <img
              src="/avacado-thumbsup.png"
              alt="Avocado thumbs up"
              className="h-28 w-auto sm:h-32 md:h-36 lg:h-40 object-contain drop-shadow-[0_8px_18px_rgba(30,80,45,0.12)] transition-transform duration-300 hover:scale-105 select-none"
              loading="eager"
            />
          </div>

          {/* Mobile Horizontal Divider */}
          <div className="col-span-2 h-px w-full bg-border/60 md:hidden" />

          {/* Desktop Divider 1 */}
          <div className="hidden h-full w-px self-stretch bg-border md:order-2 md:block" />

          {/* Part 2: Macro Nutrient Bars */}
          <div className="col-span-2 w-full space-y-3 sm:space-y-4 min-w-0 flex flex-col justify-center md:col-span-1 md:order-3">
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

          {/* Desktop Divider 2 */}
          <div className="hidden h-full w-px self-stretch bg-border md:order-4 md:block" />
        </div>
      </CardContent>
    </Card>
  );
}

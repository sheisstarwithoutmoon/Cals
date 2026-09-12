import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Goal } from "@/lib/types/api";

interface GoalSummaryProps {
  goal: Goal;
  onEdit: () => void;
}

const ROWS: { key: keyof Goal; label: string; unit: string }[] = [
  { key: "dailyCalories", label: "Daily calories", unit: "kcal" },
  { key: "dailyProtein", label: "Protein", unit: "g" },
  { key: "dailyCarbs", label: "Carbs", unit: "g" },
  { key: "dailyFat", label: "Fat", unit: "g" },
  { key: "targetWeight", label: "Target weight", unit: "kg" },
];

export function GoalSummary({ goal, onEdit }: GoalSummaryProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Your daily goals</CardTitle>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Edit goals"
          onClick={onEdit}
        >
          <PencilIcon className="size-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border">
          {ROWS.map((row) => {
            const value = goal[row.key];

            return (
              <div
                key={row.key}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <dt className="text-sm text-muted-foreground">{row.label}</dt>
                <dd className="text-sm font-semibold text-foreground">
                  {value != null ? `${value} ${row.unit}` : "Not set"}
                </dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

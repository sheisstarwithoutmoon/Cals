import { PencilIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Your daily goals</CardTitle>
        <CardAction>
          <Button
            type="button"
            size="icon-sm"
            aria-label="Edit goals"
            onClick={onEdit}
            className="rounded-full bg-emerald-700 text-white hover:bg-emerald-800"
          >
            <PencilIcon className="size-4" />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex-1">
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

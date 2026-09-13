"use client";

import { XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "@/lib/constants";
import type { MealType } from "@/lib/types/api";

export interface MealFiltersState {
  mealType: MealType | "ALL";
  startDate: string;
  endDate: string;
}

interface MealFiltersProps {
  value: MealFiltersState;
  onChange: (value: MealFiltersState) => void;
}

export function MealFilters({ value, onChange }: MealFiltersProps) {
  const hasActiveFilters =
    value.mealType !== "ALL" || value.startDate || value.endDate;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="filter-type" className="text-xs text-muted-foreground">
            Meal type
          </Label>
          <Select
            value={value.mealType}
            onValueChange={(mealType) =>
              onChange({ ...value, mealType: mealType as MealType | "ALL" })
            }
          >
            <SelectTrigger id="filter-type" className="w-full">
              <SelectValue>
                {(mealType: MealType | "ALL") =>
                  mealType === "ALL" ? "All meals" : MEAL_TYPE_LABELS[mealType]
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All meals</SelectItem>
              {MEAL_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {MEAL_TYPE_LABELS[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-start" className="text-xs text-muted-foreground">
            From
          </Label>
          <Input
            id="filter-start"
            type="date"
            className="w-full"
            value={value.startDate}
            max={value.endDate || undefined}
            onChange={(event) =>
              onChange({ ...value, startDate: event.target.value })
            }
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="filter-end" className="text-xs text-muted-foreground">
            To
          </Label>
          <Input
            id="filter-end"
            type="date"
            className="w-full"
            value={value.endDate}
            min={value.startDate || undefined}
            onChange={(event) =>
              onChange({ ...value, endDate: event.target.value })
            }
          />
        </div>
      </div>

      {hasActiveFilters && (
        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3">
          <p className="text-xs text-muted-foreground">Filters applied</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-full border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            onClick={() => onChange({ mealType: "ALL", startDate: "", endDate: "" })}
          >
            <XIcon />
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

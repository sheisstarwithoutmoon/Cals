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
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3">
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
          <SelectTrigger id="filter-type" className="w-36">
            <SelectValue />
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
          className="w-36"
          value={value.startDate}
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
          className="w-36"
          value={value.endDate}
          onChange={(event) =>
            onChange({ ...value, endDate: event.target.value })
          }
        />
      </div>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({ mealType: "ALL", startDate: "", endDate: "" })}
        >
          <XIcon />
          Clear
        </Button>
      )}
    </div>
  );
}

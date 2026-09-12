"use client";

import { useState } from "react";
import { MoreVerticalIcon, PencilIcon, TrashIcon } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatNumber, formatTime } from "@/lib/format";
import type { MealEntry } from "@/lib/types/api";

interface MealListItemProps {
  meal: MealEntry;
  onUpdated: (meal: MealEntry) => void;
  onDeleted: (mealId: string) => void;
}

export function MealListItem({ meal, onUpdated, onDeleted }: MealListItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await mealsApi.deleteMeal(meal.id);
      toast.success("Meal deleted");
      onDeleted(meal.id);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to delete meal"
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-foreground">
            {meal.foodName}
          </p>
          <Badge variant="secondary">{MEAL_TYPE_LABELS[meal.mealType]}</Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {formatTime(meal.consumedAt)}
          {meal.quantity ? ` · ${formatNumber(meal.quantity)}${meal.quantityUnit ? ` ${meal.quantityUnit}` : ""}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-semibold text-foreground">
            {formatNumber(meal.calories)}{" "}
            <span className="font-normal text-muted-foreground">kcal</span>
          </p>
          {(meal.protein || meal.carbs || meal.fat) && (
            <p className="text-[11px] text-muted-foreground">
              P{formatNumber(meal.protein)} · C{formatNumber(meal.carbs)} · F
              {formatNumber(meal.fat)}
            </p>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Meal actions" />
            }
          >
            <MoreVerticalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => setIsDeleteOpen(true)}
            >
              <TrashIcon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <MealFormDialog
        meal={meal}
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        onSaved={onUpdated}
      />

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{meal.foodName}&rdquo; will be permanently removed. This
              can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

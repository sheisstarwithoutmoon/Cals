"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import type { MealEntry, MealInput, MealType } from "@/lib/types/api";

interface MealFormDialogProps {
  meal?: MealEntry;
  trigger?: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultConsumedAt?: Date;
  onSaved?: (meal: MealEntry) => void;
}

interface FormState {
  mealType: MealType;
  foodName: string;
  quantity: string;
  quantityUnit: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  sugar: string;
  sodium: string;
  consumedAt: string;
}

function buildInitialState(
  meal: MealEntry | undefined,
  defaultConsumedAt?: Date
): FormState {
  if (meal) {
    return {
      mealType: meal.mealType,
      foodName: meal.foodName,
      quantity: meal.quantity?.toString() ?? "",
      quantityUnit: meal.quantityUnit ?? "",
      calories: meal.calories.toString(),
      protein: meal.protein?.toString() ?? "",
      carbs: meal.carbs?.toString() ?? "",
      fat: meal.fat?.toString() ?? "",
      fiber: meal.fiber?.toString() ?? "",
      sugar: meal.sugar?.toString() ?? "",
      sodium: meal.sodium?.toString() ?? "",
      consumedAt: toDateInputValue(meal.consumedAt),
    };
  }

  return {
    mealType: "BREAKFAST",
    foodName: "",
    quantity: "",
    quantityUnit: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    fiber: "",
    sugar: "",
    sodium: "",
    consumedAt: toDateInputValue(defaultConsumedAt ?? new Date()),
  };
}

function toOptionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function MealFormDialog({
  meal,
  trigger,
  open,
  onOpenChange,
  defaultConsumedAt,
  onSaved,
}: MealFormDialogProps) {
  const isEditing = Boolean(meal);
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(meal, defaultConsumedAt)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(meal, defaultConsumedAt));
      setFormError(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, meal?.id]);

  function setOpen(value: boolean) {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const payload: MealInput = {
      mealType: form.mealType,
      foodName: form.foodName.trim(),
      calories: Number(form.calories),
      quantity: toOptionalNumber(form.quantity),
      quantityUnit: form.quantityUnit.trim() || undefined,
      protein: toOptionalNumber(form.protein),
      carbs: toOptionalNumber(form.carbs),
      fat: toOptionalNumber(form.fat),
      fiber: toOptionalNumber(form.fiber),
      sugar: toOptionalNumber(form.sugar),
      sodium: toOptionalNumber(form.sodium),
      consumedAt: new Date(form.consumedAt).toISOString(),
    };

    setIsSubmitting(true);

    try {
      const result = isEditing
        ? await mealsApi.updateMeal(meal!.id, payload)
        : await mealsApi.createMeal(payload);

      toast.success(isEditing ? "Meal updated" : "Meal logged");
      onSaved?.(result.meal);
      setOpen(false);
    } catch (error) {
      if (error instanceof ApiError) {
        setFormError(error.message);
        setFieldErrors(error.fieldErrors);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit meal" : "Log a meal"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this meal entry."
              : "Add what you ate to keep today's totals accurate."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="min-h-0 space-y-4 overflow-y-auto pr-1"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="mealType">Meal type</Label>
              <Select
                value={form.mealType}
                onValueChange={(value) =>
                  updateField("mealType", value as MealType)
                }
              >
                <SelectTrigger id="mealType" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {MEAL_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="consumedAt">Consumed at</Label>
              <Input
                id="consumedAt"
                type="datetime-local"
                value={form.consumedAt}
                onChange={(event) =>
                  updateField("consumedAt", event.target.value)
                }
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="foodName">Food name</Label>
            <Input
              id="foodName"
              value={form.foodName}
              onChange={(event) => updateField("foodName", event.target.value)}
              aria-invalid={Boolean(fieldErrors.foodName)}
              placeholder="Grilled chicken salad"
              required
            />
            {fieldErrors.foodName && (
              <p className="text-xs text-destructive">
                {fieldErrors.foodName}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                step="any"
                min={0}
                value={form.quantity}
                onChange={(event) =>
                  updateField("quantity", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="quantityUnit">Unit</Label>
              <Input
                id="quantityUnit"
                placeholder="g, cup, plate..."
                value={form.quantityUnit}
                onChange={(event) =>
                  updateField("quantityUnit", event.target.value)
                }
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="calories">Calories (kcal)</Label>
            <Input
              id="calories"
              type="number"
              step="any"
              min={0}
              value={form.calories}
              onChange={(event) => updateField("calories", event.target.value)}
              aria-invalid={Boolean(fieldErrors.calories)}
              required
            />
            {fieldErrors.calories && (
              <p className="text-xs text-destructive">
                {fieldErrors.calories}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="any"
                min={0}
                value={form.protein}
                onChange={(event) =>
                  updateField("protein", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="any"
                min={0}
                value={form.carbs}
                onChange={(event) => updateField("carbs", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                step="any"
                min={0}
                value={form.fat}
                onChange={(event) => updateField("fat", event.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="fiber">Fiber (g)</Label>
              <Input
                id="fiber"
                type="number"
                step="any"
                min={0}
                value={form.fiber}
                onChange={(event) => updateField("fiber", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sugar">Sugar (g)</Label>
              <Input
                id="sugar"
                type="number"
                step="any"
                min={0}
                value={form.sugar}
                onChange={(event) => updateField("sugar", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sodium">Sodium (mg)</Label>
              <Input
                id="sodium"
                type="number"
                step="any"
                min={0}
                value={form.sodium}
                onChange={(event) =>
                  updateField("sodium", event.target.value)
                }
              />
            </div>
          </div>

          {/* Micronutrients collapsible section */}
          <div className="rounded-xl border border-stone-200/80 bg-stone-50/50 p-3 space-y-2.5">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Micronutrients (Optional)
            </p>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div>
                <Label htmlFor="vitA" className="text-[10px] text-stone-600">Vit A (mcg)</Label>
                <Input
                  id="vitA"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="h-8 text-xs"
                  defaultValue={meal?.micronutrients?.["Vitamin A (mcg)"]?.toString() ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="vitC" className="text-[10px] text-stone-600">Vit C (mg)</Label>
                <Input
                  id="vitC"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="h-8 text-xs"
                  defaultValue={meal?.micronutrients?.["Vitamin C (mg)"]?.toString() ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="calcium" className="text-[10px] text-stone-600">Calcium (mg)</Label>
                <Input
                  id="calcium"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="h-8 text-xs"
                  defaultValue={meal?.micronutrients?.["Calcium (mg)"]?.toString() ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="iron" className="text-[10px] text-stone-600">Iron (mg)</Label>
                <Input
                  id="iron"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="h-8 text-xs"
                  defaultValue={meal?.micronutrients?.["Iron (mg)"]?.toString() ?? ""}
                />
              </div>
              <div>
                <Label htmlFor="potassium" className="text-[10px] text-stone-600">Potassium (mg)</Label>
                <Input
                  id="potassium"
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0"
                  className="h-8 text-xs"
                  defaultValue={meal?.micronutrients?.["Potassium (mg)"]?.toString() ?? ""}
                />
              </div>
            </div>
          </div>

          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              {isEditing ? "Save changes" : "Log meal"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

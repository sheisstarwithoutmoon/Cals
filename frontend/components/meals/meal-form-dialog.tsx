"use client";

import { useEffect, useState, type FormEvent, type ReactElement } from "react";
import { FileTextIcon, Loader2Icon, SparklesIcon } from "lucide-react";
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
import { NumberField } from "@/components/meals/number-field";
import { extractNutrition, type ExtractedNutrition } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";
import { MEAL_TYPE_LABELS, MEAL_TYPES } from "@/lib/constants";
import { toDateInputValue } from "@/lib/format";
import type { AttachmentType, MealEntry, MealInput, MealType } from "@/lib/types/api";

interface MealFormDialogProps {
  meal?: MealEntry;
  /** Pre-fills a NEW meal (e.g. from AI photo analysis) instead of editing an existing one. */
  prefillData?: ExtractedNutrition | null;
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
  vitaminA: string;
  vitaminC: string;
  calcium: string;
  iron: string;
  potassium: string;
  consumedAt: string;
  attachmentUrl: string;
  attachmentType: AttachmentType | "";
}

const MICRO_FIELD_KEYS: Record<
  "vitaminA" | "vitaminC" | "calcium" | "iron" | "potassium",
  string
> = {
  vitaminA: "Vitamin A (mcg)",
  vitaminC: "Vitamin C (mg)",
  calcium: "Calcium (mg)",
  iron: "Iron (mg)",
  potassium: "Potassium (mg)",
};

function buildInitialState(
  meal: MealEntry | undefined,
  defaultConsumedAt?: Date,
  prefillData?: ExtractedNutrition | null
): FormState {
  const micro = meal?.micronutrients ?? prefillData?.micronutrients ?? {};

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
      vitaminA: micro["Vitamin A (mcg)"]?.toString() ?? "",
      vitaminC: micro["Vitamin C (mg)"]?.toString() ?? "",
      calcium: micro["Calcium (mg)"]?.toString() ?? "",
      iron: micro["Iron (mg)"]?.toString() ?? "",
      potassium: micro["Potassium (mg)"]?.toString() ?? "",
      consumedAt: toDateInputValue(meal.consumedAt),
      attachmentUrl: meal.attachmentUrl ?? "",
      attachmentType: meal.attachmentType ?? "",
    };
  }

  if (prefillData) {
    return {
      mealType: prefillData.mealType ?? "BREAKFAST",
      foodName: prefillData.foodName ?? "",
      quantity: prefillData.quantity != null ? String(prefillData.quantity) : "",
      quantityUnit: prefillData.quantityUnit ?? "",
      calories: prefillData.calories != null ? String(prefillData.calories) : "",
      protein: prefillData.protein != null ? String(prefillData.protein) : "",
      carbs: prefillData.carbs != null ? String(prefillData.carbs) : "",
      fat: prefillData.fat != null ? String(prefillData.fat) : "",
      fiber: prefillData.fiber != null ? String(prefillData.fiber) : "",
      sugar: prefillData.sugar != null ? String(prefillData.sugar) : "",
      sodium: prefillData.sodium != null ? String(prefillData.sodium) : "",
      vitaminA: micro["Vitamin A (mcg)"]?.toString() ?? "",
      vitaminC: micro["Vitamin C (mg)"]?.toString() ?? "",
      calcium: micro["Calcium (mg)"]?.toString() ?? "",
      iron: micro["Iron (mg)"]?.toString() ?? "",
      potassium: micro["Potassium (mg)"]?.toString() ?? "",
      consumedAt: toDateInputValue(defaultConsumedAt ?? new Date()),
      attachmentUrl: prefillData.attachmentUrl ?? "",
      attachmentType: prefillData.attachmentType ?? "",
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
    vitaminA: "",
    vitaminC: "",
    calcium: "",
    iron: "",
    potassium: "",
    consumedAt: toDateInputValue(defaultConsumedAt ?? new Date()),
    attachmentUrl: "",
    attachmentType: "",
  };
}

function toOptionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function MealFormDialog({
  meal,
  prefillData,
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
    buildInitialState(meal, defaultConsumedAt, prefillData)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setForm(buildInitialState(meal, defaultConsumedAt, prefillData));
      setFormError(null);
      setFieldErrors({});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, meal?.id, prefillData]);

  function setOpen(value: boolean) {
    if (!isControlled) setInternalOpen(value);
    onOpenChange?.(value);
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleEstimateWithAi() {
    if (!form.foodName.trim()) {
      setFormError("Enter a food name or list of items first, then estimate with AI.");
      return;
    }

    setFormError(null);
    setIsEstimating(true);

    try {
      const res = await extractNutrition({ description: form.foodName.trim() });
      const data = res.data;
      const micro = data.micronutrients ?? {};

      setForm((prev) => ({
        ...prev,
        mealType: data.mealType ?? prev.mealType,
        quantity: data.quantity != null ? String(data.quantity) : prev.quantity,
        quantityUnit: data.quantityUnit ?? prev.quantityUnit,
        calories: String(data.calories ?? prev.calories),
        protein: data.protein != null ? String(data.protein) : prev.protein,
        carbs: data.carbs != null ? String(data.carbs) : prev.carbs,
        fat: data.fat != null ? String(data.fat) : prev.fat,
        fiber: data.fiber != null ? String(data.fiber) : prev.fiber,
        sugar: data.sugar != null ? String(data.sugar) : prev.sugar,
        sodium: data.sodium != null ? String(data.sodium) : prev.sodium,
        vitaminA: micro["Vitamin A (mcg)"]?.toString() ?? prev.vitaminA,
        vitaminC: micro["Vitamin C (mg)"]?.toString() ?? prev.vitaminC,
        calcium: micro["Calcium (mg)"]?.toString() ?? prev.calcium,
        iron: micro["Iron (mg)"]?.toString() ?? prev.iron,
        potassium: micro["Potassium (mg)"]?.toString() ?? prev.potassium,
      }));

      toast.success("Filled in nutrition with AI — review before saving.");
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Couldn't estimate nutrition. Please try again."
      );
    } finally {
      setIsEstimating(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});

    const micronutrients: Record<string, number> = {};
    for (const [key, label] of Object.entries(MICRO_FIELD_KEYS) as [
      keyof typeof MICRO_FIELD_KEYS,
      string,
    ][]) {
      const value = toOptionalNumber(form[key]);
      if (value != null) micronutrients[label] = value;
    }

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
      micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
      attachmentUrl: form.attachmentUrl || undefined,
      attachmentType: form.attachmentType || undefined,
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
      <DialogContent className="max-h-[calc(100vh-3rem)] grid-rows-[auto_1fr_auto] gap-0 p-0 sm:max-w-lg">
        <DialogHeader className="gap-1.5 border-b border-border/70 px-6 py-5">
          <DialogTitle className="text-lg">
            {isEditing ? "Edit meal" : "Log a meal"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the details for this meal entry."
              : "Add what you ate to keep today's totals accurate."}
          </DialogDescription>
        </DialogHeader>

        <form
          id="meal-form"
          className="min-h-0 space-y-6 overflow-y-auto px-6 py-5"
          onSubmit={handleSubmit}
          noValidate
        >
          {form.attachmentUrl && (
            <a
              href={form.attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 transition-colors hover:bg-emerald-50"
            >
              {form.attachmentType === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.attachmentUrl}
                  alt="Attached meal photo"
                  className="size-12 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-700">
                  <FileTextIcon className="size-5" />
                </div>
              )}
              <div>
                <p className="text-xs font-semibold text-emerald-900">
                  {form.attachmentType === "IMAGE" ? "Original photo" : "Original PDF"}
                </p>
                <p className="text-[11px] text-emerald-700">
                  This entry was created from an upload — tap to view it
                </p>
              </div>
            </a>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="mealType">Meal type</Label>
              <Select
                value={form.mealType}
                onValueChange={(value) =>
                  updateField("mealType", value as MealType)
                }
              >
                <SelectTrigger id="mealType" className="w-full">
                  <SelectValue>
                    {(mealType: MealType) => MEAL_TYPE_LABELS[mealType]}
                  </SelectValue>
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
            <p className="text-xs text-muted-foreground">
              Logging more than one item? Separate them with commas, e.g. &ldquo;2
              eggs, toast, coffee&rdquo; this is logged as one combined entry.
            </p>
            {fieldErrors.foodName && (
              <p className="text-xs text-destructive">
                {fieldErrors.foodName}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleEstimateWithAi}
            disabled={isEstimating || !form.foodName.trim()}
            className="w-full rounded-full border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          >
            {isEstimating ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <SparklesIcon className="size-4" />
            )}
            <span>
              {isEstimating
                ? "Estimating nutrition..."
                : "Don't know the calories? Estimate with AI"}
            </span>
          </Button>

          <div className="grid grid-cols-2 gap-4">
            <NumberField
              id="quantity"
              label="Quantity"
              value={form.quantity}
              onChange={(value) => updateField("quantity", value)}
            />
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

          <NumberField
            id="calories"
            label="Calories (kcal)"
            value={form.calories}
            onChange={(value) => updateField("calories", value)}
            required
            invalid={Boolean(fieldErrors.calories)}
            errorMessage={fieldErrors.calories}
          />

          <div className="grid grid-cols-3 gap-4">
            <NumberField
              id="protein"
              label="Protein (g)"
              value={form.protein}
              onChange={(value) => updateField("protein", value)}
            />
            <NumberField
              id="carbs"
              label="Carbs (g)"
              value={form.carbs}
              onChange={(value) => updateField("carbs", value)}
            />
            <NumberField
              id="fat"
              label="Fat (g)"
              value={form.fat}
              onChange={(value) => updateField("fat", value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <NumberField
              id="fiber"
              label="Fiber (g)"
              value={form.fiber}
              onChange={(value) => updateField("fiber", value)}
            />
            <NumberField
              id="sugar"
              label="Sugar (g)"
              value={form.sugar}
              onChange={(value) => updateField("sugar", value)}
            />
            <NumberField
              id="sodium"
              label="Sodium (mg)"
              value={form.sodium}
              onChange={(value) => updateField("sodium", value)}
            />
          </div>

          <div className="space-y-3 rounded-xl border border-stone-200/80 bg-stone-50/50 p-4">
            <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
              Micronutrients (optional)
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <NumberField
                compact
                id="vitaminA"
                label="Vit A (mcg)"
                placeholder="0"
                value={form.vitaminA}
                onChange={(value) => updateField("vitaminA", value)}
              />
              <NumberField
                compact
                id="vitaminC"
                label="Vit C (mg)"
                placeholder="0"
                value={form.vitaminC}
                onChange={(value) => updateField("vitaminC", value)}
              />
              <NumberField
                compact
                id="calcium"
                label="Calcium (mg)"
                placeholder="0"
                value={form.calcium}
                onChange={(value) => updateField("calcium", value)}
              />
              <NumberField
                compact
                id="iron"
                label="Iron (mg)"
                placeholder="0"
                value={form.iron}
                onChange={(value) => updateField("iron", value)}
              />
              <NumberField
                compact
                id="potassium"
                label="Potassium (mg)"
                placeholder="0"
                value={form.potassium}
                onChange={(value) => updateField("potassium", value)}
              />
            </div>
          </div>

          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-muted/30 px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="meal-form" disabled={isSubmitting}>
            {isSubmitting && <Loader2Icon className="animate-spin" />}
            {isEditing ? "Save changes" : "Log meal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

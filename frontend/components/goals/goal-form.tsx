"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import type { Goal, GoalInput } from "@/lib/types/api";

interface GoalFormProps {
  goal: Goal | null;
  onSave: (input: GoalInput) => Promise<Goal>;
  onCancel?: () => void;
}

interface FormState {
  dailyCalories: string;
  dailyProtein: string;
  dailyCarbs: string;
  dailyFat: string;
  targetWeight: string;
}

function toFormState(goal: Goal | null): FormState {
  return {
    dailyCalories: goal?.dailyCalories?.toString() ?? "",
    dailyProtein: goal?.dailyProtein?.toString() ?? "",
    dailyCarbs: goal?.dailyCarbs?.toString() ?? "",
    dailyFat: goal?.dailyFat?.toString() ?? "",
    targetWeight: goal?.targetWeight?.toString() ?? "",
  };
}

function toOptionalNumber(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function GoalForm({ goal, onSave, onCancel }: GoalFormProps) {
  const [form, setForm] = useState<FormState>(() => toFormState(goal));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setForm(toFormState(goal));
  }, [goal]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError(null);
    setFieldErrors({});
    setIsSubmitting(true);

    try {
      await onSave({
        dailyCalories: toOptionalNumber(form.dailyCalories),
        dailyProtein: toOptionalNumber(form.dailyProtein),
        dailyCarbs: toOptionalNumber(form.dailyCarbs),
        dailyFat: toOptionalNumber(form.dailyFat),
        targetWeight: toOptionalNumber(form.targetWeight),
      });
      toast.success("Goals saved");
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
    <Card>
      <CardHeader>
        <CardTitle>Edit your goals</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="dailyCalories">Daily calories (kcal)</Label>
            <Input
              id="dailyCalories"
              type="number"
              step="any"
              min={0}
              value={form.dailyCalories}
              onChange={(event) =>
                updateField("dailyCalories", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.dailyCalories)}
              placeholder="e.g. 2200"
            />
            {fieldErrors.dailyCalories && (
              <p className="text-xs text-destructive">
                {fieldErrors.dailyCalories}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="dailyProtein">Protein (g)</Label>
              <Input
                id="dailyProtein"
                type="number"
                step="any"
                min={0}
                value={form.dailyProtein}
                onChange={(event) =>
                  updateField("dailyProtein", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dailyCarbs">Carbs (g)</Label>
              <Input
                id="dailyCarbs"
                type="number"
                step="any"
                min={0}
                value={form.dailyCarbs}
                onChange={(event) =>
                  updateField("dailyCarbs", event.target.value)
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dailyFat">Fat (g)</Label>
              <Input
                id="dailyFat"
                type="number"
                step="any"
                min={0}
                value={form.dailyFat}
                onChange={(event) => updateField("dailyFat", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="targetWeight">Target weight (kg)</Label>
            <Input
              id="targetWeight"
              type="number"
              step="any"
              min={0}
              value={form.targetWeight}
              onChange={(event) =>
                updateField("targetWeight", event.target.value)
              }
              aria-invalid={Boolean(fieldErrors.targetWeight)}
            />
            {fieldErrors.targetWeight && (
              <p className="text-xs text-destructive">
                {fieldErrors.targetWeight}
              </p>
            )}
          </div>

          {formError && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2Icon className="animate-spin" />}
              Save goals
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

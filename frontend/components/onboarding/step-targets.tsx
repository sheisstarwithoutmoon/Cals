"use client";

import { useEffect, useState } from "react";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import { formatNumber } from "@/lib/format";
import type {
  OnboardingTargets,
  WeightPlan,
} from "@/lib/types/api";

interface StepTargetsProps {
  onBack: () => void;
  onComplete: () => void | Promise<void>;
}

interface FormState {
  dailyCalories: string;
  dailyProtein: string;
  dailyCarbs: string;
  dailyFat: string;
}

const EMPTY_FORM: FormState = {
  dailyCalories: "",
  dailyProtein: "",
  dailyCarbs: "",
  dailyFat: "",
};

function toFormState(targets: OnboardingTargets): FormState {
  return {
    dailyCalories: targets.dailyCalories.toString(),
    dailyProtein: targets.dailyProtein.toString(),
    dailyCarbs: targets.dailyCarbs.toString(),
    dailyFat: targets.dailyFat.toString(),
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};

  const calories = Number(form.dailyCalories);
  if (!form.dailyCalories.trim() || !(calories > 0) || calories > 10000) {
    errors.dailyCalories = "Enter calories between 1 and 10000";
  }

  const protein = Number(form.dailyProtein);
  if (!form.dailyProtein.trim() || protein < 0 || protein > 1000) {
    errors.dailyProtein = "Enter protein between 0 and 1000g";
  }

  const carbs = Number(form.dailyCarbs);
  if (!form.dailyCarbs.trim() || carbs < 0 || carbs > 1500) {
    errors.dailyCarbs = "Enter carbs between 0 and 1500g";
  }

  const fat = Number(form.dailyFat);
  if (!form.dailyFat.trim() || fat < 0 || fat > 500) {
    errors.dailyFat = "Enter fat between 0 and 500g";
  }

  return errors;
}

export function StepTargets({ onBack, onComplete }: StepTargetsProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(true);
  const [plan, setPlan] = useState<WeightPlan | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSuggestion() {
      setIsLoadingSuggestion(true);
      try {
        const suggestion = await onboardingApi.getSuggestedTargets();
        if (isMounted) {
          setForm(toFormState(suggestion.targets));
          setPlan(suggestion.plan);
        }
      } catch (error) {
        if (isMounted) {
          setFormError(
            error instanceof ApiError
              ? error.message
              : "Couldn't calculate suggested targets. You can still enter them manually."
          );
        }
      } finally {
        if (isMounted) setIsLoadingSuggestion(false);
      }
    }

    loadSuggestion();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit() {
    const errors = validate(form);
    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) return;

    const payload: OnboardingTargets = {
      dailyCalories: Number(form.dailyCalories),
      dailyProtein: Number(form.dailyProtein),
      dailyCarbs: Number(form.dailyCarbs),
      dailyFat: Number(form.dailyFat),
    };

    setIsSubmitting(true);

    try {
      await onboardingApi.completeOnboarding(payload);
      await onComplete();
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
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-stone-900">
          Your daily targets
        </h2>
        <p className="mt-1 flex items-center gap-1.5 text-sm text-stone-500">
          {isLoadingSuggestion ? (
            <>
              <Loader2Icon className="size-3.5 animate-spin" />
              Calculating suggested targets...
            </>
          ) : (
            <>
              <SparklesIcon className="size-3.5 text-emerald-700" />
              Estimated from your profile, activity, and goal. Review and adjust
              them to fit you.
            </>
          )}
        </p>
      </div>

      {plan && (
        <div className="space-y-1 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs leading-relaxed text-stone-600">
          <p className="text-sm font-semibold text-stone-900">
            {formatNumber(plan.currentWeight, 1)} kg to {formatNumber(plan.targetWeight, 1)} kg
            {plan.weeksToGoal != null &&
              ` in about ${plan.weeksToGoal} ${plan.weeksToGoal === 1 ? "week" : "weeks"}`}
          </p>
          <p>
            Eating{" "}
            {formatNumber(Math.abs(plan.dailyCalorieAdjustment))} kcal a day{" "}
            {plan.goalType === "LOSE" ? "below" : "above"} maintenance, about{" "}
            {formatNumber(plan.appliedWeeklyChangeKg, 2)} kg per week.
          </p>
          {plan.limitedByMinimumCalories && (
            <p className="text-amber-700">
              Your chosen pace of {plan.weeklyWeightChangeKg} kg per week would put you below
              1,200 kcal a day, so the target is held at that minimum and the pace is slower.
            </p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2.5 text-xs leading-relaxed text-stone-600">
        We estimate your base energy needs from age, height, weight, and
        activity, then adjust it for your goal and pace. These are starting
        estimates, not medical advice. Review and change any value before
        finishing.
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ob-calories" className="text-xs font-bold text-stone-700">
          Daily calories (kcal)
        </Label>
        <Input
          id="ob-calories"
          type="number"
          step="any"
          min={0}
          value={form.dailyCalories}
          onChange={(event) => updateField("dailyCalories", event.target.value)}
          aria-invalid={Boolean(fieldErrors.dailyCalories)}
        />
        {fieldErrors.dailyCalories && (
          <p className="text-xs text-rose-600">{fieldErrors.dailyCalories}</p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ob-protein" className="text-xs font-bold text-stone-700">
            Protein (g)
          </Label>
          <Input
            id="ob-protein"
            type="number"
            step="any"
            min={0}
            value={form.dailyProtein}
            onChange={(event) => updateField("dailyProtein", event.target.value)}
            aria-invalid={Boolean(fieldErrors.dailyProtein)}
          />
          {fieldErrors.dailyProtein && (
            <p className="text-xs text-rose-600">{fieldErrors.dailyProtein}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-carbs" className="text-xs font-bold text-stone-700">
            Carbs (g)
          </Label>
          <Input
            id="ob-carbs"
            type="number"
            step="any"
            min={0}
            value={form.dailyCarbs}
            onChange={(event) => updateField("dailyCarbs", event.target.value)}
            aria-invalid={Boolean(fieldErrors.dailyCarbs)}
          />
          {fieldErrors.dailyCarbs && (
            <p className="text-xs text-rose-600">{fieldErrors.dailyCarbs}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-fat" className="text-xs font-bold text-stone-700">
            Fat (g)
          </Label>
          <Input
            id="ob-fat"
            type="number"
            step="any"
            min={0}
            value={form.dailyFat}
            onChange={(event) => updateField("dailyFat", event.target.value)}
            aria-invalid={Boolean(fieldErrors.dailyFat)}
          />
          {fieldErrors.dailyFat && (
            <p className="text-xs text-rose-600">{fieldErrors.dailyFat}</p>
          )}
        </div>
      </div>

      {formError && (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
          {formError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="rounded-full"
        >
          Back
        </Button>
        <Button
          type="button"
          disabled={isSubmitting || isLoadingSuggestion}
          onClick={handleSubmit}
          className="flex-1 cursor-pointer rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-98"
        >
          {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
          Finish
        </Button>
      </div>
    </div>
  );
}

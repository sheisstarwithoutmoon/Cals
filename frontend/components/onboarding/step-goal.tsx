"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import {
  GOAL_TYPES,
  GOAL_TYPE_DESCRIPTIONS,
  GOAL_TYPE_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { GoalType } from "@/lib/types/api";

interface StepGoalProps {
  initial: GoalType | null;
  onBack: () => void;
  onSaved: (goalType: GoalType) => void;
}

export function StepGoal({ initial, onBack, onSaved }: StepGoalProps) {
  const [selected, setSelected] = useState<GoalType | null>(initial);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!selected) {
      setFormError("Choose a goal to continue");
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await onboardingApi.saveGoalType(selected);
      onSaved(selected);
    } catch (error) {
      setFormError(
        error instanceof ApiError ? error.message : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-stone-900">
          What&apos;s your goal?
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          We&apos;ll use this to set your daily calorie target.
        </p>
      </div>

      <div className="space-y-2.5">
        {GOAL_TYPES.map((goalType) => {
          const isSelected = selected === goalType;

          return (
            <button
              key={goalType}
              type="button"
              onClick={() => {
                setSelected(goalType);
                setFormError(null);
              }}
              className={cn(
                "flex w-full items-start gap-3 rounded-2xl border px-4 py-3.5 text-left transition-colors",
                isSelected
                  ? "border-emerald-600 bg-emerald-50"
                  : "border-stone-200 bg-white hover:border-stone-300"
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-emerald-700" : "border-stone-300"
                )}
              >
                {isSelected && (
                  <span className="size-2 rounded-full bg-emerald-700" />
                )}
              </span>
              <span>
                <span className="block text-sm font-bold text-stone-900">
                  {GOAL_TYPE_LABELS[goalType]}
                </span>
                <span className="mt-0.5 block text-xs text-stone-500">
                  {GOAL_TYPE_DESCRIPTIONS[goalType]}
                </span>
              </span>
            </button>
          );
        })}
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
          disabled={isSubmitting}
          onClick={handleContinue}
          className="flex-1 cursor-pointer rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800 active:scale-98"
        >
          {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </div>
  );
}

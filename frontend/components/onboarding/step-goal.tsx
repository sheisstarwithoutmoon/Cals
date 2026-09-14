"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { BmiSummary } from "@/components/goals/bmi-summary";
import { HealthNotes } from "@/components/goals/health-conditions";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import {
  GOAL_TYPE_LABELS,
  GOAL_TYPES,
} from "@/lib/constants";
import type { BodyAssessment, GoalPlanInput, GoalType } from "@/lib/types/api";

interface StepGoalProps {
  initialGoalType: GoalType | null;
  assessment: BodyAssessment | null;
  heightCm?: number;
  onBack: () => void;
  onSavedMaintain: (plan: GoalPlanInput) => void;
  onProceedToTargetWeight: (goalType: "LOSE" | "GAIN") => void;
}

export function StepGoal({
  initialGoalType,
  assessment,
  heightCm,
  onBack,
  onSavedMaintain,
  onProceedToTargetWeight,
}: StepGoalProps) {
  const defaultGoal =
    initialGoalType || assessment?.recommendedGoalType || "MAINTAIN";
  const [selectedType, setSelectedType] = useState<GoalType>(defaultGoal);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    setFormError(null);

    if (selectedType === "MAINTAIN") {
      setIsSubmitting(true);
      try {
        const payload: GoalPlanInput = { goalType: "MAINTAIN" };
        await onboardingApi.saveGoalType(payload);
        onSavedMaintain(payload);
      } catch (error) {
        if (error instanceof ApiError) {
          setFormError(error.message);
        } else {
          setFormError("Something went wrong. Please try again.");
        }
      } finally {
        setIsSubmitting(false);
      }
    } else {
      onProceedToTargetWeight(selectedType);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">What's your goal?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Based on your BMI and health, we've marked the goal we recommend.
          You can pick a different one.
        </p>
      </div>

      {assessment && (
        <div className="rounded-xl border border-border bg-muted/30 px-3.5 py-2.5">
          <BmiSummary assessment={assessment} heightCm={heightCm} />
        </div>
      )}

      {assessment && <HealthNotes notes={assessment.notes} />}

      <div role="radiogroup" aria-label="Weight goal" className="space-y-2">
        {GOAL_TYPES.map((goalType) => {
          const isSelected = selectedType === goalType;
          const isAllowed = !assessment || assessment.allowedGoalTypes.includes(goalType);
          const isRecommended = assessment?.recommendedGoalType === goalType;

          return (
            <button
              key={goalType}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!isAllowed}
              onClick={() => setSelectedType(goalType)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected
                  ? "border-primary/50 bg-[#E7F0EA]"
                  : "border-border bg-card hover:border-primary/30",
                !isAllowed && "cursor-not-allowed opacity-50 hover:border-border"
              )}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border-2",
                  isSelected ? "border-primary" : "border-muted-foreground/40"
                )}
              >
                {isSelected && <span className="size-2 rounded-full bg-primary" />}
              </span>
              <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2">
                <span className="text-foreground">{GOAL_TYPE_LABELS[goalType]}</span>
                {!isAllowed ? (
                  <span className="text-xs text-muted-foreground">Not available</span>
                ) : (
                  isRecommended && (
                    <span className="text-xs font-semibold text-primary">Recommended for you</span>
                  )
                )}
              </span>
            </button>
          );
        })}
      </div>

      {formError && (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {formError}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onBack} className="rounded-full">
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

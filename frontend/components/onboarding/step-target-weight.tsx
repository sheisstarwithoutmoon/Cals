"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import { formatNumber } from "@/lib/format";
import type { BodyAssessment, GoalPlanInput, GoalType } from "@/lib/types/api";

type ChangeGoal = "LOSE" | "GAIN";

const PACE_OPTIONS: Record<ChangeGoal, { value: number; label: string }[]> = {
  LOSE: [
    { value: 0.25, label: "Gradual" },
    { value: 0.5, label: "Steady" },
    { value: 0.75, label: "Faster" },
    { value: 1, label: "Fastest" },
  ],
  GAIN: [
    { value: 0.25, label: "Lean" },
    { value: 0.5, label: "Steady" },
  ],
};

const KCAL_PER_KG = 7700;

interface StepTargetWeightProps {
  goalType: ChangeGoal;
  initialTargetWeight: number | null;
  initialWeeklyWeightChangeKg: number | null;
  assessment: BodyAssessment | null;
  currentWeight?: number;
  onBack: () => void;
  onSaved: (plan: GoalPlanInput) => void;
}

export function StepTargetWeight({
  goalType,
  initialTargetWeight,
  initialWeeklyWeightChangeKg,
  assessment,
  currentWeight,
  onBack,
  onSaved,
}: StepTargetWeightProps) {
  const recommendedTarget =
    assessment && assessment.recommendedGoalType === goalType
      ? assessment.recommendedTargetWeight
      : null;

  const [targetWeight, setTargetWeight] = useState<string>(() => {
    if (initialTargetWeight != null && initialTargetWeight > 0) {
      return String(initialTargetWeight);
    }
    return recommendedTarget != null ? String(recommendedTarget) : "";
  });

  const availablePaces = PACE_OPTIONS[goalType].filter(
    (option) => !assessment || option.value <= assessment.maxWeeklyChangeKg[goalType]
  );

  const [weeklyPace, setWeeklyPace] = useState<number | null>(() => {
    if (
      initialWeeklyWeightChangeKg != null &&
      availablePaces.some((p) => p.value === initialWeeklyWeightChangeKg)
    ) {
      return initialWeeklyWeightChangeKg;
    }
    const defaultPace = goalType === "LOSE" ? 0.5 : 0.25;
    return availablePaces.find((p) => p.value === defaultPace)?.value ?? availablePaces[0]?.value ?? 0.25;
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const parsedTarget = Number(targetWeight);
  const hasTarget = targetWeight.trim() !== "" && Number.isFinite(parsedTarget) && parsedTarget > 0;
  const difference = hasTarget && currentWeight != null ? parsedTarget - currentWeight : null;
  const isRightDirection =
    difference != null &&
    ((goalType === "LOSE" && difference < 0) || (goalType === "GAIN" && difference > 0));

  const dailyChange = weeklyPace ? Math.round((weeklyPace * KCAL_PER_KG) / 7) : null;
  const weeksToGoal = isRightDirection && weeklyPace ? Math.ceil(Math.abs(difference!) / weeklyPace) : null;

  async function handleContinue() {
    const errors: Record<string, string> = {};

    if (!targetWeight.trim() || !Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      errors.targetWeight = "Enter your target weight";
    }
    if (weeklyPace == null) {
      errors.weeklyPace = "Choose a weekly pace";
    }

    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    const payload: GoalPlanInput = {
      goalType,
      targetWeight: parsedTarget,
      weeklyWeightChangeKg: weeklyPace ?? undefined,
    };

    setIsSubmitting(true);

    try {
      await onboardingApi.saveGoalType(payload);
      onSaved(payload);
    } catch (error) {
      if (error instanceof ApiError) {
        setFieldErrors(error.fieldErrors);
        setFormError(Object.keys(error.fieldErrors).length ? null : error.message);
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          {goalType === "LOSE" ? "Weight loss target" : "Weight gain target"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose your target weight and how fast you want to reach it.
        </p>
      </div>

      <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-xs">
        <div className="space-y-2">
          <Label htmlFor="target-weight-input" className="text-sm font-semibold">
            Target weight (kg)
          </Label>
          <Input
            id="target-weight-input"
            type="number"
            inputMode="decimal"
            step="any"
            min={30}
            max={300}
            value={targetWeight}
            onChange={(e) => {
              setTargetWeight(e.target.value);
              setFieldErrors({});
            }}
            aria-invalid={Boolean(fieldErrors.targetWeight)}
            className="bg-background"
          />
          {fieldErrors.targetWeight ? (
            <p className="text-xs text-destructive">{fieldErrors.targetWeight}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {currentWeight != null && `Current weight ${formatNumber(currentWeight, 1)} kg`}
              {isRightDirection &&
                ` · ${goalType === "LOSE" ? "lose" : "gain"} ${formatNumber(Math.abs(difference!), 1)} kg`}
              {recommendedTarget != null && String(recommendedTarget) !== targetWeight && (
                <>
                  {" · "}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setTargetWeight(String(recommendedTarget))}
                  >
                    Use recommended {formatNumber(recommendedTarget)} kg
                  </button>
                </>
              )}
            </p>
          )}
        </div>

        <div className="space-y-2 pt-1">
          <p className="text-sm font-semibold text-foreground">
            How fast do you want to {goalType === "LOSE" ? "lose" : "gain"} it?
          </p>
          <div
            role="radiogroup"
            aria-label="Weekly pace"
            className={cn("grid gap-2.5", availablePaces.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}
          >
            {availablePaces.map((option) => {
              const isActive = weeklyPace === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setWeeklyPace(option.value)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl border p-3 text-center transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary/60 bg-[#E7F0EA] shadow-xs"
                      : "border-border bg-background hover:border-primary/30"
                  )}
                >
                  <span className="text-sm font-bold text-foreground">{option.value} kg</span>
                  <span className="text-xs text-muted-foreground">per week · {option.label}</span>
                </button>
              );
            })}
          </div>
          {assessment && goalType === "LOSE" && assessment.maxWeeklyChangeKg.LOSE < 1 && (
            <p className="text-xs text-muted-foreground">
              Faster paces are hidden to keep weight loss safe with your health conditions.
            </p>
          )}
          {fieldErrors.weeklyPace && <p className="text-xs text-destructive">{fieldErrors.weeklyPace}</p>}
        </div>

        {dailyChange != null && (
          // Always two lines, so the box (and the card) keep the same height
          // whether or not a valid target has been typed yet.
          <div className="space-y-0.5 rounded-xl bg-muted/40 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <p>
              About{" "}
              <span className="font-semibold text-foreground">
                {formatNumber(dailyChange)} kcal a day {goalType === "LOSE" ? "below" : "above"}
              </span>{" "}
              your maintenance calories.
            </p>
            <p>
              {weeksToGoal != null ? (
                <>
                  Reaching your target in about{" "}
                  <span className="font-semibold text-foreground">
                    {weeksToGoal} {weeksToGoal === 1 ? "week" : "weeks"}
                  </span>
                  .
                </>
              ) : (
                "Enter a target weight to see how long it will take."
              )}
            </p>
          </div>
        )}
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

"use client";

import { cn } from "cn";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GOAL_TYPE_LABELS, GOAL_TYPES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { BodyAssessment, GoalPlanInput, GoalType } from "@/lib/types/api";

type ChangeGoal = Exclude<GoalType, "MAINTAIN">;

export interface GoalPlanValue {
  goalType: GoalType | null;
  /** Kept as text while editing. */
  targetWeight: string;
  weeklyWeightChangeKg: number | null;
}

// Weekly paces offered (kg/week); the assessment's limits hide faster ones.
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

export function goalPlanFromSaved(saved: {
  goalType: GoalType | null;
  targetWeight: number | null;
  weeklyWeightChangeKg: number | null;
}): GoalPlanValue {
  return {
    goalType: saved.goalType,
    targetWeight: saved.targetWeight?.toString() ?? "",
    weeklyWeightChangeKg: saved.weeklyWeightChangeKg,
  };
}

/** Required-field check before sending; weight and health rules are enforced by the server. */
export function checkGoalPlan(value: GoalPlanValue): {
  errors: Record<string, string>;
  payload: GoalPlanInput | null;
} {
  const errors: Record<string, string> = {};

  if (!value.goalType) {
    return { errors: { goalType: "Choose a goal to continue" }, payload: null };
  }

  if (value.goalType === "MAINTAIN") {
    return { errors, payload: { goalType: "MAINTAIN" } };
  }

  const target = Number(value.targetWeight);
  if (!value.targetWeight.trim() || !Number.isFinite(target) || target <= 0) {
    errors.targetWeight = "Enter your target weight";
  }
  if (value.weeklyWeightChangeKg == null) {
    errors.weeklyWeightChangeKg = "Choose a weekly pace";
  }

  return {
    errors,
    payload: Object.keys(errors).length
      ? null
      : {
          goalType: value.goalType,
          targetWeight: target,
          weeklyWeightChangeKg: value.weeklyWeightChangeKg ?? undefined,
        },
  };
}

interface GoalPlanFieldsProps {
  value: GoalPlanValue;
  onChange: (value: GoalPlanValue) => void;
  assessment: BodyAssessment | null;
  currentWeight: number | null | undefined;
  errors?: Record<string, string>;
}

/**
 * Goal type (with the recommended one marked and unsafe ones disabled),
 * target weight prefilled from the recommendation, and a weekly pace limited
 * by the user's health, plus a live summary of what that plan means.
 */
export function GoalPlanFields({
  value,
  onChange,
  assessment,
  currentWeight,
  errors = {},
}: GoalPlanFieldsProps) {
  const changeGoal = value.goalType === "LOSE" || value.goalType === "GAIN" ? value.goalType : null;
  const paceOptions = changeGoal
    ? PACE_OPTIONS[changeGoal].filter(
        (option) => !assessment || option.value <= assessment.maxWeeklyChangeKg[changeGoal]
      )
    : [];

  const target = Number(value.targetWeight);
  const hasTarget = value.targetWeight.trim() !== "" && Number.isFinite(target) && target > 0;
  const difference = hasTarget && currentWeight != null ? target - currentWeight : null;
  const isRightDirection =
    difference != null &&
    ((changeGoal === "LOSE" && difference < 0) || (changeGoal === "GAIN" && difference > 0));

  const recommendedTarget =
    assessment && changeGoal && assessment.recommendedGoalType === changeGoal
      ? assessment.recommendedTargetWeight
      : null;

  function selectGoal(goalType: GoalType) {
    if (goalType === "MAINTAIN") {
      onChange({ goalType, targetWeight: "", weeklyWeightChangeKg: null });
      return;
    }

    const options = PACE_OPTIONS[goalType].filter(
      (option) => !assessment || option.value <= assessment.maxWeeklyChangeKg[goalType]
    );
    const keepsPace = options.some((option) => option.value === value.weeklyWeightChangeKg);
    const defaultPace = goalType === "LOSE" ? 0.5 : 0.25;

    // Prefill the target from the recommendation when it matches this goal;
    // otherwise keep what the user typed if it still points the right way.
    const typed = Number(value.targetWeight);
    const typedFits =
      value.goalType === goalType && Number.isFinite(typed) && typed > 0;
    const recommended =
      assessment?.recommendedGoalType === goalType ? assessment.recommendedTargetWeight : null;

    onChange({
      goalType,
      targetWeight: typedFits ? value.targetWeight : recommended != null ? String(recommended) : "",
      weeklyWeightChangeKg: keepsPace
        ? value.weeklyWeightChangeKg
        : options.find((option) => option.value === defaultPace)?.value ?? options[0]?.value ?? null,
    });
  }

  const pace = value.weeklyWeightChangeKg;
  const dailyChange = pace ? Math.round((pace * KCAL_PER_KG) / 7) : null;
  const weeksToGoal = isRightDirection && pace ? Math.ceil(Math.abs(difference!) / pace) : null;

  return (
    <div className="space-y-4">
      <div role="radiogroup" aria-label="Weight goal" className="space-y-2">
        {GOAL_TYPES.map((goalType) => {
          const isSelected = value.goalType === goalType;
          const isAllowed = !assessment || assessment.allowedGoalTypes.includes(goalType);
          const isRecommended = assessment?.recommendedGoalType === goalType;

          return (
            <button
              key={goalType}
              type="button"
              role="radio"
              aria-checked={isSelected}
              disabled={!isAllowed}
              onClick={() => selectGoal(goalType)}
              className={cn(
                "flex w-full min-w-0 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-colors",
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
        {errors.goalType && <p className="text-xs text-destructive">{errors.goalType}</p>}
      </div>

      {changeGoal && (
        <div className="space-y-4 rounded-xl border border-border bg-muted/30 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-target-weight">Target weight (kg)</Label>
            <Input
              id="goal-target-weight"
              type="number"
              inputMode="decimal"
              step="any"
              min={30}
              max={300}
              value={value.targetWeight}
              onChange={(event) => onChange({ ...value, targetWeight: event.target.value })}
              aria-invalid={Boolean(errors.targetWeight)}
              className="bg-card"
            />
            {errors.targetWeight ? (
              <p className="text-xs text-destructive">{errors.targetWeight}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {currentWeight != null && `Current weight ${formatNumber(currentWeight, 1)} kg`}
                {isRightDirection &&
                  ` · ${changeGoal === "LOSE" ? "lose" : "gain"} ${formatNumber(Math.abs(difference!), 1)} kg`}
                {recommendedTarget != null && String(recommendedTarget) !== value.targetWeight && (
                  <>
                    {" · "}
                    <button
                      type="button"
                      className="font-medium text-primary hover:underline"
                      onClick={() => onChange({ ...value, targetWeight: String(recommendedTarget) })}
                    >
                      Use recommended {formatNumber(recommendedTarget)} kg
                    </button>
                  </>
                )}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <p id="goal-pace-label" className="text-sm font-medium text-foreground">
              How fast do you want to {changeGoal === "LOSE" ? "lose" : "gain"} it?
            </p>
            <div
              role="radiogroup"
              aria-labelledby="goal-pace-label"
              className={cn("grid gap-2", paceOptions.length > 2 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2")}
            >
              {paceOptions.map((option) => {
                const isActive = pace === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => onChange({ ...value, weeklyWeightChangeKg: option.value })}
                    className={cn(
                      "min-w-0 rounded-xl border px-2 py-2.5 text-center transition-colors",
                      isActive ? "border-primary/60 bg-[#E7F0EA]" : "border-border bg-card hover:border-primary/30"
                    )}
                  >
                    <span className="block text-sm font-semibold text-foreground">{option.value} kg</span>
                    <span className="block text-xs text-muted-foreground">per week · {option.label}</span>
                  </button>
                );
              })}
            </div>
            {assessment && changeGoal === "LOSE" && assessment.maxWeeklyChangeKg.LOSE < 1 && (
              <p className="text-xs text-muted-foreground">
                Faster paces are hidden to keep weight loss safe with your health conditions.
              </p>
            )}
            {errors.weeklyWeightChangeKg && (
              <p className="text-xs text-destructive">{errors.weeklyWeightChangeKg}</p>
            )}
          </div>

          {dailyChange != null && (
            // Always two lines, so the box keeps its height while typing.
            <div className="space-y-0.5 rounded-xl bg-card px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
              <p>
                About{" "}
                <span className="font-semibold text-foreground">
                  {formatNumber(dailyChange)} kcal a day {changeGoal === "LOSE" ? "below" : "above"}
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
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { CheckIcon, HeartPulseIcon, RulerIcon, TargetIcon } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BmiSummary } from "@/components/goals/bmi-summary";
import { EditDialog } from "@/components/goals/edit-dialog";
import {
  checkGoalPlan,
  GoalPlanFields,
  goalPlanFromSaved,
  type GoalPlanValue,
} from "@/components/goals/goal-plan-fields";
import { HealthConditionsPicker, HealthNotes } from "@/components/goals/health-conditions";
import { DetailRows, SectionCard } from "@/components/goals/section-card";
import { ApiError } from "@/lib/api/client";
import {
  ACTIVITY_LEVEL_LABELS,
  ACTIVITY_LEVELS,
  ALLERGY_INTOLERANCES,
  ALLERGY_LABELS,
  DIET_PREFERENCE_LABELS,
  DIET_PREFERENCES,
  GOAL_TYPE_LABELS,
  HEALTH_CONDITION_LABELS,
} from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type {
  ActivityLevel,
  AllergyIntolerance,
  DietPreference,
  HealthCondition,
  ProfileUpdate,
  ProfileView,
} from "@/lib/types/api";

type UpdateProfile = (patch: ProfileUpdate) => Promise<string[]>;

interface CardProps {
  view: ProfileView;
  onUpdate: UpdateProfile;
}

/**
 * Saves a profile patch for a dialog: surfaces field errors, reports any
 * safety adjustments the server made, and closes the dialog on success.
 */
function useProfileSave(onUpdate: UpdateProfile, close: () => void) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  async function save(patch: ProfileUpdate, successMessage: string) {
    setIsSaving(true);
    setError(null);
    setFieldErrors({});

    try {
      const adjustments = await onUpdate(patch);
      toast.success(successMessage);
      adjustments.forEach((message) => toast.info(message, { duration: 8000 }));
      close();
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        const fieldMessages = Object.values(err.fieldErrors);
        setError(fieldMessages.length ? fieldMessages.join(" ") : err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setIsSaving(false);
    }
  }

  function reset() {
    setError(null);
    setFieldErrors({});
  }

  return { save, isSaving, error, fieldErrors, setFieldErrors, reset };
}

export function WeightGoalCard({ view, onUpdate }: CardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [plan, setPlan] = useState<GoalPlanValue>(() => goalPlanFromSaved(view));
  const { save, isSaving, error, fieldErrors, setFieldErrors, reset } = useProfileSave(onUpdate, () =>
    setIsOpen(false)
  );

  const { assessment, plan: weightPlan, goalType } = view;
  const isRecommended = assessment && goalType === assessment.recommendedGoalType;

  function open() {
    setPlan(goalPlanFromSaved(view));
    reset();
    setIsOpen(true);
  }

  function submit() {
    const { errors, payload } = checkGoalPlan(plan);
    setFieldErrors(errors);
    if (!payload) return;
    save(
      {
        goalType: payload.goalType,
        targetWeight: payload.targetWeight ?? null,
        weeklyWeightChangeKg: payload.weeklyWeightChangeKg ?? null,
      },
      "Weight goal updated"
    );
  }

  return (
    <SectionCard
      title="Weight goal"
      description={
        !assessment || !goalType
          ? undefined
          : isRecommended
            ? "This matches what we recommend for your BMI and health."
            : `We recommend: ${GOAL_TYPE_LABELS[assessment.recommendedGoalType].toLowerCase()}.`
      }
      onEdit={open}
    >
      {!goalType ? (
        <p className="text-sm text-muted-foreground">No weight goal set yet.</p>
      ) : (
        <DetailRows
          rows={[
            { label: "Goal", value: GOAL_TYPE_LABELS[goalType] },
            {
              label: "Current weight",
              value: view.profile.currentWeight != null ? `${formatNumber(view.profile.currentWeight, 1)} kg` : "Not set",
            },
            ...(weightPlan
              ? [
                { label: "Target weight", value: `${formatNumber(weightPlan.targetWeight, 1)} kg` },
                {
                  label: "To go",
                  value: `${goalType === "LOSE" ? "Lose" : "Gain"} ${formatNumber(weightPlan.weightChangeKg, 1)} kg`,
                },
                {
                  label: "Pace",
                  value: weightPlan.limitedByMinimumCalories
                    ? `About ${formatNumber(weightPlan.appliedWeeklyChangeKg, 2)} kg per week (held at 1,200 kcal minimum)`
                    : `${weightPlan.weeklyWeightChangeKg} kg per week`,
                },
                {
                  label: "Estimated time",
                  value:
                    weightPlan.weeksToGoal != null
                      ? `About ${weightPlan.weeksToGoal} ${weightPlan.weeksToGoal === 1 ? "week" : "weeks"}`
                      : "-",
                },
                {
                  label: "Calories vs maintenance",
                  value: `${formatNumber(Math.abs(weightPlan.dailyCalorieAdjustment))} kcal a day ${weightPlan.dailyCalorieAdjustment < 0 ? "below" : "above"
                    }`,
                },
              ]
              : []),
          ]}
        />
      )}

      <EditDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        icon={TargetIcon}
        title="Edit weight goal"
        description="Pick a goal, target weight and pace. The recommended goal is based on your BMI and health."
        onSubmit={submit}
        isSaving={isSaving}
        error={error}
        size="lg"
      >
        {assessment && (
          <div className="rounded-2xl border border-border bg-card p-4">
            <BmiSummary assessment={assessment} heightCm={view.profile.heightCm} />
          </div>
        )}
        {assessment && <HealthNotes notes={assessment.notes} />}
        <GoalPlanFields
          value={plan}
          onChange={(next) => {
            setPlan(next);
            setFieldErrors({});
          }}
          assessment={assessment}
          currentWeight={view.profile.currentWeight}
          errors={fieldErrors}
        />
      </EditDialog>
    </SectionCard>
  );
}

interface BodyForm {
  currentWeight: string;
  heightCm: string;
  age: string;
  activityLevel: ActivityLevel | "";
}

function bodyFormFrom(view: ProfileView): BodyForm {
  return {
    currentWeight: view.profile.currentWeight?.toString() ?? "",
    heightCm: view.profile.heightCm?.toString() ?? "",
    age: view.profile.age?.toString() ?? "",
    activityLevel: view.profile.activityLevel ?? "",
  };
}

export function BodyCard({ view, onUpdate }: CardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<BodyForm>(() => bodyFormFrom(view));
  const { save, isSaving, error, fieldErrors, setFieldErrors, reset } = useProfileSave(onUpdate, () =>
    setIsOpen(false)
  );
  const { profile, assessment } = view;

  function open() {
    setForm(bodyFormFrom(view));
    reset();
    setIsOpen(true);
  }

  function submit() {
    const errors: Record<string, string> = {};
    const weight = Number(form.currentWeight);
    const height = Number(form.heightCm);
    const age = Number(form.age);

    if (!(weight > 0 && weight <= 500)) errors.currentWeight = "Enter a weight between 1 and 500 kg";
    if (!(height > 0 && height <= 300)) errors.heightCm = "Enter a height between 1 and 300 cm";
    if (!(Number.isInteger(age) && age >= 10 && age <= 120)) errors.age = "Enter an age between 10 and 120";
    if (!form.activityLevel) errors.activityLevel = "Choose an activity level";

    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    save(
      {
        currentWeight: weight,
        heightCm: height,
        age,
        activityLevel: form.activityLevel as ActivityLevel,
      },
      "Body details updated"
    );
  }

  const field = (key: keyof Omit<BodyForm, "activityLevel">, label: string, suffix: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={`body-${key}`}>{label}</Label>
      <div className="relative">
        <Input
          id={`body-${key}`}
          type="number"
          inputMode="decimal"
          step="any"
          value={form[key]}
          onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
          aria-invalid={Boolean(fieldErrors[key])}
          className="bg-card pr-12"
        />
        <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
          {suffix}
        </span>
      </div>
      {fieldErrors[key] && <p className="text-xs text-destructive">{fieldErrors[key]}</p>}
    </div>
  );

  return (
    <SectionCard title="Body & BMI" description="Update your weight as it changes to keep targets accurate." onEdit={open} editLabel="Update">
      {assessment && <BmiSummary assessment={assessment} heightCm={profile.heightCm} />}
      <DetailRows
        rows={[
          { label: "Weight", value: profile.currentWeight != null ? `${formatNumber(profile.currentWeight, 1)} kg` : "Not set" },
          { label: "Height", value: profile.heightCm != null ? `${formatNumber(profile.heightCm)} cm` : "Not set" },
          { label: "Age", value: profile.age ?? "Not set" },
          { label: "Activity", value: profile.activityLevel ? ACTIVITY_LEVEL_LABELS[profile.activityLevel] : "Not set" },
        ]}
      />

      <EditDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        icon={RulerIcon}
        title="Update body details"
        description="Your BMI, goal recommendation and suggested targets update from these."
        onSubmit={submit}
        isSaving={isSaving}
        error={error}
      >
        <div className="grid grid-cols-1 gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
          {field("currentWeight", "Current weight", "kg")}
          {field("heightCm", "Height", "cm")}
          {field("age", "Age", "years")}
          <div className="space-y-1.5">
            <Label htmlFor="body-activity">Activity level</Label>
            <Select
              value={form.activityLevel}
              onValueChange={(value) => setForm((prev) => ({ ...prev, activityLevel: value as ActivityLevel }))}
            >
              <SelectTrigger id="body-activity" className="w-full bg-card">
                <SelectValue placeholder="Choose">
                  {(value: ActivityLevel | "") => (value ? ACTIVITY_LEVEL_LABELS[value] : "Choose")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_LEVELS.map((level) => (
                  <SelectItem key={level} value={level}>
                    {ACTIVITY_LEVEL_LABELS[level]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldErrors.activityLevel && <p className="text-xs text-destructive">{fieldErrors.activityLevel}</p>}
          </div>
        </div>
      </EditDialog>
    </SectionCard>
  );
}

export function HealthCard({ view, onUpdate }: CardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [conditions, setConditions] = useState<HealthCondition[]>(view.healthConditions);
  const [dietPreference, setDietPreference] = useState<DietPreference | null>(view.dietPreference);
  const [allergies, setAllergies] = useState<AllergyIntolerance[]>(view.allergies);
  const [noneSelected, setNoneSelected] = useState(false);
  const { save, isSaving, error, reset } = useProfileSave(onUpdate, () => setIsOpen(false));
  const [localError, setLocalError] = useState<string | null>(null);

  const reviewed = Boolean(view.healthReviewedAt);

  function toggleAllergy(allergy: AllergyIntolerance) {
    setAllergies((prev) =>
      prev.includes(allergy) ? prev.filter((a) => a !== allergy) : [...prev, allergy]
    );
  }

  function open() {
    setConditions(view.healthConditions);
    setDietPreference(view.dietPreference);
    setAllergies(view.allergies);
    setNoneSelected(reviewed && view.healthConditions.length === 0);
    setLocalError(null);
    reset();
    setIsOpen(true);
  }

  function submit() {
    if (!conditions.length && !noneSelected) {
      setLocalError('Select any health conditions that apply, or "None of these".');
      return;
    }
    save(
      { healthConditions: conditions, dietPreference, allergies },
      "Diet & health details updated"
    );
  }

  return (
    <SectionCard
      title="Diet & Health"
      description="Used for goal safety recommendations and Cals AI assistant grounding."
      onEdit={open}
      className="lg:col-span-2"
    >
      <DetailRows
        rows={[
          {
            label: "Diet preference",
            value: view.dietPreference
              ? DIET_PREFERENCE_LABELS[view.dietPreference]
              : "Not specified",
          },
          {
            label: "Allergies & Intolerances",
            value:
              view.allergies && view.allergies.length
                ? view.allergies.map((a) => ALLERGY_LABELS[a]).join(", ")
                : "None reported",
          },
          {
            label: "Health conditions",
            value:
              view.healthConditions && view.healthConditions.length
                ? view.healthConditions.map((c) => HEALTH_CONDITION_LABELS[c]).join(", ")
                : "None reported",
          },
        ]}
      />

      {view.assessment && <HealthNotes notes={view.assessment.notes} />}

      <EditDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        icon={HeartPulseIcon}
        title="Edit diet & health details"
        description="Update your dietary preferences, food allergies, and health conditions."
        onSubmit={submit}
        isSaving={isSaving}
        error={localError ?? error}
        size="lg"
      >
        <div className="space-y-6">
          {/* Diet Preference */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Dietary Preference</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DIET_PREFERENCES.map((diet) => {
                const isSelected = dietPreference === diet;
                return (
                  <button
                    key={diet}
                    type="button"
                    onClick={() => setDietPreference(isSelected ? null : (diet as DietPreference))}
                    className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-sm"
                        : "border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <span>{DIET_PREFERENCE_LABELS[diet]}</span>
                    {isSelected && <CheckIcon className="size-3.5 text-emerald-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Allergies */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">
              Allergies & Intolerances <span className="font-normal text-muted-foreground">(Optional)</span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {ALLERGY_INTOLERANCES.map((allergy) => {
                const isSelected = allergies.includes(allergy as AllergyIntolerance);
                return (
                  <button
                    key={allergy}
                    type="button"
                    onClick={() => toggleAllergy(allergy as AllergyIntolerance)}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                      isSelected
                        ? "border-amber-600 bg-amber-50 text-amber-900 shadow-sm"
                        : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50"
                    }`}
                  >
                    <span>{ALLERGY_LABELS[allergy]}</span>
                    {isSelected && <CheckIcon className="size-3 text-amber-700" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Health Conditions */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-foreground">Health Conditions</Label>
            <HealthConditionsPicker
              gender={view.profile.gender}
              value={conditions}
              onChange={(next) => {
                setConditions(next);
                setLocalError(null);
              }}
              noneSelected={noneSelected}
              onNoneSelectedChange={(next) => {
                setNoneSelected(next);
                setLocalError(null);
              }}
            />
          </div>
        </div>
      </EditDialog>
    </SectionCard>
  );
}

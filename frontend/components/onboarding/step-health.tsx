"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HealthConditionsPicker } from "@/components/goals/health-conditions";
import { AllergiesPicker, DietPreferencePicker } from "@/components/goals/diet-allergies-picker";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import type {
  AllergyIntolerance,
  BodyAssessment,
  DietPreference,
  Gender,
  HealthCondition,
} from "@/lib/types/api";

interface StepHealthProps {
  initialConditions: HealthCondition[];
  initialDiet: DietPreference | null;
  initialAllergies: AllergyIntolerance[];
  initiallyReviewed: boolean;
  gender?: Gender | string | null;
  onBack: () => void;
  onSaved: (result: {
    healthConditions: HealthCondition[];
    dietPreference: DietPreference | null;
    allergies: AllergyIntolerance[];
    assessment: BodyAssessment | null;
  }) => void;
}

export function StepHealth({
  initialConditions,
  initialDiet,
  initialAllergies,
  initiallyReviewed,
  gender,
  onBack,
  onSaved,
}: StepHealthProps) {
  const [conditions, setConditions] = useState<HealthCondition[]>(initialConditions);
  const [dietPreference, setDietPreference] = useState<DietPreference | null>(initialDiet);
  const [allergies, setAllergies] = useState<AllergyIntolerance[]>(initialAllergies);
  const [noneConditionsSelected, setNoneConditionsSelected] = useState(
    initiallyReviewed && initialConditions.length === 0
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!conditions.length && !noneConditionsSelected) {
      setFormError('Select any health conditions that apply, or "None of these"');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await onboardingApi.saveHealthConditions({
        healthConditions: conditions,
        dietPreference,
        allergies,
      });
      onSaved({
        healthConditions: result.healthConditions,
        dietPreference: result.dietPreference,
        allergies: result.allergies,
        assessment: result.assessment,
      });
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Dietary preference & Health
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Help us personalize your goal recommendations and ground Cals AI assistant.
        </p>
      </div>

      {/* Diet Preference */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground">
          Dietary Preference
        </label>
        <DietPreferencePicker value={dietPreference} onChange={setDietPreference} />
      </div>

      {/* Allergies & Intolerances */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground">
          Allergies & Intolerances <span className="font-normal text-muted-foreground">(Optional)</span>
        </label>
        <AllergiesPicker value={allergies} onChange={setAllergies} />
      </div>

      {/* Health Conditions */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-foreground">
          Health Conditions
        </label>
        <HealthConditionsPicker
          gender={gender}
          value={conditions}
          onChange={(next) => {
            setConditions(next);
            setFormError(null);
          }}
          noneSelected={noneConditionsSelected}
          onNoneSelectedChange={(next) => {
            setNoneConditionsSelected(next);
            setFormError(null);
          }}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Cals gives general guidance, not medical advice. If you have a medical
        condition, check any diet change with your doctor.
      </p>

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

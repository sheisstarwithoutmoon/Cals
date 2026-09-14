"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { HealthConditionsPicker } from "@/components/goals/health-conditions";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import type { BodyAssessment, HealthCondition } from "@/lib/types/api";

interface StepHealthProps {
  initial: HealthCondition[];
  /** True if the user already answered this step before. */
  initiallyReviewed: boolean;
  onBack: () => void;
  onSaved: (result: { healthConditions: HealthCondition[]; assessment: BodyAssessment | null }) => void;
}

export function StepHealth({ initial, initiallyReviewed, onBack, onSaved }: StepHealthProps) {
  const [conditions, setConditions] = useState<HealthCondition[]>(initial);
  const [noneSelected, setNoneSelected] = useState(initiallyReviewed && initial.length === 0);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleContinue() {
    if (!conditions.length && !noneSelected) {
      setFormError('Select any that apply, or "None of these"');
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await onboardingApi.saveHealthConditions(conditions);
      onSaved({ healthConditions: result.healthConditions, assessment: result.assessment });
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Any health conditions?
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Select any that apply. We use this to recommend a safe goal and pace.
          It stays private and you can change it later in Goals.
        </p>
      </div>

      <HealthConditionsPicker
        value={conditions}
        onChange={(next) => {
          setConditions(next);
          setFormError(null);
        }}
        noneSelected={noneSelected}
        onNoneSelectedChange={(next) => {
          setNoneSelected(next);
          setFormError(null);
        }}
      />

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

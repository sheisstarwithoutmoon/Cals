"use client";

import { useState, type FormEvent } from "react";
import { Loader2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api/client";
import * as onboardingApi from "@/lib/api/onboarding";
import {
  ACTIVITY_LEVELS,
  ACTIVITY_LEVEL_DESCRIPTIONS,
  ACTIVITY_LEVEL_LABELS,
  GENDERS,
  GENDER_LABELS,
} from "@/lib/constants";
import type { ActivityLevel, Gender, OnboardingProfileInput } from "@/lib/types/api";

interface StepBasicInfoProps {
  initial: Partial<OnboardingProfileInput>;
  onSaved: (profile: OnboardingProfileInput) => void;
}

interface FormState {
  age: string;
  gender: Gender | "";
  heightCm: string;
  currentWeight: string;
  activityLevel: ActivityLevel | "";
}

function toFormState(initial: Partial<OnboardingProfileInput>): FormState {
  return {
    age: initial.age?.toString() ?? "",
    gender: initial.gender ?? "",
    heightCm: initial.heightCm?.toString() ?? "",
    currentWeight: initial.currentWeight?.toString() ?? "",
    activityLevel: initial.activityLevel ?? "",
  };
}

function validate(form: FormState) {
  const errors: Record<string, string> = {};

  const age = Number(form.age);
  if (!form.age.trim() || !Number.isInteger(age) || age < 10 || age > 120) {
    errors.age = "Enter an age between 10 and 120";
  }

  if (!form.gender) {
    errors.gender = "Select your gender";
  }

  const heightCm = Number(form.heightCm);
  if (!form.heightCm.trim() || !(heightCm > 0) || heightCm > 300) {
    errors.heightCm = "Enter a height between 1 and 300 cm";
  }

  const currentWeight = Number(form.currentWeight);
  if (!form.currentWeight.trim() || !(currentWeight > 0) || currentWeight > 500) {
    errors.currentWeight = "Enter a weight between 1 and 500 kg";
  }

  if (!form.activityLevel) {
    errors.activityLevel = "Select your activity level";
  }

  return errors;
}

export function StepBasicInfo({ initial, onSaved }: StepBasicInfoProps) {
  const { user } = useAuth();
  const [form, setForm] = useState<FormState>(() => toFormState(initial));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors = validate(form);
    setFieldErrors(errors);
    setFormError(null);

    if (Object.keys(errors).length > 0) return;

    const payload: OnboardingProfileInput = {
      name: (initial.name ?? user?.name ?? "").trim(),
      age: Number(form.age),
      gender: form.gender as Gender,
      heightCm: Number(form.heightCm),
      currentWeight: Number(form.currentWeight),
      activityLevel: form.activityLevel as ActivityLevel,
    };

    setIsSubmitting(true);

    try {
      await onboardingApi.saveProfile(payload);
      onSaved(payload);
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
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <h2 className="font-heading text-xl font-bold text-foreground">
          Tell us about yourself
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This helps us personalize your calorie and macro targets.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ob-age" className="text-xs font-bold text-foreground">
            Age
          </Label>
          <Input
            id="ob-age"
            type="number"
            min={10}
            max={120}
            value={form.age}
            onChange={(event) => updateField("age", event.target.value)}
            aria-invalid={Boolean(fieldErrors.age)}
            placeholder="e.g. 28"
          />
          {fieldErrors.age && (
            <p className="text-xs text-destructive">{fieldErrors.age}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-gender" className="text-xs font-bold text-foreground">
            Gender
          </Label>
          <Select
            value={form.gender}
            onValueChange={(value) => updateField("gender", value as Gender)}
          >
            <SelectTrigger id="ob-gender" className="w-full">
              <SelectValue placeholder="Select gender">
                {(value: Gender | "") =>
                  value ? GENDER_LABELS[value] : "Select gender"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((gender) => (
                <SelectItem key={gender} value={gender}>
                  {GENDER_LABELS[gender]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldErrors.gender && (
            <p className="text-xs text-destructive">{fieldErrors.gender}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ob-height" className="text-xs font-bold text-foreground">
            Height (cm)
          </Label>
          <Input
            id="ob-height"
            type="number"
            step="any"
            min={0}
            value={form.heightCm}
            onChange={(event) => updateField("heightCm", event.target.value)}
            aria-invalid={Boolean(fieldErrors.heightCm)}
            placeholder="e.g. 175"
          />
          {fieldErrors.heightCm && (
            <p className="text-xs text-destructive">{fieldErrors.heightCm}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ob-weight" className="text-xs font-bold text-foreground">
            Current weight (kg)
          </Label>
          <Input
            id="ob-weight"
            type="number"
            step="any"
            min={0}
            value={form.currentWeight}
            onChange={(event) => updateField("currentWeight", event.target.value)}
            aria-invalid={Boolean(fieldErrors.currentWeight)}
            placeholder="e.g. 70"
          />
          {fieldErrors.currentWeight && (
            <p className="text-xs text-destructive">{fieldErrors.currentWeight}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="ob-activity" className="text-xs font-bold text-foreground">
          Activity level
        </Label>
        <Select
          value={form.activityLevel}
          onValueChange={(value) =>
            updateField("activityLevel", value as ActivityLevel)
          }
        >
          <SelectTrigger id="ob-activity" className="w-full">
            <SelectValue placeholder="Select your activity level">
              {(value: ActivityLevel | "") =>
                value ? ACTIVITY_LEVEL_LABELS[value] : "Select your activity level"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="min-w-[min(100%,24rem)]">
            {ACTIVITY_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span className="font-medium">
                    {ACTIVITY_LEVEL_LABELS[level]}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {ACTIVITY_LEVEL_DESCRIPTIONS[level]}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {fieldErrors.activityLevel && (
          <p className="text-xs text-destructive">{fieldErrors.activityLevel}</p>
        )}
      </div>

      {formError && (
        <p className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {formError}
        </p>
      )}

      <div className="pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 active:scale-98"
        >
          {isSubmitting && <Loader2Icon className="size-4 animate-spin" />}
          Continue
        </Button>
      </div>
    </form>
  );
}

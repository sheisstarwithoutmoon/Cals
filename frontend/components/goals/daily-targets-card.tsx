"use client";

import { useState } from "react";
import { FlameIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EditDialog } from "@/components/goals/edit-dialog";
import { DetailRows, SectionCard } from "@/components/goals/section-card";
import { ApiError } from "@/lib/api/client";
import { formatNumber } from "@/lib/format";
import type { Goal, GoalInput, OnboardingTargets } from "@/lib/types/api";

const FIELDS = [
  { key: "dailyCalories", label: "Calories", unit: "kcal", max: 10000 },
  { key: "dailyProtein", label: "Protein", unit: "g", max: 1000 },
  { key: "dailyCarbs", label: "Carbs", unit: "g", max: 1500 },
  { key: "dailyFat", label: "Fat", unit: "g", max: 500 },
] as const;

type TargetKey = (typeof FIELDS)[number]["key"];

// A suggestion is offered once it differs from the saved target by more than this.
const SUGGESTION_THRESHOLD = 0.05;

function differsFromSuggestion(goal: Goal | null, suggested: OnboardingTargets | null) {
  if (!suggested) return false;
  if (!goal) return true;
  return FIELDS.some(({ key }) => {
    const current = goal[key];
    return current == null || Math.abs(current - suggested[key]) > suggested[key] * SUGGESTION_THRESHOLD;
  });
}

interface DailyTargetsCardProps {
  goal: Goal | null;
  suggested: OnboardingTargets | null;
  onSave: (input: GoalInput) => Promise<unknown>;
}

export function DailyTargetsCard({ goal, suggested, onSave }: DailyTargetsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<Record<TargetKey, string>>(() => formFrom(goal));
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  function formFrom(source: Partial<Record<TargetKey, number | null>> | null) {
    return Object.fromEntries(
      FIELDS.map(({ key }) => [key, source?.[key] != null ? String(source[key]) : ""])
    ) as Record<TargetKey, string>;
  }

  function open() {
    setForm(formFrom(goal));
    setFieldErrors({});
    setError(null);
    setIsOpen(true);
  }

  async function submit() {
    const errors: Record<string, string> = {};
    for (const { key, label, max } of FIELDS) {
      const value = Number(form[key]);
      const isValid = form[key].trim() !== "" && value >= (key === "dailyCalories" ? 1 : 0) && value <= max;
      if (!isValid) errors[key] = `Enter ${label.toLowerCase()} between ${key === "dailyCalories" ? 1 : 0} and ${formatNumber(max)}`;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length) return;

    setIsSaving(true);
    setError(null);
    try {
      await onSave(Object.fromEntries(FIELDS.map(({ key }) => [key, Number(form[key])])) as GoalInput);
      toast.success("Daily targets updated");
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't save your targets. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  async function applySuggested() {
    if (!suggested) return;
    setIsApplying(true);
    try {
      await onSave(suggested);
      toast.success("Suggested targets applied");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't apply the suggested targets.");
    } finally {
      setIsApplying(false);
    }
  }

  const showSuggestion = differsFromSuggestion(goal, suggested);

  return (
    <SectionCard title="Daily targets" description="What you aim to eat each day." onEdit={open}>
      <DetailRows
        rows={FIELDS.map(({ key, label, unit }) => ({
          label,
          value: goal?.[key] != null ? `${formatNumber(goal[key])} ${unit}` : "Not set",
        }))}
      />

      {showSuggestion && suggested && (
        <div className="mt-auto space-y-2.5 rounded-xl bg-[#E7F0EA] p-3.5">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <SparklesIcon className="mt-0.5 size-4 shrink-0 text-primary" />
            <span>
              For your current weight, goal and health, we suggest{" "}
              <span className="font-semibold">
                {formatNumber(suggested.dailyCalories)} kcal · {formatNumber(suggested.dailyProtein)} g protein ·{" "}
                {formatNumber(suggested.dailyCarbs)} g carbs · {formatNumber(suggested.dailyFat)} g fat
              </span>
              .
            </span>
          </p>
          <Button type="button" size="sm" className="rounded-full" disabled={isApplying} onClick={applySuggested}>
            {isApplying && <Loader2Icon className="animate-spin" />}
            Use suggested targets
          </Button>
        </div>
      )}

      <EditDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        icon={FlameIcon}
        title="Edit daily targets"
        description="Set your own targets, or start from the ones suggested for your plan."
        onSubmit={submit}
        isSaving={isSaving}
        error={error}
      >
        <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
          {suggested && (
            <button
              type="button"
              className="text-sm font-medium text-primary hover:underline"
              onClick={() => {
                setForm(formFrom(suggested));
                setFieldErrors({});
              }}
            >
              Fill in suggested targets
            </button>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {FIELDS.map(({ key, label, unit }) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`target-${key}`}>{label}</Label>
                <div className="relative">
                  <Input
                    id={`target-${key}`}
                    type="number"
                    inputMode="decimal"
                    step="any"
                    min={0}
                    value={form[key]}
                    onChange={(event) => setForm((prev) => ({ ...prev, [key]: event.target.value }))}
                    aria-invalid={Boolean(fieldErrors[key])}
                    className="bg-card pr-12"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
                    {unit}
                  </span>
                </div>
                {fieldErrors[key] && <p className="text-xs text-destructive">{fieldErrors[key]}</p>}
              </div>
            ))}
          </div>
        </div>
      </EditDialog>
    </SectionCard>
  );
}

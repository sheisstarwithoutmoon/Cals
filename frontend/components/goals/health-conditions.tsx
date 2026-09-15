import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { cn } from "cn";

import { HEALTH_CONDITION_LABELS, HEALTH_CONDITIONS } from "@/lib/constants";
import type { BodyAssessment, Gender, HealthCondition } from "@/lib/types/api";

interface HealthConditionsPickerProps {
  value: HealthCondition[];
  onChange: (value: HealthCondition[]) => void;
  /** Distinguishes "None of these" from not answered, for onboarding. */
  noneSelected: boolean;
  onNoneSelectedChange: (noneSelected: boolean) => void;
  gender?: Gender | string | null;
}

/**
 * Checklist of health conditions plus "None of these". Picking a condition
 * clears "None", and picking "None" clears every condition.
 */
export function HealthConditionsPicker({
  value,
  onChange,
  noneSelected,
  onNoneSelectedChange,
  gender,
}: HealthConditionsPickerProps) {
  function toggle(condition: HealthCondition) {
    onNoneSelectedChange(false);
    onChange(
      value.includes(condition)
        ? value.filter((item) => item !== condition)
        : [...value, condition]
    );
  }

  const availableConditions = HEALTH_CONDITIONS.filter((condition) => {
    if (gender === "MALE") {
      return condition !== "PREGNANT_OR_BREASTFEEDING";
    }
    return true;
  });

  const optionClass = (isChecked: boolean) =>
    cn(
      "flex min-w-0 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition-colors",
      isChecked
        ? "border-primary/50 bg-[#E7F0EA] text-foreground"
        : "border-border bg-card text-foreground hover:border-primary/30"
    );

  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {availableConditions.map((condition) => {
        const isChecked = value.includes(condition);
        return (
          <label key={condition} className={optionClass(isChecked)}>
            <input
              type="checkbox"
              className="size-4 shrink-0 accent-primary"
              checked={isChecked}
              onChange={() => toggle(condition)}
            />
            <span className="min-w-0 break-words">{HEALTH_CONDITION_LABELS[condition]}</span>
          </label>
        );
      })}
      <label className={cn(optionClass(noneSelected), "sm:col-span-2")}>
        <input
          type="checkbox"
          className="size-4 shrink-0 accent-primary"
          checked={noneSelected}
          onChange={(event) => {
            onNoneSelectedChange(event.target.checked);
            if (event.target.checked) onChange([]);
          }}
        />
        <span>None of these</span>
      </label>
    </div>
  );
}

/** Safety and context notes from the assessment, cautions first. */
export function HealthNotes({ notes }: { notes: BodyAssessment["notes"] }) {
  if (!notes.length) return null;

  const sorted = [...notes].sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "caution" ? -1 : 1));

  return (
    <ul className="space-y-2">
      {sorted.map((note) => {
        const Icon = note.tone === "caution" ? AlertTriangleIcon : InfoIcon;
        return (
          <li
            key={note.message}
            className={cn(
              "flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 text-xs leading-relaxed",
              note.tone === "caution" ? "bg-amber-50 text-amber-900" : "bg-muted/60 text-muted-foreground"
            )}
          >
            <Icon className="mt-0.5 size-4 shrink-0" />
            <span>{note.message}</span>
          </li>
        );
      })}
    </ul>
  );
}

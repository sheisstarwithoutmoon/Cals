import { CheckIcon } from "lucide-react";

import {
  ALLERGY_INTOLERANCES,
  ALLERGY_LABELS,
  DIET_PREFERENCE_LABELS,
  DIET_PREFERENCES,
} from "@/lib/constants";
import type { AllergyIntolerance, DietPreference } from "@/lib/types/api";

interface DietPreferencePickerProps {
  value: DietPreference | null;
  onChange: (value: DietPreference | null) => void;
}

/** Single-select grid of diet preferences; clicking the selected option clears it. */
export function DietPreferencePicker({ value, onChange }: DietPreferencePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {DIET_PREFERENCES.map((diet) => {
        const isSelected = value === diet;
        return (
          <button
            key={diet}
            type="button"
            onClick={() => onChange(isSelected ? null : (diet as DietPreference))}
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
  );
}

interface AllergiesPickerProps {
  value: AllergyIntolerance[];
  onChange: (value: AllergyIntolerance[]) => void;
}

/** Multi-select chip list of allergies/intolerances. */
export function AllergiesPicker({ value, onChange }: AllergiesPickerProps) {
  function toggle(allergy: AllergyIntolerance) {
    onChange(
      value.includes(allergy) ? value.filter((item) => item !== allergy) : [...value, allergy]
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {ALLERGY_INTOLERANCES.map((allergy) => {
        const isSelected = value.includes(allergy as AllergyIntolerance);
        return (
          <button
            key={allergy}
            type="button"
            onClick={() => toggle(allergy as AllergyIntolerance)}
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
  );
}

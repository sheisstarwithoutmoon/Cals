import {
  CoffeeIcon,
  MoonIcon,
  SoupIcon,
  SunIcon,
  UtensilsIcon,
  type LucideIcon,
} from "lucide-react";

import { MEAL_TYPE_LABELS } from "@/lib/constants";
import type { MealType } from "@/lib/types/api";

export type MealTypeFilter = MealType | "ALL";

interface MealTypeMeta {
  label: string;
  icon: LucideIcon;
  /** Background + foreground classes for the round icon tile. */
  iconClassName: string;
}

export const MEAL_TYPE_META: Record<MealTypeFilter, MealTypeMeta> = {
  ALL: {
    label: "All meals",
    icon: UtensilsIcon,
    iconClassName: "bg-emerald-100 text-emerald-700",
  },
  BREAKFAST: {
    label: MEAL_TYPE_LABELS.BREAKFAST,
    icon: SunIcon,
    iconClassName: "bg-amber-100 text-amber-600",
  },
  LUNCH: {
    label: MEAL_TYPE_LABELS.LUNCH,
    icon: SoupIcon,
    iconClassName: "bg-emerald-100 text-emerald-700",
  },
  SNACK: {
    // Deliberately plural here, unlike the singular "Snack" in
    // MEAL_TYPE_LABELS — this label is shown on the meal-type filter tab,
    // which can hold more than one snack entry.
    label: "Snacks",
    icon: CoffeeIcon,
    iconClassName: "bg-sky-100 text-sky-600",
  },
  DINNER: {
    label: MEAL_TYPE_LABELS.DINNER,
    icon: MoonIcon,
    iconClassName: "bg-violet-100 text-violet-600",
  },
};

/** Display order of the meal type tabs. */
export const MEAL_TYPE_FILTERS: MealTypeFilter[] = [
  "ALL",
  "BREAKFAST",
  "LUNCH",
  "SNACK",
  "DINNER",
];

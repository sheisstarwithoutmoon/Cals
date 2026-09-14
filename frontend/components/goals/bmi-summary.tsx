import { cn } from "cn";

import { BMI_CATEGORY_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import type { BmiCategory, BodyAssessment } from "@/lib/types/api";

// Displayed BMI scale; values outside it pin to the ends of the bar.
const SCALE_MIN = 15;
const SCALE_MAX = 35;

const BANDS: { category: BmiCategory; from: number; to: number; className: string }[] = [
  { category: "UNDERWEIGHT", from: SCALE_MIN, to: 18.5, className: "bg-amber-300" },
  { category: "HEALTHY", from: 18.5, to: 25, className: "bg-emerald-500" },
  { category: "OVERWEIGHT", from: 25, to: 30, className: "bg-amber-400" },
  { category: "OBESE", from: 30, to: SCALE_MAX, className: "bg-rose-400" },
];

const CATEGORY_TEXT: Record<BmiCategory, string> = {
  UNDERWEIGHT: "text-amber-700",
  HEALTHY: "text-emerald-700",
  OVERWEIGHT: "text-amber-700",
  OBESE: "text-rose-700",
};

function scalePercent(bmi: number) {
  const clamped = Math.min(SCALE_MAX, Math.max(SCALE_MIN, bmi));
  return ((clamped - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100;
}

interface BmiSummaryProps {
  assessment: BodyAssessment;
  heightCm?: number | null;
  className?: string;
}

/**
 * BMI value, its category, where it sits on the BMI scale, and the healthy
 * weight range for the user's height. Shared by onboarding and Goals.
 */
export function BmiSummary({ assessment, heightCm, className }: BmiSummaryProps) {
  const { bmi, bmiCategory, healthyWeightRange } = assessment;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xs text-muted-foreground">
          BMI{" "}
          <span className="text-base font-semibold text-foreground">{formatNumber(bmi, 1)}</span>{" "}
          <span className={cn("text-sm font-medium", CATEGORY_TEXT[bmiCategory])}>
            {BMI_CATEGORY_LABELS[bmiCategory]}
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Healthy weight{heightCm ? ` at ${formatNumber(heightCm)} cm` : ""}:{" "}
          <span className="font-medium text-foreground">
            {healthyWeightRange.min}–{healthyWeightRange.max} kg
          </span>
        </p>
      </div>

      <div className="relative pt-0.5" aria-hidden>
        <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
          {BANDS.map((band) => (
            <div
              key={band.category}
              className={cn("h-full", band.className)}
              style={{ width: `${((band.to - band.from) / (SCALE_MAX - SCALE_MIN)) * 100}%` }}
            />
          ))}
        </div>
        <span
          className="absolute top-0 size-2.5 -translate-x-1/2 rounded-full border-2 border-card bg-foreground shadow-sm"
          style={{ left: `${scalePercent(bmi)}%` }}
        />
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
          <span>Under</span>
          <span>18.5</span>
          <span>25</span>
          <span>30</span>
          <span>Obese</span>
        </div>
      </div>
    </div>
  );
}

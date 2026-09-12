interface StepIndicatorProps {
  current: number;
  labels: string[];
}

export function StepIndicator({ current, labels }: StepIndicatorProps) {
  const total = labels.length;
  const percent = Math.round((current / total) * 100);

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between text-xs font-semibold text-stone-500">
        <span>
          Step {current} of {total}
        </span>
        <span className="text-emerald-700">{labels[current - 1]}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-200">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

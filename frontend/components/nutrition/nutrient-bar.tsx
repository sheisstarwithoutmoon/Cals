import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { percentOf } from "@/lib/nutrition";

interface NutrientBarProps {
  label: string;
  consumed: number;
  target?: number | null;
  unit: string;
  colorClassName: string;
}

export function NutrientBar({
  label,
  consumed,
  target,
  unit,
  colorClassName,
}: NutrientBarProps) {
  const pct = target ? percentOf(consumed, target) : 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <span className="text-xs text-muted-foreground">
          {formatNumber(consumed)}
          {target ? ` / ${formatNumber(target)}` : ""} {unit}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", colorClassName)}
          style={{ width: target ? `${pct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

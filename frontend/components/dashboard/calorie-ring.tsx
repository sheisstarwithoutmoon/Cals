import { formatNumber } from "@/lib/format";

interface CalorieRingProps {
  consumed: number;
  goal: number | null;
}

export function CalorieRing({ consumed, goal }: CalorieRingProps) {
  const pct = goal && goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const remaining = goal ? Math.max(0, Math.round(goal - consumed)) : null;
  const isOver = goal ? consumed > goal : false;

  return (
    <div
      className="relative flex size-36 shrink-0 items-center justify-center rounded-full sm:size-40"
      style={{
        background: `conic-gradient(var(--primary) ${pct * 3.6}deg, var(--muted) 0deg)`,
      }}
    >
      <div className="absolute inset-2.5 flex flex-col items-center justify-center rounded-full bg-card text-center">
        {goal ? (
          <>
            <span
              className={
                "text-2xl font-semibold tabular-nums " +
                (isOver ? "text-destructive" : "text-foreground")
              }
            >
              {formatNumber(remaining)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              {isOver ? "kcal over" : "kcal left"}
            </span>
          </>
        ) : (
          <>
            <span className="text-2xl font-semibold tabular-nums text-foreground">
              {formatNumber(consumed)}
            </span>
            <span className="text-[11px] text-muted-foreground">
              kcal today
            </span>
          </>
        )}
      </div>
    </div>
  );
}

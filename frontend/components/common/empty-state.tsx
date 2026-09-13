import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { LottieAvocado } from "@/components/common/lottie-avocado";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  showAvocado?: boolean;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  showAvocado = true,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-8 text-center">
      {showAvocado ? (
        <div className="mb-1">
          <LottieAvocado variant="walking" width={96} height={96} speed={0.95} />
        </div>
      ) : Icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-2xs">
          <Icon className="size-6" />
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="font-heading text-base font-bold text-foreground">{title}</p>
        {description && (
          <p className="max-w-sm text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

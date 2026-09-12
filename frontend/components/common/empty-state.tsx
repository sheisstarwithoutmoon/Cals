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
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-stone-300/80 bg-stone-50/50 px-6 py-10 text-center">
      {showAvocado ? (
        <div className="mb-1">
          <LottieAvocado width={120} height={120} speed={0.9} />
        </div>
      ) : Icon ? (
        <div className="flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800 shadow-2xs">
          <Icon className="size-6" />
        </div>
      ) : null}

      <div className="space-y-1">
        <p className="font-heading text-base font-bold text-stone-900">{title}</p>
        {description && (
          <p className="max-w-sm text-xs sm:text-sm text-stone-500 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

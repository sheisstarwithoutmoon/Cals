import type { ReactNode } from "react";
import { PencilIcon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface SectionCardProps {
  title: string;
  description?: string;
  onEdit?: () => void;
  editLabel?: string;
  className?: string;
  children: ReactNode;
}

/** Card shell for the Goals page: title, optional description and an Edit button. */
export function SectionCard({
  title,
  description,
  onEdit,
  editLabel = "Edit",
  className,
  children,
}: SectionCardProps) {
  return (
    <Card className={cn("h-full rounded-2xl", className)}>
      <CardContent className="flex h-full flex-col gap-4 px-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 rounded-full"
              onClick={onEdit}
            >
              <PencilIcon />
              {editLabel}
            </Button>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export function DetailRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-border/70">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
          <dt className="text-sm text-muted-foreground">{row.label}</dt>
          <dd className="min-w-0 text-right text-sm font-medium break-words text-foreground">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

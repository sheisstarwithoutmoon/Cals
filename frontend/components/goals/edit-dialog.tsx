"use client";

import { useId, type FormEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2Icon } from "lucide-react";
import { cn } from "cn";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  icon: LucideIcon;
  title: string;
  description: string;
  onSubmit: () => void;
  isSaving: boolean;
  error?: string | null;
  size?: "md" | "lg";
  children: ReactNode;
}

/**
 * The Goals page's edit dialog: same header, body and footer treatment as
 * the Log meal and Import PDF dialogs, so every edit flow looks alike.
 */
export function EditDialog({
  open,
  onOpenChange,
  icon: Icon,
  title,
  description,
  onSubmit,
  isSaving,
  error,
  size = "md",
  children,
}: EditDialogProps) {
  const formId = useId();

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-2xl bg-card p-0",
          size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg"
        )}
      >
        <DialogHeader className="flex-row items-center gap-3 border-b border-border/70 px-5 py-4 pr-12 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
            <Icon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>

        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          className="min-h-0 space-y-4 overflow-y-auto bg-muted/40 px-4 py-4 sm:px-6 sm:py-5"
        >
          {children}
          {error && (
            <p className="rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">{error}</p>
          )}
        </form>

        <div className="flex flex-col-reverse gap-2 border-t border-border/70 bg-card px-5 py-3.5 sm:flex-row sm:justify-end sm:px-6">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={isSaving}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} className="rounded-full" disabled={isSaving}>
            {isSaving && <Loader2Icon className="animate-spin" />}
            Save changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { cn } from "cn";
import { useState } from "react";
import {
  MoreVerticalIcon,
  PencilIcon,
  TrashIcon,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { AttachmentPreviewModal } from "@/components/meals/attachment-preview-modal";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { MEAL_TYPE_META } from "@/components/meals/meal-type-meta";
import { formatNumber, formatTime } from "@/lib/format";
import type { MealEntry } from "@/lib/types/api";

interface MealListItemProps {
  meal: MealEntry;
  onUpdated: (meal: MealEntry) => void;
  onDeleted: (mealId: string) => void;
}

export function MealListItem({ meal, onUpdated, onDeleted }: MealListItemProps) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const typeMeta = MEAL_TYPE_META[meal.mealType];
  const TypeIcon = typeMeta.icon;
  const items = meal.items ?? [];
  // Meals logged before per-item tracking only have a comma-joined foodName;
  // those still expand to the names split out, just without per-item numbers.
  const legacyItemNames = items.length
    ? []
    : meal.foodName
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const itemCount = items.length || legacyItemNames.length;
  const hasMultipleItems = itemCount > 1;
  // Only photo attachments are worth a "View source" affordance — a
  // PDF-imported entry's attachment is the whole multi-row diary export,
  // not a document specific to this one meal, so it isn't shown here.
  const hasAttachment = Boolean(meal.attachmentUrl && meal.attachmentType === "IMAGE");

  async function handleDelete() {
    setIsDeleting(true);
    try {
      await mealsApi.deleteMeal(meal.id);
      toast.success("Meal deleted");
      onDeleted(meal.id);
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Failed to delete meal"
      );
    } finally {
      setIsDeleting(false);
      setIsDeleteOpen(false);
    }
  }

  const quantityLabel = meal.quantity
    ? `${formatNumber(meal.quantity, 2)}${meal.quantityUnit ? ` ${meal.quantityUnit}` : ""}`
    : null;
  const hasMacros = meal.protein != null || meal.carbs != null || meal.fat != null;

  return (
    <div
      role={hasMultipleItems ? "button" : undefined}
      tabIndex={hasMultipleItems ? 0 : undefined}
      aria-expanded={hasMultipleItems ? isExpanded : undefined}
      onClick={
        hasMultipleItems
          ? () => setIsExpanded((value) => !value)
          : undefined
      }
      onKeyDown={
        hasMultipleItems
          ? (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setIsExpanded((value) => !value);
            }
          }
          : undefined
      }
      className={cn(
        "flex items-start gap-3.5 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:gap-4 transition-all duration-150 text-left",
        hasMultipleItems &&
        "cursor-pointer hover:border-primary/40 hover:bg-muted/15 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      )}
    >
      {hasAttachment ? (
        <button
          type="button"
          title="View meal photo"
          aria-label={`View photo of ${meal.foodName}`}
          onClick={(event) => {
            event.stopPropagation();
            setIsPreviewOpen(true);
          }}
          className="size-12 shrink-0 overflow-hidden rounded-full ring-1 ring-border transition-transform outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 sm:size-14"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meal.attachmentUrl!}
            alt=""
            className="size-full object-cover"
          />
        </button>
      ) : (
        <div
          className={`flex size-12 shrink-0 items-center justify-center rounded-full sm:size-14 ${typeMeta.iconClassName}`}
        >
          <TypeIcon className="size-5 sm:size-6" />
        </div>
      )}

      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {MEAL_TYPE_LABELS[meal.mealType]}
        </p>
        <p className="mt-0.5 break-words text-sm text-foreground">
          {meal.foodName}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {quantityLabel ? `${quantityLabel} · ` : ""}
          {formatTime(meal.consumedAt)}
        </p>

        {hasMultipleItems && isExpanded && items.length > 0 && (
          <ul
            onClick={(event) => event.stopPropagation()}
            className="mt-3 divide-y divide-border/70 rounded-xl bg-muted/40 px-3 cursor-default"
          >
            {items.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2"
              >
                <span className="min-w-0 text-xs">
                  <span className="break-words font-medium text-foreground">
                    {item.name}
                  </span>
                  {item.quantity != null && (
                    <span className="text-muted-foreground">
                      {" "}
                      · {formatNumber(item.quantity, 2)}
                      {item.quantityUnit ? ` ${item.quantityUnit}` : ""}
                    </span>
                  )}
                </span>
                <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  <span className="font-medium text-foreground">
                    {formatNumber(item.calories)}
                  </span>{" "}
                  kcal · P{formatNumber(item.protein ?? 0)} · C
                  {formatNumber(item.carbs ?? 0)} · F{formatNumber(item.fat ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        )}

        {hasMultipleItems && isExpanded && legacyItemNames.length > 0 && (
          <ul
            onClick={(event) => event.stopPropagation()}
            className="mt-2 space-y-1 border-l-2 border-border pl-3 cursor-default"
          >
            {legacyItemNames.map((name, index) => (
              <li key={index} className="break-words text-xs text-muted-foreground">
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex shrink-0 items-start gap-1 self-start pt-0.5 sm:gap-2">
        <div className="text-right">
          <p className="whitespace-nowrap text-sm text-muted-foreground">
            <span className="text-base font-semibold tabular-nums text-foreground">
              {formatNumber(meal.calories)}
            </span>{" "}
            kcal
          </p>
          {hasMacros && (
            <p className="mt-0.5 whitespace-nowrap text-[11px] tabular-nums text-muted-foreground">
              P{formatNumber(meal.protein ?? 0)} · C{formatNumber(meal.carbs ?? 0)} · F
              {formatNumber(meal.fat ?? 0)}
            </p>
          )}
        </div>

        <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Meal actions" />
              }
            >
              <MoreVerticalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditOpen(true)}>
                <PencilIcon />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setIsDeleteOpen(true)}
              >
                <TrashIcon />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div onClick={(event) => event.stopPropagation()}>
        <MealFormDialog
          meal={meal}
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          onSaved={onUpdated}
        />
      </div>

      {hasAttachment && (
        <AttachmentPreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          attachmentUrl={meal.attachmentUrl!}
          attachmentType={meal.attachmentType!}
          title={meal.foodName}
        />
      )}

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent onClick={(event) => event.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this meal?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{meal.foodName}&rdquo; will be permanently removed. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

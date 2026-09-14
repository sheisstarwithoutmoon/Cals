"use client";

import { useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  AlertCircleIcon,
  FileTextIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  UploadCloudIcon,
} from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { MealItemsTable } from "@/components/meals/meal-items-table";
import { MEAL_TYPE_META } from "@/components/meals/meal-type-meta";
import type { ExtractedNutrition } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import { createMealsBulk, previewPdfImport } from "@/lib/api/meals";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatDate, formatNumber, formatTime } from "@/lib/format";
import type { MealInput, PdfMealDraft } from "@/lib/types/api";

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

interface ReviewMeal {
  key: string;
  selected: boolean;
  meal: MealInput;
}

function draftToMealInput(draft: PdfMealDraft): MealInput {
  return {
    mealType: draft.mealType,
    foodName: draft.foodName,
    // The date comes from the PDF and the time is a per-meal-type default;
    // built here so it lands on that calendar day in the user's timezone.
    consumedAt: new Date(`${draft.date}T${draft.time}:00`).toISOString(),
    calories: draft.calories,
    protein: draft.protein,
    carbs: draft.carbs,
    fat: draft.fat,
    fiber: draft.fiber,
    sugar: draft.sugar,
    sodium: draft.sodium,
    items: draft.items,
    attachmentUrl: draft.attachmentUrl,
    attachmentType: draft.attachmentType,
    source: "PDF_IMPORT",
  };
}

function mealInputToPrefill(meal: MealInput): ExtractedNutrition {
  return {
    foodName: meal.foodName,
    mealType: meal.mealType,
    quantity: meal.quantity,
    quantityUnit: meal.quantityUnit,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    fat: meal.fat,
    fiber: meal.fiber,
    sugar: meal.sugar,
    sodium: meal.sodium,
    micronutrients: meal.micronutrients,
    items: meal.items,
    attachmentUrl: meal.attachmentUrl ?? undefined,
    attachmentType: meal.attachmentType ?? undefined,
  };
}

function localDateKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

export function PdfImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: PdfImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewMeals, setReviewMeals] = useState<ReviewMeal[] | null>(null);
  const [skippedCount, setSkippedCount] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);

  const isReviewing = reviewMeals !== null;

  function reset() {
    setFileName(null);
    setPdfBase64(null);
    setIsDragging(false);
    setIsParsing(false);
    setIsSaving(false);
    setError(null);
    setReviewMeals(null);
    setSkippedCount(0);
    setEditingKey(null);
  }

  function handleClose() {
    if (isParsing || isSaving) return;
    reset();
    onClose();
  }

  function handleFile(file: File | undefined) {
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Choose a PDF file.");
      return;
    }

    setError(null);
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => setPdfBase64(reader.result as string);
    reader.onerror = () => setError("Couldn't read that file. Please try again.");
    reader.readAsDataURL(file);
  }

  async function handleParse() {
    if (!pdfBase64) return;
    setIsParsing(true);
    setError(null);

    try {
      const result = await previewPdfImport({ pdfBase64 });
      const meals = [...result.meals]
        .map(draftToMealInput)
        .sort((a, b) => a.consumedAt.localeCompare(b.consumedAt));

      setReviewMeals(
        meals.map((meal, index) => ({ key: `draft-${index}`, selected: true, meal }))
      );
      setSkippedCount(result.skippedCount);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't read meals from this PDF. Make sure it contains a table of meal entries."
      );
    } finally {
      setIsParsing(false);
    }
  }

  async function handleAddMeals() {
    const selected = reviewMeals?.filter((entry) => entry.selected) ?? [];
    if (!selected.length) return;

    setIsSaving(true);
    setError(null);

    try {
      const result = await createMealsBulk(selected.map((entry) => entry.meal));
      toast.success(
        `Added ${result.count} ${result.count === 1 ? "meal" : "meals"} with ${result.itemCount} ${
          result.itemCount === 1 ? "item" : "items"
        }`
      );
      onImportComplete();
      reset();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't add the selected meals. Please try again."
      );
      setIsSaving(false);
    }
  }

  function setSelected(key: string, selected: boolean) {
    setReviewMeals((prev) =>
      prev?.map((entry) => (entry.key === key ? { ...entry, selected } : entry)) ?? prev
    );
  }

  function setAllSelected(selected: boolean) {
    setReviewMeals((prev) => prev?.map((entry) => ({ ...entry, selected })) ?? prev);
  }

  const editingEntry = reviewMeals?.find((entry) => entry.key === editingKey) ?? null;
  // Memoized so the editor doesn't reset its form on every parent render.
  const editingPrefill = useMemo(
    () => (editingEntry ? mealInputToPrefill(editingEntry.meal) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingKey]
  );

  const groups = useMemo(() => {
    const map = new Map<string, ReviewMeal[]>();
    // Sorted here (not only after parsing) so an edited date moves the meal.
    const sorted = [...(reviewMeals ?? [])].sort((a, b) =>
      a.meal.consumedAt.localeCompare(b.meal.consumedAt)
    );
    for (const entry of sorted) {
      const key = localDateKey(entry.meal.consumedAt);
      map.set(key, [...(map.get(key) ?? []), entry]);
    }
    return Array.from(map.entries());
  }, [reviewMeals]);

  const selectedMeals = reviewMeals?.filter((entry) => entry.selected) ?? [];
  const selectedCalories = selectedMeals.reduce((sum, entry) => sum + entry.meal.calories, 0);
  const totalItems = reviewMeals?.reduce((sum, entry) => sum + (entry.meal.items?.length ?? 0), 0) ?? 0;
  const allSelected = Boolean(reviewMeals?.length) && selectedMeals.length === reviewMeals?.length;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-2xl bg-card p-0",
          isReviewing ? "sm:max-w-[min(64rem,calc(100%-3rem))]" : "sm:max-w-lg"
        )}
      >
        <DialogHeader className="flex-row items-center gap-3 border-b border-border/70 px-5 py-4 pr-12 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
            <FileTextIcon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold">
              {isReviewing ? "Review imported meals" : "Import PDF"}
            </DialogTitle>
            <DialogDescription>
              {isReviewing
                ? "Choose the meals to add. Edit any meal before adding it."
                : "Upload a food diary or nutrition history PDF. You can review every meal before anything is added."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/40 px-4 py-4 sm:px-6 sm:py-5">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={(event: ChangeEvent<HTMLInputElement>) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {!isReviewing && (
            <>
              {!fileName ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(event: DragEvent<HTMLButtonElement>) => {
                    event.preventDefault();
                    setIsDragging(false);
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className={cn(
                    "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                    isDragging
                      ? "border-primary bg-[#E7F0EA]"
                      : "border-border bg-card hover:border-primary/40 hover:bg-[#E7F0EA]/60"
                  )}
                >
                  <span className="flex size-11 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
                    <UploadCloudIcon className="size-5" />
                  </span>
                  <span className="text-sm font-medium text-foreground">Choose a PDF</span>
                  <span className="text-xs text-muted-foreground">
                    Click or drag a file here. Tables of meals by date work best.
                  </span>
                </button>
              ) : (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#E7F0EA] text-primary">
                      <FileTextIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium break-words text-foreground">{fileName}</p>
                      <p className="text-xs text-muted-foreground">
                        {isParsing
                          ? "Reading meals from your PDF. This can take up to a minute."
                          : "Ready to read"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isParsing}
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary"
                    >
                      Change
                    </Button>
                  </div>

                  <Button
                    type="button"
                    onClick={handleParse}
                    disabled={isParsing || !pdfBase64}
                    className="w-full rounded-full"
                  >
                    {isParsing ? (
                      <Loader2Icon className="animate-spin" />
                    ) : (
                      <UploadCloudIcon />
                    )}
                    {isParsing ? "Reading PDF" : "Read meals from PDF"}
                  </Button>
                </div>
              )}
            </>
          )}

          {isReviewing && reviewMeals && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {reviewMeals.length} {reviewMeals.length === 1 ? "meal" : "meals"} found ·{" "}
                    {totalItems} {totalItems === 1 ? "item" : "items"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Rows with the same date and meal type are grouped into one meal.
                    {skippedCount > 0 &&
                      ` ${skippedCount} ${skippedCount === 1 ? "row was" : "rows were"} skipped because the date or calories couldn't be read.`}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground">
                  <input
                    type="checkbox"
                    className="size-4 accent-primary"
                    checked={allSelected}
                    onChange={(event) => setAllSelected(event.target.checked)}
                  />
                  Select all
                </label>
              </div>

              {groups.map(([dateKey, entries]) => (
                <section key={dateKey} className="space-y-3">
                  <h3 className="px-1 text-sm font-semibold text-foreground">
                    {formatDate(new Date(`${dateKey}T00:00:00`), { weekday: "short" })}
                  </h3>

                  {entries.map((entry) => {
                    const { meal } = entry;
                    const meta = MEAL_TYPE_META[meal.mealType];
                    const Icon = meta.icon;
                    const checkboxId = `import-${entry.key}`;

                    return (
                      <div
                        key={entry.key}
                        className={cn(
                          "overflow-hidden rounded-2xl border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors",
                          entry.selected ? "border-primary/40" : "border-border"
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3.5 sm:p-4">
                          <input
                            id={checkboxId}
                            type="checkbox"
                            className="size-4 shrink-0 accent-primary"
                            checked={entry.selected}
                            onChange={(event) => setSelected(entry.key, event.target.checked)}
                          />
                          <label
                            htmlFor={checkboxId}
                            className={cn(
                              "flex min-w-0 flex-1 cursor-pointer items-center gap-3",
                              !entry.selected && "opacity-60"
                            )}
                          >
                            <span
                              className={cn(
                                "flex size-10 shrink-0 items-center justify-center rounded-full",
                                meta.iconClassName
                              )}
                            >
                              <Icon className="size-5" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold text-foreground">
                                {MEAL_TYPE_LABELS[meal.mealType]}
                                <span className="font-normal text-muted-foreground">
                                  {" "}
                                  · {formatTime(meal.consumedAt)}
                                </span>
                              </span>
                              <span className="block text-sm break-words text-foreground">
                                {meal.foodName}
                              </span>
                            </span>
                          </label>
                          <div
                            className={cn(
                              "ml-auto flex shrink-0 items-center gap-3",
                              !entry.selected && "opacity-60"
                            )}
                          >
                            <div className="text-right">
                              <p className="text-sm whitespace-nowrap text-muted-foreground">
                                <span className="text-base font-semibold text-foreground tabular-nums">
                                  {formatNumber(meal.calories)}
                                </span>{" "}
                                kcal
                              </p>
                              <p className="text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                                P{formatNumber(meal.protein ?? 0)} · C{formatNumber(meal.carbs ?? 0)} · F
                                {formatNumber(meal.fat ?? 0)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="rounded-full"
                              onClick={() => setEditingKey(entry.key)}
                            >
                              <PencilIcon />
                              Edit
                            </Button>
                          </div>
                        </div>

                        <MealItemsTable
                          items={meal.items ?? []}
                          className={cn("border-t border-border/70", !entry.selected && "opacity-60")}
                        />
                      </div>
                    );
                  })}
                </section>
              ))}
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {isReviewing && (
          <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-muted-foreground tabular-nums">
              <span className="font-semibold text-foreground">
                {selectedMeals.length} of {reviewMeals?.length}
              </span>{" "}
              meals selected · {formatNumber(selectedCalories)} kcal
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={isSaving}
                onClick={() => {
                  reset();
                  fileInputRef.current?.click();
                }}
              >
                Upload another PDF
              </Button>
              <Button
                type="button"
                className="rounded-full"
                disabled={isSaving || selectedMeals.length === 0}
                onClick={handleAddMeals}
              >
                {isSaving ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                {isSaving
                  ? "Adding meals"
                  : `Add ${selectedMeals.length} ${selectedMeals.length === 1 ? "meal" : "meals"}`}
              </Button>
            </div>
          </div>
        )}

        <MealFormDialog
          open={Boolean(editingEntry)}
          onOpenChange={(open) => {
            if (!open) setEditingKey(null);
          }}
          prefillData={editingPrefill}
          defaultConsumedAt={editingEntry ? new Date(editingEntry.meal.consumedAt) : undefined}
          title="Edit imported meal"
          description="Changes apply to this import only until you add the meal."
          submitLabel="Save changes"
          onSubmitDraft={(payload) => {
            if (!editingKey) return;
            setReviewMeals(
              (prev) =>
                prev?.map((entry) =>
                  entry.key === editingKey
                    ? { ...entry, selected: true, meal: { ...payload, source: "PDF_IMPORT" } }
                    : entry
                ) ?? prev
            );
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

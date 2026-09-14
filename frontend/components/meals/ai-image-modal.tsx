"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  AlertCircleIcon,
  CameraIcon,
  ImagePlusIcon,
  Loader2Icon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  SparklesIcon,
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
import { MealItemsTable } from "@/components/meals/meal-items-table";
import { ACCEPTED_IMAGE_TYPES, compressImage } from "@/components/meals/meal-photo-field";
import { MEAL_TYPE_META } from "@/components/meals/meal-type-meta";
import { analyzeImage, type ExtractedNutrition } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import { createMeal } from "@/lib/api/meals";
import { MEAL_TYPE_LABELS } from "@/lib/constants";
import { formatNumber } from "@/lib/format";

interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: () => void;
  onPrefillManualForm?: (data: ExtractedNutrition) => void;
}

const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

export function AiImageModal({
  isOpen,
  onClose,
  onMealSaved,
  onPrefillManualForm,
}: AiImageModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [result, setResult] = useState<ExtractedNutrition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isBusy = isPreparing || isAnalyzing || isSaving;

  function reset() {
    setPhoto(null);
    setIsDragging(false);
    setIsPreparing(false);
    setIsAnalyzing(false);
    setIsSaving(false);
    setResult(null);
    setError(null);
  }

  function handleClose() {
    if (isAnalyzing || isSaving) return;
    reset();
    onClose();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG or WebP photo.");
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      setError("That photo is too large. Choose one under 20 MB.");
      return;
    }

    setError(null);
    setResult(null);
    setIsPreparing(true);

    try {
      // Resized before analysis so large phone photos upload quickly.
      setPhoto(await compressImage(file));
    } catch {
      setError("Couldn't read that photo. Please try another one.");
    } finally {
      setIsPreparing(false);
    }
  }

  async function handleAnalyze() {
    if (!photo) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await analyzeImage({ imageBase64: photo, mimeType: "image/jpeg" });
      setResult(response.data);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Couldn't analyze this photo. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleLogMeal() {
    if (!result) return;
    setIsSaving(true);
    setError(null);

    try {
      await createMeal({
        mealType: result.mealType,
        foodName: result.foodName,
        calories: result.calories,
        protein: result.protein,
        carbs: result.carbs,
        fat: result.fat,
        fiber: result.fiber,
        sugar: result.sugar,
        sodium: result.sodium,
        items: result.items,
        attachmentUrl: result.attachmentUrl,
        attachmentType: result.attachmentType,
        consumedAt: new Date().toISOString(),
        source: "AI",
      });

      toast.success("Meal logged");
      onMealSaved();
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't log this meal. Please try again.");
      setIsSaving(false);
    }
  }

  function handleEdit() {
    if (!result || !onPrefillManualForm) return;
    onPrefillManualForm(result);
    reset();
    onClose();
  }

  const meta = result ? MEAL_TYPE_META[result.mealType] : null;
  const MealIcon = meta?.icon;
  const items = result?.items ?? [];

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className={cn(
          "max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] gap-0 rounded-2xl bg-card p-0",
          result ? "sm:max-w-[min(64rem,calc(100%-3rem))]" : "sm:max-w-lg"
        )}
      >
        <DialogHeader className="flex-row items-center gap-3 border-b border-border/70 px-5 py-4 pr-12 sm:px-6">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
            <CameraIcon className="size-5" />
          </span>
          <div className="min-w-0 space-y-1">
            <DialogTitle className="text-lg font-semibold">
              {result ? "Review scanned meal" : "Scan food"}
            </DialogTitle>
            <DialogDescription>
              {result
                ? "Check the foods found in your photo, then log the meal or edit it first."
                : "Upload a photo of your meal or a nutrition label. AI identifies each food and estimates its nutrition."}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="min-h-0 space-y-4 overflow-y-auto bg-muted/40 px-4 py-4 sm:px-6 sm:py-5">
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(event) => {
              handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />

          {!result && (
            <>
              {!photo ? (
                <button
                  type="button"
                  disabled={isPreparing}
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
                    {isPreparing ? (
                      <Loader2Icon className="size-5 animate-spin" />
                    ) : (
                      <ImagePlusIcon className="size-5" />
                    )}
                  </span>
                  <span className="text-sm font-medium text-foreground">Choose a photo</span>
                  <span className="text-xs text-muted-foreground">
                    Click or drag an image here. JPEG, PNG or WebP.
                  </span>
                </button>
              ) : (
                <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
                  <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="Meal to scan" className="size-full object-cover" />
                    {isAnalyzing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-sm font-medium text-white">
                        <Loader2Icon className="size-6 animate-spin" />
                        Finding foods in your photo
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="absolute right-2.5 bottom-2.5 rounded-full bg-white/95 hover:bg-white"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RefreshCwIcon />
                        Replace
                      </Button>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="w-full rounded-full"
                  >
                    <SparklesIcon />
                    Analyze photo
                  </Button>
                </div>
              )}
            </>
          )}

          {result && meta && MealIcon && (
            <>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-5">
                <div className="relative min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] lg:min-h-64">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={result.attachmentUrl || photo || ""}
                    alt={result.foodName}
                    className="aspect-[16/10] w-full object-cover lg:absolute lg:inset-0 lg:aspect-auto lg:h-full"
                  />
                </div>

                <section className="min-w-0 space-y-4 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5">
                  <div className="flex items-start gap-3">
                    <span
                      className={cn(
                        "flex size-11 shrink-0 items-center justify-center rounded-full",
                        meta.iconClassName
                      )}
                    >
                      <MealIcon className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {MEAL_TYPE_LABELS[result.mealType]}
                      </p>
                      <p className="text-base break-words text-foreground">{result.foodName}</p>
                      <p className="text-xs text-muted-foreground">
                        {items.length} {items.length === 1 ? "food" : "foods"} found
                      </p>
                    </div>
                    <p className="shrink-0 text-sm whitespace-nowrap text-muted-foreground">
                      <span className="text-2xl font-semibold text-foreground tabular-nums">
                        {formatNumber(result.calories)}
                      </span>{" "}
                      kcal
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {(
                      [
                        { label: "Protein", value: result.protein, dot: "bg-chart-2" },
                        { label: "Carbs", value: result.carbs, dot: "bg-chart-3" },
                        { label: "Fat", value: result.fat, dot: "bg-chart-4" },
                      ] as const
                    ).map((macro) => (
                      <div key={macro.label} className="min-w-0 rounded-xl bg-muted/50 px-3 py-2.5">
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={cn("size-2 shrink-0 rounded-full", macro.dot)} />
                          {macro.label}
                        </p>
                        <p className="mt-0.5 text-base font-semibold text-foreground tabular-nums">
                          {formatNumber(macro.value ?? 0, 1)}g
                        </p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Values are AI estimates from the photo. Use Edit to adjust any food or
                    quantity before logging.
                  </p>
                </section>
              </div>

              <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="px-4 py-3.5 sm:px-5">
                  <h3 className="text-sm font-semibold text-foreground">Items ({items.length})</h3>
                  <p className="text-xs text-muted-foreground">
                    Nutrition is for the quantity shown.
                  </p>
                </div>
                <MealItemsTable items={items} className="border-t border-border/70" />
              </section>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-sm text-destructive">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {result && (
          <div className="flex flex-col-reverse gap-3 border-t border-border/70 bg-card px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-muted-foreground tabular-nums">
              {items.length} {items.length === 1 ? "item" : "items"} ·{" "}
              <span className="font-semibold text-foreground">{formatNumber(result.calories)}</span>{" "}
              kcal total
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={isBusy}
                onClick={() => {
                  setResult(null);
                  fileInputRef.current?.click();
                }}
              >
                <RefreshCwIcon />
                Scan another photo
              </Button>
              {onPrefillManualForm && (
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  disabled={isBusy}
                  onClick={handleEdit}
                >
                  <PencilIcon />
                  Edit before logging
                </Button>
              )}
              <Button
                type="button"
                className="rounded-full"
                disabled={isBusy}
                onClick={handleLogMeal}
              >
                {isSaving ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
                {isSaving ? "Logging meal" : "Log meal"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

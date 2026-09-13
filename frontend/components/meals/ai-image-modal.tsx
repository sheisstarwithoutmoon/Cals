"use client";

import { useState, useRef, type ChangeEvent } from "react";
import {
  SparklesIcon,
  UploadCloudIcon,
  CameraIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  FlameIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeImage, type ExtractedNutrition } from "@/lib/api/ai";
import { ApiError } from "@/lib/api/client";
import { createMeal } from "@/lib/api/meals";

interface AiImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMealSaved: () => void;
  onPrefillManualForm?: (data: ExtractedNutrition) => void;
}

export function AiImageModal({
  isOpen,
  onClose,
  onMealSaved,
  onPrefillManualForm,
}: AiImageModalProps) {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>("image/jpeg");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedNutrition | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setExtracted(null);
    setImageMime(file.type || "image/jpeg");

    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    if (!imagePreview) return;
    setIsAnalyzing(true);
    setError(null);

    try {
      const res = await analyzeImage({
        imageBase64: imagePreview,
        mimeType: imageMime,
      });

      if (res.success && res.data) {
        setExtracted(res.data);
      } else {
        setError("Could not analyze nutritional details from this photo.");
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to analyze image. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSaveDirectly() {
    if (!extracted) return;
    setIsSaving(true);
    setError(null);

    try {
      await createMeal({
        mealType: extracted.mealType || "LUNCH",
        foodName: extracted.foodName || "Photo Logged Meal",
        quantity: extracted.quantity || 1,
        quantityUnit: extracted.quantityUnit || "serving",
        calories: extracted.calories,
        protein: extracted.protein || 0,
        carbs: extracted.carbs || 0,
        fat: extracted.fat || 0,
        fiber: extracted.fiber || 0,
        sugar: extracted.sugar || 0,
        sodium: extracted.sodium || 0,
        micronutrients: extracted.micronutrients || {},
        attachmentUrl: extracted.attachmentUrl,
        attachmentType: extracted.attachmentType,
        consumedAt: new Date().toISOString(),
        source: "AI",
      });

      onMealSaved();
      handleClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save meal entry.");
    } finally {
      setIsSaving(false);
    }
  }

  function handlePrefill() {
    if (extracted && onPrefillManualForm) {
      onPrefillManualForm(extracted);
      handleClose();
    }
  }

  function handleClose() {
    setImagePreview(null);
    setExtracted(null);
    setError(null);
    setIsAnalyzing(false);
    setIsSaving(false);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-2xl sm:p-7 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <CameraIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-stone-900">
                AI Photo Calorie Extraction
              </h2>
              <p className="text-xs text-stone-500">
                Upload a food plate or nutrition label to extract macros
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          >
            <XIcon className="size-5" />
          </button>
        </div>

        {/* Upload Dropzone */}
        <div className="mt-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!imagePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-[#eef7f2]/60 p-8 text-center transition-colors hover:border-emerald-500 hover:bg-[#e6f4eb]"
            >
              <div className="flex size-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-2xs">
                <UploadCloudIcon className="size-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-stone-800">
                Click or drag to upload photo
              </p>
              <p className="mt-1 text-xs text-stone-500">
                Supports JPG, PNG, WEBP of food plates or nutrition labels
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100">
                <img
                  src={imagePreview}
                  alt="Uploaded meal"
                  className="max-h-64 w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-full bg-stone-900/80 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-stone-900"
                >
                  Change photo
                </button>
              </div>

              {!extracted && (
                <Button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={isAnalyzing}
                  className="w-full rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" />
                      <span>Extracting nutritional values...</span>
                    </>
                  ) : (
                    <>
                      <SparklesIcon className="size-4" />
                      <span>Analyze Photo with AI</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}

          {/* Extracted Nutrition Breakdown */}
          {extracted && (
            <div className="space-y-4 rounded-2xl border border-emerald-200/80 bg-[#f2faf5] p-4 sm:p-5">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
                    {extracted.mealType}
                  </span>
                  <h3 className="mt-1 font-heading text-lg font-bold text-stone-900">
                    {extracted.foodName}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Serving: {extracted.quantity} {extracted.quantityUnit}
                  </p>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1 text-emerald-800">
                    <FlameIcon className="size-4" />
                    <span className="font-heading text-2xl font-extrabold">
                      {extracted.calories}
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase">
                    KCAL
                  </p>
                </div>
              </div>

              {/* Macros Grid */}
              <div className="grid grid-cols-3 gap-2 border-t border-emerald-900/10 pt-3 text-center">
                <div className="rounded-xl bg-white p-2.5 shadow-2xs border border-emerald-100">
                  <p className="text-[10px] font-bold text-stone-500 uppercase">
                    Protein
                  </p>
                  <p className="mt-0.5 font-heading text-base font-bold text-stone-900">
                    {extracted.protein ?? 0}g
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2.5 shadow-2xs border border-emerald-100">
                  <p className="text-[10px] font-bold text-stone-500 uppercase">
                    Carbs
                  </p>
                  <p className="mt-0.5 font-heading text-base font-bold text-stone-900">
                    {extracted.carbs ?? 0}g
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2.5 shadow-2xs border border-emerald-100">
                  <p className="text-[10px] font-bold text-stone-500 uppercase">
                    Fat
                  </p>
                  <p className="mt-0.5 font-heading text-base font-bold text-stone-900">
                    {extracted.fat ?? 0}g
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  onClick={handleSaveDirectly}
                  disabled={isSaving}
                  className="flex-1 rounded-full bg-emerald-700 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                >
                  {isSaving ? (
                    <Loader2Icon className="size-4 animate-spin" />
                  ) : (
                    <CheckIcon className="size-4" />
                  )}
                  <span>Save to Diary</span>
                </Button>

                {onPrefillManualForm && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrefill}
                    className="rounded-full border-stone-300 text-sm font-semibold text-stone-700 hover:bg-white"
                  >
                    Edit / Pre-fill
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

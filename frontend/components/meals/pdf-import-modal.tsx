"use client";

import { useState, useRef, useEffect, type ChangeEvent } from "react";
import {
  FileTextIcon,
  UploadCloudIcon,
  Loader2Icon,
  CheckIcon,
  XIcon,
  AlertCircleIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import { importMealsFromPdf } from "@/lib/api/meals";
import type { MealEntry } from "@/lib/types/api";

interface PdfImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}

export function PdfImportModal({
  isOpen,
  onClose,
  onImportComplete,
}: PdfImportModalProps) {
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    count: number;
    sampleEntries: Partial<MealEntry>[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please select a valid PDF file.");
      return;
    }

    setError(null);
    setResult(null);
    setSelectedFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      setPdfBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleImport() {
    if (!pdfBase64) return;
    setIsImporting(true);
    setError(null);

    try {
      const res = await importMealsFromPdf({ pdfBase64 });
      if (res.success) {
        setResult({
          count: res.count,
          sampleEntries: res.sampleEntries || [],
        });
        onImportComplete();
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to parse PDF. Please ensure the PDF contains tabular meal entries."
      );
    } finally {
      setIsImporting(false);
    }
  }

  function handleClose() {
    setSelectedFileName(null);
    setPdfBase64(null);
    setResult(null);
    setError(null);
    setIsImporting(false);
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

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
              <FileTextIcon className="size-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-stone-900">
                Bulk PDF Nutrition Import
              </h2>
              <p className="text-xs text-stone-500">
                Upload tabular food history or diary PDF to bulk import
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

        {/* Content */}
        <div className="mt-5 space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            onChange={handleFileChange}
            className="hidden"
          />

          {!result ? (
            <>
              {!selectedFileName ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-emerald-300/80 bg-[#eef7f2]/60 p-8 text-center transition-colors hover:border-emerald-500 hover:bg-[#e6f4eb]"
                >
                  <div className="flex size-12 items-center justify-center rounded-full bg-white text-emerald-700 shadow-2xs">
                    <UploadCloudIcon className="size-6" />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-stone-800">
                    Click or drag to upload nutrition PDF
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    Accepts exported tabular food logs or meal histories
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl border border-stone-200 bg-stone-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <FileTextIcon className="size-5 text-emerald-700" />
                      <div>
                        <p className="truncate text-xs font-bold text-stone-900">
                          {selectedFileName}
                        </p>
                        <p className="text-[11px] text-stone-500">PDF Document ready</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-emerald-800 hover:underline"
                    >
                      Change
                    </button>
                  </div>

                  <Button
                    type="button"
                    onClick={handleImport}
                    disabled={isImporting}
                    className="mt-4 w-full rounded-full bg-emerald-700 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-800"
                  >
                    {isImporting ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        <span>Parsing and importing table rows...</span>
                      </>
                    ) : (
                      <>
                        <UploadCloudIcon className="size-4" />
                        <span>Parse & Bulk Import Meals</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4 rounded-2xl border border-emerald-200 bg-[#f0faf4] p-5 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                <CheckIcon className="size-6 stroke-[3]" />
              </div>
              <h3 className="font-heading text-lg font-bold text-stone-900">
                Successfully Imported {result.count} Meals
              </h3>
              <p className="text-xs text-stone-600">
                All food items and nutritional values have been added to your database diary.
              </p>

              {result.sampleEntries.length > 0 && (
                <div className="mt-3 text-left">
                  <p className="text-[11px] font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                    Sample Extracted Entries:
                  </p>
                  <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl bg-white p-3 border border-emerald-100 text-xs text-stone-700">
                    {result.sampleEntries.map((entry, idx) => (
                      <div key={idx} className="flex justify-between border-b border-stone-100 py-1 last:border-0">
                        <span className="font-medium truncate max-w-[200px]">{entry.foodName}</span>
                        <span className="font-bold text-emerald-800">{entry.calories} kcal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleClose}
                className="w-full rounded-full bg-stone-900 py-2.5 text-xs font-semibold text-white hover:bg-stone-800"
              >
                Done
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
              <AlertCircleIcon className="size-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

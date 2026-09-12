"use client";

import { useState } from "react";
import { CameraIcon, ChevronRightIcon, FileTextIcon, XIcon } from "lucide-react";

import { AiImageModal } from "@/components/meals/ai-image-modal";
import { PdfImportModal } from "@/components/meals/pdf-import-modal";
import type { ExtractedNutrition } from "@/lib/api/ai";

interface ImportMealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
  onPrefillManualForm?: (data: ExtractedNutrition) => void;
}

type Mode = "choose" | "photo" | "pdf";

export function ImportMealModal({
  isOpen,
  onClose,
  onImported,
  onPrefillManualForm,
}: ImportMealModalProps) {
  const [mode, setMode] = useState<Mode>("choose");

  function handleClose() {
    setMode("choose");
    onClose();
  }

  if (!isOpen) return null;

  if (mode === "photo") {
    return (
      <AiImageModal
        isOpen
        onClose={handleClose}
        onMealSaved={() => {
          onImported();
          handleClose();
        }}
        onPrefillManualForm={
          onPrefillManualForm
            ? (data) => {
                onPrefillManualForm(data);
                handleClose();
              }
            : undefined
        }
      />
    );
  }

  if (mode === "pdf") {
    return (
      <PdfImportModal
        isOpen
        onClose={handleClose}
        onImportComplete={() => {
          onImported();
          handleClose();
        }}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-sm rounded-3xl border border-emerald-900/10 bg-white p-6 shadow-xl">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
          aria-label="Close"
        >
          <XIcon className="size-5" />
        </button>

        <h2 className="font-heading text-lg font-bold text-stone-900">
          Import a meal
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Snap a photo of your food or a nutrition label, or upload a PDF: we'll extract the details automatically.
        </p>

        <div className="mt-5 space-y-2.5">
          <button
            type="button"
            onClick={() => setMode("photo")}
            className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <CameraIcon className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-stone-900">Photo</p>
              <p className="text-xs text-stone-500">
                A plate of food or a nutrition label
              </p>
            </div>
            <ChevronRightIcon className="size-4 text-stone-400" />
          </button>

          <button
            type="button"
            onClick={() => setMode("pdf")}
            className="flex w-full items-center gap-3 rounded-2xl border border-stone-200 px-4 py-3.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/60"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <FileTextIcon className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-stone-900">PDF</p>
              <p className="text-xs text-stone-500">
                A tabular food log or diary export
              </p>
            </div>
            <ChevronRightIcon className="size-4 text-stone-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

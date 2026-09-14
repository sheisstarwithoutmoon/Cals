"use client";

import { useRef, useState, type DragEvent } from "react";
import { ImagePlusIcon, Loader2Icon, RefreshCwIcon, TrashIcon } from "lucide-react";
import { cn } from "cn";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api/client";
import * as mealsApi from "@/lib/api/meals";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/**
 * Downscales the photo to at most MAX_DIMENSION on its long edge and
 * re-encodes it as JPEG, so phone photos (often 5–10 MB) upload quickly and
 * stay well under the API's size limit.
 */
export async function compressImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is not supported");

  // JPEG has no transparency; paint white behind transparent PNGs.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return canvas.toDataURL("image/jpeg", 0.85);
}

interface MealPhotoFieldProps {
  /** Currently attached photo URL, if any. */
  photoUrl: string | null;
  onChange: (photoUrl: string | null) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  onPhotoUploaded?: (dataUrl: string, uploadedUrl: string) => Promise<void> | void;
  allowReplace?: boolean;
  isScanning?: boolean;
}

export function MealPhotoField({
  photoUrl,
  onChange,
  onUploadingChange,
  onPhotoUploaded,
  allowReplace = true,
  isScanning = false,
}: MealPhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const previewUrl = localPreview ?? photoUrl;

  function setUploading(value: boolean) {
    setIsUploading(value);
    onUploadingChange?.(value);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Choose a JPEG, PNG or WebP photo.");
      return;
    }

    if (file.size > MAX_SOURCE_BYTES) {
      toast.error("That photo is too large. Choose one under 20 MB.");
      return;
    }

    setUploading(true);

    try {
      const dataUrl = await compressImage(file);
      setLocalPreview(dataUrl);

      const result = await mealsApi.uploadMealPhoto({ imageBase64: dataUrl });
      onChange(result.attachmentUrl);

      if (onPhotoUploaded) {
        await onPhotoUploaded(dataUrl, result.attachmentUrl);
      }
    } catch (error) {
      toast.error(
        error instanceof ApiError ? error.message : "Couldn't upload the photo. Please try again."
      );
    } finally {
      setLocalPreview(null);
      setUploading(false);
    }
  }

  function openPicker() {
    if (!isUploading && !isScanning) inputRef.current?.click();
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    setIsDragging(false);
    handleFile(event.dataTransfer.files?.[0]);
  }

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          handleFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />

      {previewUrl ? (
        <div
          className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-muted"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Meal photo" className="size-full object-cover" />

          {isUploading || isScanning ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-sm font-medium text-white">
              <Loader2Icon className="size-6 animate-spin" />
              {isScanning ? "Scanning photo with AI..." : "Uploading photo"}
            </div>
          ) : (
            <div className="absolute right-2.5 bottom-2.5 flex gap-2">
              {allowReplace && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="rounded-full bg-white/95 hover:bg-white"
                  onClick={openPicker}
                >
                  <RefreshCwIcon />
                  Replace
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full bg-white/95 text-destructive hover:bg-white hover:text-destructive"
                onClick={() => onChange(null)}
              >
                <TrashIcon />
                Remove
              </Button>
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={openPicker}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 text-center transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
            isDragging
              ? "border-primary bg-[#E7F0EA]"
              : "border-border bg-muted/30 hover:border-primary/40 hover:bg-[#E7F0EA]/60"
          )}
        >
          <span className="flex size-11 items-center justify-center rounded-full bg-[#E7F0EA] text-primary">
            <ImagePlusIcon className="size-5" />
          </span>
          <span className="text-sm font-medium text-foreground">Add a photo of your meal</span>
          <span className="text-xs text-muted-foreground">
            Click or drag an image here. JPEG, PNG or WebP.
          </span>
        </button>
      )}
    </div>
  );
}

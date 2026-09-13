"use client";

import { useEffect } from "react";
import { XIcon } from "lucide-react";

import type { AttachmentType } from "@/lib/types/api";

interface AttachmentPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachmentUrl: string;
  attachmentType: AttachmentType;
  title: string;
}

export function AttachmentPreviewModal({
  isOpen,
  onClose,
  attachmentUrl,
  attachmentType,
  title,
}: AttachmentPreviewModalProps) {
  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3.5">
          <p className="truncate pr-4 text-sm font-bold text-stone-900">{title}</p>
          <div className="flex shrink-0 items-center">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700"
              aria-label="Close"
            >
              <XIcon className="size-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto bg-stone-50 p-4">
          {attachmentType === "IMAGE" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachmentUrl}
              alt={title}
              className="mx-auto max-h-[70vh] w-auto rounded-xl object-contain"
            />
          ) : (
            <iframe
              src={attachmentUrl}
              title={title}
              className="h-[70vh] w-full rounded-xl border border-stone-200 bg-white"
            />
          )}
        </div>
      </div>
    </div>
  );
}

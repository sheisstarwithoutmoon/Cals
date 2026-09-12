"use client";

import { useState } from "react";
import { PlusIcon, CameraIcon, MessageSquareIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MealFormDialog } from "@/components/meals/meal-form-dialog";
import { AiImageModal } from "@/components/meals/ai-image-modal";
import { PdfImportModal } from "@/components/meals/pdf-import-modal";
import { AiChatDrawer } from "@/components/chat/ai-chat-drawer";
import type { MealEntry } from "@/lib/types/api";

interface QuickActionsProps {
  onMealSaved: (meal?: MealEntry) => void;
}

export function QuickActions({ onMealSaved }: QuickActionsProps) {
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      <Card className="rounded-3xl border border-stone-200/80 bg-white shadow-xs">
        <CardContent className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 p-4 sm:p-5">
          <MealFormDialog
            trigger={
              <Button
                className="cursor-pointer justify-center rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-5"
                size="lg"
              >
                <PlusIcon className="size-4.5" />
                <span>Log meal</span>
              </Button>
            }
            onSaved={onMealSaved}
          />

          <Button
            onClick={() => setIsPhotoOpen(true)}
            className="cursor-pointer justify-center rounded-2xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-900 font-semibold py-5"
            size="lg"
            variant="outline"
          >
            <CameraIcon className="size-4.5 text-emerald-700" />
            <span>Photo AI</span>
          </Button>

          <Button
            onClick={() => setIsChatOpen(true)}
            className="cursor-pointer justify-center rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold py-5"
            size="lg"
            variant="outline"
          >
            <MessageSquareIcon className="size-4.5 text-emerald-700" />
            <span>AI Chat</span>
          </Button>

          <Button
            onClick={() => setIsPdfOpen(true)}
            className="cursor-pointer justify-center rounded-2xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-800 font-semibold py-5"
            size="lg"
            variant="outline"
          >
            <FileTextIcon className="size-4.5 text-stone-600" />
            <span>Import PDF</span>
          </Button>
        </CardContent>
      </Card>

      <AiImageModal
        isOpen={isPhotoOpen}
        onClose={() => setIsPhotoOpen(false)}
        onMealSaved={() => onMealSaved()}
      />

      <PdfImportModal
        isOpen={isPdfOpen}
        onClose={() => setIsPdfOpen(false)}
        onImportComplete={() => onMealSaved()}
      />

      <AiChatDrawer
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onMealLogged={() => onMealSaved()}
      />
    </>
  );
}

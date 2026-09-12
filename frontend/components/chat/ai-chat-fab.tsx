"use client";

import { useState } from "react";
import { SparklesIcon } from "lucide-react";

import { AiChatDrawer } from "@/components/chat/ai-chat-drawer";

export function AiChatFab() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Open Cals Assistant"
        className="fixed right-5 bottom-20 z-40 flex size-13 cursor-pointer items-center justify-center rounded-full bg-emerald-700 text-white shadow-lg transition-all hover:bg-emerald-800 hover:shadow-xl active:scale-95 lg:bottom-6"
      >
        <SparklesIcon className="size-5.5" />
      </button>

      <AiChatDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

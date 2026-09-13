"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, SparklesIcon } from "lucide-react";

import { AiChatDrawer } from "@/components/chat/ai-chat-drawer";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { TopNav } from "@/components/layout/top-nav";
import { useAuth } from "@/contexts/auth-context";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
    } else if (!user.onboardingCompleted) {
      router.replace("/onboarding");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || !user.onboardingCompleted) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen min-h-0 flex-col overflow-hidden bg-transparent">
      <TopNav />
      <MobileHeader />
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
        </div>
      </main>
      <MobileTabBar onOpenChat={() => setIsChatOpen(true)} />

      {/* Floating AI Assistant Action Button */}
      <button
        type="button"
        onClick={() => setIsChatOpen(true)}
        aria-label="Open AI Assistant"
        className="fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-110 hover:bg-primary/90 hover:shadow-xl active:scale-95 md:bottom-8 md:right-8 md:size-14"
      >
        <SparklesIcon className="size-5 md:size-6 text-white" />
      </button>

      <AiChatDrawer isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { AiChatFab } from "@/components/chat/ai-chat-fab";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { MobileHeader } from "@/components/layout/mobile-header";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { useAuth } from "@/contexts/auth-context";

export function ProtectedShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

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
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-svh overflow-hidden bg-background">
      <AppSidebar />
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:py-8 lg:pb-8">
          {children}
          </div>
        </main>
      </div>
      <MobileTabBar />
      <AiChatFab />
    </div>
  );
}

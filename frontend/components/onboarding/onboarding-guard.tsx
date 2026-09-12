"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";

export function OnboardingGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace("/login");
    } else if (user.onboardingCompleted) {
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.onboardingCompleted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef7f2]">
        <Loader2Icon className="size-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  return <>{children}</>;
}

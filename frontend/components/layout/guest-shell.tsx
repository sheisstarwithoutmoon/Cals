"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2Icon, TargetIcon, MessageSquareIcon, TrendingUpIcon } from "lucide-react";
import { BrandLogo } from "@/components/common/brand-logo";
import { useAuth } from "@/contexts/auth-context";

export function GuestShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }, [isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#eef7f2]">
        <Loader2Icon className="size-8 animate-spin text-emerald-700" />
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-[#eef7f2] px-4 py-8 sm:px-6 lg:px-8">
      {/* Background organic blur */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 size-96 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 size-96 rounded-full bg-teal-100/40 blur-3xl" />
      </div>

      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:items-start lg:gap-8">
        {/* Left Column: Product Value Props */}
        <div className="hidden flex-col justify-center lg:col-span-6 lg:flex">
          <BrandLogo size="lg" brandName="Cals" />
          <p className="mt-2 text-lg font-medium text-stone-600">
            Smart nutrition & calorie tracking made simple
          </p>

          <div className="mt-10 space-y-5">
            {/* Value prop 1 */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-200/60 text-emerald-700">
                <TargetIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-stone-900">
                  Daily meal tracking
                </h3>
                <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                  Log calories and macros effortlessly without tedious manual counting
                </p>
              </div>
            </div>

            {/* Value prop 2 */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-200/60 text-emerald-700">
                <MessageSquareIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-stone-900">
                  Natural meal logger
                </h3>
                <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                  Describe what you ate in plain words and get instant macro breakdowns
                </p>
              </div>
            </div>

            {/* Value prop 3 */}
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-xs border border-stone-200/60 text-emerald-700">
                <TrendingUpIcon className="size-6" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-stone-900">
                  Track everything
                </h3>
                <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
                  Macros, weight trends, daily streaks, and hydration progress
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Form Container */}
        <div className="w-full lg:col-span-6">
          <div className="mb-6 flex justify-center lg:hidden">
            <BrandLogo size="md" brandName="Cals" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

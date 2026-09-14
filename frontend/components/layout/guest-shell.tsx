"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2Icon } from "lucide-react";
import { BrandLogo } from "@/components/common/brand-logo";
import { useAuth } from "@/contexts/auth-context";

export function GuestShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;

    router.replace(user.onboardingCompleted ? "/dashboard" : "/onboarding");
  }, [isLoading, user, router]);


  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center px-4 py-6 sm:px-6 lg:px-8">
      <div className="relative mx-auto grid w-full max-w-5xl grid-cols-1 items-center gap-6 md:grid-cols-12 md:gap-8 lg:gap-12">
        {/* Left Column: Illustration */}
        <div className="hidden flex-col items-center justify-center md:col-span-5 lg:col-span-6 md:flex">
          {/* Handwritten slogan with twisted doodle arrow */}
          <div className="flex flex-col items-center select-none text-center">
            <div
              className="flex flex-col items-center font-bold leading-[1.0] tracking-wide text-[#237847]"
              style={{ fontFamily: "var(--font-caveat), cursive" }}
            >
              <span className="text-3xl -rotate-3 sm:text-4xl">better</span>
              <span className="text-3xl rotate-1 sm:text-4xl">eating,</span>
              <span className="text-3xl -rotate-1 sm:text-4xl">brighter</span>
              <span className="text-3xl rotate-2 sm:text-4xl">days.</span>
            </div>

            {/* Cute hand-drawn twisted doodle arrow pointing down */}
            <svg
              viewBox="0 0 50 64"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="my-1 h-13 w-10 text-[#237847] select-none"
              aria-hidden="true"
            >
              {/* Twisted corkscrew loop stem */}
              <path d="M 27 4 C 37 12, 43 21, 31 25 C 19 29, 15 17, 26 15 C 37 13, 41 30, 27 42 C 22 47, 25 53, 26 56" />
              {/* Arrowhead pointing down */}
              <path d="M 19 50 C 22 53, 24 55, 26 57 C 28 55, 31 53, 34 49" />
            </svg>
          </div>

          <div className="mt-2 flex w-full items-center justify-center">
            <img
              src="/normal-avacado.png"
              alt="Avocado mascot"
              className="w-52 md:w-56 lg:w-64 max-w-[85%] object-contain drop-shadow-[0_18px_25px_rgba(30,80,45,0.10)]"
            />
          </div>
        </div>

        {/* Right Column: Form Container */}
        <div className="w-full md:col-span-7 lg:col-span-6">
          <div className="mb-6 flex justify-center md:hidden">
            <BrandLogo size="md" brandName="Cals" />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

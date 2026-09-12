"use client";

import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { LottieAvocado } from "@/components/common/lottie-avocado";

export function HeroSection() {
  return (
    <section className="relative flex min-h-[calc(100vh-4.5rem)] flex-col justify-center overflow-hidden py-10">
      {/* Subtle organic ambient glow */}
      <div className="pointer-events-none absolute -top-16 left-1/4 -z-10 h-80 w-80 -translate-x-1/2 rounded-full bg-emerald-100/40 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-16 -z-10 h-72 w-72 rounded-full bg-teal-100/20 blur-3xl" />

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-6 lg:grid-cols-12 lg:gap-8">
          {/* Left Column: Walking Avocado Alone (No hardcoded metrics / cards) */}
          <div className="flex items-center justify-center lg:col-span-6">
            <div className="relative flex items-center justify-center p-4">
              <div className="pointer-events-none absolute inset-0 -z-10 rounded-full bg-emerald-200/30 blur-2xl transform scale-110" />
              <LottieAvocado
                speed={1.1}
                className="h-52 w-52 sm:h-64 sm:w-64 md:h-80 md:w-80 lg:h-[400px] lg:w-[400px]"
              />
            </div>
          </div>

          {/* Right Column: Text on the other side */}
          <div className="flex flex-col items-start lg:col-span-6">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Cals
            </span>

            {/* Headline */}
            <h1 className="mt-3 font-heading text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl md:text-6xl md:leading-[1.12]">
              Keep track of your{" "}
              <span className="text-[#0d6832] underline decoration-emerald-300/60 decoration-wavy decoration-2 underline-offset-8">
                calories with Cals.
              </span>
            </h1>

            {/* Subtext aligned with app requirements */}
            <p className="mt-6 max-w-xl text-base leading-relaxed text-stone-600 sm:text-lg">
              A mindful calorie and nutrition tracker designed to help you monitor, manage, and understand your daily nutritional intake. Log meals across breakfast, lunch, dinner, and snacks, set personalized health goals, and visualize macro and micronutrient trends over time.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/register"
                className="group inline-flex items-center gap-2.5 rounded-full bg-emerald-700 px-7 py-3.5 text-base font-semibold text-white shadow-md transition-all hover:bg-emerald-800 hover:shadow-lg active:scale-95"
              >
                <span>Get started</span>
                <ArrowRightIcon className="size-4 transition-transform duration-200 group-hover:translate-x-1" />
              </Link>
              <Link
                href="#how-it-works"
                className="inline-flex items-center justify-center rounded-full border border-stone-300/80 bg-white/90 px-7 py-3.5 text-base font-semibold text-stone-700 shadow-2xs backdrop-blur-xs transition-all hover:border-stone-400 hover:bg-white hover:text-stone-900 active:scale-95"
              >
                See how it works
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

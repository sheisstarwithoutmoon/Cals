import Image from "next/image";
import {
  CameraIcon,
  ChartLineIcon,
  MessageCircleIcon,
  TargetIcon,
} from "lucide-react";

const FEATURES = [
  {
    icon: CameraIcon,
    title: "Snap a photo or drop a PDF",
    description: "AI extracts calories and macros: no manual typing.",
  },
  {
    icon: MessageCircleIcon,
    title: "Just tell the chat assistant",
    description: "Log meals, check goals, or ask nutrition questions in plain English.",
  },
  {
    icon: TargetIcon,
    title: "Set goals that fit you",
    description: "Daily calorie, macro and weight targets tailored to your plan.",
  },
  {
    icon: ChartLineIcon,
    title: "See it add up",
    description: "Trends across calories, macros and micronutrients over time.",
  },
];

export function FeatureShowcase() {
  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">
          {/* Left: feature list */}
          <div className="lg:col-span-6">
            <span className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Why Cals
            </span>
            <h2 className="mt-3 font-heading text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Logging that gets out of your way.
            </h2>

            <div className="mt-8 space-y-6">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex items-start gap-4">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <feature.icon className="size-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-stone-900">
                      {feature.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-stone-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: animated vision-AI scan card */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-sm overflow-hidden rounded-3xl border border-emerald-900/10 bg-white p-3 shadow-lg">
              <div className="relative aspect-4/3 overflow-hidden rounded-2xl">
                <Image
                  src="/scanner-img.png"
                  alt="A buddha bowl with grilled chicken, apple, pecans and chickpeas"
                  fill
                  sizes="(min-width: 1024px) 384px, 90vw"
                  className="object-cover object-[center_15%]"
                  priority
                />

                {/* Scan line */}
                <div className="animate-scan-line pointer-events-none absolute inset-x-3 h-0.5 rounded-full bg-emerald-400 shadow-[0_0_14px_3px_rgba(52,211,153,0.85)]" />

                {/* Floating labels, positioned over the real ingredients in the photo */}
                <span
                  className="animate-scan-label absolute left-[8%] top-[63%] rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-xs"
                  style={{ animationDelay: "0.3s" }}
                >
                  Pecans
                </span>
                <span
                  className="animate-scan-label absolute right-[6%] top-[50%] rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-xs"
                  style={{ animationDelay: "0.9s" }}
                >
                  Grilled chicken
                </span>
                <span
                  className="animate-scan-label absolute right-[18%] top-[7%] rounded-full border border-emerald-200 bg-white/95 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm backdrop-blur-xs"
                  style={{ animationDelay: "1.5s" }}
                >
                  Green apple
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-stone-50 px-4 py-3">
                <span className="text-xs font-semibold text-stone-600">
                  Vision AI
                </span>
                <span className="text-sm font-bold text-emerald-800">
                  420 kcal analyzed
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

import { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Cals",
  description:
    "A modern nutrition platform to monitor daily intake, log meals across breakfast, lunch, and dinner, set health goals, and visualize macro and micronutrient trends effortlessly.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-100 via-[#eef7f2] to-[#eef7f2] text-stone-900 selection:bg-emerald-200 selection:text-emerald-950">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}

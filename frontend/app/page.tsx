import { Metadata } from "next";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero-section";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SiteFooter } from "@/components/landing/site-footer";

export const metadata: Metadata = {
  title: "Cals",
  description:
    "A modern nutrition platform to monitor daily intake, log meals across breakfast, lunch, and dinner, set health goals, and visualize macro and micronutrient trends effortlessly.",
};

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col text-foreground selection:bg-secondary selection:text-primary">
      <LandingNavbar />
      <main className="flex-1 flex flex-col">
        <HeroSection />
        <FeatureShowcase />
        <HowItWorks />
      </main>
      <SiteFooter />
    </div>
  );
}

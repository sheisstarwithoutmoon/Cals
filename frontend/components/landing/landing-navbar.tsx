"use client";

import Link from "next/link";
import { LayoutDashboardIcon } from "lucide-react";
import { BrandLogo } from "@/components/common/brand-logo";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export function LandingNavbar() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-emerald-900/10 bg-white/50 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-18 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <BrandLogo size="md" brandName="Cals" />

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {!isLoading && user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md"
            >
              <LayoutDashboardIcon className="size-4" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-emerald-800 hover:shadow-md active:scale-95"
            >
              <span>Log in</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

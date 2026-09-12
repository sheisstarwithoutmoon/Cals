"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOutIcon } from "lucide-react";

import { BrandLogo } from "@/components/common/brand-logo";
import { NAV_ITEMS } from "@/components/layout/nav-items";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function AppSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "?";

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-stone-200/80 bg-[#e7f3ec] lg:flex">
        <div className="flex h-18 items-center px-6 border-b border-stone-200/50">
          <BrandLogo size="md" brandName="Cals" href="/dashboard" />
        </div>

        <nav className="flex flex-1 flex-col gap-1.5 px-4 py-4">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-emerald-700 text-white shadow-xs"
                    : "text-stone-600 hover:bg-stone-200/60 hover:text-stone-900"
                )}
              >
                <Icon className="size-4.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

      <div className="flex items-center gap-3 border-t border-stone-200/70 bg-stone-50/50 px-4 py-4">
        <Avatar size="sm" className="ring-1 ring-stone-200">
          <AvatarFallback className="bg-emerald-100 text-emerald-900 font-bold text-xs">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-stone-900">
            {user?.name}
          </p>
          <p className="truncate text-[11px] text-stone-500 font-medium">
            {user?.email}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Log out"
          onClick={() => logout()}
          className="hover:bg-stone-200/80 text-stone-600 hover:text-rose-600 rounded-lg"
        >
          <LogOutIcon className="size-4" />
        </Button>
      </div>
    </aside>
  );
}

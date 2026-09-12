"use client";

import { LogOutIcon } from "lucide-react";
import { BrandLogo } from "@/components/common/brand-logo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/auth-context";

export function MobileHeader() {
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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200/80 bg-[#eef7f2]/95 px-4 backdrop-blur-sm lg:hidden">
      <BrandLogo size="sm" brandName="Cals" href="/" />

      <DropdownMenu>
        <DropdownMenuTrigger className="outline-none">
          <Avatar size="sm" className="ring-1 ring-stone-200">
            <AvatarFallback className="bg-emerald-100 text-emerald-900 font-bold text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="rounded-2xl border-stone-200 bg-white shadow-md">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-bold text-stone-900">
              {user?.name}
            </p>
            <p className="truncate text-xs text-stone-500">
              {user?.email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-stone-100" />
          <DropdownMenuItem
            variant="destructive"
            onClick={() => logout()}
            className="cursor-pointer font-medium"
          >
            <LogOutIcon className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}

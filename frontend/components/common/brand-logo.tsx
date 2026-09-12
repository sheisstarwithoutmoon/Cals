import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg";
  href?: string | null;
  brandName?: string;
  tagline?: string;
}

export function AvocadoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <path
        d="M24 4C17.5 4 12 11 12 21C12 32.5 17 44 24 44C31 44 36 32.5 36 21C36 11 30.5 4 24 4Z"
        fill="#15803D"
      />
      <path
        d="M24 7C19 7 14.5 13 14.5 22C14.5 32 18.5 41.5 24 41.5C29.5 41.5 33.5 32 33.5 22C33.5 13 29 7 24 7Z"
        fill="#BBF7D0"
      />
      <ellipse cx="24" cy="28" rx="8.5" ry="10" fill="#DCFCE7" />
      <ellipse cx="24" cy="28" rx="5.5" ry="6.5" fill="#78350F" />
      <ellipse cx="22.5" cy="26" rx="1.5" ry="2" fill="#92400E" />
      <circle cx="22" cy="25" r="0.8" fill="#FDE68A" />
      <circle cx="21" cy="16" r="1.1" fill="#14532D" />
      <circle cx="27" cy="16" r="1.1" fill="#14532D" />
      <path
        d="M22.5 18.5C23.2 19.5 24.8 19.5 25.5 18.5"
        stroke="#14532D"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
      <circle cx="19.5" cy="18" r="1.2" fill="#FCA5A5" opacity="0.8" />
      <circle cx="28.5" cy="18" r="1.2" fill="#FCA5A5" opacity="0.8" />
      <path
        d="M24 4.5C24 2 26.5 1.5 28 2.5C28 4.5 25.5 5 24 4.5Z"
        fill="#16A34A"
      />
    </svg>
  );
}

export function BrandLogo({
  className,
  size = "md",
  href = "/",
  brandName = "Cals",
  tagline,
}: BrandLogoProps) {
  const sizeClasses = {
    sm: {
      icon: "size-5",
      text: "text-base tracking-tight font-semibold",
      badge: "size-7",
    },
    md: {
      icon: "size-6",
      text: "text-lg tracking-tight font-bold",
      badge: "size-9",
    },
    lg: {
      icon: "size-8",
      text: "text-2xl tracking-tight font-extrabold",
      badge: "size-12",
    },
  };

  const content = (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-2xl bg-emerald-50/80 p-1 border border-emerald-100 shadow-xs transition-transform duration-200 hover:scale-105",
          sizeClasses[size].badge
        )}
      >
        <img
          src="/cals-flame.svg"
          alt="Cals"
          className={cn("shrink-0 object-contain", sizeClasses[size].icon)}
        />
      </div>
      <div className="flex flex-col">
        <span
          className={cn(
            "font-heading text-neutral-900 leading-none",
            sizeClasses[size].text
          )}
        >
          {brandName}
        </span>
        {tagline && (
          <span className="text-[11px] text-neutral-500 font-medium leading-tight mt-0.5">
            {tagline}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded-lg">
        {content}
      </Link>
    );
  }

  return content;
}

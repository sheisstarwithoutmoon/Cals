import {
  LayoutDashboard,
  LineChart,
  Target,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/meals", label: "Meals", icon: UtensilsCrossed },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/reports", label: "Reports", icon: LineChart },
];

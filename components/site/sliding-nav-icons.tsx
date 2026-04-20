"use client";

import { Heart, Search, ShoppingCart, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type SlidingNavTheme = "light" | "dark";

export type SlidingNavIconsProps = {
  isExpanded: boolean;
  isSidebarOpen: boolean;
  onIconClick: (item: string) => void;
  theme: SlidingNavTheme;
};

const navItems = [
  { id: "cart", icon: ShoppingCart, label: "Cart" },
  { id: "wishlist", icon: Heart, label: "Wishlist" },
  { id: "search", icon: Search, label: "Search" },
  { id: "profile", icon: User, label: "Profile" },
] as const;

export function SlidingNavIcons({
  isExpanded,
  isSidebarOpen,
  onIconClick,
  theme,
}: SlidingNavIconsProps) {
  const iconClass =
    theme === "light"
      ? isSidebarOpen
        ? "text-accent"
        : "text-[color:var(--color-light-text)]"
      : isSidebarOpen
        ? "text-accent"
        : "text-foreground";

  const labelClass =
    theme === "light"
      ? "text-[color:var(--color-light-text)]"
      : "text-foreground";

  const glow =
    theme === "light"
      ? "drop-shadow(0 0 10px rgba(0,0,0,0.45)) drop-shadow(0 1px 2px rgba(0,0,0,0.35))"
      : "drop-shadow(0 0 10px rgba(255,255,255,0.35)) drop-shadow(0 0 4px rgba(255,255,255,0.2))";

  return (
    <div className="flex flex-col gap-6">
      {navItems.map((item, index) => {
        const Icon = item.icon;
        const delay = index * 100;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onIconClick(item.id)}
            className={cn(
              "focus-visible:ring-accent/50 focus-visible:ring-offset-background flex flex-col items-center gap-1 transition-all duration-300 hover:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              isExpanded
                ? "pointer-events-auto translate-x-0 opacity-100"
                : "pointer-events-none translate-x-8 opacity-0",
            )}
            style={{
              transitionDelay: isExpanded ? `${delay}ms` : "0ms",
              filter: glow,
            }}
            aria-label={item.label}
          >
            <Icon
              className={cn("h-5 w-5 transition-colors", iconClass)}
              strokeWidth={1.5}
            />
            <span
              className={cn("text-[10px] font-light tracking-wide", labelClass)}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

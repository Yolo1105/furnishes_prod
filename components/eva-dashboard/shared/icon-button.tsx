"use client";

import { cn } from "@/lib/utils";

interface IconButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function IconButton({
  icon: Icon,
  title,
  onClick,
  active,
  disabled,
  size = "md",
  className,
}: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={cn(
        "text-muted-foreground hover:text-primary focus-visible:ring-primary/20 flex items-center justify-center rounded transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
        size === "md"
          ? "hover:bg-accent/10 h-7 w-7"
          : "hover:bg-accent/10 h-6 w-6",
        active && "text-primary",
        className,
      )}
    >
      <Icon className={cn(size === "md" ? "h-4 w-4" : "h-3.5 w-3.5")} />
    </button>
  );
}

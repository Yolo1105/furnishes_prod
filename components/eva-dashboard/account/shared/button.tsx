"use client";

import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium tracking-[0.14em] uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border-border text-foreground bg-card hover:bg-muted border",
  ghost: "text-foreground hover:bg-muted",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3 text-[10px]",
  md: "h-9 px-4 text-[11px]",
};

type BtnBaseProps = {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconRight?: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Button / LinkButton — consistent styling across all account pages.
 * Use LinkButton for navigation, Button for actions.
 */
export function Button({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  ...rest
}: BtnBaseProps & Omit<ComponentProps<"button">, "children" | "className">) {
  return (
    <button
      {...rest}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
      {children}
      {iconRight}
    </button>
  );
}

export function LinkButton({
  variant = "secondary",
  size = "md",
  icon,
  iconRight,
  children,
  className = "",
  href,
  ...rest
}: BtnBaseProps & { href: string } & Omit<
    ComponentProps<typeof Link>,
    "children" | "className" | "href"
  >) {
  return (
    <Link
      {...rest}
      href={href}
      className={`${base} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
    >
      {icon}
      {children}
      {iconRight}
    </Link>
  );
}

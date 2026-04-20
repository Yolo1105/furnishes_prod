import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const base =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 font-medium tracking-[0.14em] uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

const variants = {
  primary:
    "bg-primary text-primary-foreground hover:opacity-90 h-9 px-4 text-[11px]",
  secondary:
    "border-border text-foreground bg-card hover:bg-muted h-9 border px-4 text-[11px]",
} as const;

/**
 * Same look as LinkButton but safe inside Server Components (no "use client").
 */
export function AccountServerLink({
  href,
  variant = "secondary",
  className = "",
  children,
  ...rest
}: {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: ReactNode;
} & Omit<ComponentProps<typeof Link>, "href" | "className" | "children">) {
  return (
    <Link
      href={href}
      className={`${base} ${variants[variant]} ${className}`}
      {...rest}
    >
      {children}
    </Link>
  );
}

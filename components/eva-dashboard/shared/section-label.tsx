"use client";

import { cn } from "@/lib/utils";

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p
      className={cn(
        "text-muted-foreground/60 text-[9px] font-semibold tracking-wider uppercase",
        className,
      )}
    >
      {children}
    </p>
  );
}

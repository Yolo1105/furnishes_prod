import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioHeroPanelProps = React.HTMLAttributes<HTMLElement>;

/**
 * Main canvas / preview column: token-driven field, zero-radius, architectural slab.
 */
export function StudioHeroPanel({ className, ...props }: StudioHeroPanelProps) {
  return (
    <section
      className={cn(
        // Align with chat main column (`DashboardLayout` uses `bg-card`).
        "bg-card flex min-h-0 min-w-0 flex-1 flex-col",
        className,
      )}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioLeftRailProps = React.HTMLAttributes<HTMLElement>;

export function StudioLeftRail({ className, ...props }: StudioLeftRailProps) {
  return (
    <aside
      className={cn(
        // Opaque warm card (not bg-background/40) so we never composite onto dashboard main.
        "border-border bg-card flex min-h-0 w-full shrink-0 flex-col overflow-hidden border-b md:max-h-full md:w-[260px] md:border-r md:border-b-0",
        className,
      )}
      {...props}
    />
  );
}

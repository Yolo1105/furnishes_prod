import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioTopChromeProps = React.HTMLAttributes<HTMLDivElement>;

export function StudioTopChrome({ className, ...props }: StudioTopChromeProps) {
  return (
    <div
      className={cn(
        // Same warm surface as studio shell — avoids a “white card” strip on cool-tinted hero.
        "border-border bg-background flex h-11 shrink-0 items-center justify-between border-b px-3 md:px-4",
        className,
      )}
      {...props}
    />
  );
}

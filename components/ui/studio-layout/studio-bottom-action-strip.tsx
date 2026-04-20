import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioBottomActionStripProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Bottom toolbar for filmstrip + secondary actions — in document flow so it does not
 * overlay the canvas (avoids clipped / unreachable Results on short viewports).
 */
export function StudioBottomActionStrip({
  className,
  ...props
}: StudioBottomActionStripProps) {
  return (
    <div
      className={cn(
        "border-border bg-background shrink-0 border-t px-3 py-2.5 md:px-4",
        className,
      )}
      {...props}
    />
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioWorkspaceShellProps = React.HTMLAttributes<HTMLDivElement>;

/**
 * Root row for Eva Studio tools: applies `.eva-studio` tokens and flex split
 * (left rail | hero). Default composition model for image-gen / similar surfaces.
 */
export function StudioWorkspaceShell({
  className,
  ...props
}: StudioWorkspaceShellProps) {
  return (
    <div
      className={cn(
        // Solid warm surface so account `main` (dashboard `bg-card`) does not bleed through
        // semi-transparent rails / heroes and read as cool grey.
        "eva-studio bg-background text-foreground flex h-full min-h-0 min-w-0 flex-col md:flex-row",
        className,
      )}
      {...props}
    />
  );
}

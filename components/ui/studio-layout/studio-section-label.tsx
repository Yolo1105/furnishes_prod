import * as React from "react";
import { cn } from "@/lib/utils";

export type StudioSectionLabelProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "children"
> & {
  children: React.ReactNode;
  /** Same-row meta (counts, hints) — not uppercased; uses body style. */
  meta?: React.ReactNode;
};

/**
 * Uppercase eyebrow label for stacked studio sections (Generate / Arrange rails).
 */
export function StudioSectionLabel({
  className,
  children,
  meta,
  ...props
}: StudioSectionLabelProps) {
  return (
    <div
      className={cn(
        "mb-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
        className,
      )}
      {...props}
    >
      <span className="text-muted-foreground font-ui text-[10px] font-medium tracking-[0.12em] uppercase">
        {children}
      </span>
      {meta != null && meta !== false ? (
        <span className="text-muted-foreground font-body text-[10px] font-normal tracking-normal normal-case">
          {meta}
        </span>
      ) : null}
    </div>
  );
}

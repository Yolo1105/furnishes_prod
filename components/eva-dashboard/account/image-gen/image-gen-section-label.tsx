"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ImageGenSectionLabelProps = {
  children: ReactNode;
  meta?: ReactNode;
  className?: string;
};

/** Uppercase rail labels for Image Gen — same visual language as studio tooling. */
export function ImageGenSectionLabel({
  children,
  meta,
  className,
}: ImageGenSectionLabelProps) {
  return (
    <div
      className={cn(
        "mb-2 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5",
        className,
      )}
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

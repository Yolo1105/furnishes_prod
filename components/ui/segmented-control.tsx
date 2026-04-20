"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export type SegmentedOption<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: SegmentedOption<T>[];
  className?: string;
  listClassName?: string;
  /** Accessible name for the tablist */
  "aria-label"?: string;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  listClassName,
  "aria-label": ariaLabel = "Segmented control",
}: SegmentedControlProps<T>) {
  return (
    <div
      className={cn(
        "border-border bg-muted/50 inline-flex gap-0.5 border p-0.5",
        className,
        listClassName,
      )}
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(opt.value)}
            className={cn(
              "font-ui inline-flex items-center gap-1 rounded-none px-2.5 py-1.5 text-[11px] transition-colors",
              active
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

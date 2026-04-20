"use client";

import { Search, X } from "lucide-react";
import type { ReactNode } from "react";

/* ── SearchInput ──────────────────────────────────────────────── */

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border-border bg-card text-foreground placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-primary/20 h-9 w-full border pr-8 pl-8 text-sm focus:ring-2 focus:outline-none"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="hover:bg-muted text-muted-foreground absolute top-1/2 right-1.5 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center transition-colors"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

/* ── SegmentedFilter ──────────────────────────────────────────── */

export function SegmentedFilter<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; count?: number }[];
}) {
  return (
    <div
      role="tablist"
      className="border-border bg-muted/50 inline-flex items-center rounded-full border p-1"
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium tracking-[0.14em] uppercase transition-colors ${
              active
                ? "bg-card text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={`tabular-nums ${active ? "text-foreground/60" : "text-muted-foreground/70"} text-[10px]`}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ── FilterBar ────────────────────────────────────────────────── */

/** Layout wrapper: arranges filter controls with consistent spacing. */
export function FilterBar({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border-border bg-card mb-5 flex flex-wrap items-center gap-3 border p-2 ${className}`}
    >
      {children}
    </div>
  );
}

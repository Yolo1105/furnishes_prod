"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { type LucideIcon } from "lucide-react";

export type BreadcrumbSegment = {
  label: string;
  /** If undefined, this is the active (last) segment — renders as text, not a link */
  href?: string;
  /** Only the FIRST segment should pass an icon */
  icon?: LucideIcon;
};

export function Breadcrumb({
  segments,
  actions,
}: {
  segments: BreadcrumbSegment[];
  /** Optional right-aligned action buttons */
  actions?: ReactNode;
}) {
  if (segments.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-20 -mx-6 mb-6 flex h-12 items-center justify-between gap-4 border-b px-6 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
      style={{
        background: "var(--card)",
        borderColor: "var(--border)",
      }}
    >
      <nav
        aria-label="Breadcrumb"
        className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden"
      >
        {segments.map((seg, i) => {
          const isLast = i === segments.length - 1;
          const isFirst = i === 0;
          const Icon = seg.icon;

          return (
            <div
              key={`${seg.label}-${i}`}
              className="flex min-w-0 items-center gap-2"
            >
              {!isFirst && (
                <span
                  className="shrink-0 text-xs"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-hidden="true"
                >
                  /
                </span>
              )}

              {isFirst && Icon && seg.href ? (
                <Link
                  href={seg.href}
                  aria-label={seg.label}
                  title={seg.label}
                  className="flex shrink-0 items-center transition-colors hover:opacity-70"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  <Icon className="h-3.5 w-3.5" />
                </Link>
              ) : isFirst && Icon ? (
                <Icon
                  className="h-3.5 w-3.5 shrink-0"
                  style={{ color: "var(--muted-foreground)" }}
                  aria-label={seg.label}
                />
              ) : null}

              {(!isFirst || !Icon) && (
                <>
                  {seg.href && !isLast ? (
                    <Link
                      href={seg.href}
                      className="font-ui min-w-0 truncate text-xs tracking-[0.06em] transition-colors hover:text-[var(--foreground)]"
                      style={{ color: "var(--muted-foreground)" }}
                    >
                      {seg.label}
                    </Link>
                  ) : (
                    <span
                      aria-current={isLast ? "page" : undefined}
                      className={
                        isLast
                          ? "font-ui min-w-0 truncate pb-0.5 text-xs font-semibold tracking-[0.06em]"
                          : "font-ui min-w-0 truncate text-xs tracking-[0.06em]"
                      }
                      style={{
                        color: isLast
                          ? "var(--foreground)"
                          : "var(--muted-foreground)",
                        borderBottom: isLast
                          ? "2px solid var(--primary)"
                          : "none",
                        marginBottom: isLast ? "-1px" : 0,
                      }}
                    >
                      {seg.label}
                    </span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </nav>

      {actions && (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

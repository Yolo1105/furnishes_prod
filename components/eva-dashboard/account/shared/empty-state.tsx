import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { SectionCard } from "./section-card";

/**
 * Empty-state block used when a list / collection has no items.
 * Stays on brand: bracketed eyebrow, centered Manrope title, editorial voice.
 */
export function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
  compact,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  cta?: ReactNode;
  compact?: boolean;
}) {
  return (
    <SectionCard tone="muted" padding="lg">
      <div
        className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-10"}`}
      >
        {Icon && (
          <span className="bg-card border-border mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full border">
            <Icon className="text-muted-foreground h-5 w-5" />
          </span>
        )}
        <h3 className="text-foreground text-lg leading-tight font-[var(--font-manrope)] tracking-tight">
          {title}
        </h3>
        {body && (
          <p className="text-muted-foreground mt-2 max-w-md text-sm leading-relaxed">
            {body}
          </p>
        )}
        {cta && <div className="mt-5">{cta}</div>}
      </div>
    </SectionCard>
  );
}

import type { ReactNode } from "react";
import { Eyebrow } from "./eyebrow";
import { Breadcrumb, type BreadcrumbSegment } from "./breadcrumb";

/**
 * PageHeader — consistent page-level title block.
 *
 * When `breadcrumbs` is set, the breadcrumb strip renders above the header
 * and the eyebrow is omitted (breadcrumb already signals the section).
 */
export function PageHeader({
  breadcrumbs,
  breadcrumbActions,
  eyebrow,
  title,
  subtitle,
  actions,
  meta,
}: {
  /** If provided, renders breadcrumb strip and omits eyebrow */
  breadcrumbs?: BreadcrumbSegment[];
  /** Right-aligned actions inside the breadcrumb strip */
  breadcrumbActions?: ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string | ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
}) {
  return (
    <>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb segments={breadcrumbs} actions={breadcrumbActions} />
      )}
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          {!breadcrumbs && eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1
            className={`font-display text-3xl md:text-[32px] ${!breadcrumbs && eyebrow ? "mt-3" : "mt-0"}`}
            style={{ color: "var(--foreground)" }}
          >
            {title}
          </h1>
          {subtitle && (
            <div
              className="font-body mt-2 max-w-2xl text-sm"
              style={{ color: "var(--muted-foreground)" }}
            >
              {typeof subtitle === "string" ? <p>{subtitle}</p> : subtitle}
            </div>
          )}
          {meta && <div className="mt-3">{meta}</div>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </header>
    </>
  );
}

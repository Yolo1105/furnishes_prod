"use client";

import { Fragment } from "react";
import Link from "next/link";
import {
  COLLECTION_ROOT_LABEL,
  formatDirectoryLabel,
  type BreadcrumbItem,
} from "@/lib/site/collection-navigation";

const linkBaseClass =
  "text-[var(--color-primary)] transition-colors hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]/15";

/** Root “Collection” matches hero last-segment weight (`font-[375]`) so it does not read bolder than the rest. */
function heroLinkClass(item: BreadcrumbItem) {
  const weight =
    item.label === COLLECTION_ROOT_LABEL ? "font-[375]" : "font-normal";
  return `${weight} ${linkBaseClass}`;
}

const navLinkClass = `font-normal ${linkBaseClass}`;

function lastSpanClass(variant: "hero" | "nav", isLast: boolean) {
  if (!isLast) return "font-normal text-[var(--color-primary)]";
  return variant === "hero"
    ? "font-[375] text-[var(--color-primary)]"
    : "font-medium text-[var(--color-primary)]";
}

/** Root “Collection” matches hero body weight; nav stays normal vs. medium for current page. */
function spanClassForItem(
  variant: "hero" | "nav",
  item: BreadcrumbItem,
  isLast: boolean,
) {
  if (item.label === COLLECTION_ROOT_LABEL) {
    if (variant === "hero") {
      return "font-[375] text-[var(--color-primary)]";
    }
    return "font-normal text-[var(--color-primary)]";
  }
  return lastSpanClass(variant, isLast);
}

/**
 * Large hero `<h1>`: directory trail (Collection > …) at headline scale.
 */
export function CollectionHeroDirectoryHeadline({
  items,
}: {
  items: BreadcrumbItem[];
}) {
  if (items.length === 0) return null;
  const n = items.length;
  return (
    <h1 className="m-0 flex w-full min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1.5 font-sans text-[clamp(1.5rem,3.5vw,2.4rem)] leading-snug font-normal tracking-tight">
      {items.map((item, i) => {
        const isLast = i === n - 1;
        return (
          <Fragment key={`dir-${i}-${item.href ?? "here"}-${item.label}`}>
            {item.href != null && !isLast ? (
              <Link href={item.href} className={heroLinkClass(item)}>
                {formatDirectoryLabel(item.label)}
              </Link>
            ) : (
              <span className={spanClassForItem("hero", item, isLast)}>
                {formatDirectoryLabel(item.label)}
              </span>
            )}
          </Fragment>
        );
      })}
    </h1>
  );
}

type CollectionBreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

/** Directory trail (`<nav>` + list) for PDP title block and similar. */
export function CollectionBreadcrumbs({
  items,
  className,
}: CollectionBreadcrumbsProps) {
  if (items.length === 0) return null;
  const n = items.length;
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="m-0 flex list-none flex-wrap items-baseline gap-x-2 gap-y-1 p-0 text-left text-sm leading-snug font-normal tracking-tight text-[var(--color-primary)] md:text-[15px] md:leading-relaxed">
        {items.map((item, i) => {
          const isLast = i === n - 1;
          return (
            <li
              key={`bc-${i}-${item.href ?? "here"}-${item.label}`}
              className="flex items-baseline"
            >
              {item.href != null && !isLast ? (
                <Link href={item.href} className={navLinkClass}>
                  {formatDirectoryLabel(item.label)}
                </Link>
              ) : (
                <span
                  className={spanClassForItem("nav", item, isLast)}
                  aria-current={isLast ? "page" : undefined}
                >
                  {formatDirectoryLabel(item.label)}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

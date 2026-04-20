"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "@/components/site/ChevronDownIcon";
import { expandCollapse, expandTransitionQuick } from "@/lib/site/animations";

export type AccordionItem = {
  title: ReactNode;
  content: ReactNode;
  number?: string;
  tag?: string;
};

type AccordionProps = {
  items: AccordionItem[];
  expandIcon?: "plusMinus" | "arrow";
  /** `lg`: larger row type, padding, and expanded body (e.g. Heritage). */
  size?: "default" | "lg";
  /** Index open on first render (`null` = all closed). */
  defaultExpandedIndex?: number | null;
  listClassName?: string;
  itemClassName?: string;
  buttonClassName?: string;
  contentClassName?: string;
};

const defaultButtonClass =
  "w-full flex items-center justify-between gap-4 py-4 md:py-5 font-sans text-[var(--color-primary)] text-[clamp(0.9375rem,1.05vw,1.0625rem)] font-normal text-left bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/20";

const largeButtonClass =
  "w-full flex items-center justify-between gap-3 py-4 font-sans text-[var(--color-primary)] font-normal text-left bg-transparent border-0 cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]/20 md:gap-4 md:py-5";

const defaultContentClass =
  "text-sm leading-relaxed text-[var(--foreground)]/75 md:text-base pb-4 md:pb-5 pl-0 pr-12 md:pr-14";

const largeContentClass =
  "text-sm leading-[1.6] text-[var(--foreground)]/75 md:text-[0.9375rem] md:leading-[1.62] pb-4 pl-0 pr-12 md:pb-5 md:pr-14";

export function Accordion({
  items,
  expandIcon = "arrow",
  size = "default",
  defaultExpandedIndex = null,
  listClassName = "",
  itemClassName = "",
  buttonClassName = "",
  contentClassName,
}: AccordionProps) {
  const resolvedButtonClass =
    buttonClassName || (size === "lg" ? largeButtonClass : defaultButtonClass);
  const resolvedContentClass =
    contentClassName ??
    (size === "lg" ? largeContentClass : defaultContentClass);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(
    defaultExpandedIndex,
  );

  const transition =
    expandIcon === "arrow" ? expandCollapse.transition : expandTransitionQuick;

  return (
    <ul
      className={`m-0 list-none border-t border-[var(--foreground)]/12 p-0 font-sans ${listClassName}`.trim()}
    >
      {items.map((item, index) => {
        const isExpanded = expandedIndex === index;
        const key =
          typeof item.title === "string" ? item.title : `accordion-${index}`;
        const id = `accordion-${index}`;
        const controlsId = `accordion-details-${index}`;
        return (
          <li
            key={key}
            className={`border-b border-[var(--foreground)]/12 ${itemClassName}`.trim()}
          >
            <button
              type="button"
              onClick={() =>
                setExpandedIndex((prev) => (prev === index ? null : index))
              }
              className={resolvedButtonClass}
              aria-expanded={isExpanded}
              aria-controls={controlsId}
              id={id}
            >
              {item.number != null && item.tag != null ? (
                <>
                  <span
                    className={`shrink-0 font-normal tracking-[0.02em] text-[var(--color-secondary-muted)] ${
                      size === "lg"
                        ? "text-[clamp(0.875rem,1.02vw,1rem)]"
                        : "text-[clamp(0.875rem,1vw,1rem)]"
                    }`}
                  >
                    {item.number}
                  </span>
                  <span
                    className={`flex-1 text-left tracking-[-0.02em] text-[var(--color-primary)] ${
                      size === "lg" ? "text-[clamp(1rem,1.12vw,1.125rem)]" : ""
                    }`}
                  >
                    {item.title}
                  </span>
                  <span
                    className={`shrink-0 font-normal tracking-[0.08em] text-[var(--color-secondary-muted)]/90 uppercase ${
                      size === "lg"
                        ? "text-[clamp(0.75rem,0.88vw,0.875rem)]"
                        : "text-[clamp(0.75rem,0.9vw,0.875rem)]"
                    }`}
                  >
                    {item.tag}
                  </span>
                </>
              ) : (
                <>
                  <span
                    className={
                      size === "lg"
                        ? "text-[clamp(0.9375rem,1.05vw,1.0625rem)]"
                        : undefined
                    }
                  >
                    {item.title}
                  </span>
                  {expandIcon === "plusMinus" ? (
                    <span
                      className={`flex shrink-0 items-center justify-center leading-none font-normal text-[var(--color-primary)] ${
                        size === "lg" ? "h-7 w-7 text-2xl" : "h-6 w-6 text-xl"
                      }`}
                      aria-hidden
                    >
                      {isExpanded ? "−" : "+"}
                    </span>
                  ) : (
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--color-primary)] transition-transform duration-300 ease-out"
                      style={{
                        transform: isExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                      aria-hidden
                    >
                      <ChevronDownIcon size={20} />
                    </span>
                  )}
                </>
              )}
            </button>
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  id={controlsId}
                  role="region"
                  aria-labelledby={id}
                  initial={expandCollapse.initial}
                  animate={expandCollapse.animate}
                  exit={expandCollapse.exit}
                  transition={transition}
                  className="overflow-hidden"
                >
                  <div className={resolvedContentClass}>{item.content}</div>
                </motion.div>
              )}
            </AnimatePresence>
          </li>
        );
      })}
    </ul>
  );
}

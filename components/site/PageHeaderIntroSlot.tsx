"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  defaultTransition,
  slideFromLeft,
  slideFromRight,
} from "@/lib/site/animations";

/** Seconds — matches stagger used elsewhere for multi-line headers. */
const STAGGER_S = 0.06;

export type PageHeaderIntroSlotProps = {
  children: ReactNode;
  /** Stagger order: 0 runs first. */
  step: number;
  /** LTR: slide in from the left (`start`) or from the right (`end`). */
  slideFrom?: "start" | "end";
  className?: string;
};

/**
 * Same motion recipe as Playground + About intros: `slideFromLeft` / `slideFromRight`,
 * `whileInView`, and `viewport` from `@/lib/site/animations`.
 */
export function PageHeaderIntroSlot({
  children,
  step,
  slideFrom = "start",
  className,
}: PageHeaderIntroSlotProps) {
  const initial =
    slideFrom === "end" ? slideFromRight.initial : slideFromLeft.initial;
  const inView =
    slideFrom === "end" ? slideFromRight.animate : slideFromLeft.animate;

  return (
    <motion.div
      className={className}
      initial={initial}
      whileInView={inView}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ ...defaultTransition, delay: step * STAGGER_S }}
    >
      {children}
    </motion.div>
  );
}

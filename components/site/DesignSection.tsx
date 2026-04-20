"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { ArrowUpRightIcon } from "@/components/site/ArrowUpRightIcon";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";
import {
  DESIGN_SECTION_HEADING_LINE1,
  DESIGN_SECTION_HEADING_LINE2,
  DESIGN_SECTION_LABEL,
  DESIGN_SECTION_STEPS,
} from "@/content/site/design-section";
import { defaultTransition } from "@/lib/site/animations";

export function DesignSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });

  return (
    <section
      ref={ref}
      id="Design"
      className="scroll-mt-0 px-6 pt-8 pb-16 md:px-12 md:pt-10 md:pb-20 lg:px-16 lg:pt-12"
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6 md:gap-8">
        <div className="mb-1 flex flex-col gap-1 md:mb-0 md:flex-row md:items-start md:justify-between">
          <motion.h2
            className="font-sans leading-[1.18] font-[375] tracking-[-0.02em]"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={defaultTransition}
          >
            <span className="block text-[clamp(1.5rem,3.85vw,2.625rem)] text-[var(--color-primary)] md:text-[clamp(1.875rem,4.35vw,3.125rem)]">
              {DESIGN_SECTION_HEADING_LINE1}
            </span>
            <span className="mt-0.5 block text-[clamp(1.6rem,4.05vw,2.875rem)] font-[375] text-[var(--color-accent)] md:text-[clamp(2rem,4.65vw,3.25rem)]">
              {DESIGN_SECTION_HEADING_LINE2}
            </span>
          </motion.h2>
          <motion.div
            className="mt-3 md:mt-1"
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.06 }}
          >
            <BracketedSectionLabel label={DESIGN_SECTION_LABEL} />
          </motion.div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
          {DESIGN_SECTION_STEPS.map((step, index) => (
            <motion.article
              key={step.num}
              className="relative flex flex-col rounded-2xl bg-[#faf8f5] p-6 shadow-[0_4px_24px_rgba(0,0,0,0.06)] md:p-7"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{
                ...defaultTransition,
                duration: 0.5,
                delay: index * 0.08,
              }}
            >
              <a
                href="#site-footer"
                className="absolute top-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-[#e8e4df] text-[var(--color-primary)] transition-colors hover:bg-[#ddd9d4] focus:ring-2 focus:ring-[var(--color-primary)]/20 focus:outline-none"
                aria-label="Contact"
              >
                <ArrowUpRightIcon size={18} />
              </a>
              <h3 className="mb-6 pr-12 font-sans text-[clamp(1.0625rem,1.25vw,1.25rem)] leading-snug font-normal tracking-[-0.02em] text-[var(--color-primary)] md:mb-8">
                <span className="font-normal tabular-nums">{step.num}.</span>{" "}
                {step.title}
              </h3>
              <p className="flex-1 text-sm leading-[1.7] text-[var(--foreground)]/75 md:text-base">
                {step.body}
              </p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

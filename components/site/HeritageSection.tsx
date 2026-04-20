"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Accordion } from "@/components/site/Accordion";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";
import {
  HERITAGE_ACCORDION_ITEMS,
  HERITAGE_CTA_LABEL,
  HERITAGE_HEADING,
  HERITAGE_HEADING_REST,
  HERITAGE_TAGLINE,
  HERITAGE_WE,
} from "@/content/site/heritage-content";
import { CONTACT_HREF } from "@/content/site/site";
import { defaultTransition } from "@/lib/site/animations";

export function HeritageSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.06 });

  return (
    <section
      ref={ref}
      id="Heritage"
      className="scroll-mt-0 px-6 py-12 font-sans md:px-12 md:py-14 lg:px-16 lg:py-16"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="mb-7 grid grid-cols-1 gap-5 md:mb-9 md:grid-cols-[minmax(0,1fr)_minmax(0,min(100%,640px))] md:grid-rows-[auto_auto] md:gap-x-7 md:gap-y-5 lg:gap-x-9">
          <motion.div
            className="md:col-start-1 md:row-start-1 md:self-start"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={defaultTransition}
          >
            <Link
              href={CONTACT_HREF}
              className="inline-flex w-fit items-center text-inherit transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/40"
              style={{ textDecoration: "none" }}
            >
              <BracketedSectionLabel label={HERITAGE_CTA_LABEL} />
            </Link>
          </motion.div>

          <motion.div
            className="md:col-start-1 md:row-start-2 md:self-start"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={defaultTransition}
          >
            <h2 className="font-sans leading-[1.18] font-[375] tracking-[-0.02em]">
              <span className="block text-[clamp(1.5rem,3.85vw,2.625rem)] text-[var(--color-primary)] md:text-[clamp(1.875rem,4.35vw,3.125rem)]">
                {HERITAGE_HEADING}
              </span>
              <span className="mt-0.5 block text-[clamp(1.6rem,4.05vw,2.875rem)] font-[375] md:text-[clamp(2rem,4.65vw,3.25rem)]">
                <span className="text-[var(--color-accent)]">
                  {HERITAGE_WE}
                </span>
                <span className="text-black">{HERITAGE_HEADING_REST}</span>
              </span>
            </h2>
          </motion.div>

          <motion.div
            className="flex max-w-[min(100%,560px)] flex-col md:col-start-2 md:row-span-2 md:row-start-1 md:max-w-none md:self-start md:text-left lg:max-w-[min(100%,640px)]"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.06 }}
          >
            <div className="text-[0.9375rem] leading-[1.56] text-[var(--foreground)]/75 md:text-base md:leading-[1.55]">
              {HERITAGE_TAGLINE.split(/\n\n+/).map((para, j) => (
                <p key={j} className={j > 0 ? "mt-3" : undefined}>
                  {para}
                </p>
              ))}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...defaultTransition, delay: 0.1 }}
        >
          <Accordion
            expandIcon="arrow"
            size="lg"
            defaultExpandedIndex={0}
            items={HERITAGE_ACCORDION_ITEMS.map((item, i) => ({
              number: String(i + 1).padStart(2, "0"),
              title: item.title,
              tag: item.tag,
              content: (
                <>
                  {item.body.split(/\n\n+/).map((para, j) => (
                    <p key={j} className={j > 0 ? "mt-3" : undefined}>
                      {para}
                    </p>
                  ))}
                </>
              ),
            }))}
          />
        </motion.div>
      </div>
    </section>
  );
}

"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { PageHeaderAccentRule } from "@/components/site/PageHeader";
import {
  PLAYGROUND_INTRO_HEADLINE_PARTS,
  PLAYGROUND_INTRO_TAGLINE,
} from "@/content/site/playground-page";
import { defaultTransition, slideFromLeft } from "@/lib/site/animations";
import { aboutBodyMutedClass } from "@/lib/site/about-typography";

export function PlaygroundPageContent() {
  return (
    <section className="w-full scroll-mt-0 px-6 py-12 pt-3 md:px-10 md:py-16 md:pt-5 lg:py-20 lg:pt-5">
      <motion.div
        className="flex max-w-3xl flex-col gap-3"
        initial={slideFromLeft.initial}
        whileInView={slideFromLeft.animate}
        viewport={{ once: true, amount: 0.2 }}
        transition={defaultTransition}
      >
        <PageHeaderAccentRule />
        <h1 className="font-sans text-[clamp(1.5rem,3.5vw,2.4rem)] leading-tight font-[375] tracking-tight text-[var(--color-primary)]">
          {PLAYGROUND_INTRO_HEADLINE_PARTS.map((part, i) =>
            "highlight" in part && part.highlight ? (
              <span key={i} className="text-[var(--color-accent)]">
                {part.text}
              </span>
            ) : (
              <Fragment key={i}>{part.text}</Fragment>
            ),
          )}
        </h1>
        <p className={`max-w-2xl ${aboutBodyMutedClass}`}>
          {PLAYGROUND_INTRO_TAGLINE}
        </p>
      </motion.div>
    </section>
  );
}

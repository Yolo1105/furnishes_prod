"use client";

import { motion, useInView, useScroll } from "framer-motion";
import { useRef } from "react";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";
import { AboutHeroText } from "@/components/site/AboutHeroText";
import {
  ABOUT_INLINE_IMAGES,
  SECTION_WHO_ARE_WE,
} from "@/content/site/about-hero";
import { defaultTransition } from "@/lib/site/animations";

export function AboutWhoWe() {
  const aboutRef = useRef<HTMLElement>(null);
  const aboutInView = useInView(aboutRef, { once: true, amount: 0.05 });
  const { scrollYProgress } = useScroll({
    target: aboutRef,
    offset: ["start end", "end start"],
  });

  return (
    <section
      ref={aboutRef}
      id="About"
      className="relative w-full px-6 pt-16 pb-14 md:px-12 md:pt-24 md:pb-20 lg:px-16 lg:pt-28"
    >
      <div className="mx-auto w-full max-w-[1200px]">
        <motion.div
          className="mb-2.5 md:mb-3"
          initial={{ opacity: 0, y: 12 }}
          animate={aboutInView ? { opacity: 1, y: 0 } : {}}
          transition={defaultTransition}
        >
          <BracketedSectionLabel label={SECTION_WHO_ARE_WE} />
        </motion.div>

        <AboutHeroText
          aboutInView={aboutInView}
          aboutImages={ABOUT_INLINE_IMAGES}
          scrollYProgress={scrollYProgress}
        />
      </div>
    </section>
  );
}

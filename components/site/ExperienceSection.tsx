"use client";

import { motion, useInView } from "framer-motion";
import Image from "next/image";
import { useRef } from "react";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";
import {
  EXPERIENCE_FEATURES,
  EXPERIENCE_INTRO,
  EXPERIENCE_PHILOSOPHY,
  EXPERIENCE_PHILOSOPHY_IMAGE,
  EXPERIENCE_QUOTE,
  EXPERIENCE_SECTION_LABEL,
} from "@/content/site/experience-content";
import { defaultTransition } from "@/lib/site/animations";

function FeatureIcon({ type }: { type: "truck" | "card" | "bell" }) {
  const stroke = "#2C3A2F";
  const common = {
    width: 36,
    height: 36,
    fill: "none" as const,
    stroke,
    strokeWidth: 1.5,
  };
  if (type === "truck") {
    return (
      <svg
        viewBox="0 0 24 24"
        {...common}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M1 3h15v13H1z" />
        <path d="M16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    );
  }
  if (type === "card") {
    return (
      <svg
        viewBox="0 0 24 24"
        {...common}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <path d="M1 10h22" />
        <path d="M5 16h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" {...common}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export function ExperienceSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.08 });

  return (
    <section
      ref={ref}
      id="Experience"
      className="scroll-mt-0 px-6 pt-4 pb-16 md:px-12 md:pt-6 md:pb-20 lg:px-16 lg:pt-8"
    >
      <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-8 md:gap-10">
        {/* Intro */}
        <div className="flex flex-wrap items-start gap-6 md:gap-8">
          <motion.div
            className="min-w-[220px] flex-1 basis-[320px]"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={defaultTransition}
          >
            <div className="mb-2">
              <BracketedSectionLabel label={EXPERIENCE_SECTION_LABEL} />
            </div>
            <h2 className="font-sans text-[clamp(1.65rem,4.35vw,3.05rem)] leading-[1.18] font-[375] tracking-[-0.02em] text-[var(--color-primary)]">
              <span className="block">
                {EXPERIENCE_INTRO.titleLine1.prefix}
                <span className="text-[var(--color-accent)]">
                  {EXPERIENCE_INTRO.titleLine1.accent}
                </span>
              </span>
              <span className="block">{EXPERIENCE_INTRO.titleLine2}</span>
            </h2>
          </motion.div>
          <motion.div
            className="min-w-[220px] flex-[2] basis-[400px] self-center text-right"
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.08 }}
          >
            <p className="ml-auto max-w-[600px] text-left text-[1.05rem] leading-relaxed text-[var(--foreground)]/75 md:text-right md:text-[1.1rem]">
              {EXPERIENCE_INTRO.body}
            </p>
          </motion.div>
        </div>

        {/* Philosophy + image */}
        <div className="flex min-h-0 flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:gap-6">
          <motion.div
            className="relative z-[2] mx-auto flex w-full max-w-[520px] flex-1 justify-center lg:mx-0 lg:justify-start"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.12 }}
          >
            <div className="relative aspect-[520/420] w-full max-w-[520px] shadow-[0_8px_32px_rgba(0,0,0,0.1)]">
              <Image
                src={EXPERIENCE_PHILOSOPHY_IMAGE.src}
                alt={EXPERIENCE_PHILOSOPHY_IMAGE.alt}
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 520px"
              />
            </div>
          </motion.div>
          <motion.div
            className="z-[3] flex min-w-0 flex-1 flex-col justify-center text-right lg:pl-4"
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ ...defaultTransition, delay: 0.18 }}
          >
            <h3 className="mb-3 ml-auto max-w-[520px] font-sans text-[clamp(1.5rem,3.5vw,3.05rem)] leading-[1.18] font-[375] tracking-[-0.02em] text-[var(--color-primary)]">
              {EXPERIENCE_PHILOSOPHY.titleLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h3>
            <p className="mb-2 ml-auto max-w-[520px] text-lg font-medium text-[var(--color-accent)]">
              {EXPERIENCE_PHILOSOPHY.label}
            </p>
            <p className="ml-auto max-w-[520px] text-left text-[1.05rem] leading-relaxed text-[var(--foreground)]/75 lg:text-right lg:text-[1.2rem]">
              {EXPERIENCE_PHILOSOPHY.body}
            </p>
          </motion.div>
        </div>

        {/* Quote */}
        <motion.div
          className="w-full text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...defaultTransition, delay: 0.22 }}
        >
          <p className="font-nav text-[clamp(1.2rem,3vw,1.8rem)] font-[375] tracking-wide text-[var(--color-primary)]">
            &ldquo;{EXPERIENCE_QUOTE}&rdquo;
          </p>
        </motion.div>

        {/* Features */}
        <motion.div
          className="grid grid-cols-1 gap-7 md:grid-cols-3 md:gap-6 lg:gap-8"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...defaultTransition, delay: 0.26 }}
        >
          {EXPERIENCE_FEATURES.map((f) => (
            <div key={f.title} className="flex min-w-0 items-start gap-4">
              <span className="relative mt-0.5 inline-flex shrink-0 items-center justify-center">
                <span
                  className="absolute -right-1.5 -bottom-1.5 z-0 h-[60px] w-[60px] rounded-full bg-[var(--color-accent)]"
                  aria-hidden
                />
                <span className="relative z-[2] flex rounded-full bg-white p-3 shadow-sm">
                  <FeatureIcon type={f.icon} />
                </span>
              </span>
              <div className="min-w-0 text-left">
                <div className="text-lg font-medium text-[var(--color-primary)]">
                  {f.title}
                </div>
                <p className="mt-1.5 text-[0.95rem] leading-relaxed text-[var(--foreground)]/70 md:text-base">
                  {f.description}
                </p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Stats — temporarily hidden
        <motion.div
          className="flex flex-wrap justify-center gap-5 md:gap-6"
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ ...defaultTransition, delay: 0.3 }}
        >
          {EXPERIENCE_STATS.map((s) => (
            <div
              key={s.value}
              className="flex min-w-[280px] max-w-[380px] flex-1 flex-col items-center px-4 py-6 text-center md:px-8 md:py-8"
            >
              <span className="font-nav text-[2.75rem] font-light leading-none tracking-tight text-[var(--color-primary)]">
                {s.value}
                <span className="text-[1.75rem] font-light">{s.suffix}</span>
              </span>
              <p className="mt-3 whitespace-pre-line text-base font-normal leading-relaxed text-[var(--foreground)]/80">
                {s.description}
              </p>
            </div>
          ))}
        </motion.div>
        */}
      </div>
    </section>
  );
}

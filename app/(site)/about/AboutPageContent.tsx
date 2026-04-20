"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { PageHeaderAccentRule } from "@/components/site/PageHeader";
import { AboutSectionHeader } from "@/components/site/AboutSectionHeader";
import {
  ABOUT_AWARDS,
  ABOUT_AWARDS_HEADLINE,
  ABOUT_AWARDS_LABEL,
  ABOUT_BLOG_HEADLINE,
  ABOUT_BLOG_ITEMS,
  ABOUT_BLOG_LABEL,
  ABOUT_INTRO_HEADLINE_PARTS,
  ABOUT_INTRO_HEADLINE_TAGLINE,
  ABOUT_INTRO_SUBCOLUMN1,
  ABOUT_INTRO_SUBCOLUMN2,
  ABOUT_INTRO_SUBHEADLINE,
  ABOUT_TEAM_MEMBERS,
  ABOUT_TEAMS_HEADLINE,
  ABOUT_TEAMS_LABEL,
} from "@/content/site/about-page";
import {
  ABOUT_AWARDS_BANNER_IMAGE,
  ABOUT_PAGE_INTRO_IMAGES,
  ABOUT_TEAM_IMAGE,
} from "@/content/site/about-images";
import { defaultTransition, slideFromLeft } from "@/lib/site/animations";
import {
  AWARDS_TRANSITIONS,
  AWARDS_VIEWPORT,
  awardsBannerVariants,
  awardsHeaderContainerVariants,
  awardsRowVariants,
  awardsTimelineContainerVariants,
} from "./awards-section.config";
import {
  aboutBodyMutedClass,
  aboutEmphasisBodyClass,
  aboutIntroSubheadClass,
  aboutMetaCapsClass,
  aboutMetaCapsMutedClass,
  aboutTimelineYearClass,
} from "@/lib/site/about-typography";
import { useAwardsSection } from "./useAwardsSection";

const TEAM_ROTATE_INTERVAL_MS = 4000;

function AboutSection({
  children,
  id,
  className,
  sectionRef,
  /** Renders above the max-width column at full viewport width (e.g. awards banner). */
  fullWidthLead,
}: {
  children: React.ReactNode;
  id?: string;
  className?: string;
  /** Optional ref for scroll / in-view hooks (e.g. awards block). */
  sectionRef?: React.RefObject<HTMLElement | null>;
  fullWidthLead?: React.ReactNode;
}) {
  /** Horizontal inset matches Header / UtilityBar (`--site-inline-gutter` in globals.css). */
  const contentGutter = "px-[var(--site-inline-gutter)]";
  const sectionPad = fullWidthLead
    ? "overflow-x-hidden py-12 md:py-16 lg:py-20"
    : `${contentGutter} py-12 md:py-16 lg:py-20`;

  return (
    <section
      ref={sectionRef}
      id={id}
      className={`scroll-mt-0 ${sectionPad} ${className ?? ""}`}
    >
      {fullWidthLead}
      {fullWidthLead ? (
        <div className={contentGutter}>
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </div>
      ) : (
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      )}
    </section>
  );
}

export function AboutPageContent() {
  const { ref: awardsSectionRef } = useAwardsSection();
  const [expandedYears, setExpandedYears] = useState<Set<string>>(() => {
    const row2024 = ABOUT_AWARDS.find(
      (e) => e.year === "2024" && (e.images?.length ?? 0) > 0,
    );
    return row2024 ? new Set([row2024.year]) : new Set();
  });
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const pauseTeamRotationRef = useRef(false);

  useEffect(() => {
    const n = ABOUT_TEAM_MEMBERS.length;
    if (n <= 1) return;
    const id = window.setInterval(() => {
      if (pauseTeamRotationRef.current) return;
      setActiveTeamIndex((i) => (i + 1) % n);
    }, TEAM_ROTATE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);

  const toggleAwardRow = useCallback((year: string) => {
    setExpandedYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  }, []);

  const borderRow = "border-b border-[var(--foreground)]/12";

  return (
    <>
      <AboutSection className="pt-3 md:pt-5 lg:pt-5">
        <div className="flex flex-col">
          <motion.div
            className="flex max-w-3xl flex-col gap-3"
            initial={slideFromLeft.initial}
            whileInView={slideFromLeft.animate}
            viewport={{ once: true, amount: 0.2 }}
            transition={defaultTransition}
          >
            <PageHeaderAccentRule />
            <h2 className="font-sans text-[clamp(1.5rem,3.5vw,2.4rem)] leading-tight font-[375] tracking-tight text-[var(--color-primary)]">
              {ABOUT_INTRO_HEADLINE_PARTS.map((part, i) =>
                "highlight" in part && part.highlight ? (
                  <span key={i} className="text-[var(--color-accent)]">
                    {part.text}
                  </span>
                ) : (
                  <Fragment key={i}>{part.text}</Fragment>
                ),
              )}
            </h2>
            <p className={`max-w-2xl ${aboutBodyMutedClass}`}>
              {ABOUT_INTRO_HEADLINE_TAGLINE}
            </p>
          </motion.div>

          <div className="mt-4 grid grid-cols-1 gap-5 md:mt-5 md:grid-cols-2 md:gap-6 lg:mt-5">
            <motion.div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-sm"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={defaultTransition}
            >
              <Image
                src={ABOUT_PAGE_INTRO_IMAGES[0].src}
                alt={ABOUT_PAGE_INTRO_IMAGES[0].alt}
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
            <motion.div
              className="relative aspect-[4/3] w-full overflow-hidden rounded-sm"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ ...defaultTransition, delay: 0.08 }}
            >
              <Image
                src={ABOUT_PAGE_INTRO_IMAGES[1].src}
                alt={ABOUT_PAGE_INTRO_IMAGES[1].alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </motion.div>
          </div>

          <p
            className={`mt-4 max-w-full md:mt-5 lg:mt-5 ${aboutBodyMutedClass}`}
          >
            {ABOUT_INTRO_SUBCOLUMN1}
          </p>

          <div className="mt-8 grid grid-cols-1 items-start gap-8 lg:mt-12 lg:grid-cols-12 lg:gap-10">
            <motion.h3
              className={`${aboutIntroSubheadClass} lg:col-span-5`}
              initial={slideFromLeft.initial}
              whileInView={slideFromLeft.animate}
              viewport={{ once: true, amount: 0.2 }}
              transition={defaultTransition}
            >
              {ABOUT_INTRO_SUBHEADLINE}
            </motion.h3>
            <p className={`${aboutBodyMutedClass} lg:col-span-7`}>
              {ABOUT_INTRO_SUBCOLUMN2}
            </p>
          </div>
        </div>
      </AboutSection>

      <AboutSection
        sectionRef={awardsSectionRef}
        id="awards-section"
        className="overflow-hidden"
        fullWidthLead={
          <motion.div
            className="relative mb-8 aspect-[21/9] min-h-[200px] w-full lg:mb-10"
            initial={awardsBannerVariants.initial}
            whileInView={awardsBannerVariants.visible}
            viewport={AWARDS_VIEWPORT.banner}
            transition={AWARDS_TRANSITIONS.banner}
          >
            <Image
              src={ABOUT_AWARDS_BANNER_IMAGE}
              alt=""
              fill
              className="object-cover"
              sizes="100vw"
              priority={false}
            />
            <div className="absolute inset-0 bg-black/10" aria-hidden />
          </motion.div>
        }
      >
        <div className="awards-content">
          <motion.div
            className="mb-8 lg:mb-10"
            initial="hidden"
            whileInView="visible"
            viewport={AWARDS_VIEWPORT.header}
            variants={awardsHeaderContainerVariants}
          >
            <AboutSectionHeader
              label={ABOUT_AWARDS_LABEL}
              heading={ABOUT_AWARDS_HEADLINE}
            />
          </motion.div>

          <motion.div
            className="space-y-6 lg:space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={AWARDS_VIEWPORT.timeline}
            variants={awardsTimelineContainerVariants}
          >
            {ABOUT_AWARDS.map((entry) => {
              const isExpanded = expandedYears.has(entry.year);
              const hasImages = entry.images && entry.images.length > 0;
              return (
                <motion.div
                  key={entry.year}
                  className={`grid grid-cols-1 items-start gap-5 pb-6 last:border-b-0 last:pb-0 lg:grid-cols-12 lg:gap-8 lg:pb-8 ${borderRow}`}
                  variants={awardsRowVariants}
                  transition={AWARDS_TRANSITIONS.row}
                >
                  <div className="lg:col-span-2">
                    <span className={aboutTimelineYearClass}>{entry.year}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => hasImages && toggleAwardRow(entry.year)}
                    className={`w-full space-y-4 text-left lg:col-span-10 ${hasImages ? "group cursor-pointer" : "cursor-default"}`}
                    aria-expanded={hasImages ? isExpanded : undefined}
                    aria-controls={
                      hasImages ? `award-details-${entry.year}` : undefined
                    }
                    id={hasImages ? `award-row-${entry.year}` : undefined}
                  >
                    <p className={aboutMetaCapsClass}>{entry.award}</p>
                    {hasImages && entry.images && (
                      <motion.div
                        id={`award-details-${entry.year}`}
                        className="overflow-hidden"
                        initial={false}
                        animate={{
                          maxHeight: isExpanded ? 420 : 0,
                          opacity: isExpanded ? 1 : 0,
                        }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                      >
                        <div className="grid grid-cols-3 gap-3 pt-1 md:gap-4">
                          {entry.images.slice(0, 3).map((img, i) => (
                            <div
                              key={i}
                              className="relative aspect-[4/3] overflow-hidden rounded-sm"
                            >
                              <Image
                                src={img.src}
                                alt={img.alt}
                                fill
                                className="object-cover"
                                sizes="(max-width: 768px) 33vw, 200px"
                              />
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                    <p className={aboutEmphasisBodyClass}>
                      {entry.project}, {entry.result}
                    </p>
                  </button>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </AboutSection>

      <AboutSection>
        <div className="flex flex-col gap-8 lg:gap-10">
          <AboutSectionHeader
            label={ABOUT_TEAMS_LABEL}
            heading={ABOUT_TEAMS_HEADLINE}
          />
          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-12">
            <motion.div
              className="relative aspect-[3/4] max-h-[420px] w-full shrink-0 overflow-hidden rounded-sm lg:col-span-5"
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ ...defaultTransition, duration: 0.5 }}
            >
              {ABOUT_TEAM_MEMBERS.map((member, i) => {
                const img = member.image ?? ABOUT_TEAM_IMAGE;
                const isVisible = activeTeamIndex === i;
                return (
                  <div
                    key={member.name}
                    className="absolute inset-0 transition-opacity duration-500 ease-out"
                    style={{ opacity: isVisible ? 1 : 0 }}
                    aria-hidden={!isVisible}
                  >
                    <Image
                      src={img.src}
                      alt={img.alt}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 40vw"
                    />
                  </div>
                );
              })}
            </motion.div>
            <ul
              className="flex flex-col gap-0 lg:col-span-7"
              onMouseLeave={() => {
                pauseTeamRotationRef.current = false;
              }}
            >
              {ABOUT_TEAM_MEMBERS.map((member, index) => {
                const isActive = activeTeamIndex === index;
                const isLast = index === ABOUT_TEAM_MEMBERS.length - 1;
                return (
                  <motion.li
                    key={member.name}
                    className="py-3 first:pt-0 md:py-4"
                    initial={{ opacity: 0, y: 12 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ ...defaultTransition, delay: index * 0.05 }}
                  >
                    <div
                      className={`w-full max-w-2xl ${!isLast ? `${borderRow} pb-3 md:pb-4` : ""}`}
                    >
                      <div
                        className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-3 md:gap-x-4 ${
                          isActive ? "gap-y-2" : ""
                        }`}
                      >
                        <span
                          className={`inline-flex w-3 shrink-0 justify-center self-baseline md:w-3.5 ${
                            isActive
                              ? "mt-1.5 md:mt-2"
                              : "mt-[0.35em] md:mt-[0.4em]"
                          }`}
                          aria-hidden
                        >
                          <span
                            className="size-2 rounded-full transition-all duration-300 md:size-2.5"
                            style={{
                              backgroundColor: "var(--color-accent)",
                              opacity: isActive ? 1 : 0,
                              transform: isActive ? "scale(1)" : "scale(0.6)",
                            }}
                          />
                        </span>
                        <button
                          type="button"
                          aria-current={isActive ? "true" : undefined}
                          className={`min-w-0 cursor-pointer text-left font-sans tracking-wide text-[var(--color-primary)] uppercase transition-all duration-300 hover:opacity-90 ${
                            isActive
                              ? "text-lg font-semibold md:text-2xl"
                              : "text-base font-[375] opacity-80 md:text-lg md:opacity-90"
                          }`}
                          onMouseEnter={() => {
                            pauseTeamRotationRef.current = true;
                            setActiveTeamIndex(index);
                          }}
                        >
                          {member.name}
                        </button>
                        <span
                          className={`${aboutTimelineYearClass} shrink-0 pl-2 text-right md:pl-3`}
                        >
                          {member.role}
                        </span>
                        {isActive && member.roleDescription ? (
                          <p className="col-start-2 col-end-4 font-sans text-sm leading-relaxed text-[var(--color-secondary-muted)] md:text-base">
                            {member.roleDescription}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </div>
      </AboutSection>

      <AboutSection className="pb-20 md:pb-28">
        <div>
          <div className="mb-6 lg:mb-8">
            <AboutSectionHeader
              label={ABOUT_BLOG_LABEL}
              heading={ABOUT_BLOG_HEADLINE}
            />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            {ABOUT_BLOG_ITEMS.map((post) => (
              <motion.article
                key={post.title}
                className="group cursor-pointer"
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={defaultTransition}
                whileHover={{ y: -4 }}
              >
                <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-sm md:mb-4">
                  <Image
                    src={post.imageSrc}
                    alt={post.imageAlt}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
                <p className={`mb-1 ${aboutMetaCapsMutedClass}`}>
                  {post.readTime}
                </p>
                <h3
                  className={`${aboutEmphasisBodyClass} leading-snug font-semibold uppercase transition-colors group-hover:text-[var(--color-primary)]/80`}
                >
                  {post.title}
                </h3>
              </motion.article>
            ))}
          </div>
        </div>
      </AboutSection>
    </>
  );
}

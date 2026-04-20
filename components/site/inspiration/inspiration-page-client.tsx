"use client";

import { Fragment, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRightIcon } from "@/components/site/ArrowRightIcon";
import { PageHeader, PageHeaderAccentRule } from "@/components/site/PageHeader";
import { PageHeaderIntroSlot } from "@/components/site/PageHeaderIntroSlot";
import {
  INSPIRATION_TOOLS,
  INSPIRATION_INTRO_HEADLINE_PARTS,
  INSPIRATION_INTRO_SUBLINE,
  INSPIRATION_FILTER_ALL,
  INSPIRATION_FILTER_CATEGORIES,
  INSPIRATION_EMPTY_MESSAGE,
} from "@/content/site/inspiration-content";
import type {
  InspirationTool,
  InspirationToolCategory,
} from "@/content/site/inspiration-content";
import { aboutBodyMutedClass } from "@/lib/site/about-typography";

function getGridClasses(index: number, total: number): string {
  if (total === 1) return "col-span-4 row-span-2";
  if (total === 2) return "col-span-4 md:col-span-2 row-span-2";
  if (total === 3)
    return index === 0
      ? "col-span-4 md:col-span-2 row-span-2"
      : "col-span-4 md:col-span-2 row-span-1";
  if (total === 4) return "col-span-4 md:col-span-2 row-span-1";

  const layouts = [
    "col-span-4 md:col-span-2 row-span-2",
    "col-span-4 md:col-span-2 row-span-1",
    "col-span-2 md:col-span-1 row-span-2",
    "col-span-2 md:col-span-1 row-span-2",
    "col-span-4 md:col-span-2 row-span-1",
  ];
  return layouts[index % layouts.length];
}

function InspirationCard({
  tool,
  index,
  total,
}: {
  tool: InspirationTool;
  index: number;
  total: number;
}) {
  const isHero = total === 5 && index === 0;
  const isSmall = total === 5 && (index === 2 || index === 3);
  const titleClass = isHero
    ? "text-5xl md:text-7xl lg:text-8xl"
    : isSmall
      ? "text-3xl md:text-4xl"
      : "text-4xl md:text-5xl lg:text-6xl";

  const linkContent = (
    <motion.div
      className="absolute inset-0 block h-full w-full overflow-hidden"
      initial="rest"
      whileHover="hover"
      animate="rest"
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        variants={{
          rest: { scale: 1, opacity: 0.85 },
          hover: { scale: 1.05, opacity: 1 },
        }}
        transition={{ duration: 0.8, ease: [0.25, 1, 0.5, 1] }}
      >
        <Image
          src={tool.image}
          alt={tool.title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
          priority={index === 0}
        />
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-linear-to-b from-black/10 via-black/25 to-black/85"
        variants={{
          rest: { opacity: 0.9 },
          hover: { opacity: 1 },
        }}
        transition={{ duration: 0.4 }}
      />
      <div className="relative z-10 flex h-full flex-col justify-between p-6 md:p-8">
        <div className="flex items-start justify-between">
          <motion.span
            className="text-surface border-surface/30 border px-3 py-1.5 font-sans text-[10px] tracking-[0.2em] uppercase backdrop-blur-md md:text-xs"
            variants={{
              rest: {
                backgroundColor: "rgba(252, 242, 232, 0)",
                color: "var(--color-surface)",
              },
              hover: {
                backgroundColor: "var(--color-surface)",
                color: "var(--color-primary)",
              },
            }}
            transition={{ duration: 0.3 }}
          >
            {tool.category}
          </motion.span>
          <motion.div
            className="relative h-5 w-5"
            variants={{
              rest: { rotate: 0, opacity: 0.5 },
              hover: { rotate: 90, opacity: 1 },
            }}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          >
            <div className="bg-surface absolute top-1/2 left-0 h-[1px] w-full" />
            <div className="bg-surface absolute top-0 left-1/2 h-full w-[1px]" />
          </motion.div>
        </div>
        <div className="flex flex-col justify-end overflow-hidden">
          <motion.div
            variants={{
              rest: { y: 10 },
              hover: { y: 0 },
            }}
            transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
          >
            <p className="text-surface/60 mb-2 font-sans text-[11px] tracking-[0.2em] uppercase md:text-xs">
              {tool.tagline}
            </p>
            <h3
              className={`text-surface font-sans leading-[1.05] font-normal tracking-tight ${titleClass}`}
            >
              {tool.title}
            </h3>
            <motion.div
              variants={{
                rest: { height: 0, opacity: 0, marginTop: 0 },
                hover: { height: "auto", opacity: 1, marginTop: "1rem" },
              }}
              transition={{ duration: 0.4, ease: [0.25, 1, 0.5, 1] }}
              className="overflow-hidden"
            >
              <div className="bg-surface/20 mb-3 h-[1px] w-12" />
              <div className="flex items-end gap-4">
                <p className="text-surface/80 max-w-md font-sans text-sm leading-relaxed font-light md:text-base">
                  {tool.description}
                </p>
                <motion.div
                  className="bg-surface text-primary hidden h-10 w-10 shrink-0 items-center justify-center rounded-full md:flex"
                  variants={{
                    rest: { x: -16, opacity: 0, scale: 0.8 },
                    hover: { x: 0, opacity: 1, scale: 1 },
                  }}
                  transition={{
                    duration: 0.5,
                    delay: 0.1,
                    ease: [0.25, 1, 0.5, 1],
                  }}
                >
                  <ArrowRightIcon variant="stroke" size={18} />
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="group bg-primary relative block h-full min-h-[250px] w-full cursor-pointer overflow-hidden md:min-h-[300px]">
      <Link
        href={tool.route}
        className="absolute inset-0 z-10 block h-full w-full cursor-pointer"
        aria-label={`Go to ${tool.title}`}
      >
        {linkContent}
      </Link>
    </div>
  );
}

/** Interactive inspiration grid + filters (Framer Motion). Rendered from server `page.tsx`. */
export function InspirationPageClient() {
  const [filter, setFilter] = useState<InspirationToolCategory | "All">(
    INSPIRATION_FILTER_ALL as "All",
  );
  const filteredTools = INSPIRATION_TOOLS.filter(
    (tool) => filter === "All" || tool.category === filter,
  );

  return (
    <div className="site-chrome-pad text-primary min-h-screen w-full pt-[var(--site-content-pt-inspiration)] font-sans md:pt-[var(--site-content-pt-md-inspiration)]">
      <div className="w-full px-6 pt-0 pb-3 md:px-10 md:pt-1 md:pb-5">
        <PageHeader
          columnAlign="end"
          tag={
            <PageHeaderIntroSlot step={0}>
              <PageHeaderAccentRule />
            </PageHeaderIntroSlot>
          }
          headline={
            <PageHeaderIntroSlot step={1} className="w-full min-w-0">
              <h1 className="font-sans text-[clamp(1.5rem,3.5vw,2.4rem)] leading-tight font-[375] tracking-tight text-[var(--color-primary)]">
                {INSPIRATION_INTRO_HEADLINE_PARTS.map((part, i) =>
                  "highlight" in part && part.highlight ? (
                    <span key={i} className="text-[var(--color-accent)]">
                      {part.text}
                    </span>
                  ) : (
                    <Fragment key={i}>{part.text}</Fragment>
                  ),
                )}
              </h1>
            </PageHeaderIntroSlot>
          }
          belowTitleSlot={
            <PageHeaderIntroSlot step={2}>
              <p className={`max-w-2xl ${aboutBodyMutedClass}`}>
                {INSPIRATION_INTRO_SUBLINE}
              </p>
            </PageHeaderIntroSlot>
          }
          rightColumnMaxWidthClassName="max-w-4xl xl:max-w-3xl"
          rightSlot={
            <PageHeaderIntroSlot step={3} slideFrom="end" className="w-full">
              <div
                className="flex w-full flex-wrap justify-end gap-x-6 gap-y-2 md:gap-x-8"
                role="tablist"
                aria-label="Filter tools by category"
              >
                {INSPIRATION_FILTER_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    role="tab"
                    aria-selected={filter === cat}
                    onClick={() => setFilter(cat)}
                    className={`group relative py-1.5 font-sans text-xs tracking-[0.15em] uppercase transition-colors duration-300 md:text-sm ${
                      filter === cat
                        ? "text-page-header-accent font-normal"
                        : "text-primary/50 hover:text-primary"
                    }`}
                  >
                    <span className="relative z-10">{cat}</span>
                    <span
                      className={`absolute bottom-0 left-0 h-[2px] w-full origin-left transition-transform duration-300 ${
                        filter === cat
                          ? "bg-page-header-accent scale-x-100"
                          : "bg-primary group-hover:bg-primary scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </PageHeaderIntroSlot>
          }
        />

        <motion.div
          layout
          className="mt-3 grid auto-rows-[minmax(250px,30vh)] grid-cols-4 gap-3 md:mt-4 md:auto-rows-[minmax(300px,35vh)] md:gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filteredTools.map((tool, index) => {
              const gridClass = getGridClasses(index, filteredTools.length);
              return (
                <motion.div
                  key={tool.id}
                  layout
                  initial={{ opacity: 0, y: 20, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95, filter: "blur(4px)" }}
                  transition={{ duration: 0.6, ease: [0.25, 1, 0.5, 1] }}
                  className={gridClass}
                >
                  <InspirationCard
                    tool={tool}
                    index={index}
                    total={filteredTools.length}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>

        {filteredTools.length === 0 && (
          <div className="col-span-4 w-full py-32 text-center">
            <p className="text-primary/40 font-sans text-3xl">
              {INSPIRATION_EMPTY_MESSAGE}
            </p>
          </div>
        )}

        <div className="h-12 md:h-24" />
      </div>
    </div>
  );
}

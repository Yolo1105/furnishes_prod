"use client";

import { motion, useMotionValueEvent, type MotionValue } from "framer-motion";
import Image from "next/image";
import { useState } from "react";

/** Matches furnishes_v2 `app/types` AboutHeroPart + `AboutHeroText.tsx` ABOUT_HERO_PARTS. */
type AboutHeroPart =
  | { type: "text"; text: string; highlight?: boolean }
  | { type: "image"; index: number };

const ABOUT_HERO_PARTS: AboutHeroPart[] = [
  { type: "text", text: "We understand that " },
  { type: "text", text: "good design ", highlight: true },
  { type: "image", index: 0 },
  { type: "text", text: "goes beyond aesthetics. " },
  { type: "image", index: 1 },
  { type: "text", text: "Our philosophy " },
  { type: "image", index: 2 },
  { type: "text", text: "centers around creating functional, " },
  { type: "image", index: 3 },
  { type: "text", text: "comfortable ", highlight: true },
  { type: "text", text: "spaces. " },
  { type: "text", text: "We listen first to what matters " },
  { type: "image", index: 4 },
  { type: "text", text: ", then we shape " },
  { type: "image", index: 5 },
  { type: "text", text: " light and layout to how you " },
  { type: "image", index: 6 },
  { type: "text", text: " live, work, and rest." },
];

const ABOUT_TOTAL_CHARS = ABOUT_HERO_PARTS.reduce((s, p) => {
  if (p.type === "text") return s + p.text.length;
  return s;
}, 0);

/** Lower = slower grey→black reveal (needs more scroll through the section). */
const ABOUT_TEXT_REVEAL_SPEED = 1.2;

const INLINE_IMAGE_BOX = {
  w: "clamp(86px, 11.6vw, 174px)",
  h: "clamp(48px, 6.15vw, 88px)",
} as const;

type AboutHeroTextProps = {
  aboutInView: boolean;
  aboutImages: readonly { src: string; alt: string }[];
  scrollYProgress: MotionValue<number>;
};

/** Global character index at the start of each text part (for staggered reveal). */
const TEXT_CHAR_START = (() => {
  let acc = 0;
  return ABOUT_HERO_PARTS.map((part) => {
    if (part.type !== "text") return -1;
    const start = acc;
    acc += part.text.length;
    return start;
  });
})();

export function AboutHeroText({
  aboutInView,
  aboutImages,
  scrollYProgress,
}: AboutHeroTextProps) {
  const [progress, setProgress] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => setProgress(v));

  const totalChars = ABOUT_TOTAL_CHARS;
  const grey = "var(--color-secondary-muted)";
  const black = "var(--color-primary)";
  const accent = "var(--color-accent)";
  const revealProgress = Math.min(1, progress * ABOUT_TEXT_REVEAL_SPEED);

  return (
    <motion.div
      className="mb-0 font-sans text-[clamp(1.2rem,3.2vw,2.15rem)] leading-[1.18] font-[375] tracking-[-0.02em] md:text-[clamp(1.45rem,3.9vw,3.1rem)]"
      initial={{ opacity: 0, y: 20 }}
      animate={aboutInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.15, ease: "easeOut" }}
    >
      {ABOUT_HERO_PARTS.map((part, partIdx) => {
        if (part.type === "text") {
          const chars = part.text.split("");
          const startIdx = TEXT_CHAR_START[partIdx] ?? 0;
          const highlight = !!part.highlight;
          return (
            <span key={partIdx}>
              {chars.map((char, i) => {
                const idx = startIdx + i;
                const revealed = revealProgress >= (idx + 1) / totalChars;
                const color = revealed ? (highlight ? accent : black) : grey;
                return (
                  <span
                    key={`${partIdx}-${i}`}
                    className="inline"
                    style={{ color }}
                  >
                    {char}
                  </span>
                );
              })}
            </span>
          );
        }
        const showImg = aboutInView;
        return (
          <motion.span
            key={`img-${partIdx}`}
            className="relative mx-0.5 hidden inline-block overflow-hidden rounded align-middle md:inline-block"
            style={{ width: INLINE_IMAGE_BOX.w, height: INLINE_IMAGE_BOX.h }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={
              showImg ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.92 }
            }
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <span className="relative block h-full w-full">
              <Image
                src={aboutImages[part.index].src}
                alt={aboutImages[part.index].alt}
                fill
                priority={part.index === 0}
                className="object-cover"
                sizes="174px"
              />
            </span>
          </motion.span>
        );
      })}
    </motion.div>
  );
}

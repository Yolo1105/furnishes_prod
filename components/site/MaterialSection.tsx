"use client";

import Image from "next/image";
import { useState } from "react";
import { ArrowRightIcon } from "@/components/site/ArrowRightIcon";
import { BracketedSectionLabel } from "@/components/site/BracketedSectionLabel";
import {
  SERVICES,
  SERVICES_SECTION_HEADING_ACCENT,
  SERVICES_SECTION_HEADING_PRIMARY,
  SERVICES_SECTION_INTRO,
  SERVICES_SECTION_LABEL,
  SERVICE_PREVIEW_IMAGES,
} from "@/content/site/services-content";

export function MaterialSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = SERVICES[activeIndex];
  const image =
    SERVICE_PREVIEW_IMAGES[activeIndex] ?? SERVICE_PREVIEW_IMAGES[0];

  const handleSelect = (index: number) => {
    if (index === activeIndex) return;
    setActiveIndex(index);
  };

  return (
    <section
      id="Material"
      className="scroll-mt-0 px-6 py-8 font-sans md:px-12 md:py-10 lg:px-16 lg:py-12"
    >
      <div className="mx-auto w-full max-w-[1180px]">
        <div className="grid min-h-0 grid-cols-1 items-start gap-9 lg:grid-cols-2 lg:gap-12 xl:gap-16">
          {/* Left: label + service list */}
          <div>
            <div className="mb-2 md:mb-3">
              <BracketedSectionLabel label={SERVICES_SECTION_LABEL} />
            </div>

            <h2 className="mb-2 font-sans text-[clamp(1.5rem,3.85vw,2.625rem)] leading-[1.18] font-[375] tracking-[-0.02em] md:mb-3 md:text-[clamp(1.875rem,4.35vw,3.125rem)]">
              <span className="text-[var(--color-primary)]">
                {SERVICES_SECTION_HEADING_PRIMARY}
              </span>
              <span className="text-[var(--color-accent)]">
                {SERVICES_SECTION_HEADING_ACCENT}
              </span>
            </h2>

            <p className="mb-2 max-w-[52ch] text-[0.9375rem] leading-[1.6] font-normal text-[var(--foreground)]/75 md:mb-3 md:text-base md:leading-[1.58]">
              {SERVICES_SECTION_INTRO}
            </p>

            <div>
              {SERVICES.map((s, i) => {
                const isActive = i === activeIndex;
                return (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => handleSelect(i)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 border-transparent py-3.5 text-left font-[350] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]/30 md:gap-4 md:py-4"
                  >
                    <div className="flex items-center gap-3 md:gap-4">
                      <div
                        className="w-[3px] shrink-0 rounded-sm bg-[var(--color-accent)] transition-all duration-300 ease-out"
                        style={{ height: isActive ? "32px" : "0" }}
                        aria-hidden
                      />
                      <span
                        className="leading-[1.18] font-[350] tracking-[-0.02em] transition-colors duration-[0.22s] ease-out"
                        style={{
                          fontSize: "clamp(22px, 2.6vw, 32px)",
                          color: isActive
                            ? "var(--color-primary)"
                            : "color-mix(in srgb, var(--color-primary) 38%, transparent)",
                        }}
                      >
                        {s.title}
                      </span>
                    </div>

                    <ArrowRightIcon
                      className="shrink-0 text-[var(--color-accent)] transition-all duration-[0.25s] ease-out"
                      style={{
                        opacity: isActive ? 1 : 0,
                        transform: isActive
                          ? "translateX(0)"
                          : "translateX(-6px)",
                      }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: image + description — wide measure so body copy wraps later */}
          <div className="mx-auto w-full max-w-[min(100%,640px)] lg:sticky lg:top-10 lg:mx-0 lg:max-w-none">
            <div className="relative mb-4 aspect-[4/3] w-full overflow-hidden rounded-lg bg-[var(--color-primary)]/5 md:mb-5">
              <Image
                key={activeIndex}
                src={image.src}
                alt={image.alt}
                fill
                priority={activeIndex === 0}
                className="object-cover transition-opacity duration-300"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>

            <p
              key={activeIndex}
              className="w-full max-w-none text-base leading-[1.7] font-normal text-[var(--foreground)]/80 md:text-[1.0625rem]"
            >
              {active.description}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

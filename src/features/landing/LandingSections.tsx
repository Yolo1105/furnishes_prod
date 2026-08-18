"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { BracketedText, stripBrackets } from "./BracketedText";
import { landingContent } from "./landing-content";
import styles from "./landing.module.css";
import { useSequentialAutoplay } from "./useSequentialAutoplay";

type LandingSectionsProps = {
  onContact: () => void;
};

const ABOUT_CHARS = landingContent.aboutManifesto.parts.flatMap((part) =>
  part.type === "text"
    ? Array.from(part.text).map((ch) => ({ ch, hl: part.highlight }))
    : [],
);

/** Global character index at the start of each manifesto part (−1 for images). */
const ABOUT_CHAR_START = (() => {
  let acc = 0;
  return landingContent.aboutManifesto.parts.map((part) => {
    if (part.type !== "text") return -1;
    const start = acc;
    acc += part.text.length;
    return start;
  });
})();

function ExpGlyph({ type }: { type: "layers" | "sun" | "frame" }) {
  const common = {
    width: 26,
    height: 26,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
  };
  if (type === "layers") {
    return (
      <svg {...common}>
        <path d="M12 3 4 7l8 4 8-4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 17l8 4 8-4" />
      </svg>
    );
  }
  if (type === "sun") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="16" rx="1.5" />
      <path d="M3 9h18M8 4v16" />
      <path d="M13 11.5l4 2.5-4 2.5z" />
    </svg>
  );
}

function WhoAreWe() {
  const secRef = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLParagraphElement>(null);
  const spanRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const lastRef = useRef(-1);

  useEffect(() => {
    const GREY = "#6b7280";
    const BLACK = "#6e1810";
    const ACCENT = "var(--landing-accent-hi)";
    const total = ABOUT_CHARS.length;
    let raf = 0;
    let visible = false;

    const updateColors = () => {
      raf = 0;
      const sec = secRef.current;
      if (!sec || !visible) return;
      const el = copyRef.current || sec;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.62;
      const end = vh * 0.16;
      let p = (start - r.top) / (start - end);
      p = Math.max(0, Math.min(1, p));
      p = Math.pow(p, 1.4);
      const count = Math.round(p * total);
      if (count === lastRef.current) return;
      const lo = Math.max(0, Math.min(lastRef.current, count));
      const hi = Math.max(lastRef.current, count);
      for (let i = lo; i < hi; i++) {
        const span = spanRefs.current[i];
        if (!span) continue;
        span.style.color =
          i < count ? (ABOUT_CHARS[i]!.hl ? ACCENT : BLACK) : GREY;
      }
      lastRef.current = count;
    };

    const schedule = () => {
      if (!visible || raf) return;
      raf = requestAnimationFrame(updateColors);
    };

    const vio = new IntersectionObserver(
      ([e]) => {
        visible = Boolean(e?.isIntersecting);
        if (visible) schedule();
      },
      { rootMargin: "120px 0px" },
    );
    if (secRef.current) vio.observe(secRef.current);

    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    schedule();

    return () => {
      if (raf) cancelAnimationFrame(raf);
      vio.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <section
      className={styles.block}
      id="about"
      ref={secRef}
      aria-labelledby="about-title"
    >
      <h2 id="about-title" className={styles.visuallyHidden}>
        About
      </h2>
      <p className={`${styles.sectionEyebrow} ${styles.reveal}`}>
        <BracketedText>Who we are</BracketedText>
      </p>
      <p className={`${styles.manifesto} ${styles.reveal}`} ref={copyRef}>
        {landingContent.aboutManifesto.parts.map((part, partIdx) => {
          if (part.type === "image") {
            const img = landingContent.aboutManifesto.images[part.index];
            if (!img) return null;
            return (
              <span key={`img-${partIdx}`} className={styles.manifestoThumb}>
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  sizes="174px"
                  className={styles.manifestoThumbImg}
                  priority={part.index === 0}
                />
              </span>
            );
          }

          const start = ABOUT_CHAR_START[partIdx] ?? 0;
          return (
            <span key={`txt-${partIdx}`}>
              {Array.from(part.text).map((ch, i) => {
                const idx = start + i;
                return (
                  <span
                    key={`${partIdx}-${i}`}
                    ref={(el) => {
                      spanRefs.current[idx] = el;
                    }}
                    style={{ color: "#6b7280" }}
                  >
                    {ch}
                  </span>
                );
              })}
            </span>
          );
        })}
      </p>
    </section>
  );
}

function ExperienceSection() {
  const { experience } = landingContent;
  return (
    <section
      className={`${styles.block} ${styles.blockExp}`}
      id="experience"
      aria-labelledby="experience-title"
    >
      <div className={styles.expStack}>
        <div className={styles.expIntro}>
          <div className={`${styles.expIntroHead} ${styles.reveal}`}>
            <p className={styles.sectionEyebrow}>
              <BracketedText>{experience.eyebrow}</BracketedText>
            </p>
            <h2 id="experience-title" className={styles.expTitle}>
              {experience.titleLead}{" "}
              <span className={styles.accent}>{experience.titleAccent}</span>
              <br />
              {experience.titleTrail}
            </h2>
          </div>
          <p className={`${styles.expLead} ${styles.reveal}`}>
            {experience.lead}
          </p>
        </div>

        <div className={styles.expPhil}>
          <div className={`${styles.expPhilMedia} ${styles.reveal}`}>
            <Image
              src={experience.philosophyImage.src}
              alt={experience.philosophyImage.alt}
              fill
              sizes="(max-width: 1024px) 100vw, 520px"
              className={styles.expPhilImg}
            />
          </div>
          <div className={`${styles.expPhilCopy} ${styles.reveal}`}>
            <h3 className={styles.expSubtitle}>
              {experience.philosophyTitle.split("\n").map((line) => (
                <span key={line}>
                  {line}
                  <br />
                </span>
              ))}
            </h3>
            <p className={styles.expPhilLabel}>
              <BracketedText>
                {stripBrackets(experience.philosophyLabel)}
              </BracketedText>
            </p>
            <p className={styles.expPhilBody}>{experience.philosophyBody}</p>
          </div>
        </div>

        <p className={`${styles.expQuote} ${styles.reveal}`}>
          &ldquo;{experience.quote}&rdquo;
        </p>

        <div className={styles.expFeatures}>
          {experience.features.map((feature) => (
            <div
              key={feature.title}
              className={`${styles.expFeat} ${styles.reveal}`}
            >
              <span className={styles.expFeatIc}>
                <span className={styles.expFeatDot} aria-hidden="true" />
                <span className={styles.expFeatGlyph}>
                  <ExpGlyph type={feature.icon} />
                </span>
              </span>
              <div>
                <p className={styles.expFeatH}>{feature.title}</p>
                <p className={styles.expFeatP}>{feature.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AboutTeams() {
  const sectionRef = useRef<HTMLElement>(null);
  const members = landingContent.teams.members;
  const {
    activeIndex: active,
    selectIndex,
    pauseBriefly,
  } = useSequentialAutoplay(members.length, 4000, sectionRef);

  return (
    <section
      ref={sectionRef}
      className={`${styles.block} ${styles.blockAb}`}
      id="about-teams"
      aria-labelledby="about-teams-title"
    >
      <header className={`${styles.abHead} ${styles.reveal}`}>
        <p className={styles.sectionEyebrow}>
          <BracketedText>{landingContent.teams.label}</BracketedText>
        </p>
        <h2 id="about-teams-title" className={styles.abHeadH}>
          {landingContent.teams.titleBefore}{" "}
          <span className={styles.accent}>
            {landingContent.teams.titleAccent}
          </span>
          {landingContent.teams.titleAfter}
        </h2>
      </header>

      <div className={styles.teamGrid}>
        <div className={`${styles.teamMedia} ${styles.reveal}`}>
          {members.map((member, index) => (
            <div
              key={member.name}
              className={`${styles.teamSlide} ${active === index ? styles.teamSlideOn : ""}`}
              aria-hidden={active !== index}
            >
              <Image
                src={member.image.src}
                alt={member.image.alt}
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className={styles.teamSlideImg}
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        <ul
          className={`${styles.teamList} ${styles.reveal}`}
          onMouseLeave={() => pauseBriefly(1200)}
        >
          {members.map((member, index) => {
            const on = active === index;
            return (
              <li
                key={member.name}
                className={`${styles.teamRow}${on ? ` ${styles.teamRowOn}` : ""}`}
              >
                <button
                  type="button"
                  className={styles.teamButton}
                  aria-current={on ? "true" : undefined}
                  onMouseEnter={() => selectIndex(index)}
                  onClick={() => selectIndex(index)}
                  onFocus={() => selectIndex(index)}
                >
                  <span className={styles.teamDot} aria-hidden="true" />
                  <span className={styles.teamName}>{member.name}</span>
                  <span className={styles.teamRole}>{member.role}</span>
                  {on ? (
                    <p className={styles.teamDescInline}>{member.desc}</p>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HeritageSection({ onContact }: { onContact: () => void }) {
  const [open, setOpen] = useState(0);
  const { heritage } = landingContent;

  return (
    <section
      className={`${styles.block} ${styles.heritage}`}
      id="heritage"
      aria-labelledby="heritage-title"
    >
      <div className={styles.heritageHead}>
        <button
          type="button"
          className={`${styles.heritageCta} ${styles.reveal}`}
          onClick={onContact}
        >
          <BracketedText>{stripBrackets(heritage.cta)}</BracketedText>
        </button>
        <h2
          id="heritage-title"
          className={`${styles.heritageTitle} ${styles.reveal}`}
        >
          {heritage.titleLine1}
          <br />
          <span className={styles.accent}>
            {heritage.titleLine2Before}
          </span>{" "}
          {heritage.titleLine2After}
        </h2>
        <div className={`${styles.heritageTag} ${styles.reveal}`}>
          {heritage.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
      <ul className={styles.heritageList}>
        {heritage.items.map((item, index) => {
          const isOpen = open === index;
          return (
            <li key={item.title} className={styles.reveal}>
              <button
                type="button"
                className={`${styles.heritageRowTop}${isOpen ? ` ${styles.heritageRowTopOpen}` : ""}`}
                aria-expanded={isOpen}
                onClick={() => setOpen(isOpen ? -1 : index)}
              >
                <span className={styles.heritageNo}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className={styles.heritageItemTitle}>{item.title}</span>
                <span className={styles.heritageCat}>{item.category}</span>
                <span className={styles.heritageChev} aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      d="M6 9l6 6 6-6"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </button>
              <div
                className={`${styles.heritageBody}${isOpen ? ` ${styles.heritageBodyOpen}` : ""}`}
              >
                <div className={styles.heritageBodyIn}>
                  <p>{item.body}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function StudioSection() {
  const { studio } = landingContent;
  const sectionRef = useRef<HTMLElement>(null);
  const { activeIndex, selectIndex } = useSequentialAutoplay(
    studio.services.length,
    3500,
    sectionRef,
  );
  const active = studio.services[activeIndex] ?? studio.services[0];

  return (
    <section
      ref={sectionRef}
      className={`${styles.block} ${styles.blockStudio}`}
      id="studio"
      aria-labelledby="studio-title"
    >
      <div className={styles.studioGrid}>
        <div className={styles.studioListCol}>
          <p className={`${styles.sectionEyebrow} ${styles.reveal}`}>
            <BracketedText>{studio.eyebrow}</BracketedText>
          </p>
          <h2
            id="studio-title"
            className={`${styles.studioTitle} ${styles.reveal}`}
          >
            <span>{studio.titlePrimary}</span>
            <span className={styles.accent}>{studio.titleAccent}</span>
          </h2>
          <p className={`${styles.studioIntro} ${styles.reveal}`}>
            {studio.intro}
          </p>
          <div className={`${styles.studioList} ${styles.reveal}`} role="list">
            {studio.services.map((service, index) => {
              const isActive = index === activeIndex;
              return (
                <button
                  key={service.title}
                  type="button"
                  role="listitem"
                  className={`${styles.studioItem} ${isActive ? styles.studioItemActive : ""}`}
                  aria-current={isActive ? "true" : undefined}
                  onClick={() => selectIndex(index)}
                >
                  <span className={styles.studioItemBar} aria-hidden="true" />
                  <span className={styles.studioItemLabel}>
                    {service.title}
                  </span>
                  <span className={styles.studioItemArrow} aria-hidden="true">
                    <svg
                      viewBox="0 0 24 24"
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M7 17L17 7" />
                      <path d="M17 7v6M17 7h-6" />
                    </svg>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={`${styles.studioPreview} ${styles.reveal}`}>
          <div className={styles.studioPreviewMedia}>
            {studio.services.map((service, index) => {
              const isActive = index === activeIndex;
              return (
                <div
                  key={service.title}
                  className={`${styles.studioPreviewSlide} ${isActive ? styles.studioPreviewSlideActive : ""}`}
                  aria-hidden={!isActive}
                >
                  <Image
                    src={service.image.src}
                    alt={service.image.alt}
                    fill
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className={styles.studioPreviewImg}
                    priority={index <= 1}
                  />
                </div>
              );
            })}
          </div>
          <p key={active.title} className={styles.studioPreviewBody}>
            {active.description}
          </p>
        </div>
      </div>
    </section>
  );
}

function AboutProjects() {
  const { projects } = landingContent;
  const [expandedYears, setExpandedYears] = useState<Set<string>>(
    () => new Set([projects.defaultExpandedYear]),
  );

  const toggleYear = (year: string, hasImages: boolean) => {
    if (!hasImages) return;
    setExpandedYears((prev) => {
      if (prev.has(year)) return new Set();
      return new Set([year]);
    });
  };

  return (
    <section
      className={`${styles.block} ${styles.blockAb}`}
      id="about-projects"
      aria-labelledby="about-projects-title"
    >
      <header className={`${styles.abHead} ${styles.reveal}`}>
        <p className={styles.sectionEyebrow}>
          <BracketedText>{projects.label}</BracketedText>
        </p>
        <h2 id="about-projects-title" className={styles.abHeadH}>
          {projects.titleBefore}{" "}
          <span className={styles.accent}>{projects.titleAccent}</span>{" "}
          {projects.titleAfter}
        </h2>
      </header>
      <ul className={styles.projectList}>
        {projects.items.map((item) => {
          const images = item.images;
          const hasImages = images.length > 0;
          const isExpanded = expandedYears.has(item.year);
          return (
            <li
              key={item.year}
              className={`${styles.projectRow} ${styles.reveal}`}
            >
              <span className={styles.projectYear}>{item.year}</span>
              <button
                type="button"
                className={`${styles.projectBody} ${hasImages ? styles.projectBodyClickable : ""}`}
                onClick={() => toggleYear(item.year, hasImages)}
                aria-expanded={hasImages ? isExpanded : undefined}
                aria-controls={
                  hasImages ? `project-images-${item.year}` : undefined
                }
              >
                <p className={styles.projectAward}>{item.award}</p>
                {hasImages ? (
                  <div
                    id={`project-images-${item.year}`}
                    className={`${styles.projectImages} ${isExpanded ? styles.projectImagesOpen : ""}`}
                  >
                    <div className={styles.projectImagesInner}>
                      {images.slice(0, 3).map((image) => (
                        <div
                          key={`${item.year}-${image.src}`}
                          className={styles.projectImage}
                        >
                          <Image
                            src={image.src}
                            alt={image.alt}
                            fill
                            sizes="(max-width: 768px) 33vw, 220px"
                            className={styles.projectImageImg}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
                <p className={styles.projectMeta}>
                  {item.project}, {item.result}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function LandingSections({ onContact }: LandingSectionsProps) {
  const { aboutIntro, journal } = landingContent;

  return (
    <div className={styles.sections}>
      <WhoAreWe />
      <ExperienceSection />
      <StudioSection />

      <section
        className={`${styles.block} ${styles.blockAb}`}
        id="about-intro"
        aria-labelledby="about-intro-title"
      >
        <div className={`${styles.abIntroHead} ${styles.reveal}`}>
          <p className={styles.sectionEyebrow}>
            <BracketedText>{aboutIntro.label}</BracketedText>
          </p>
          <h2 id="about-intro-title" className={styles.abIntroH}>
            {aboutIntro.parts.map((part) => (
              <span
                key={part.text}
                className={part.highlight ? styles.accent : undefined}
              >
                {part.text}
              </span>
            ))}
          </h2>
          <p className={styles.abIntroTag}>{aboutIntro.tagline}</p>
        </div>

        <div className={`${styles.abIntroImages} ${styles.reveal}`}>
          {aboutIntro.images.map((image, index) => (
            <div key={image.src} className={styles.abIntroImage}>
              <Image
                src={image.src}
                alt={image.alt}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className={styles.abIntroImageImg}
                priority={index === 0}
              />
            </div>
          ))}
        </div>

        <p className={`${styles.abIntroCol1} ${styles.reveal}`}>
          {aboutIntro.col1}
        </p>
        <div className={`${styles.abIntroSplit} ${styles.reveal}`}>
          <h3 className={styles.abIntroSub}>{aboutIntro.subtitle}</h3>
          <p className={styles.abIntroCol2}>{aboutIntro.col2}</p>
        </div>
      </section>

      <AboutProjects />

      <AboutTeams />

      <section
        className={`${styles.block} ${styles.blockAb} ${styles.blockBlog}`}
        id="about-blog"
        aria-labelledby="about-blog-title"
      >
        <header className={`${styles.abHead} ${styles.reveal}`}>
          <p className={styles.sectionEyebrow}>
            <BracketedText>{journal.label}</BracketedText>
          </p>
          <h2 id="about-blog-title" className={styles.abHeadH}>
            {journal.titleBefore}{" "}
            <span className={styles.accent}>{journal.titleAccent}</span>{" "}
            {journal.titleAfter}
          </h2>
        </header>
        <div className={`${styles.blogGrid} ${styles.reveal}`}>
          {journal.entries.map((entry) => (
            <article key={entry.title} className={styles.blogCard}>
              <div className={styles.blogMedia}>
                <Image
                  src={entry.image.src}
                  alt={entry.image.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"
                  className={styles.blogMediaImg}
                />
              </div>
              <p className={styles.blogRead}>{entry.read}</p>
              <h3 className={styles.blogTitle}>{entry.title}</h3>
            </article>
          ))}
        </div>
      </section>

      <HeritageSection onContact={onContact} />
    </div>
  );
}

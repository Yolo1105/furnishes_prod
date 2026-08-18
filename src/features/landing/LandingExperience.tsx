"use client";

import type { CSSProperties, RefObject } from "react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { landingContent } from "./landing-content";
import styles from "./landing.module.css";
import { LandingGrain, LandingWarmGrain } from "./LandingGrain";
import { LandingHero } from "./LandingHero";
import { scrollToLandingSection } from "./landing-navigation";
import { landingSideNav } from "./landing-navigation";

type LandingExperienceProps = {
  activeSection: string;
  onContact: () => void;
  bandRef: RefObject<HTMLDivElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  onHeroReady?: () => void;
  skipIntro?: boolean;
  e2eMode?: boolean;
};

const TITLE_ECHO_OPACITY = [0.9, 0.65, 0.4, 0.15] as const;

export function LandingExperience({
  activeSection,
  onContact,
  bandRef,
  headerRef,
  onHeroReady,
  skipIntro = false,
  e2eMode = false,
}: LandingExperienceProps) {
  const rootRef = useRef<HTMLElement>(null);
  const [introDone, setIntroDone] = useState(skipIntro);

  useLayoutEffect(() => {
    const host = rootRef.current;
    const header = headerRef.current;
    if (!host || !header) return;

    const syncNavH = () => {
      const h = `${header.offsetHeight}px`;
      host.style.setProperty("--public-nav-h", h);
      document.documentElement.style.setProperty("--public-nav-h", h);
      document.documentElement.style.setProperty("--nav-h", h);
    };
    syncNavH();
    const ro = new ResizeObserver(syncNavH);
    ro.observe(header);
    return () => {
      ro.disconnect();
      host.style.removeProperty("--public-nav-h");
      document.documentElement.style.removeProperty("--public-nav-h");
      document.documentElement.style.removeProperty("--nav-h");
    };
  }, [headerRef]);

  const handleIntroDone = useCallback(() => setIntroDone(true), []);

  /* Reveal title / blurb / CTA even if the Three.js intro callback stalls. */
  useEffect(() => {
    if (skipIntro) return;
    const timer = window.setTimeout(() => {
      setIntroDone(true);
    }, 7_000);
    return () => {
      window.clearTimeout(timer);
    };
  }, [skipIntro]);

  const indexTheme =
    activeSection === "contact" || !activeSection ? "light" : "dark";
  const indexHidden = activeSection === "contact";

  return (
    <section
      ref={rootRef}
      className={styles.experience}
      aria-labelledby="landing-hero-title"
    >
      <div
        className={`${styles.sectionIndex} ${introDone ? styles.sectionIndexIsIn : ""} ${styles[`sectionIndex${indexTheme === "light" ? "Light" : "Dark"}`]}${indexHidden ? ` ${styles.sectionIndexHidden}` : ""}`}
        aria-hidden="true"
      >
        {landingSideNav.map((item, i) => (
          <button
            key={item.id}
            type="button"
            className={styles.sectionIndexItem}
            data-active={String(activeSection === item.id)}
            tabIndex={-1}
            onClick={() => scrollToLandingSection(item.id)}
          >
            <span className={styles.bracketMark}>[</span>
            {String(i).padStart(2, "0")}
            <span className={styles.bracketMark}>]</span>
          </button>
        ))}
      </div>

      <div className={styles.stage} id="landing-hero">
        <div className={styles.heroMount}>
          <LandingHero
            skipIntro={skipIntro}
            e2eMode={e2eMode}
            onIntroDone={handleIntroDone}
            {...(onHeroReady ? { onReady: onHeroReady } : {})}
          />
        </div>

        <div className={styles.band} ref={bandRef}>
          <LandingGrain
            filterId="landing-band-grain"
            className={styles.bandGrain}
          />
          <div className={styles.lockup}>
            <div className={styles.lockupTitle}>
              <h1
                id="landing-hero-title"
                className={`${styles.heroTitle} ${introDone ? styles.heroTitleIsIn : ""}`}
                aria-label={landingContent.hero.ariaLabel}
              >
                <span
                  className={styles.heroTitleMain}
                  style={{ "--landing-title-o": 1 } as CSSProperties}
                >
                  {landingContent.hero.title}
                </span>
                {landingContent.hero.echoes.map((echo, index) => (
                  <span
                    key={`${echo}-${index}`}
                    className={styles.heroTitleEcho}
                    style={
                      {
                        "--landing-title-o": TITLE_ECHO_OPACITY[index],
                      } as CSSProperties
                    }
                    aria-hidden="true"
                  >
                    {echo}
                  </span>
                ))}
              </h1>
            </div>
            <div
              className={`${styles.lockupRight} ${introDone ? styles.lockupRightIsIn : ""}`}
            >
              <p className={styles.lockupLabel}>
                {landingContent.hero.blurb.map((line) => (
                  <span key={line}>
                    {line}
                    <br />
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
        <div className={styles.mainStage}>
          <div className={styles.mainGrain} aria-hidden="true">
            <LandingGrain
              filterId="landing-main-tex"
              className={styles.grainFill}
            />
            <LandingWarmGrain
              filterId="landing-main-warm"
              className={styles.grainFillWarm}
            />
          </div>
          <button
            className={`${styles.heroTag} ${introDone ? styles.heroTagIsIn : ""}`}
            type="button"
            onClick={onContact}
          >
            <span className={styles.heroTagline}>
              {landingContent.hero.cta}
            </span>
            <span className={styles.heroTagMark} aria-hidden="true">
              <span className={styles.heroBracket}>[</span>
              <span className={styles.heroMarkArrow}>
                <svg
                  className={styles.heroArrowSvg}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 17 L17 7" />
                  <path d="M9 7 H17 V15" />
                </svg>
              </span>
              <span className={styles.heroBracket}>]</span>
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

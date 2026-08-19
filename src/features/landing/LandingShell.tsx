"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { startRouteHandoff } from "@/components/route-handoff/start-route-handoff";
import { PublicShell } from "@/components/public-shell";
import { LandingCookieConsent } from "./LandingCookieConsent";
import { LandingExperience } from "./LandingExperience";
import { LandingGrain, LandingWarmGrain } from "./LandingGrain";
import { LandingHeader } from "./LandingHeader";
import { LandingLoader } from "./LandingLoader";
import { LandingSections } from "./LandingSections";
import { LandingSideNav } from "./LandingSideNav";
import { LandingWaitlist } from "./LandingWaitlist";
import { landingContent } from "./landing-content";
import { enableLandingDampedScroll } from "./landing-damped-scroll";
import {
  landingNavItems,
  landingStudioItems,
  landingWorkItems,
  isLandingDestination,
  resolveLandingDestination,
  scrollToLandingSection,
} from "./landing-navigation";
import { landingScroll } from "./landing-scroll-state";
import { markLandingIntroSeen } from "./landing-intro";
import styles from "./landing.module.css";
import { LOADER_TIMING } from "./three/loader-timing";
import { useLandingReveal } from "./useLandingReveal";
import { useLandingSectionSpy } from "./useLandingSectionSpy";

function LandingMain({
  onHeroReady,
  skipIntro = false,
  e2eMode = false,
  userLabel = null,
}: {
  onHeroReady: () => void;
  skipIntro?: boolean;
  e2eMode?: boolean;
  userLabel?: string | null;
}) {
  const router = useRouter();
  const rootRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const bandRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const menuWasOpenRef = useRef(false);
  const activeSection = useLandingSectionSpy();

  useLandingReveal(
    rootRef,
    styles.reveal ?? "reveal",
    styles.revealIn ?? "revealIn",
  );

  /* Damped wheel scroll; native fallback owns landingScroll.active only when damping is off. */
  useEffect(() => {
    const disposeDamped = enableLandingDampedScroll();
    if (disposeDamped) return disposeDamped;

    let idle = 0;
    const onScroll = () => {
      landingScroll.active = true;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => {
        landingScroll.active = false;
      }, 140);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(idle);
      landingScroll.active = false;
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    let threshold = 0;
    let raf = 0;
    const measure = () => {
      const band = bandRef.current;
      const bar = headerRef.current;
      const bandH = band ? band.offsetHeight : window.innerHeight * 0.24;
      const barH = bar ? bar.offsetHeight : 56;
      threshold = Math.max(0, bandH - barH - 1);
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled((window.scrollY || 0) > threshold);
      });
    };
    const remeasure = () => {
      measure();
      onScroll();
    };
    remeasure();
    const t1 = window.setTimeout(remeasure, 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    return () => {
      window.clearTimeout(t1);
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", remeasure);
    };
  }, []);

  useEffect(() => {
    if (menuOpen) {
      menuWasOpenRef.current = true;
      return;
    }

    if (pendingActionRef.current) {
      const action = pendingActionRef.current;
      pendingActionRef.current = null;
      requestAnimationFrame(action);
      menuWasOpenRef.current = false;
      return;
    }

    if (menuWasOpenRef.current) {
      menuButtonRef.current?.focus();
    }
    menuWasOpenRef.current = false;
  }, [menuOpen]);

  const runOrDefer = useCallback(
    (action: () => void) => {
      if (menuOpen) {
        pendingActionRef.current = action;
        setMenuOpen(false);
      } else {
        action();
      }
    },
    [menuOpen],
  );

  const navigateTo = useCallback(
    (destination: string) => {
      /* The shell hands back a destination token; narrow it at Landing's boundary. */
      if (!isLandingDestination(destination)) return;
      const target = resolveLandingDestination(destination);
      const action = () => {
        if (target.kind === "route") {
          if (!startRouteHandoff(target.href)) {
            router.push(target.href);
          }
          return;
        }
        scrollToLandingSection(target.sectionId, rootRef.current);
      };

      if (menuOpen) {
        pendingActionRef.current = action;
        setMenuOpen(false);
      } else {
        action();
      }
    },
    [menuOpen, router],
  );

  return (
    <main ref={rootRef} id="home">
      <PublicShell
        header={
          <LandingHeader
            ref={headerRef}
            menuOpen={menuOpen}
            scrolled={scrolled}
            menuButtonRef={menuButtonRef}
            userLabel={userLabel}
            onToggleMenu={() => setMenuOpen((open) => !open)}
            onHome={() => runOrDefer(() => scrollToLandingSection("home"))}
          />
        }
        menuOpen={menuOpen}
        menuId="landing-main-menu"
        email={landingContent.contact.emailAddress}
        workItems={landingWorkItems}
        studioItems={landingStudioItems}
        navItems={landingNavItems}
        socialLinks={landingContent.links.social}
        {...(styles.reveal ? { footerGridClassName: styles.reveal } : {})}
        footer={{
          ctaBefore: landingContent.footer.ctaBefore,
          ctaAfter: landingContent.footer.ctaAfter,
          body: landingContent.footer.body,
          email: landingContent.contact.emailAddress,
          hours: landingContent.contact.hours,
          studioBlurb: landingContent.contact.studioBlurb,
          studioLabel: landingContent.contact.studioLabel,
          social: landingContent.links.social,
          legal: landingContent.links.legal,
        }}
        onCloseMenu={() => setMenuOpen(false)}
        onNavigate={navigateTo}
      >
        <LandingSideNav activeSection={activeSection} />
        <LandingExperience
          activeSection={activeSection}
          headerRef={headerRef}
          bandRef={bandRef}
          onContact={() =>
            runOrDefer(() => scrollToLandingSection("contact", rootRef.current))
          }
          onHeroReady={onHeroReady}
          skipIntro={skipIntro}
          e2eMode={e2eMode}
        />
        <div className={styles.below}>
          <div className={styles.belowGrain} aria-hidden="true">
            <LandingGrain
              filterId="landing-below-tex"
              className={styles.grainFill}
            />
            <LandingWarmGrain
              filterId="landing-below-warm"
              className={styles.grainFillWarm}
            />
          </div>
          <LandingSections
            onContact={() => scrollToLandingSection("contact", rootRef.current)}
          />
          <LandingWaitlist />
          <LandingCookieConsent activeSection={activeSection} />
        </div>
      </PublicShell>
    </main>
  );
}

/**
 * Owns the loader → dispose → landing handoff.
 *
 * Sequence (matches the frozen reference intent):
 * 1. Loader pieces hop + collapse into the square.
 * 2. Loader WebGL disposes; landing mounts under the same orange→cream cover.
 * 3. Once the hero paints its first frame, the cover crossfades out.
 * 4. Loader DOM is removed after the fade.
 *
 * Pass `skipLoader` after the visitor has seen the % screen once.
 * Pass `skipIntro` (via `/?intro=skip`) to also settle the hero camera for E2E.
 * Pass `e2eMode` (via `/?e2e=1` + NEXT_PUBLIC_E2E) for low-cost WebGL tests.
 */
export function LandingShell({
  skipLoader = false,
  skipIntro = false,
  e2eMode = false,
  userLabel = null,
  onHeroReady,
}: {
  skipLoader?: boolean;
  skipIntro?: boolean;
  e2eMode?: boolean;
  userLabel?: string | null;
  onHeroReady?: () => void;
}) {
  const [introGone, setIntroGone] = useState(skipLoader);
  const [loaderReleased, setLoaderReleased] = useState(skipLoader);
  const [heroReady, setHeroReady] = useState(false);
  const [forceRelease, setForceRelease] = useState(false);
  const releasedOnceRef = useRef(false);
  const goneOnceRef = useRef(false);
  const heroReadyOnceRef = useRef(false);
  const onHeroReadyRef = useRef(onHeroReady);
  onHeroReadyRef.current = onHeroReady;

  useEffect(() => {
    if (skipLoader) return;
    const forceTimer = window.setTimeout(
      () => setForceRelease(true),
      LOADER_TIMING.stallForceMs,
    );
    const goneTimer = window.setTimeout(() => {
      if (goneOnceRef.current) return;
      goneOnceRef.current = true;
      markLandingIntroSeen();
      setIntroGone(true);
    }, LOADER_TIMING.stallGoneMs);
    return () => {
      window.clearTimeout(forceTimer);
      window.clearTimeout(goneTimer);
    };
  }, [skipLoader]);

  const [revealArmed, setRevealArmed] = useState(skipLoader);
  useEffect(() => {
    if (skipLoader) return;
    if (!loaderReleased) return;
    if (heroReady) {
      setRevealArmed(true);
      return;
    }
    const t = window.setTimeout(
      () => setRevealArmed(true),
      LOADER_TIMING.heroReadyFallbackMs,
    );
    return () => window.clearTimeout(t);
  }, [loaderReleased, heroReady, skipLoader]);

  return (
    <>
      {loaderReleased ? (
        <LandingMain
          skipIntro={skipIntro}
          e2eMode={e2eMode}
          userLabel={userLabel}
          onHeroReady={() => {
            if (heroReadyOnceRef.current) return;
            heroReadyOnceRef.current = true;
            setHeroReady(true);
            onHeroReadyRef.current?.();
          }}
        />
      ) : null}
      {!introGone && !skipLoader ? (
        <LandingLoader
          ready
          forceRelease={forceRelease}
          allowReveal={revealArmed}
          onRendererReleased={() => {
            if (releasedOnceRef.current) return;
            releasedOnceRef.current = true;
            setLoaderReleased(true);
          }}
          onDone={() => {
            if (goneOnceRef.current) return;
            goneOnceRef.current = true;
            markLandingIntroSeen();
            setIntroGone(true);
          }}
        />
      ) : null}
    </>
  );
}

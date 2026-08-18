"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";
import type {
  LandingLoaderPhase,
  LandingLoaderSceneHandle,
} from "./three/landing-scene-types";
import { LOADER_TIMING } from "./three/loader-timing";

type LandingLoaderProps = {
  /** When true (default), the loader may finish after the min duration. */
  ready?: boolean;
  /** Stall fallback: force dispose before any hero can mount. */
  forceRelease?: boolean;
  /**
   * When true, start the opacity crossfade that reveals the landing underneath.
   * Parent should set this only after the hero has painted its first frame.
   */
  allowReveal?: boolean;
  onDone: () => void;
  /** Fires only after the loader WebGL context is fully disposed. */
  onRendererReleased: () => void;
};

function useOneShot(callback: (() => void) | undefined) {
  const ref = useRef(callback);
  const firedRef = useRef(false);
  useEffect(() => {
    ref.current = callback;
  }, [callback]);
  return useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    ref.current?.();
  }, []);
}

export function LandingLoader({
  ready = true,
  forceRelease = false,
  allowReveal = false,
  onDone,
  onRendererReleased,
}: LandingLoaderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const navProbeRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<LandingLoaderSceneHandle | null>(null);
  const readyRef = useRef(ready);
  const phaseRef = useRef<LandingLoaderPhase>("run");
  const exitTimersRef = useRef<number[]>([]);
  const revealStartedRef = useRef(false);

  const fireDone = useOneShot(onDone);
  const fireReleased = useOneShot(onRendererReleased);

  const [pct, setPct] = useState(0);
  const [phase, setPhase] = useState<LandingLoaderPhase>("run");
  /** Cover held opaque after collapse until the hero is ready to crossfade. */
  const [holding, setHolding] = useState(false);
  const [wiping, setWiping] = useState(false);

  useEffect(() => {
    readyRef.current = ready;
  }, [ready]);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const probe = navProbeRef.current;
    if (!probe) return;
    const root = document.documentElement;
    const prevNav = root.style.getPropertyValue("--nav-h");
    const prevLanding = root.style.getPropertyValue("--public-nav-h");
    const apply = () => {
      const h = `${probe.offsetHeight}px`;
      root.style.setProperty("--nav-h", h);
      root.style.setProperty("--public-nav-h", h);
    };
    apply();
    const timer = window.setTimeout(apply, 250);
    window.addEventListener("resize", apply);
    void document.fonts?.ready.then(apply);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", apply);
      if (prevNav) root.style.setProperty("--nav-h", prevNav);
      else root.style.removeProperty("--nav-h");
      if (prevLanding) root.style.setProperty("--public-nav-h", prevLanding);
      else root.style.removeProperty("--public-nav-h");
    };
  }, []);

  const clearExitTimers = useCallback(() => {
    exitTimersRef.current.forEach((id) => window.clearTimeout(id));
    exitTimersRef.current = [];
  }, []);

  const beginExit = useCallback(() => {
    if (phaseRef.current !== "run") return;
    phaseRef.current = "breath";
    setPhase("breath");
    exitTimersRef.current.push(
      window.setTimeout(() => {
        phaseRef.current = "exit";
        setPhase("exit");
      }, LOADER_TIMING.dwellMs),
    );
    /* After pieces collapse: hold the cover, then dispose loader GL so the
       white document never shows through a transparent frame. */
    exitTimersRef.current.push(
      window.setTimeout(() => {
        phaseRef.current = "hold";
        setPhase("hold");
        setHolding(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            handleRef.current?.releaseRenderer();
          });
        });
      }, LOADER_TIMING.dwellMs + LOADER_TIMING.exitMs),
    );
  }, []);

  /* Crossfade only once the hero has painted (or parent forced reveal). */
  useEffect(() => {
    if (!allowReveal || !holding || revealStartedRef.current) return;
    let cancelled = false;
    let doneTimer = 0;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        if (cancelled || revealStartedRef.current) return;
        revealStartedRef.current = true;
        phaseRef.current = "wipe";
        setPhase("wipe");
        setWiping(true);
        doneTimer = window.setTimeout(() => {
          phaseRef.current = "gone";
          setPhase("gone");
          fireDone();
        }, LOADER_TIMING.revealMs);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(doneTimer);
    };
  }, [allowReveal, holding, fireDone]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let handle: LandingLoaderSceneHandle | null = null;

    void import("./three/createLandingLoaderScene")
      .then(({ createLandingLoaderScene }) => {
        if (cancelled) return;
        handle = createLandingLoaderScene({
          mount,
          getReady: () => readyRef.current,
          getPhase: () => phaseRef.current,
          getSkip: () => false,
          onPct: setPct,
          onLift: beginExit,
          onRendererReleased: fireReleased,
        });

        if (!handle) {
          fireReleased();
          setHolding(true);
          return;
        }

        handleRef.current = handle;
      })
      .catch(() => {
        if (cancelled) return;
        fireReleased();
        setHolding(true);
      });

    return () => {
      cancelled = true;
      clearExitTimers();
      handle?.dispose();
      handleRef.current = null;
    };
  }, [beginExit, clearExitTimers, fireReleased]);

  useEffect(() => {
    if (!forceRelease) return;
    handleRef.current?.releaseRenderer();
    clearExitTimers();
    setHolding(true);
    setWiping(true);
    phaseRef.current = "gone";
    setPhase("gone");
    fireDone();
  }, [forceRelease, clearExitTimers, fireDone]);

  const exiting =
    phase === "exit" ||
    phase === "hold" ||
    phase === "wipe" ||
    phase === "gone" ||
    holding;
  const holdClass = holding ? styles.introHold : "";
  const revealClass = wiping || phase === "gone" ? styles.introWipe : "";

  return (
    <div
      className={`${styles.intro}${exiting ? ` ${styles.introExit}` : ""}${holdClass ? ` ${holdClass}` : ""}${revealClass ? ` ${revealClass}` : ""}`}
      role="dialog"
      aria-label="Loading Furnishes"
      aria-busy={phase === "run"}
    >
      {/* Single stage-matched wash — under the canvas during run; sole cover after hold. */}
      <div className={styles.introCover} aria-hidden="true" />

      <div ref={mountRef} className={styles.introCanvas} aria-hidden="true" />

      {/* Hidden layout probe only — sizes --nav-h to match PublicHeader. */}
      <div
        ref={navProbeRef}
        className={styles.introNavProbe}
        aria-hidden="true"
      >
        <span className={styles.introNavProbeMenu}>Menu</span>
        <span className={styles.introNavProbeBrand}>furnishes.</span>
        <span className={styles.introNavProbeLogin}>login</span>
      </div>

      <div className={styles.introBrand} aria-hidden="true">
        furnishes.
      </div>

      <div className={styles.introCount}>
        <div className={styles.introCountLabel}>loading</div>
        <div
          className={styles.introCountNum}
          data-testid="landing-loader-progress"
        >
          <span className={styles.introBrO} aria-hidden="true">
            「
          </span>
          {String(pct).padStart(2, "0")}
          <span className={styles.introBrC} aria-hidden="true">
            」
          </span>
          <span className={styles.introPct} aria-hidden="true">
            %
          </span>
        </div>
      </div>

      <div className={styles.introMeta}>
        <div className={styles.introMetaMono}>[ Visual development · 3D ]</div>
        <div className={styles.introMetaTop}>Soft Architecture</div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./landing.module.css";
import type { LandingHeroSceneHandle } from "./three/landing-scene-types";

const HERO_ROOM_NAMES = ["LIVING", "STUDIO", "LOUNGE", "NOOK", "WING"] as const;

type LandingHeroProps = {
  onIntroDone?: () => void;
  onReady?: () => void;
  skipIntro?: boolean;
  /** Low-cost renderer path for Playwright (`/?e2e=1` + NEXT_PUBLIC_E2E). */
  e2eMode?: boolean;
};

type RendererState = "initializing" | "webgl" | "fallback";

/** Deterministic room-control positions for demand-driven E2E (no projection). */
const E2E_ROOM_POSITIONS = [
  { left: "24%", top: "48%" },
  { left: "42%", top: "39%" },
  { left: "62%", top: "58%" },
  { left: "35%", top: "66%" },
  { left: "76%", top: "43%" },
] as const;

function HouseFallback() {
  return (
    <div
      className={styles.houseFallback}
      role="img"
      aria-label="Illustration of a furnished house. The interactive 3D model is unavailable in this browser."
    >
      <svg
        viewBox="0 0 320 240"
        width="72%"
        height="72%"
        fill="none"
        stroke="#6e1810"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M60 120 L160 70 L260 120 L160 170 Z" fill="#FFF2E5" />
        <path d="M60 120 L60 190 L160 230 L160 170 Z" fill="#FFE1CE" />
        <path d="M260 120 L260 190 L160 230 L160 170 Z" fill="#FFD3BC" />
        <path d="M96 138 L96 172" opacity="0.5" />
        <path d="M128 154 L128 188" opacity="0.5" />
        <path d="M192 154 L192 188" opacity="0.5" />
        <path d="M224 138 L224 172" opacity="0.5" />
        <circle cx="160" cy="118" r="7" fill="#E7551A" stroke="none" />
      </svg>
    </div>
  );
}

export function LandingHero({
  onIntroDone,
  onReady,
  skipIntro = false,
  e2eMode = false,
}: LandingHeroProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const sceneHandleRef = useRef<LandingHeroSceneHandle | null>(null);
  const onIntroDoneRef = useRef(onIntroDone);
  const onReadyRef = useRef(onReady);
  const skipIntroRef = useRef(skipIntro);
  const e2eModeRef = useRef(e2eMode);
  const introDoneFiredRef = useRef(false);
  const readyFiredRef = useRef(false);
  const [activeRoom, setActiveRoom] = useState<number | null>(null);
  const [paused, setPaused] = useState(false);
  /* Opening UI only — not renderer readiness (skipIntro can be true on paint). */
  const [showCtl, setShowCtl] = useState(skipIntro);
  const [rendererState, setRendererState] =
    useState<RendererState>("initializing");
  const [glFailed, setGlFailed] = useState(false);
  const [resizeVersion, setResizeVersion] = useState(0);
  const [renderSize, setRenderSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    onIntroDoneRef.current = onIntroDone;
  }, [onIntroDone]);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    skipIntroRef.current = skipIntro;
  }, [skipIntro]);

  useEffect(() => {
    e2eModeRef.current = e2eMode;
  }, [e2eMode]);

  const fireIntroDone = useCallback(() => {
    if (introDoneFiredRef.current) return;
    introDoneFiredRef.current = true;
    onIntroDoneRef.current?.();
  }, []);

  const fireReady = useCallback(() => {
    if (readyFiredRef.current) return;
    readyFiredRef.current = true;
    onReadyRef.current?.();
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let handle: LandingHeroSceneHandle | null = null;

    const safeDispose = () => {
      if (disposed) return;
      disposed = true;
      handle?.dispose();
      sceneHandleRef.current = null;
    };

    void import("./three/createLandingHeroScene")
      .then(({ createLandingHeroScene }) => {
        if (disposed) return;
        handle = createLandingHeroScene({
          mount,
          skipIntro: skipIntroRef.current,
          testMode: e2eModeRef.current,
          getLabelEl: (ri) => labelRefs.current[ri] ?? null,
          onGlFailed: () => {
            safeDispose();
            setRendererState("fallback");
            setGlFailed(true);
            setShowCtl(false);
            fireIntroDone();
            fireReady();
          },
          onIntroDone: fireIntroDone,
          /* Pause only after the tour settles into overview auto-rotate. */
          onOpeningComplete: () => setShowCtl(true),
          onFirstFrame: () => {
            setRendererState("webgl");
            fireReady();
          },
          onResize: (width, height) => {
            setRenderSize({ width, height });
            setResizeVersion((current) => current + 1);
          },
        });

        sceneHandleRef.current = handle;
        if (!handle) {
          setRendererState("fallback");
          setGlFailed(true);
          fireIntroDone();
          fireReady();
        }
      })
      .catch(() => {
        if (disposed) return;
        setRendererState("fallback");
        setGlFailed(true);
        fireIntroDone();
        fireReady();
      });

    return safeDispose;
  }, [fireIntroDone, fireReady]);

  const onRoomClick = useCallback((ri: number) => {
    setActiveRoom((cur) => {
      const next = cur === ri ? null : ri;
      if (next === null) {
        sceneHandleRef.current?.showOverview();
      } else {
        sceneHandleRef.current?.focusRoom(next);
      }
      return next;
    });
  }, []);

  const goOverview = useCallback(() => {
    setActiveRoom(null);
    sceneHandleRef.current?.showOverview();
  }, []);

  const togglePause = useCallback(() => {
    setPaused((prev) => {
      const next = !prev;
      sceneHandleRef.current?.setPaused(next);
      return next;
    });
  }, []);

  const activeRoomName =
    activeRoom === null
      ? "overview"
      : HERO_ROOM_NAMES[activeRoom]!.toLowerCase();

  // Island id is distinct from stage id="landing-hero". suppressHydrationWarning
  // covers diagnostic attrs that update after the first frame, and Turbopack HMR
  // cases where SSR HTML briefly lags the client module.
  return (
    <div
      className={styles.hero}
      id="landing-hero-scene"
      data-landing-hero="true"
      data-testid="landing-hero"
      data-e2e-renderer={e2eMode ? "true" : "false"}
      data-renderer-state={rendererState}
      data-opening-complete={showCtl ? "true" : "false"}
      data-paused={paused ? "true" : "false"}
      data-active-room={activeRoomName}
      data-resize-version={resizeVersion}
      data-render-width={renderSize.width}
      data-render-height={renderSize.height}
      suppressHydrationWarning
      role="group"
      aria-label="Interactive furnished-house preview. Use the room buttons to zoom into a room and the Overview button to reset."
    >
      {glFailed ? (
        <HouseFallback />
      ) : (
        <>
          <div
            ref={mountRef}
            className={styles.heroCanvas}
            aria-hidden="true"
          />

          {HERO_ROOM_NAMES.map((name, ri) => (
            <button
              type="button"
              key={name}
              data-room-control
              data-room={name.toLowerCase()}
              data-room-visible={e2eMode ? "true" : undefined}
              ref={(el) => {
                labelRefs.current[ri] = el;
              }}
              className={styles.roomPill}
              style={
                e2eMode
                  ? {
                      left: E2E_ROOM_POSITIONS[ri]!.left,
                      top: E2E_ROOM_POSITIONS[ri]!.top,
                      transform: "translate(-50%, -50%)",
                      display: "flex",
                      opacity: 1,
                    }
                  : undefined
              }
              onClick={() => onRoomClick(ri)}
              aria-pressed={activeRoom === ri}
              aria-label={`Zoom into the ${name.toLowerCase()} room`}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <span className={styles.roomPillDot} aria-hidden="true" />
              {name}
            </button>
          ))}

          <button
            type="button"
            data-testid="landing-overview"
            onClick={goOverview}
            className={styles.heroOverview}
            data-visible={activeRoom != null}
          >
            Overview
          </button>

          <button
            type="button"
            data-testid="landing-motion-toggle"
            onClick={togglePause}
            aria-pressed={paused}
            className={styles.heroPause}
            data-visible={showCtl}
          >
            <span className={styles.heroPauseIcon} aria-hidden="true">
              {paused ? (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M8 5 L19 12 L8 19 Z" />
                </svg>
              ) : (
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                >
                  <path d="M9 6 V18" />
                  <path d="M15 6 V18" />
                </svg>
              )}
            </span>
            {paused ? "Resume" : "Pause"}
          </button>
        </>
      )}
    </div>
  );
}

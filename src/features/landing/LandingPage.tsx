"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import styles from "./landing.module.css";
import {
  clearLandingFreezePaint,
  ensureLandingFreezePaint,
} from "./landing-freeze";
import { LandingDocumentPaint } from "./LandingDocumentPaint";
import { LandingShell } from "./LandingShell";

export function LandingPage({
  skipLoader = false,
  skipIntro = false,
  e2eMode = false,
  userLabel = null,
}: {
  /** Skip the % loading screen (after first visit). */
  skipLoader?: boolean;
  /** Skip hero open camera — E2E settled state only. */
  skipIntro?: boolean;
  e2eMode?: boolean;
  userLabel?: string | null;
}) {
  /** Keep the last house frame (freeze overlay) until this 3D is ready. */
  const [heroReady, setHeroReady] = useState(skipIntro);

  useLayoutEffect(() => {
    if (!skipLoader) {
      clearLandingFreezePaint();
      return;
    }
    if (!heroReady) {
      // SPA return (e.g. login→home): boot script does not re-run.
      ensureLandingFreezePaint();
      return;
    }
    clearLandingFreezePaint();
  }, [heroReady, skipLoader]);

  useEffect(() => {
    if (skipIntro || heroReady) return;
    const t = window.setTimeout(() => setHeroReady(true), 8000);
    return () => window.clearTimeout(t);
  }, [skipIntro, heroReady]);

  return (
    <div
      className={styles.landingRoot}
      data-landing-root=""
      data-skip-loader={skipLoader ? "1" : "0"}
      data-route-paint="landing"
      data-route-path={heroReady ? "/" : undefined}
      data-hero-ready={heroReady ? "1" : "0"}
    >
      <LandingDocumentPaint active />
      <LandingShell
        skipLoader={skipLoader}
        skipIntro={skipIntro}
        e2eMode={e2eMode}
        userLabel={userLabel}
        onHeroReady={() => setHeroReady(true)}
      />
    </div>
  );
}

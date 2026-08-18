"use client";

import styles from "./landing.module.css";
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
  return (
    <div className={styles.landingRoot}>
      <LandingDocumentPaint />
      <LandingShell
        skipLoader={skipLoader}
        skipIntro={skipIntro}
        e2eMode={e2eMode}
        userLabel={userLabel}
      />
    </div>
  );
}

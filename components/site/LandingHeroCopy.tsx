"use client";

import { useEffect, useState } from "react";
import styles from "./LandingHeroCopy.module.css";

const HASH_LINES = ["AI interiors", "3D layouts", "Custom pieces"] as const;

export function LandingHeroCopy() {
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHash, setShowHash] = useState(false);

  useEffect(() => {
    const tWelcome = window.setTimeout(() => setShowWelcome(true), 1500);
    const tHash = window.setTimeout(() => setShowHash(true), 2000);
    return () => {
      window.clearTimeout(tWelcome);
      window.clearTimeout(tHash);
    };
  }, []);

  return (
    <div className={styles.overlay} role="region" aria-label="Welcome">
      <div className={styles.column}>
        <div
          className={`${styles.welcome} ${showWelcome ? styles.welcomeAnimated : ""}`}
        >
          <div className={styles.welcomeLine}>
            Hello<span className={styles.accent}>!</span>
          </div>
          <div className={styles.welcomeLine}>
            Welcome h<span className={styles.accent}>o</span>me
            <span className={styles.accent}>.</span>
          </div>
        </div>

        <div className={styles.hashList}>
          {HASH_LINES.map((label, i) => (
            <div
              key={label}
              className={`${styles.hashRow} ${showHash ? styles.hashRowAnimated : ""}`}
              style={{ ["--hash-delay" as string]: `${i * 0.25}s` }}
            >
              <span className={styles.hashSymbol}>#</span>
              <span className={styles.hashLabel}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

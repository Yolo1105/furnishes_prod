"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { routes } from "@/lib/contracts/routes";
import {
  INTERIOR_HERO_SLIDE_MS,
  INTERIOR_HERO_SLIDES,
} from "@/lib/interior-hero-slides";
import styles from "./auth.module.css";

function AuthHeroSlides() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduce) return;
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % INTERIOR_HERO_SLIDES.length);
    }, INTERIOR_HERO_SLIDE_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={styles.heroMedia} aria-hidden="true">
      {INTERIOR_HERO_SLIDES.map((src, i) => (
        <img
          key={src}
          className={`${styles.heroImg} ${i === index ? styles.heroImgOn : ""}`}
          src={src}
          alt=""
        />
      ))}
    </div>
  );
}

function switchClass(from: string, to: string) {
  if (from === to) return styles.formSwitch;
  if (from === "/login" && to === "/signup") {
    return `${styles.formSwitch} ${styles.formSwitchFromLogin}`;
  }
  if (from === "/signup" && to === "/login") {
    return `${styles.formSwitch} ${styles.formSwitchFromSignup}`;
  }
  return `${styles.formSwitch} ${styles.formSwitchFade}`;
}

/** Persistent photo + peach column. Form pages swap inside the panel. */
export function AuthChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const motionRef = useRef(styles.formSwitch);
  if (prevPath.current !== pathname) {
    motionRef.current = switchClass(prevPath.current, pathname);
    prevPath.current = pathname;
  }

  useEffect(() => {
    const html = document.documentElement;
    const { overflow: htmlOverflow } = html.style;
    const { overflow: bodyOverflow } = document.body.style;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  return (
    <div
      className={styles.split}
      data-route-paint="auth"
      data-route-path={pathname}
    >
      <aside className={styles.hero}>
        <AuthHeroSlides />
        <div className={styles.heroShade} />
        <Link className={styles.heroBrand} href={routes.home}>
          <span className={styles.heroBrandName}>
            furnishes<span className={styles.heroBrandDot}>.</span>
          </span>
        </Link>
        <div className={styles.heroCopy}>
          <p className={styles.heroHeadline}>
            <span className={styles.heroAccent} aria-hidden="true">
              [
            </span>{" "}
            A room thinks with you{" "}
            <span className={styles.heroAccent} aria-hidden="true">
              ]
            </span>
          </p>
          <p className={styles.heroBody}>
            Eva remembers how you like a room to feel and what you will not live
            with. She pulls pieces that actually fit.
          </p>
        </div>
      </aside>
      <main className={styles.panel}>
        <div key={pathname} className={motionRef.current}>
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthSplit({
  kicker,
  title,
  lede,
  children,
  footer,
}: {
  kicker: string;
  title: string;
  lede: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className={styles.formWrap}>
      <p className={styles.kicker}>
        <span className={styles.kickerMark} aria-hidden="true">
          [
        </span>{" "}
        {kicker}{" "}
        <span className={styles.kickerMark} aria-hidden="true">
          ]
        </span>
      </p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.lede}>{lede}</p>
      {children}
      {footer}
    </div>
  );
}

export function GoogleMark() {
  return (
    <svg
      className={styles.googleMark}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#4285F4"
        d="M23.49 12.27c0-.82-.07-1.64-.23-2.43H12v4.6h6.46a5.52 5.52 0 0 1-2.4 3.63v3h3.87c2.26-2.08 3.56-5.15 3.56-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.93l-3.87-3c-1.08.73-2.47 1.16-4.08 1.16-3.13 0-5.78-2.11-6.73-4.96H1.27v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27A7.2 7.2 0 0 1 4.89 12c0-.79.14-1.56.38-2.27V6.64H1.27A12 12 0 0 0 0 12c0 1.94.46 3.77 1.27 5.36l4-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.36.61 4.61 1.8l3.45-3.45C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.69 1.27 6.64l4 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

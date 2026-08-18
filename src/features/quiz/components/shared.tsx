// @ts-nocheck

"use client";

import { useEffect, useLayoutEffect } from "react";
import { QUIZ_CSS } from "@/features/quiz/data/quiz-css";
import { QUIZ_PAD_X } from "@/features/quiz/data/constants";

export { QUIZ_PAD_X };

/* SSR-safe: useLayoutEffect warns during server render — fall back there. */
export const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export function OptionPill({
  label,
  selected,
  accent,
  bg,
  onClick,
  style,
}: any) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      style={{
        display: "inline-block",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.3)"}`,
        color: selected ? bg : "rgba(255,255,255,0.85)",
        backgroundColor: selected ? accent : "transparent",
        padding: "10px 20px",
        fontSize: "13px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function OptionBlock({
  label,
  sublabel,
  selected,
  accent,
  bg,
  onClick,
}: any) {
  return (
    <button
      onClick={onClick}
      role="radio"
      aria-checked={selected}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        border: `1.5px solid ${selected ? accent : "rgba(255,255,255,0.2)"}`,
        color: selected ? bg : "rgba(255,255,255,0.85)",
        backgroundColor: selected ? accent : "transparent",
        padding: "16px 22px",
        fontSize: "12px",
        letterSpacing: "0.14em",
        fontWeight: 700,
        cursor: "pointer",
        transition: "all 0.2s",
      }}
    >
      <span style={{ display: "block" }}>{label}</span>
      {sublabel && (
        <span
          style={{
            display: "block",
            fontSize: "12px",
            opacity: 0.6,
            letterSpacing: "0.1em",
            marginTop: "4px",
            fontWeight: 400,
          }}
        >
          {sublabel}
        </span>
      )}
    </button>
  );
}

/* Common question header used by several layouts */
export function QHeader({ question, big }: any) {
  return (
    <>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: big ? "clamp(18px, 3vw, 32px)" : "clamp(16px, 2.5vw, 28px)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginBottom: question.subtext ? "6px" : "24px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.55,
            fontSize: "13px",
            letterSpacing: "0.1em",
            marginBottom: "20px",
          }}
        >
          {question.subtext}
        </p>
      )}
    </>
  );
}

export const flexCol = { display: "flex", flexDirection: "column" as const };

/** Staggered entrance — pair with className="q-stagger". */
export function stagger(i: any, step: any = 45) {
  return { animationDelay: `${i * step}ms` };
}

/** In-brand icon set — stroke line-art, square caps, currentColor. Replaces
    all unicode-glyph "icons" (→ ▸ ✓ ⧉ ↗), which render inconsistently across
    platforms and read as generic. */
export function Icon({ name, size = 13, strokeWidth = 2, style }: any) {
  const paths = {
    "arrow-right": (
      <>
        <line x1="2" y1="8" x2="13" y2="8" />
        <polyline points="9,4 13,8 9,12" />
      </>
    ),
    "arrow-left": (
      <>
        <line x1="14" y1="8" x2="3" y2="8" />
        <polyline points="7,4 3,8 7,12" />
      </>
    ),
    chevron: <polyline points="6,3.5 10.5,8 6,12.5" />,
    check: <polyline points="3,8.5 6.5,12 13,4.5" />,
    copy: (
      <>
        <rect x="5.5" y="5.5" width="8" height="8" />
        <path d="M 10.5 5.5 V 2.5 H 2.5 V 10.5 H 5.5" />
      </>
    ),
    external: (
      <>
        <polyline points="7,3 13,3 13,9" />
        <line x1="13" y1="3" x2="4.5" y2="11.5" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 16 16"
      width={size}
      height={size}
      aria-hidden="true"
      stroke="currentColor"
      fill="none"
      strokeWidth={strokeWidth}
      strokeLinecap="square"
      style={{
        display: "inline-block",
        verticalAlign: "-0.12em",
        flexShrink: 0,
        ...style,
      }}
    >
      {paths[name]}
    </svg>
  );
}

/** #RRGGBB → rgba() so borders/text can track the live accent color. */
export function hexA(hex: any, alpha: any) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

/**
 * ROBUSTNESS FIX — inject the stylesheet into document.head imperatively.
 * Some hosts sanitize <style> elements rendered through JSX, which silently
 * kills every keyframe/transition rule (the quiz still works, but with zero
 * animation). An imperative appendChild cannot be stripped by JSX filtering.
 * The JSX <style> tag is kept as a harmless fallback for hosts that allow it.
 */

/** Env-proof press feedback: compress on pointer-down via inline style. */
export function pressFx(base: any = "") {
  const apply = (el: any, down: any) => {
    el.style.transform = down ? `${base} scale(0.94)`.trim() : base || "";
    el.style.opacity = down ? "0.55" : "";
  };
  return {
    onPointerDown: (e: any) => apply(e.currentTarget, true),
    onPointerUp: (e: any) => apply(e.currentTarget, false),
    onPointerLeave: (e: any) => apply(e.currentTarget, false),
  };
}

export function useInjectQuizCss() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    let el = document.querySelector("style[data-furnishes-quiz]");
    if (!el) {
      el = document.createElement("style");
      el.setAttribute("data-furnishes-quiz", "true");
      document.head.appendChild(el);
    }
    el.textContent = QUIZ_CSS;
    return () => {
      /* keep stylesheet while quiz remounts; next mount refreshes textContent */
    };
  }, []);
}

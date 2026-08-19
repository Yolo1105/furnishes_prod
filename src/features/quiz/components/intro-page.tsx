// @ts-nocheck

"use client";

import { useEffect, useRef, useState } from "react";
import { INTRO_COPY, MODE_OPTIONS } from "@/features/quiz/data/constants";
import {
  QUIZ_PAD_X,
  Icon,
  stagger,
  useIsoLayoutEffect,
  pressFx,
} from "./shared";
import { QuizHomeLink } from "./quiz-shell";

function useEnterOnChange(dep: any) {
  const [on, setOn] = useState(true);
  const first = useRef(true);
  /* useLayoutEffect + transition:none while hidden — the block is snapped
     invisible BEFORE the new content paints, then only the fade-IN animates.
     (Hiding after paint with an animated opacity produced a mere blink.) */
  useIsoLayoutEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setOn(false);
    let r2;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setOn(true));
    });
    return () => {
      if (typeof cancelAnimationFrame === "function") {
        cancelAnimationFrame(r1);
        if (r2) cancelAnimationFrame(r2);
      }
    };
  }, [dep]);
  return {
    opacity: on ? 1 : 0,
    transition: on ? "opacity 0.45s cubic-bezier(0.22, 1, 0.36, 1)" : "none",
  };
}

/** Line-art marks for the path index — one per mode, drawn in-brand. */
function IntroGlyph({ kind, active }: any) {
  const c = active ? "#B33D0E" : "rgba(221,213,196,0.78)";
  const s = { stroke: c, fill: "none", strokeWidth: 1.6 };
  return (
    <svg
      viewBox="0 0 48 48"
      width="40"
      height="40"
      aria-hidden="true"
      style={{
        display: "block",
        filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.55))",
      }}
    >
      {kind === "resume" && (
        <>
          <rect x="16" y="14" width="6" height="20" {...s} />
          <rect x="26" y="14" width="6" height="20" {...s} />
        </>
      )}
      {kind === "full" && (
        <>
          <path d="M 8 14 Q 24 10 24 14 L 24 36 Q 24 32 8 36 Z" {...s} />
          <path d="M 40 14 Q 24 10 24 14 L 24 36 Q 24 32 40 36 Z" {...s} />
          <line x1="12" y1="20" x2="20" y2="19" {...s} strokeWidth="1.2" />
          <line x1="12" y1="25" x2="20" y2="24" {...s} strokeWidth="1.2" />
          <line x1="28" y1="19" x2="36" y2="20" {...s} strokeWidth="1.2" />
          <line x1="28" y1="24" x2="36" y2="25" {...s} strokeWidth="1.2" />
        </>
      )}
      {kind === "style" && (
        <>
          <rect
            x="10"
            y="16"
            width="22"
            height="14"
            {...s}
            transform="rotate(-8 21 23)"
          />
          <rect
            x="14"
            y="18"
            width="22"
            height="14"
            {...s}
            transform="rotate(2 25 25)"
          />
          <rect
            x="18"
            y="21"
            width="22"
            height="14"
            {...s}
            transform="rotate(12 29 28)"
          />
        </>
      )}
      {kind === "budget" && (
        <>
          <line x1="10" y1="16" x2="30" y2="16" {...s} />
          <line x1="34" y1="16" x2="38" y2="16" {...s} />
          <line x1="10" y1="23" x2="27" y2="23" {...s} />
          <line x1="33" y1="23" x2="38" y2="23" {...s} />
          <line x1="10" y1="30" x2="24" y2="30" {...s} />
          <line x1="32" y1="30" x2="38" y2="30" {...s} />
          <line x1="10" y1="36" x2="38" y2="36" {...s} strokeWidth="2.4" />
        </>
      )}
      {kind === "room" && (
        <>
          <rect x="10" y="10" width="28" height="28" {...s} />
          <line
            x1="20"
            y1="10"
            x2="28"
            y2="10"
            stroke="rgba(12,10,8,0.9)"
            strokeWidth="3"
          />
          <line x1="20" y1="10" x2="20" y2="18" {...s} />
          <path
            d="M 20 18 A 8 8 0 0 0 28 10"
            {...s}
            strokeDasharray="2.5 2.5"
          />
          <line
            x1="10"
            y1="28"
            x2="20"
            y2="28"
            {...s}
            strokeWidth="1"
            opacity="0.6"
          />
        </>
      )}
    </svg>
  );
}

function PathRow({
  index,
  kind,
  label,
  sub,
  selected,
  onSelect,
  delay = 0,
  onDiscard,
}: any) {
  const shadow = "0 1px 18px rgba(0,0,0,0.7)";
  return (
    <div className="q-stagger" style={{ ...stagger(delay, 70) }}>
      <button
        type="button"
        onClick={onSelect}
        role="radio"
        aria-checked={selected}
        {...pressFx()}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "18px",
          width: "100%",
          textAlign: "left",
          padding: "16px 8px 16px 14px",
          background: "none",
          border: "none",
          borderTop: "1px solid rgba(221,213,196,0.18)",
          borderLeft: `2px solid ${selected ? "#B33D0E" : "transparent"}`,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "border-color 0.25s ease",
        }}
      >
        <span
          aria-hidden="true"
          className="q-display"
          style={{
            fontSize: "28px",
            fontWeight: 700,
            lineHeight: 1,
            color: "transparent",
            WebkitTextStroke: `1.2px ${selected ? "#B33D0E" : "rgba(240,235,224,0.72)"}`,
            flexShrink: 0,
            width: "42px",
            filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.55))",
          }}
        >
          {index}
        </span>
        <IntroGlyph kind={kind} active={selected} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span
            style={{
              display: "block",
              fontSize: "13px",
              letterSpacing: "0.2em",
              fontWeight: 700,
              color: selected ? "#B33D0E" : "#F0EBE0",
              textShadow: shadow,
            }}
          >
            {label}
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "12px",
              marginTop: "5px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                color: "rgba(240,235,224,0.7)",
                letterSpacing: "0.08em",
                textShadow: shadow,
              }}
            >
              {sub}
            </span>
            {onDiscard ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onDiscard();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onDiscard();
                  }
                }}
                style={{
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  color: "rgba(240,235,224,0.45)",
                  cursor: "pointer",
                  textShadow: shadow,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(240,235,224,0.9)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(240,235,224,0.45)")
                }
              >
                DISCARD
              </span>
            ) : null}
          </span>
        </span>
        <span
          aria-hidden="true"
          style={{
            color: "#B33D0E",
            opacity: selected ? 1 : 0,
            filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.5))",
            flexShrink: 0,
            width: "14px",
          }}
        >
          <Icon name="chevron" size={13} />
        </span>
      </button>
    </div>
  );
}

export function IntroPage({
  mode,
  onStart,
  onModeChange,
  saved,
  onResume,
  onDiscardSave,
}: any) {
  const savedCount = saved ? Object.keys(saved.answers ?? {}).length : 0;
  const hasSave = !!(saved && savedCount > 0);
  const savedLabel = saved
    ? (MODE_OPTIONS.find((o) => o.id === saved.mode)?.label ??
      saved.mode.toUpperCase())
    : "";
  const [intent, setIntent] = useState(hasSave ? "resume" : "path");
  useEffect(() => {
    setIntent(hasSave ? "resume" : "path");
  }, [hasSave]);
  const resuming = hasSave && intent === "resume";
  /* the whole editorial copy block re-enters whenever the chosen path changes */
  const copyEnter = useEnterOnChange(resuming ? "resume" : mode);

  const copy = resuming
    ? INTRO_COPY.resume
    : (INTRO_COPY[mode] ?? INTRO_COPY.full);
  const titleWords = copy.title.split(" ");
  const lastWord = titleWords.pop();
  const footer = resuming
    ? `${savedLabel} · ${savedCount} ANSWERED`
    : copy.footer;

  const go = () => {
    if (resuming) onResume();
    else onStart();
  };

  return (
    <div
      className="quiz-enter q-vh"
      style={{
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        padding: `24px 0 36px`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* giant cropped ghost word */}
      <div
        aria-hidden="true"
        className="q-display"
        style={{
          position: "absolute",
          bottom: "-6%",
          right: "-3%",
          fontSize: "clamp(120px, 26vw, 340px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: "1px #B33D0E",
          opacity: 0.07,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.04em",
        }}
      >
        {copy.ghost}
      </div>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: "10px",
          width: "fit-content",
          padding: `0 ${QUIZ_PAD_X}`,
          position: "relative",
          zIndex: 1,
          border: "none",
          boxShadow: "none",
        }}
      >
        <QuizHomeLink />
        <span
          aria-hidden="true"
          style={{ color: "rgba(221,213,196,0.45)", fontSize: "12px" }}
        >
          /
        </span>
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: "rgba(221,213,196,0.62)",
            fontWeight: 700,
          }}
        >
          {copy.eyebrow}
        </span>
      </header>

      <main
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "48px 72px",
          position: "relative",
          zIndex: 1,
          paddingTop: "36px",
          paddingBottom: "24px",
          paddingLeft: "clamp(48px, 8vw, 120px)",
          paddingRight: "clamp(48px, 8vw, 120px)",
          width: "100%",
        }}
      >
        {/* ── Left: editorial title block ── */}
        <div
          style={{ flex: "1 1 400px", minWidth: "300px", maxWidth: "640px" }}
        >
          <h1
            style={{
              fontSize: "clamp(34px, 6.4vw, 78px)",
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: 1.04,
              color: "#DDD5C4",
              marginBottom: "26px",
            }}
          >
            {titleWords.join(" ")}{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.5px #DDD5C4",
              }}
            >
              {lastWord}
            </span>
          </h1>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.75,
              color: "rgba(221,213,196,0.72)",
              letterSpacing: "0.06em",
              marginBottom: "36px",
              maxWidth: "380px",
              ...copyEnter,
            }}
          >
            {copy.body}
          </p>
          <button
            onClick={go}
            {...pressFx()}
            style={{
              backgroundColor: "#B33D0E",
              color: "#DDD5C4",
              border: "none",
              padding: "17px 44px",
              fontSize: "13px",
              letterSpacing: "0.2em",
              fontWeight: 700,
              cursor: "pointer",
              transition: "opacity 0.2s, transform 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88";
              e.currentTarget.style.transform = "translateX(4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            {resuming ? "CONTINUE" : "BEGIN"}{" "}
            <Icon name="arrow-right" size={14} style={{ marginLeft: "6px" }} />
          </button>
          <p
            style={{
              marginTop: "26px",
              fontSize: "11px",
              color: "rgba(221,213,196,0.5)",
              letterSpacing: "0.14em",
              fontWeight: 700,
              ...copyEnter,
            }}
          >
            {footer}
          </p>
        </div>

        {/* ── Right: the path index ── */}
        <div
          style={{
            flex: "1 1 420px",
            minWidth: "300px",
            maxWidth: "560px",
            minHeight: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              padding: "0 8px 6px 14px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.28em",
                color: "rgba(240,235,224,0.55)",
                fontWeight: 700,
                textShadow: "0 1px 14px rgba(0,0,0,0.7)",
              }}
            >
              CHOOSE YOUR PATH
            </span>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "rgba(240,235,224,0.4)",
                fontWeight: 700,
                textShadow: "0 1px 14px rgba(0,0,0,0.7)",
              }}
            >
              {resuming
                ? "00 / 04"
                : `${String(
                    MODE_OPTIONS.findIndex((o) => o.id === mode) + 1,
                  ).padStart(2, "0")} / 04`}
            </span>
          </div>
          <div role="radiogroup" aria-label="Choose your path">
            {hasSave && (
              <PathRow
                index="00"
                kind="resume"
                label="CONTINUE"
                sub={`${savedLabel} · ${savedCount} answered`}
                selected={resuming}
                onSelect={() => setIntent("resume")}
                onDiscard={() => {
                  setIntent("path");
                  onDiscardSave();
                  if (saved?.mode) onModeChange(saved.mode);
                }}
              />
            )}
            {MODE_OPTIONS.map((opt, i) => (
              <PathRow
                key={opt.id}
                index={String(i + 1).padStart(2, "0")}
                kind={opt.id}
                label={opt.label}
                sub={opt.sub}
                selected={!resuming && mode === opt.id}
                onSelect={() => {
                  setIntent("path");
                  onModeChange(opt.id);
                }}
                delay={hasSave ? i + 1 : i}
              />
            ))}
            <div style={{ borderTop: "1px solid rgba(221,213,196,0.18)" }} />
          </div>
        </div>
      </main>
    </div>
  );
}

// @ts-nocheck

"use client";

import { useRef, useState } from "react";
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
  const c = active ? "#B33D0E" : "rgba(221,213,196,0.55)";
  const s = { stroke: c, fill: "none", strokeWidth: 1.6 };
  return (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      aria-hidden="true"
      style={{ display: "block", transition: "opacity 0.2s" }}
    >
      {kind === "full" && (
        <>
          {/* open editorial spread */}
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
          {/* fanned swatch cards */}
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
          {/* ledger: line items and a ruled total */}
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
          {/* floor plan with a door swing */}
          <rect x="10" y="10" width="28" height="28" {...s} />
          <line
            x1="20"
            y1="10"
            x2="28"
            y2="10"
            stroke="#1a1714"
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

export function IntroPage({
  mode,
  onStart,
  onModeChange,
  saved,
  onResume,
  onDiscardSave,
}: any) {
  const savedCount = saved ? Object.keys(saved.answers ?? {}).length : 0;
  const savedLabel = saved
    ? (MODE_OPTIONS.find((o) => o.id === saved.mode)?.label ??
      saved.mode.toUpperCase())
    : "";
  /* the whole editorial copy block re-enters whenever the chosen path changes */
  const copyEnter = useEnterOnChange(mode);

  const copy = INTRO_COPY[mode] ?? INTRO_COPY.full;
  const titleWords = copy.title.split(" ");
  const lastWord = titleWords.pop();

  return (
    <div
      className="quiz-enter q-vh"
      style={{
        backgroundColor: "transparent",
        display: "flex",
        flexDirection: "column",
        padding: `24px ${QUIZ_PAD_X} 28px`,
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
          gap: "12px",
          position: "relative",
          zIndex: 1,
          border: "none",
          boxShadow: "none",
        }}
      >
        <QuizHomeLink />
        <span
          aria-hidden="true"
          style={{ color: "rgba(221,213,196,0.28)", fontSize: "12px" }}
        >
          /
        </span>
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.2em",
            color: "rgba(221,213,196,0.45)",
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
              color: "rgba(221,213,196,0.5)",
              letterSpacing: "0.06em",
              marginBottom: "36px",
              maxWidth: "380px",
              ...copyEnter,
            }}
          >
            {copy.body}
          </p>
          {saved && savedCount > 0 && (
            <div
              style={{
                border: "1.5px solid #B33D0E",
                padding: "14px 16px",
                marginBottom: "18px",
                maxWidth: "380px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
              }}
            >
              <button
                onClick={onResume}
                {...pressFx()}
                style={{
                  background: "none",
                  border: "none",
                  color: "#B33D0E",
                  fontSize: "12px",
                  letterSpacing: "0.18em",
                  fontWeight: 700,
                  cursor: "pointer",
                  textAlign: "left",
                  padding: 0,
                  transition:
                    "transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease, filter 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateX(4px)";
                  e.currentTarget.style.filter = "brightness(1.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "";
                  e.currentTarget.style.filter = "";
                }}
              >
                CONTINUE <Icon name="chevron" size={11} />
                <span
                  style={{
                    display: "block",
                    marginTop: "5px",
                    fontSize: "10px",
                    letterSpacing: "0.12em",
                    color: "rgba(221,213,196,0.45)",
                  }}
                >
                  {savedLabel} · {savedCount} ANSWERED
                </span>
              </button>
              <button
                onClick={onDiscardSave}
                {...pressFx()}
                aria-label="Discard saved progress"
                onMouseEnter={(e) =>
                  (e.currentTarget.style.color = "rgba(221,213,196,0.85)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = "rgba(221,213,196,0.35)")
                }
                style={{
                  transition:
                    "color 0.2s ease, transform 0.15s ease, opacity 0.15s ease",
                  background: "none",
                  border: "none",
                  color: "rgba(221,213,196,0.55)",
                  fontSize: "10px",
                  letterSpacing: "0.16em",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                  flexShrink: 0,
                }}
              >
                START FRESH
              </button>
            </div>
          )}
          <button
            onClick={onStart}
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
            BEGIN{" "}
            <Icon name="arrow-right" size={14} style={{ marginLeft: "6px" }} />
          </button>
          <p
            style={{
              marginTop: "26px",
              fontSize: "11px",
              color: "rgba(221,213,196,0.25)",
              letterSpacing: "0.14em",
              fontWeight: 700,
              ...copyEnter,
            }}
          >
            {copy.footer}
          </p>
        </div>

        {/* ── Right: the path index ── */}
        <div
          style={{ flex: "1 1 430px", minWidth: "320px", maxWidth: "720px" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              marginBottom: "4px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.28em",
                color: "rgba(221,213,196,0.4)",
                fontWeight: 700,
              }}
            >
              CHOOSE YOUR PATH
            </span>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "rgba(221,213,196,0.25)",
                fontWeight: 700,
              }}
            >
              {String(
                MODE_OPTIONS.findIndex((o) => o.id === mode) + 1,
              ).padStart(2, "0")}{" "}
              / 04
            </span>
          </div>
          <div role="radiogroup" aria-label="Choose your path">
            {MODE_OPTIONS.map((opt, i) => {
              const sel = mode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => onModeChange(opt.id)}
                  role="radio"
                  aria-checked={sel}
                  className="q-stagger"
                  {...pressFx(sel ? "translateX(6px)" : "translateX(0)")}
                  style={{
                    ...stagger(i, 70),
                    display: "flex",
                    alignItems: "center",
                    gap: "20px",
                    width: "100%",
                    textAlign: "left",
                    padding: "18px 14px 18px 18px",
                    background: sel ? "rgba(179,61,14,0.09)" : "none",
                    border: "none",
                    borderTop: "1px solid rgba(221,213,196,0.14)",
                    borderLeft: `2px solid ${sel ? "#B33D0E" : "transparent"}`,
                    cursor: "pointer",
                    transform: sel ? "translateX(6px)" : "translateX(0)",
                    transition:
                      "background 0.25s ease, border-color 0.25s ease, transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                  onMouseEnter={(e) => {
                    if (!sel)
                      e.currentTarget.style.background =
                        "rgba(221,213,196,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    if (!sel) e.currentTarget.style.background = "none";
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="q-display"
                    style={{
                      fontSize: "30px",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: "transparent",
                      WebkitTextStroke: `1px ${sel ? "#B33D0E" : "rgba(221,213,196,0.4)"}`,
                      flexShrink: 0,
                      width: "44px",
                      transition: "all 0.2s",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <IntroGlyph kind={opt.id} active={sel} />
                  <span style={{ flex: 1 }}>
                    <span
                      style={{
                        display: "block",
                        fontSize: "13px",
                        letterSpacing: "0.2em",
                        fontWeight: 700,
                        color: sel ? "#B33D0E" : "#DDD5C4",
                        transition: "color 0.2s",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span
                      style={{
                        display: "block",
                        fontSize: "12px",
                        color: "rgba(221,213,196,0.38)",
                        letterSpacing: "0.08em",
                        marginTop: "4px",
                      }}
                    >
                      {opt.sub}
                    </span>
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#B33D0E",
                      opacity: sel ? 1 : 0,
                      transform: sel ? "translateX(0)" : "translateX(-6px)",
                      transition: "opacity 0.2s, transform 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name="chevron" size={13} />
                  </span>
                </button>
              );
            })}
            <div style={{ borderTop: "1px solid rgba(221,213,196,0.14)" }} />
          </div>
        </div>
      </main>
    </div>
  );
}

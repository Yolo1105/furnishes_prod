"use client";

import { Component, type ReactNode } from "react";
import { QUIZ_PAD_X, Icon, pressFx } from "./shared";
import { QuizHomeLink } from "./quiz-shell";
import { QuizBgSlides } from "./quiz-bg-slides";

type BoundaryProps = { children?: ReactNode };
type BoundaryState = { error: Error | null };

const MONO =
  "var(--font-space-mono, 'Space Mono'), 'Space Mono', ui-monospace, monospace";
const DISPLAY =
  "var(--font-archivo, 'Archivo'), 'Archivo', ui-sans-serif, system-ui, sans-serif";

function HoldGlyph() {
  const s = { stroke: "#B33D0E", fill: "none", strokeWidth: 1.6 };
  return (
    <svg
      viewBox="0 0 48 48"
      width="44"
      height="44"
      aria-hidden="true"
      style={{ display: "block" }}
    >
      <rect x="12" y="12" width="24" height="24" {...s} />
      <line x1="20" y1="18" x2="20" y2="30" {...s} />
      <line x1="28" y1="18" x2="28" y2="30" {...s} />
    </svg>
  );
}

function QuizErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      className="style-explorer-root"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        overscrollBehavior: "none",
        backgroundColor: "#1a1714",
        color: "#DDD5C4",
        display: "flex",
        flexDirection: "column",
        padding: `24px ${QUIZ_PAD_X} 28px`,
        fontFamily: MONO,
        WebkitFontSmoothing: "antialiased",
        zIndex: 20,
      }}
    >
      <style>{`
        html, body {
          background-color: #1a1714 !important;
          height: 100%;
          width: 100%;
          overflow: hidden;
          overscroll-behavior: none;
        }
      `}</style>
      <QuizBgSlides />

      <div
        aria-hidden="true"
        className="q-display"
        style={{
          position: "absolute",
          bottom: "-6%",
          right: "-3%",
          fontFamily: DISPLAY,
          fontStretch: "112%",
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
        HOLD
      </div>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          position: "relative",
          zIndex: 1,
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
          DESIGN QUIZ
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
        <div
          style={{ flex: "1 1 400px", minWidth: "300px", maxWidth: "640px" }}
        >
          <h1
            className="q-display"
            style={{
              fontFamily: DISPLAY,
              fontStretch: "112%",
              fontSize: "clamp(34px, 6.4vw, 78px)",
              fontWeight: 700,
              letterSpacing: "0.02em",
              lineHeight: 1.04,
              color: "#DDD5C4",
              margin: "0 0 26px",
            }}
          >
            THE QUIZ HIT{" "}
            <span
              style={{
                color: "transparent",
                WebkitTextStroke: "1.5px #DDD5C4",
              }}
            >
              A SNAG
            </span>
          </h1>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.75,
              color: "rgba(221,213,196,0.5)",
              letterSpacing: "0.06em",
              margin: "0 0 36px",
              maxWidth: "380px",
            }}
          >
            Your saved progress is untouched. Pick up the same path, the same
            answers, the same room — nothing was lost.
          </p>
          <button
            type="button"
            onClick={onRetry}
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
              fontFamily: "inherit",
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
            TRY AGAIN{" "}
            <Icon name="arrow-right" size={14} style={{ marginLeft: "6px" }} />
          </button>
          <p
            style={{
              margin: "26px 0 0",
              fontSize: "11px",
              color: "rgba(221,213,196,0.25)",
              letterSpacing: "0.14em",
              fontWeight: 700,
            }}
          >
            PROGRESS KEPT · NOTHING WAS LOST
          </p>
        </div>

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
              STILL HERE
            </span>
            <span
              style={{
                fontSize: "10px",
                letterSpacing: "0.18em",
                color: "rgba(221,213,196,0.25)",
                fontWeight: 700,
              }}
            >
              01 / 01
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "20px",
              width: "100%",
              padding: "18px 14px 18px 18px",
              background: "rgba(179,61,14,0.09)",
              borderTop: "1px solid rgba(221,213,196,0.14)",
              borderBottom: "1px solid rgba(221,213,196,0.14)",
              borderLeft: "2px solid #B33D0E",
              transform: "translateX(6px)",
            }}
          >
            <span
              aria-hidden="true"
              className="q-display"
              style={{
                fontFamily: DISPLAY,
                fontStretch: "112%",
                fontSize: "30px",
                fontWeight: 700,
                lineHeight: 1,
                color: "transparent",
                WebkitTextStroke: "1px #B33D0E",
                flexShrink: 0,
                width: "44px",
              }}
            >
              01
            </span>
            <HoldGlyph />
            <span style={{ flex: 1 }}>
              <span
                style={{
                  display: "block",
                  fontSize: "13px",
                  letterSpacing: "0.2em",
                  fontWeight: 700,
                  color: "#B33D0E",
                }}
              >
                PLACE SAVED
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
                Answers kept on this device
              </span>
            </span>
            <span
              aria-hidden="true"
              style={{ color: "#B33D0E", flexShrink: 0 }}
            >
              <Icon name="chevron" size={13} />
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}

export class QuizErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }
  override render() {
    if (!this.state.error) return this.props.children;
    return <QuizErrorScreen onRetry={() => this.setState({ error: null })} />;
  }
}

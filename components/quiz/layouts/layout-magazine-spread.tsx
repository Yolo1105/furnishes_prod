"use client";

import type { LayoutProps } from "./types";

export function LayoutMagazineSpread({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const opts = question.options ?? [];

  return (
    <div
      className="flex flex-1 flex-col"
      role="group"
      aria-labelledby="q-text"
      style={{ overflow: "hidden" }}
    >
      {/* Header strip */}
      <div
        style={{
          padding: "28px 28px 20px",
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          display: "flex",
          alignItems: "flex-end",
          gap: "24px",
        }}
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(22px, 4vw, 44px)",
            fontWeight: 700,
            letterSpacing: "0.06em",
            lineHeight: 1.05,
            flex: 1,
          }}
        >
          {question.question}
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.45,
              fontSize: "10px",
              letterSpacing: "0.12em",
              maxWidth: "220px",
              lineHeight: 1.6,
              textAlign: "right",
              flexShrink: 0,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      {/* Option rows */}
      <div className="flex flex-1 flex-col">
        {opts.map((opt, i) => {
          const sel = answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                gap: "0",
                borderBottom: `1px solid rgba(255,255,255,0.07)`,
                backgroundColor: sel ? question.accent : "transparent",
                cursor: "pointer",
                fontFamily: "inherit",
                padding: "0",
                transition: "background-color 0.22s",
                minHeight: "52px",
              }}
            >
              {/* Index number — big and ghosted */}
              <div
                aria-hidden="true"
                style={{
                  width: "72px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(28px, 5vw, 56px)",
                  fontWeight: 700,
                  letterSpacing: "-0.04em",
                  color: sel ? question.bg : question.accent,
                  opacity: sel ? 0.25 : 0.12,
                  lineHeight: 1,
                  transition: "all 0.22s",
                  userSelect: "none",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>

              {/* Divider */}
              <div
                style={{
                  width: "1px",
                  alignSelf: "stretch",
                  backgroundColor: sel
                    ? `rgba(255,255,255,0.2)`
                    : `rgba(255,255,255,0.08)`,
                  transition: "background-color 0.22s",
                  flexShrink: 0,
                  margin: "10px 0",
                }}
              />

              {/* Label + sublabel */}
              <div style={{ flex: 1, padding: "0 24px", textAlign: "left" }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "clamp(12px, 1.8vw, 16px)",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: sel ? question.bg : `rgba(255,255,255,0.82)`,
                    transition: "color 0.22s",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "10px",
                      letterSpacing: "0.08em",
                      color: sel ? question.bg : `rgba(255,255,255,0.4)`,
                      marginTop: "3px",
                      fontWeight: 400,
                      transition: "color 0.22s",
                    }}
                  >
                    {opt.sublabel}
                  </span>
                )}
              </div>

              {/* Selected tick */}
              <div
                style={{
                  width: "48px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  opacity: sel ? 1 : 0,
                  transition: "opacity 0.22s",
                }}
              >
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path
                    d="M1 5L4.5 8.5L11 1"
                    stroke={question.bg}
                    strokeWidth="1.5"
                    strokeLinecap="square"
                  />
                </svg>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Split Typewriter ────────────────────────────────────────────────────
// Tall left panel with giant question text, compact stacked options on the right

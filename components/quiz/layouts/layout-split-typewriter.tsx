"use client";

import { useState, useEffect } from "react";
import type { LayoutProps } from "./types";

export function LayoutSplitTypewriter({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const opts = question.options ?? [];
  const [cursorVisible, setCursorVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => setCursorVisible((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex flex-1 flex-col md:flex-row"
      role="group"
      aria-labelledby="q-text"
      style={{ overflow: "hidden" }}
    >
      {/* Left: question text takes most of the vertical space */}
      <div
        style={{
          flex: "1 1 55%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          padding: "28px 28px 28px",
          borderRight: `1px solid rgba(255,255,255,0.08)`,
          position: "relative",
        }}
      >
        {/* Ghost large question number */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "16px",
            left: "22px",
            fontSize: "clamp(80px, 18vw, 180px)",
            fontWeight: 700,
            letterSpacing: "-0.05em",
            color: "transparent",
            WebkitTextStroke: `1px ${question.accent}`,
            opacity: 0.07,
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
          }}
        >
          ?
        </div>
        <div
          style={{
            fontSize: "9px",
            letterSpacing: "0.22em",
            fontWeight: 700,
            color: question.accent,
            opacity: 0.4,
            marginBottom: "14px",
          }}
        >
          {question.flow?.toUpperCase()} / {question.section}
        </div>
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(20px, 4vw, 46px)",
            fontWeight: 700,
            letterSpacing: "0.04em",
            lineHeight: 1.15,
            position: "relative",
            zIndex: 1,
          }}
        >
          {question.question}
          <span
            aria-hidden="true"
            style={{
              display: "inline-block",
              width: "3px",
              height: "0.85em",
              backgroundColor: question.accent,
              marginLeft: "6px",
              verticalAlign: "middle",
              opacity: cursorVisible ? 1 : 0,
              transition: "opacity 0.1s",
            }}
          />
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.45,
              fontSize: "10px",
              letterSpacing: "0.12em",
              marginTop: "12px",
              lineHeight: 1.6,
              position: "relative",
              zIndex: 1,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      {/* Right: compact option stack */}
      <div
        style={{
          flex: "0 0 auto",
          width: "100%",
          maxWidth: "340px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "24px 28px",
          gap: "0",
        }}
      >
        {opts.map((opt, i) => {
          const sel = answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onAnswer(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                padding: "14px 0",
                borderBottom: `1px solid rgba(255,255,255,0.07)`,
                background: "none",
                border: "none",
                borderBottomColor: "rgba(255,255,255,0.07)",
                borderBottomStyle: "solid",
                borderBottomWidth: "1px",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                transition: "opacity 0.18s",
              }}
            >
              {/* Radio dot */}
              <div
                style={{
                  width: "16px",
                  height: "16px",
                  border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.28)"}`,
                  borderRadius: "50%",
                  backgroundColor: sel ? question.accent : "transparent",
                  flexShrink: 0,
                  transition: "all 0.18s",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {sel && (
                  <div
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      backgroundColor: question.bg,
                    }}
                  />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <span
                  style={{
                    display: "block",
                    fontSize: "11px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: sel ? question.accent : "rgba(255,255,255,0.75)",
                    transition: "color 0.18s",
                    lineHeight: 1.3,
                  }}
                >
                  {opt.label}
                </span>
                {opt.sublabel && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "9px",
                      color: sel ? question.accent : "rgba(255,255,255,0.35)",
                      letterSpacing: "0.08em",
                      marginTop: "2px",
                      fontWeight: 400,
                      transition: "color 0.18s",
                    }}
                  >
                    {opt.sublabel}
                  </span>
                )}
              </div>
              <span
                style={{
                  fontSize: "9px",
                  color: "rgba(255,255,255,0.2)",
                  letterSpacing: "0.08em",
                  fontWeight: 700,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Pinboard ────────────────────────────────────────────────────────────
// Options as slightly rotated "pinned card" tiles — great for mood/feature selection

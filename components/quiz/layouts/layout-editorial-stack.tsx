"use client";

import type { LayoutProps } from "./types";
import { LayoutSliders } from "./layout-sliders";

export function LayoutEditorialStack({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  if (question.type === "sliders") {
    return (
      <LayoutSliders question={question} answer={answer} onAnswer={onAnswer} />
    );
  }

  const opts = question.options ?? [];
  return (
    <div
      className="flex flex-1 flex-col justify-center"
      style={{ padding: "20px 28px" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          display: "flex",
          gap: "32px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 280px", minWidth: "220px" }}>
          <div
            aria-hidden="true"
            style={{
              fontSize: "clamp(48px, 10vw, 100px)",
              fontWeight: 700,
              color: question.accent,
              opacity: 0.18,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              marginBottom: "12px",
            }}
          >
            ·
          </div>
          <h1
            id="q-text"
            style={{
              color: question.accent,
              fontSize: "clamp(15px, 2.2vw, 22px)",
              letterSpacing: "0.08em",
              fontWeight: 700,
              lineHeight: 1.35,
            }}
          >
            {question.question}
          </h1>
        </div>
        <div
          style={{
            flex: "1 1 240px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
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
                  gap: "12px",
                  border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                  backgroundColor: sel ? question.accent : "transparent",
                  color: sel ? question.bg : "rgba(255,255,255,0.8)",
                  padding: "16px 18px",
                  fontSize: "11px",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.22s",
                  textAlign: "left",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    opacity: sel ? 0.6 : 0.3,
                    letterSpacing: "0.1em",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Layout: Full-bleed statement ────────────────────────────────────────────

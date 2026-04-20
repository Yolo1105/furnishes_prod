"use client";

import type { LayoutProps } from "./types";

export function LayoutVerticalSplit({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const opts = question.options ?? [];
  return (
    <div className="flex flex-1 flex-col" role="group" aria-labelledby="q-text">
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 17px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          padding: "32px 28px 24px",
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </h1>
      <div className="flex flex-1">
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
                alignItems: "flex-end",
                justifyContent: "flex-start",
                padding: "20px 14px",
                backgroundColor: sel
                  ? question.accent
                  : i % 2 === 0
                    ? "rgba(0,0,0,0.06)"
                    : "transparent",
                borderLeft: i > 0 ? `1px solid rgba(255,255,255,0.12)` : "none",
                color: sel ? question.bg : "rgba(255,255,255,0.75)",
                fontSize: "10px",
                letterSpacing: "0.14em",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.25s",
                writingMode: "vertical-rl",
                textOrientation: "mixed",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Layout: Offset composition ───────────────────────────────────────────────

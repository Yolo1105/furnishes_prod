"use client";

import type { LayoutProps } from "./types";
import { OptionPill } from "./shared";

export function LayoutOffsetComposition({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const opts = question.options ?? [];
  return (
    <div
      className="relative flex-1"
      role="group"
      aria-labelledby="q-text"
      style={{ minHeight: "400px" }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "10%",
          left: "-2%",
          fontSize: "clamp(120px, 22vw, 260px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.07,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.05em",
        }}
      >
        05
      </div>
      <h1
        id="q-text"
        style={{
          position: "absolute",
          top: "28px",
          right: "28px",
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 16px)",
          letterSpacing: "0.10em",
          fontWeight: 700,
          maxWidth: "280px",
          textAlign: "right",
          lineHeight: 1.5,
          zIndex: 2,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          right: "28px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          zIndex: 2,
        }}
      >
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={answer === opt.id}
            accent={question.accent}
            bg={question.bg}
            onClick={() => onAnswer(opt.id)}
            style={{ textAlign: "right" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Layout: Giant type, small options ────────────────────────────────────────

"use client";

import type { LayoutProps } from "./types";
import { OptionPill } from "./shared";
import { LayoutFreeText } from "./layout-free-text";

export function LayoutFullBleedStatement({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  if (question.type === "free-text") {
    return (
      <LayoutFreeText question={question} answer={answer} onAnswer={onAnswer} />
    );
  }

  const opts = question.options ?? [];
  return (
    <div
      className="relative flex flex-1 flex-col justify-center"
      style={{ padding: "0 28px" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "clamp(60px, 16vw, 180px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.05,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.04em",
          lineHeight: 1,
        }}
      >
        FEEL
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(24px, 5vw, 56px)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          maxWidth: "520px",
          marginBottom: "36px",
          position: "relative",
          zIndex: 1,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          position: "relative",
          zIndex: 1,
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
          />
        ))}
      </div>
    </div>
  );
}

// ─── NEW: Image Grid ──────────────────────────────────────────────────────────

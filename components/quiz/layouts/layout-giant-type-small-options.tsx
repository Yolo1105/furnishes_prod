"use client";

import type { LayoutProps } from "./types";
import { OptionPill } from "./shared";

export function LayoutGiantTypeSmallOptions({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const opts = question.options ?? [];
  const firstWord = question.question.split(" ")[0];
  return (
    <div
      className="flex flex-1 flex-col justify-between"
      style={{ padding: "20px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          fontSize: "clamp(60px, 14vw, 160px)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: question.accent,
          lineHeight: 0.95,
          userSelect: "none",
          opacity: 0.9,
        }}
      >
        {firstWord}
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "12px",
          letterSpacing: "0.14em",
          fontWeight: 700,
          margin: "16px 0 20px",
          opacity: 0.7,
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "8px",
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
            style={{ display: "block", width: "100%", textAlign: "left" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Layout: Two-column grid ──────────────────────────────────────────────────

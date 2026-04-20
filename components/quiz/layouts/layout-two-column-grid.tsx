"use client";

import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";
import { LayoutImageGrid } from "./layout-image-grid";

export function LayoutTwoColumnGrid({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const isMulti =
    question.type === "multi-select" || question.type === "image-grid";
  const selected = isMulti ? ((answer as MultiAnswer) ?? []) : null;

  const toggle = (id: string) => {
    if (isMulti) {
      const cur = (answer as MultiAnswer) ?? [];
      onAnswer(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    } else {
      onAnswer(id);
    }
  };

  // For image-grid type, use image cards
  if (question.type === "image-grid") {
    return (
      <LayoutImageGrid
        question={question}
        answer={answer}
        onAnswer={onAnswer}
      />
    );
  }

  const opts = question.options ?? [];
  return (
    <div
      className="flex flex-1 flex-col"
      style={{ padding: "28px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(14px, 2vw, 20px)",
          letterSpacing: "0.10em",
          fontWeight: 700,
          marginBottom: "28px",
          lineHeight: 1.4,
          maxWidth: "480px",
        }}
      >
        {question.question}
      </h1>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "10px",
          flex: 1,
          maxHeight: "340px",
        }}
      >
        {opts.map((opt) => {
          const sel = isMulti
            ? (selected as string[]).includes(opt.id)
            : answer === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role="radio"
              aria-checked={sel}
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "flex-end",
                padding: "18px",
                border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                backgroundColor: sel
                  ? question.accent
                  : "rgba(255,255,255,0.04)",
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "11px",
                letterSpacing: "0.12em",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.22s",
                textAlign: "left",
                lineHeight: 1.4,
                minHeight: "80px",
              }}
            >
              <span style={{ display: "block" }}>{opt.label}</span>
              {opt.sublabel && (
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    opacity: 0.65,
                    marginTop: "4px",
                    letterSpacing: "0.08em",
                    fontWeight: 400,
                    lineHeight: 1.5,
                  }}
                >
                  {opt.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Layout: Hover-reactive ───────────────────────────────────────────────────

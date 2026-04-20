"use client";

import { useState } from "react";
import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutHoverReactive({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const isMulti = question.type === "multi-select";
  const selected = isMulti ? ((answer as MultiAnswer) ?? []) : null;

  const toggle = (id: string) => {
    if (isMulti) {
      const cur = (answer as MultiAnswer) ?? [];
      onAnswer(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    } else {
      onAnswer(id);
    }
  };

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
          padding: "24px 28px 16px",
          lineHeight: 1.5,
        }}
      >
        {question.question}
      </h1>
      <div className="flex flex-1 flex-col">
        {opts.map((opt, i) => {
          const sel = isMulti
            ? (selected as string[]).includes(opt.id)
            : answer === opt.id;
          const isHov = hovered === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              role="radio"
              aria-checked={sel}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                paddingLeft: "28px",
                borderTop: `1px solid rgba(255,255,255,0.1)`,
                backgroundColor: sel
                  ? question.accent
                  : isHov
                    ? "rgba(255,255,255,0.05)"
                    : "transparent",
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "clamp(12px, 1.8vw, 16px)",
                letterSpacing: "0.12em",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                textAlign: "left",
                minHeight: "48px",
              }}
            >
              <span
                style={{
                  marginRight: "16px",
                  fontSize: "10px",
                  opacity: 0.4,
                  letterSpacing: "0.06em",
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
  );
}

// ─── Layout: Editorial stack ──────────────────────────────────────────────────

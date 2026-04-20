"use client";

import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";
import { OptionPill } from "./shared";

export function LayoutGhostType({ question, answer, onAnswer }: LayoutProps) {
  const isMulti = question.type === "multi-select";
  const selected = isMulti
    ? ((answer as MultiAnswer) ?? [])
    : typeof answer === "string"
      ? answer
      : null;

  const toggle = (id: string) => {
    if (isMulti) {
      const cur = (answer as MultiAnswer) ?? [];
      onAnswer(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
    } else {
      onAnswer(id);
    }
  };

  const words = question.question.split(" ");
  const ghostWord = words[0];
  const opts = question.options ?? [];

  return (
    <div
      className="relative flex flex-1 flex-col justify-end"
      style={{ padding: "0 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: "clamp(80px, 18vw, 200px)",
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: "transparent",
          WebkitTextStroke: `1px ${question.accent}`,
          opacity: 0.12,
          whiteSpace: "nowrap",
          userSelect: "none",
          pointerEvents: "none",
          lineHeight: 1,
        }}
      >
        {ghostWord}
      </div>
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 18px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          marginBottom: "32px",
          lineHeight: 1.4,
          position: "relative",
          zIndex: 1,
        }}
      >
        {question.question}
      </h1>
      <div className="relative z-10 mb-8 flex flex-wrap gap-3 pb-0">
        {opts.map((opt) => (
          <OptionPill
            key={opt.id}
            label={opt.label}
            selected={
              isMulti
                ? (selected as string[]).includes(opt.id)
                : selected === opt.id
            }
            accent={question.accent}
            bg={question.bg}
            onClick={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Layout: Scattered chips ──────────────────────────────────────────────────

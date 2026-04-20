"use client";

import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";
import { OptionPill } from "./shared";

export function LayoutScatteredChips({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
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

  const opts = question.options ?? [];

  // For many options (> 6), fall back to a wrapping flow layout
  if (opts.length > 6) {
    return (
      <div
        className="flex flex-1 flex-col"
        style={{ padding: "24px 28px 0" }}
        role="group"
        aria-labelledby="q-text"
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(13px, 2vw, 16px)",
            letterSpacing: "0.12em",
            fontWeight: 700,
            marginBottom: "28px",
            lineHeight: 1.4,
          }}
        >
          {question.question}
        </h1>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
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

  const positions = [
    { top: "20%", left: "8%", rotate: "-2deg" },
    { top: "28%", left: "48%", rotate: "1deg" },
    { top: "42%", left: "22%", rotate: "-1deg" },
    { top: "55%", left: "58%", rotate: "2deg" },
    { top: "68%", left: "10%", rotate: "-1.5deg" },
    { top: "72%", left: "42%", rotate: "0.5deg" },
  ];

  return (
    <div
      className="relative flex-1"
      style={{ minHeight: "420px" }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          position: "absolute",
          top: "28px",
          left: "28px",
          color: question.accent,
          fontSize: "clamp(13px, 2vw, 16px)",
          letterSpacing: "0.12em",
          fontWeight: 700,
          maxWidth: "260px",
          lineHeight: 1.4,
          zIndex: 2,
        }}
      >
        {question.question}
      </h1>
      {opts.map((opt, i) => {
        const pos = positions[i] || {};
        const sel = isMulti
          ? (selected as string[]).includes(opt.id)
          : selected === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => toggle(opt.id)}
            role="radio"
            aria-checked={sel}
            style={{
              position: "absolute",
              top: pos.top,
              left: pos.left,
              transform: `rotate(${pos.rotate || "0deg"})`,
              border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.28)"}`,
              backgroundColor: sel ? question.accent : "transparent",
              color: sel ? question.bg : "rgba(255,255,255,0.85)",
              padding: "10px 18px",
              fontSize: "10px",
              letterSpacing: "0.16em",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              zIndex: 2,
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Layout: Vertical split ───────────────────────────────────────────────────

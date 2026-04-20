"use client";

import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutPinboard({ question, answer, onAnswer }: LayoutProps) {
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

  // Precompute stable rotations per index
  const rotations = [
    -2.2, 1.5, -1, 2.8, -0.6, 1.8, -2, 0.8, -1.6, 2.2, -0.4, 1.2, -2.5, 1, -0.8,
    2, -1.4, 0.6, -2.1, 1.7, 0.3,
  ];

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ padding: "20px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "24px",
        }}
      >
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(14px, 2.2vw, 20px)",
            fontWeight: 700,
            letterSpacing: "0.1em",
            lineHeight: 1.3,
          }}
        >
          {question.question}
        </h1>
        {question.subtext && (
          <p
            style={{
              color: question.accent,
              opacity: 0.4,
              fontSize: "9px",
              letterSpacing: "0.12em",
              marginLeft: "20px",
              flexShrink: 0,
              fontWeight: 700,
            }}
          >
            {question.subtext}
          </p>
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignContent: "flex-start",
        }}
      >
        {opts.map((opt, i) => {
          const sel = isMulti
            ? (selected as string[]).includes(opt.id)
            : answer === opt.id;
          const rot = rotations[i % rotations.length];

          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              role={isMulti ? "checkbox" : "radio"}
              aria-checked={sel}
              style={{
                position: "relative",
                padding: "14px 18px 18px",
                backgroundColor: sel
                  ? question.accent
                  : `rgba(255,255,255,0.06)`,
                border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                color: sel ? question.bg : "rgba(255,255,255,0.8)",
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                cursor: "pointer",
                fontFamily: "inherit",
                transform: `rotate(${rot}deg)`,
                transition: "all 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transformOrigin: "center center",
                whiteSpace: "nowrap",
                boxShadow: sel
                  ? `2px 3px 0 rgba(0,0,0,0.25)`
                  : `1px 2px 0 rgba(0,0,0,0.15)`,
              }}
              onMouseEnter={(e) => {
                if (!sel) {
                  e.currentTarget.style.transform = `rotate(${rot * 0.3}deg) translateY(-2px)`;
                }
              }}
              onMouseLeave={(e) => {
                if (!sel) {
                  e.currentTarget.style.transform = `rotate(${rot}deg)`;
                }
              }}
            >
              {/* Pin dot */}
              <div
                aria-hidden="true"
                style={{
                  position: "absolute",
                  top: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: sel ? question.bg : question.accent,
                  opacity: sel ? 0.5 : 0.35,
                  transition: "all 0.22s",
                }}
              />
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Grouped Checklist ───────────────────────────────────────────────────

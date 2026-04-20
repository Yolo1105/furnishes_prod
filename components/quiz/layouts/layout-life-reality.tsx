"use client";

import { LifeRealityAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutLifeReality({ question, answer, onAnswer }: LayoutProps) {
  const groups = question.lifeRealityGroups ?? [];
  const current = (answer as LifeRealityAnswer) ?? {};

  const choose = (groupId: string, optionId: string) => {
    onAnswer({ ...current, [groupId]: optionId });
  };

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ padding: "20px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <h1
        id="q-text"
        style={{
          color: question.accent,
          fontSize: "clamp(18px, 3vw, 32px)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginBottom: question.subtext ? "6px" : "28px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.55,
            fontSize: "11px",
            letterSpacing: "0.1em",
            marginBottom: "28px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {groups.map((group) => (
          <div key={group.id}>
            <span
              style={{
                display: "block",
                fontSize: "9px",
                letterSpacing: "0.22em",
                fontWeight: 700,
                color: question.accent,
                opacity: 0.5,
                marginBottom: "10px",
              }}
            >
              {group.label}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {group.options.map((opt) => {
                const sel = current[group.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(group.id, opt.id)}
                    role="radio"
                    aria-checked={sel}
                    style={{
                      border: `1.5px solid ${sel ? question.accent : "rgba(255,255,255,0.2)"}`,
                      backgroundColor: sel ? question.accent : "transparent",
                      color: sel ? question.bg : "rgba(255,255,255,0.75)",
                      padding: "9px 16px",
                      fontSize: "10px",
                      letterSpacing: "0.12em",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.18s",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── NEW: Free Text ───────────────────────────────────────────────────────────

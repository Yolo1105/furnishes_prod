"use client";

import {
  CategoryPriorityAnswer,
  BUDGET_PRIORITY_OPTIONS,
} from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutCategoryPriority({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const cats = question.categories ?? [];
  const current = (answer as CategoryPriorityAnswer) ?? {};

  const choose = (catId: string, optId: string) => {
    onAnswer({ ...current, [catId]: optId });
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
          fontSize: "clamp(16px, 2.5vw, 28px)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          marginBottom: question.subtext ? "6px" : "24px",
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
            marginBottom: "24px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
        {cats.map((cat, i) => (
          <div
            key={cat.id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              borderTop: `1px solid rgba(255,255,255,0.08)`,
              padding: "12px 0",
              borderBottom:
                i === cats.length - 1
                  ? `1px solid rgba(255,255,255,0.08)`
                  : "none",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: question.accent,
                minWidth: "160px",
              }}
            >
              {cat.label}
            </span>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {BUDGET_PRIORITY_OPTIONS.map((opt) => {
                const sel = current[cat.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => choose(cat.id, opt.id)}
                    style={{
                      border: `1px solid ${sel ? question.accent : "rgba(255,255,255,0.18)"}`,
                      backgroundColor: sel ? question.accent : "transparent",
                      color: sel ? "#1a1714" : "rgba(255,255,255,0.55)",
                      padding: "6px 12px",
                      fontSize: "9px",
                      letterSpacing: "0.14em",
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

// ─── NEW: Category Spend ──────────────────────────────────────────────────────

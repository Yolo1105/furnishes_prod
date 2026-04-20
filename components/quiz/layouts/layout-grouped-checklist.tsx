"use client";

import { GroupedChecklistAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutGroupedChecklist({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const groups = question.checklistGroups ?? [];
  const selected = (answer as GroupedChecklistAnswer) ?? [];

  const toggle = (id: string) => {
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    onAnswer(next);
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "24px",
        }}
      >
        {groups.map((group) => (
          <div key={group.id}>
            <span
              style={{
                display: "block",
                fontSize: "9px",
                letterSpacing: "0.22em",
                fontWeight: 700,
                color: question.accent,
                opacity: 0.45,
                marginBottom: "10px",
                borderBottom: `1px solid rgba(0,0,0,0.1)`,
                paddingBottom: "8px",
              }}
            >
              {group.label}
            </span>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {group.items.map((item) => {
                const sel = selected.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    role="checkbox"
                    aria-checked={sel}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 0",
                      fontFamily: "inherit",
                      textAlign: "left",
                    }}
                  >
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: `1.5px solid ${sel ? question.accent : "rgba(0,0,0,0.3)"}`,
                        backgroundColor: sel ? question.accent : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                        transition: "all 0.18s",
                      }}
                    >
                      {sel && (
                        <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                          <path
                            d="M1 3L3 5L7 1"
                            stroke={question.bg}
                            strokeWidth="1.5"
                            strokeLinecap="square"
                          />
                        </svg>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        color: sel ? question.accent : "rgba(0,0,0,0.65)",
                        transition: "color 0.18s",
                      }}
                    >
                      {item.label}
                    </span>
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

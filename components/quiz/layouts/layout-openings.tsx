"use client";

import { OpeningsAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

const OPENING_TYPES = [
  "Single Door",
  "Double Door",
  "Sliding Door",
  "Standard Window",
  "Floor-to-Ceiling Window",
  "Bay Window",
];
const WALLS = ["N", "S", "E", "W"];

export function LayoutOpenings({ question, answer, onAnswer }: LayoutProps) {
  const current = (answer as OpeningsAnswer) ?? [];

  const addOpening = () => {
    onAnswer([...current, { type: OPENING_TYPES[0], wall: "N" }]);
  };

  const updateOpening = (i: number, field: "type" | "wall", val: string) => {
    const next = current.map((o, idx) =>
      idx === i ? { ...o, [field]: val } : o,
    );
    onAnswer(next);
  };

  const removeOpening = (i: number) => {
    onAnswer(current.filter((_, idx) => idx !== i));
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
          fontSize: "clamp(22px, 4vw, 40px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {question.question}
      </h1>
      {question.subtext && (
        <p
          style={{
            color: question.accent,
            opacity: 0.5,
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
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          marginBottom: "16px",
        }}
      >
        {current.map((opening, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              border: `1px solid rgba(255,255,255,0.15)`,
              padding: "10px 14px",
            }}
          >
            <select
              value={opening.type}
              onChange={(e) => updateOpening(i, "type", e.target.value)}
              aria-label="Opening type"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: question.accent,
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                fontFamily: "inherit",
                cursor: "pointer",
              }}
            >
              {OPENING_TYPES.map((t) => (
                <option
                  key={t}
                  value={t}
                  style={{ backgroundColor: "#1a1714", color: question.accent }}
                >
                  {t.toUpperCase()}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: "4px" }}>
              {WALLS.map((w) => (
                <button
                  key={w}
                  onClick={() => updateOpening(i, "wall", w)}
                  style={{
                    width: "28px",
                    height: "28px",
                    border: `1px solid ${opening.wall === w ? question.accent : "rgba(255,255,255,0.2)"}`,
                    backgroundColor:
                      opening.wall === w ? question.accent : "transparent",
                    color:
                      opening.wall === w ? "#1a1714" : "rgba(255,255,255,0.55)",
                    fontSize: "9px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    letterSpacing: "0.1em",
                    transition: "all 0.18s",
                  }}
                >
                  {w}
                </button>
              ))}
            </div>
            <button
              onClick={() => removeOpening(i)}
              aria-label="Remove opening"
              style={{
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.3)",
                cursor: "pointer",
                fontSize: "16px",
                lineHeight: 1,
                padding: "0 4px",
                fontFamily: "inherit",
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addOpening}
        style={{
          border: `1.5px dashed rgba(255,255,255,0.25)`,
          backgroundColor: "transparent",
          color: "rgba(255,255,255,0.5)",
          padding: "14px 20px",
          fontSize: "10px",
          letterSpacing: "0.18em",
          fontWeight: 700,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all 0.2s",
          alignSelf: "flex-start",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = question.accent;
          e.currentTarget.style.color = question.accent;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
          e.currentTarget.style.color = "rgba(255,255,255,0.5)";
        }}
      >
        + ADD OPENING
      </button>
    </div>
  );
}

// ─── NEW: Magazine Spread ─────────────────────────────────────────────────────
// Large index number + full-width row per option — editorial newspaper feel

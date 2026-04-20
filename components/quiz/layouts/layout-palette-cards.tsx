"use client";

import type { LayoutProps } from "./types";

export function LayoutPaletteCards({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const cards = question.paletteCards ?? [];

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
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
          flex: 1,
        }}
      >
        {cards.map((card) => {
          const sel = answer === card.id;
          return (
            <button
              key={card.id}
              onClick={() => onAnswer(card.id)}
              role="radio"
              aria-checked={sel}
              style={{
                display: "flex",
                flexDirection: "column",
                border: `2px solid ${sel ? question.accent : "rgba(255,255,255,0.12)"}`,
                backgroundColor: sel ? "rgba(255,255,255,0.06)" : "transparent",
                cursor: "pointer",
                padding: "14px",
                transition: "all 0.2s",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              {/* Swatches */}
              <div
                style={{ display: "flex", gap: "3px", marginBottom: "10px" }}
              >
                {card.swatches.map((hex, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: "28px",
                      backgroundColor: hex,
                    }}
                  />
                ))}
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: sel ? question.accent : "rgba(255,255,255,0.7)",
                  transition: "color 0.2s",
                }}
              >
                {card.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Binary Pairs ────────────────────────────────────────────────────────

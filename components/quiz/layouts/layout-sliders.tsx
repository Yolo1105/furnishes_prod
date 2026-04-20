"use client";

import { SlidersAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutSliders({ question, answer, onAnswer }: LayoutProps) {
  const sliders = question.sliders ?? [];
  const current = (answer as SlidersAnswer) ?? {};

  const setValue = (id: string, val: number) => {
    onAnswer({ ...current, [id]: val });
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
          marginBottom: question.subtext ? "6px" : "32px",
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
            marginBottom: "32px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
        {sliders.map((slider) => {
          const val = current[slider.id] ?? 50;
          return (
            <div key={slider.id}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.18em",
                    fontWeight: 700,
                    color: question.accent,
                    opacity: 0.5,
                  }}
                >
                  {slider.label}
                </span>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={val}
                  onChange={(e) => setValue(slider.id, Number(e.target.value))}
                  aria-label={slider.label}
                  style={{
                    width: "100%",
                    appearance: "none",
                    height: "2px",
                    background: `linear-gradient(to right, ${question.accent} 0%, ${question.accent} ${val}%, rgba(255,255,255,0.2) ${val}%, rgba(255,255,255,0.2) 100%)`,
                    outline: "none",
                    cursor: "pointer",
                  }}
                />
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginTop: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                  }}
                >
                  {slider.leftLabel}
                </span>
                <span
                  style={{
                    fontSize: "9px",
                    letterSpacing: "0.1em",
                    color: "rgba(255,255,255,0.4)",
                    fontWeight: 700,
                  }}
                >
                  {slider.rightLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Life Reality (3 grouped single-selects) ─────────────────────────────

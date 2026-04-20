"use client";

import { BinaryPairsAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutBinaryPairs({ question, answer, onAnswer }: LayoutProps) {
  const pairs = question.binaryPairs ?? [];
  const current = (answer as BinaryPairsAnswer) ?? {};

  const choose = (pairId: string, side: "left" | "right") => {
    onAnswer({ ...current, [pairId]: side });
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
          fontSize: "clamp(18px, 3vw, 28px)",
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
            marginBottom: "20px",
          }}
        >
          {question.subtext}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        {pairs.map((pair) => {
          const chosen = current[pair.id];
          return (
            <div
              key={pair.id}
              style={{
                display: "flex",
                alignItems: "stretch",
                height: "48px",
                borderBottom: `1px solid rgba(255,255,255,0.08)`,
              }}
            >
              {/* Left option */}
              <button
                onClick={() => choose(pair.id, "left")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "0",
                  paddingRight: "16px",
                  justifyContent: "flex-start",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color:
                    chosen === "left"
                      ? question.accent
                      : chosen
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(255,255,255,0.7)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "color 0.18s",
                }}
              >
                {pair.left}
              </button>

              {/* Center divider / dot */}
              <div
                style={{
                  width: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: chosen
                      ? question.accent
                      : "rgba(255,255,255,0.2)",
                    transition: "background-color 0.18s",
                  }}
                />
              </div>

              {/* Right option */}
              <button
                onClick={() => choose(pair.id, "right")}
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  paddingLeft: "16px",
                  justifyContent: "flex-end",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color:
                    chosen === "right"
                      ? question.accent
                      : chosen
                        ? "rgba(255,255,255,0.22)"
                        : "rgba(255,255,255,0.7)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "color 0.18s",
                  textAlign: "right",
                }}
              >
                {pair.right}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── NEW: Sliders ─────────────────────────────────────────────────────────────

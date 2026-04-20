"use client";

import { BUDGET_STRICTNESS_OPTIONS } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutBudgetEntry({ question, answer, onAnswer }: LayoutProps) {
  const current = answer as {
    path?: "know" | "guided";
    amount?: number;
    strictness?: string;
  } | null;
  const path = current?.path;

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
          fontSize: "clamp(22px, 4vw, 48px)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          marginBottom: "8px",
        }}
      >
        {question.question}
      </h1>
      <p
        style={{
          color: question.accent,
          opacity: 0.5,
          fontSize: "11px",
          letterSpacing: "0.1em",
          marginBottom: "36px",
        }}
      >
        {question.subtext}
      </p>

      {/* Path selector */}
      {!path && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxWidth: "480px",
          }}
        >
          <button
            onClick={() => onAnswer({ path: "know" })}
            style={{
              border: `1.5px solid rgba(255,255,255,0.25)`,
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.85)",
              padding: "22px 28px",
              fontSize: "13px",
              letterSpacing: "0.14em",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = question.accent;
              e.currentTarget.style.color = question.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
          >
            I KNOW MY BUDGET
            <span
              style={{
                display: "block",
                fontSize: "10px",
                opacity: 0.5,
                marginTop: "4px",
                fontWeight: 400,
              }}
            >
              Enter a number and we will work within it
            </span>
          </button>
          <button
            onClick={() => onAnswer({ path: "guided" })}
            style={{
              border: `1.5px solid rgba(255,255,255,0.25)`,
              backgroundColor: "transparent",
              color: "rgba(255,255,255,0.85)",
              padding: "22px 28px",
              fontSize: "13px",
              letterSpacing: "0.14em",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = question.accent;
              e.currentTarget.style.color = question.accent;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.25)";
              e.currentTarget.style.color = "rgba(255,255,255,0.85)";
            }}
          >
            HELP ME FIGURE IT OUT
            <span
              style={{
                display: "block",
                fontSize: "10px",
                opacity: 0.5,
                marginTop: "4px",
                fontWeight: 400,
              }}
            >
              6 quick questions to estimate your budget
            </span>
          </button>
        </div>
      )}

      {/* "Know" path: number input + strictness */}
      {path === "know" && (
        <div style={{ maxWidth: "480px" }}>
          <button
            onClick={() => onAnswer({ path: undefined })}
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.35)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              padding: "0",
              marginBottom: "24px",
            }}
          >
            ← BACK
          </button>
          <div style={{ marginBottom: "24px" }}>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.2em",
                color: question.accent,
                opacity: 0.5,
                fontWeight: 700,
                display: "block",
                marginBottom: "10px",
              }}
            >
              YOUR BUDGET
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                borderBottom: `1.5px solid ${question.accent}`,
                paddingBottom: "6px",
              }}
            >
              <span
                style={{
                  color: question.accent,
                  fontSize: "24px",
                  fontWeight: 700,
                }}
              >
                $
              </span>
              <input
                type="number"
                min={0}
                value={current?.amount ?? ""}
                onChange={(e) =>
                  onAnswer({
                    path: "know",
                    amount: Number(e.target.value),
                    strictness: current?.strictness,
                  })
                }
                placeholder="15000"
                aria-label="Budget amount"
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: question.accent,
                  fontSize: "24px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  letterSpacing: "0.04em",
                  width: "100%",
                  caretColor: question.accent,
                }}
              />
            </div>
          </div>
          <span
            style={{
              fontSize: "9px",
              letterSpacing: "0.2em",
              color: question.accent,
              opacity: 0.5,
              fontWeight: 700,
              display: "block",
              marginBottom: "12px",
            }}
          >
            STRICTNESS
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {BUDGET_STRICTNESS_OPTIONS.map((s) => (
              <button
                key={s.id}
                onClick={() =>
                  onAnswer({
                    path: "know",
                    amount: current?.amount,
                    strictness: s.id,
                  })
                }
                style={{
                  border: `1.5px solid ${current?.strictness === s.id ? question.accent : "rgba(255,255,255,0.2)"}`,
                  backgroundColor:
                    current?.strictness === s.id
                      ? question.accent
                      : "transparent",
                  color:
                    current?.strictness === s.id
                      ? "#1a1714"
                      : "rgba(255,255,255,0.7)",
                  padding: "12px 18px",
                  fontSize: "10px",
                  letterSpacing: "0.12em",
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "all 0.18s",
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* "Guided" path: indicator only — actual questions handled by quiz-app */}
      {path === "guided" && (
        <div>
          <button
            onClick={() => onAnswer({ path: undefined })}
            style={{
              fontSize: "9px",
              letterSpacing: "0.18em",
              color: "rgba(255,255,255,0.35)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              fontWeight: 700,
              padding: "0",
              marginBottom: "24px",
            }}
          >
            ← BACK
          </button>
          <p
            style={{
              fontSize: "13px",
              letterSpacing: "0.06em",
              color: "rgba(255,255,255,0.6)",
              lineHeight: 1.6,
              maxWidth: "380px",
            }}
          >
            We will ask you 6 quick questions to recommend a realistic budget
            range. Hit NEXT to begin.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── NEW: Budget Result (inline display after guided questions) ───────────────

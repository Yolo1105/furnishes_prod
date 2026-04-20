"use client";

import { RoomSizeAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";

export function LayoutRoomSize({ question, answer, onAnswer }: LayoutProps) {
  const current = (answer as RoomSizeAnswer) ?? {};
  const presets = question.options ?? [];

  const presetDims: Record<string, { width: number; length: number }> = {
    "r4-sm": { width: 10, length: 10 },
    "r4-st": { width: 12, length: 12 },
    "r4-lg": { width: 14, length: 16 },
  };

  const choosePreset = (id: string) => {
    const d = presetDims[id] ?? {};
    onAnswer({
      preset: id,
      width: d.width,
      length: d.length,
      ceiling: current.ceiling,
    });
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
            marginBottom: "28px",
          }}
        >
          {question.subtext}
        </p>
      )}
      {/* Presets */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "28px",
          flexWrap: "wrap",
        }}
      >
        {presets.map((p) => {
          const sel = current.preset === p.id;
          return (
            <button
              key={p.id}
              onClick={() => choosePreset(p.id)}
              style={{
                border: `1.5px solid ${sel ? question.accent : "rgba(0,0,0,0.2)"}`,
                backgroundColor: sel ? question.accent : "transparent",
                color: sel ? question.bg : "rgba(0,0,0,0.6)",
                padding: "14px 22px",
                fontSize: "11px",
                letterSpacing: "0.14em",
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.2s",
                textAlign: "left",
              }}
            >
              <span style={{ display: "block" }}>{p.label}</span>
              {p.sublabel && (
                <span
                  style={{
                    display: "block",
                    fontSize: "9px",
                    opacity: 0.6,
                    marginTop: "3px",
                  }}
                >
                  {p.sublabel}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* Manual inputs */}
      <span
        style={{
          fontSize: "9px",
          letterSpacing: "0.2em",
          color: question.accent,
          opacity: 0.5,
          fontWeight: 700,
          display: "block",
          marginBottom: "14px",
        }}
      >
        OR ENTER MANUALLY
      </span>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {[
          { key: "width" as const, label: "WIDTH (FT)" },
          { key: "length" as const, label: "LENGTH (FT)" },
          { key: "ceiling" as const, label: "CEILING HEIGHT (FT)" },
        ].map(({ key, label }) => (
          <div key={key} style={{ flex: "1 1 100px" }}>
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                color: question.accent,
                opacity: 0.45,
                fontWeight: 700,
                display: "block",
                marginBottom: "6px",
              }}
            >
              {label}
            </span>
            <div
              style={{
                borderBottom: `1.5px solid ${question.accent}`,
                paddingBottom: "4px",
              }}
            >
              <input
                type="number"
                min={1}
                value={current[key] ?? ""}
                onChange={(e) =>
                  onAnswer({
                    ...current,
                    preset: undefined,
                    [key]: Number(e.target.value),
                  })
                }
                aria-label={label}
                style={{
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  color: question.accent,
                  fontSize: "20px",
                  fontWeight: 700,
                  fontFamily: "inherit",
                  width: "100%",
                  caretColor: question.accent,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

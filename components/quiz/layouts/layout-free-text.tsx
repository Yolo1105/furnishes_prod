"use client";

import { useState } from "react";
import type { LayoutProps } from "./types";

export function LayoutFreeText({ question, answer, onAnswer }: LayoutProps) {
  const placeholders = question.placeholders ?? [];
  const [phIdx] = useState(() =>
    Math.floor(Math.random() * placeholders.length),
  );
  const placeholder = placeholders[phIdx] ?? "describe your ideal space...";

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
          fontSize: "clamp(22px, 4vw, 52px)",
          fontWeight: 700,
          letterSpacing: "0.04em",
          lineHeight: 1.1,
          marginBottom: question.subtext ? "8px" : "32px",
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
      <div
        style={{
          borderBottom: `1.5px solid ${question.accent}`,
          paddingBottom: "4px",
          marginBottom: "12px",
        }}
      >
        <textarea
          value={typeof answer === "string" ? answer : ""}
          onChange={(e) => onAnswer(e.target.value)}
          placeholder={placeholder}
          aria-label={question.question}
          rows={4}
          style={{
            width: "100%",
            background: "transparent",
            border: "none",
            outline: "none",
            color: question.accent,
            fontSize: "clamp(14px, 2.5vw, 22px)",
            fontFamily: "inherit",
            letterSpacing: "0.06em",
            lineHeight: 1.6,
            resize: "none",
            caretColor: question.accent,
          }}
        />
      </div>
      <p
        style={{
          fontSize: "9px",
          letterSpacing: "0.16em",
          color: question.accent,
          opacity: 0.3,
          fontWeight: 700,
        }}
      >
        OPTIONAL. SKIP WITH NEXT
      </p>
    </div>
  );
}

// ─── NEW: Category Priority ───────────────────────────────────────────────────

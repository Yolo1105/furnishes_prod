"use client";

import { MultiAnswer } from "@/lib/quiz-data";
import type { LayoutProps } from "./types";
import { OptionBlock } from "./shared";
import { LayoutLifeReality } from "./layout-life-reality";

export function LayoutFullColorSplit({
  question,
  answer,
  onAnswer,
}: LayoutProps) {
  const isMulti = question.type === "multi-select";
  const selected = isMulti
    ? ((answer as MultiAnswer) ?? [])
    : typeof answer === "string"
      ? answer
      : null;

  const toggle = (id: string) => {
    if (isMulti) {
      const cur = (answer as MultiAnswer) ?? [];
      const next = cur.includes(id)
        ? cur.filter((x) => x !== id)
        : [...cur, id];
      onAnswer(next);
    } else {
      onAnswer(id);
    }
  };

  if (question.type === "life-reality") {
    return (
      <LayoutLifeReality
        question={question}
        answer={answer}
        onAnswer={onAnswer}
      />
    );
  }

  const opts = question.options ?? [];
  return (
    <div
      className="flex flex-1 flex-col md:flex-row"
      style={{ padding: "40px 28px 0" }}
      role="group"
      aria-labelledby="q-text"
    >
      <div className="mb-10 flex flex-1 items-start md:mb-0 md:items-center md:pr-12">
        <h1
          id="q-text"
          style={{
            color: question.accent,
            fontSize: "clamp(22px, 4vw, 48px)",
            lineHeight: 1.1,
            letterSpacing: "0.06em",
            fontWeight: 700,
            textTransform: "uppercase",
            maxWidth: "420px",
          }}
        >
          {question.question}
        </h1>
      </div>
      <div className="flex flex-col gap-3 md:w-80 md:justify-center">
        {opts.map((opt) => (
          <OptionBlock
            key={opt.id}
            label={opt.label}
            sublabel={opt.sublabel}
            selected={
              isMulti
                ? (selected as string[]).includes(opt.id)
                : selected === opt.id
            }
            accent={question.accent}
            bg={question.bg}
            onClick={() => toggle(opt.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Layout: Ghost type ───────────────────────────────────────────────────────

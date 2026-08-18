"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { routes } from "@/lib/contracts";
import { AccountWireFrame } from "@/features/account/primitives/AccountWireFrame";
import { AccountWireHeader } from "@/features/account/primitives/AccountWireHeader";

type QuizMode = "full" | "style" | "budget" | "room";

const FULL_RUN = {
  id: "full" as const,
  label: "Full quiz",
  time: "15–20 min",
  questions: "30+ questions",
  line: "Style, budget, and room in one sitting — the complete brief Eva can work from.",
  details: [
    "Style profile from texture, light, and instinct",
    "A spend range or locked number you can shop against",
    "Room brief: household, light, openings, furniture list",
  ],
};

const PATHS = [
  {
    id: "style" as const,
    label: "Style",
    time: "~8 min",
    questions: "14 questions",
    line: "Find the look and feel that fits you — five possible profiles.",
    details: [
      "Mood, materials, color, and light preferences",
      "No wrong answers — ends on a named style profile",
      "Feeds Eva’s taste memory for recommendations",
    ],
  },
  {
    id: "budget" as const,
    label: "Budget",
    time: "~5 min",
    questions: "3–9 questions",
    line: "Plan what you’ll spend — guided range or a number you already know.",
    details: [
      "Room type, size, timeline, and quality level",
      "Priorities for where the money should go",
      "Gives Eva a spend band for shopping",
    ],
  },
  {
    id: "room" as const,
    label: "Room",
    time: "~7 min",
    questions: "10 questions",
    line: "Turn one space into a working brief Eva can design against.",
    details: [
      "Household, light, floor, and openings",
      "Furniture list and what the room must do",
      "Becomes the project brief in Chat",
    ],
  },
] as const;

function quizHref(mode: QuizMode): string {
  return `${routes.quiz}?mode=${mode}&start=1`;
}

/**
 * Account gateway before the full-screen Design Quiz at /quiz.
 * Choose the full run or a single path, then start.
 */
export function QuizIntroPage() {
  const [mode, setMode] = useState<QuizMode>("full");

  const selected = useMemo(() => {
    if (mode === "full") return FULL_RUN;
    return PATHS.find((path) => path.id === mode) ?? FULL_RUN;
  }, [mode]);

  const ctaLabel =
    mode === "full" ? "Start full quiz" : `Start ${selected.label} only`;

  return (
    <AccountWireFrame>
      <AccountWireHeader
        eyebrow="Design Work"
        title="Quiz"
        subtitle="Take the full run, or just one path. Answers stay on your account and feed Eva."
        actions={
          <Link href={quizHref(mode)} className="wf-btn">
            {ctaLabel}
          </Link>
        }
      />

      <p className="wf-sec__lbl" style={{ marginTop: 0 }}>
        How do you want to take it?
      </p>

      <button
        type="button"
        className={`wf-quiz-opt wf-quiz-opt--full${mode === "full" ? " is-on" : ""}`}
        aria-pressed={mode === "full"}
        onClick={() => setMode("full")}
      >
        <span className="wf-quiz-opt__radio" aria-hidden="true" />
        <span className="wf-quiz-opt__main">
          <span className="wf-quiz-opt__top">
            <span className="wf-quiz-opt__name">{FULL_RUN.label}</span>
            <span className="wf-quiz-opt__meta">
              {FULL_RUN.questions} · {FULL_RUN.time}
            </span>
          </span>
          <span className="wf-quiz-opt__line">{FULL_RUN.line}</span>
        </span>
      </button>

      <p className="wf-sec__lbl">
        Or one path
        <span className="wf-lblhint">
          shorter · still saves to your account
        </span>
      </p>

      <div className="wf-quiz-opts" role="radiogroup" aria-label="Quiz path">
        {PATHS.map((path, index) => {
          const on = mode === path.id;
          return (
            <button
              key={path.id}
              type="button"
              className={`wf-quiz-opt${on ? " is-on" : ""}`}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(path.id)}
            >
              <span className="wf-quiz-opt__ix" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="wf-quiz-opt__main">
                <span className="wf-quiz-opt__top">
                  <span className="wf-quiz-opt__name">{path.label}</span>
                  <span className="wf-quiz-opt__meta">
                    {path.questions} · {path.time}
                  </span>
                </span>
                <span className="wf-quiz-opt__line">{path.line}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="wf-quiz-about">
        <p className="wf-quiz-about__lbl">What’s included</p>
        <ul className="wf-quiz-about__list">
          {selected.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
        <div className="wf-quiz-about__act">
          <Link href={routes.accountChat} className="wf-quiz-skip">
            Skip to Chat
          </Link>
        </div>
      </div>
    </AccountWireFrame>
  );
}

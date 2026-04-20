"use client";

import { Question } from "@/lib/quiz-data";
import { LayoutBudgetResult } from "@/components/quiz/question-layouts";

interface QuizShellProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  canProceed: boolean;
  onNext: () => void;
  onBack: () => void;
  children: React.ReactNode;
  // Budget result injection
  showBudgetResult?: boolean;
  budgetRange?: [number, number] | null;
  budgetAccent?: string;
  budgetBg?: string;
}

export function QuizShell({
  question,
  questionNumber,
  totalQuestions,
  canProceed,
  onNext,
  onBack,
  children,
  showBudgetResult,
  budgetRange,
  budgetAccent,
  budgetBg,
}: QuizShellProps) {
  const flowLabel =
    question.flow === "style"
      ? "STYLE DISCOVERY"
      : question.flow === "budget"
        ? "BUDGET"
        : "ROOM DETAILS";

  const isOptional = question.optional ?? false;
  const isAutoAdvance = question.autoAdvance ?? false;

  // Min-select hint for multi-select
  const minSelect = question.minSelect;
  const maxSelect = question.maxSelect;
  let selectHint = "";
  if (minSelect && maxSelect && minSelect === maxSelect) {
    selectHint = `PICK EXACTLY ${minSelect}`;
  } else if (minSelect && maxSelect) {
    selectHint = `PICK ${minSelect} TO ${maxSelect}`;
  } else if (minSelect) {
    selectHint = `PICK AT LEAST ${minSelect}`;
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        backgroundColor: question.bg,
        position: "relative",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        transition: "background-color 0.45s ease",
      }}
    >
      {/* ── Top bar ── */}
      <header
        style={{ padding: "18px 28px 0" }}
        className="flex items-center justify-between"
      >
        {/* Flow + progress */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          {/* Back button */}
          <button
            onClick={onBack}
            aria-label="Previous question"
            style={{
              background: "none",
              border: "none",
              color: question.accent,
              opacity: 0.4,
              fontSize: "11px",
              letterSpacing: "0.16em",
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "inherit",
              padding: "0",
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
            onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.4")}
          >
            ←
          </button>

          {/* Dot progress */}
          <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
            {Array.from({ length: Math.min(totalQuestions, 20) }, (_, i) => (
              <div
                key={i}
                style={{
                  width: i < questionNumber ? "16px" : "5px",
                  height: "3px",
                  backgroundColor: question.accent,
                  opacity: i < questionNumber ? 1 : 0.18,
                  transition: "all 0.3s ease",
                }}
              />
            ))}
          </div>
        </div>

        {/* Right: flow label */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {isAutoAdvance && (
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.16em",
                color: question.accent,
                opacity: 0.4,
                fontWeight: 700,
              }}
            >
              AUTO →
            </span>
          )}
          <span
            style={{
              color: question.accent,
              fontSize: "9px",
              letterSpacing: "0.2em",
              fontWeight: 700,
              opacity: 0.65,
            }}
          >
            {flowLabel}
          </span>
        </div>
      </header>

      {/* ── Vertical ghost section label ── */}
      <div
        aria-hidden="true"
        className="writing-vertical absolute top-1/2 right-6"
        style={{
          color: question.accent,
          opacity: 0.06,
          fontSize: "11px",
          letterSpacing: "0.22em",
          fontWeight: 700,
          transform: "translateY(-50%)",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {flowLabel}
      </div>

      {/* ── Question content area ── */}
      <main className="flex flex-1 flex-col">{children}</main>

      {/* ── Injected budget result (shown above b3) ── */}
      {showBudgetResult && budgetRange && (
        <div style={{ padding: "0 28px 20px" }}>
          <LayoutBudgetResult
            range={budgetRange}
            accent={budgetAccent ?? "#DDD5C4"}
            bg={budgetBg ?? "#1a1714"}
          />
        </div>
      )}

      {/* ── Bottom bar ── */}
      <footer
        style={{ padding: "14px 28px 24px" }}
        className="flex items-center justify-between"
      >
        {/* Select hint / optional label */}
        <div>
          {selectHint && (
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.18em",
                color: question.accent,
                opacity: 0.4,
                fontWeight: 700,
              }}
            >
              {selectHint}
            </span>
          )}
          {isOptional && !selectHint && (
            <span
              style={{
                fontSize: "9px",
                letterSpacing: "0.18em",
                color: question.accent,
                opacity: 0.3,
                fontWeight: 700,
              }}
            >
              OPTIONAL
            </span>
          )}
        </div>

        {/* Next */}
        {!isAutoAdvance && (
          <button
            onClick={canProceed ? onNext : undefined}
            disabled={!canProceed}
            aria-label="Next question"
            style={{
              color: canProceed ? question.accent : question.accent,
              opacity: canProceed ? 1 : 0.15,
              fontSize: "11px",
              letterSpacing: "0.22em",
              fontWeight: 700,
              background: "none",
              border: "none",
              cursor: canProceed ? "pointer" : "default",
              padding: "8px 0",
              transition: "opacity 0.3s",
              fontFamily: "inherit",
            }}
          >
            NEXT →
          </button>
        )}
      </footer>
    </div>
  );
}

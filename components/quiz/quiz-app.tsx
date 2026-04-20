"use client";

import { useState, useCallback, useEffect, useRef, createElement } from "react";
import Link from "next/link";
import {
  Question,
  AnswerValue,
  MultiAnswer,
  BinaryPairsAnswer,
  LifeRealityAnswer,
  GroupedChecklistAnswer,
  RoomSizeAnswer,
  CategoryPriorityAnswer,
  CategorySpendAnswer,
  BudgetEntryAnswer,
  STYLE_QUESTIONS,
  BUDGET_QUESTIONS,
  ROOM_QUESTIONS,
  calculateResult,
  computeBudgetRange,
  StyleKey,
  QuizAppMode,
} from "@/lib/quiz-data";
import {
  LayoutFullColorSplit,
  LayoutGhostType,
  LayoutScatteredChips,
  LayoutVerticalSplit,
  LayoutOffsetComposition,
  LayoutGiantTypeSmallOptions,
  LayoutTwoColumnGrid,
  LayoutHoverReactive,
  LayoutEditorialStack,
  LayoutFullBleedStatement,
  LayoutImageGrid,
  LayoutPaletteCards,
  LayoutBinaryPairs,
  LayoutSliders,
  LayoutLifeReality,
  LayoutFreeText,
  LayoutCategoryPriority,
  LayoutCategorySpend,
  LayoutBudgetEntry,
  LayoutRoomSize,
  LayoutOpenings,
  LayoutGroupedChecklist,
  LayoutMagazineSpread,
  LayoutSplitTypewriter,
  LayoutPinboard,
  LayoutProps,
} from "@/components/quiz/question-layouts";
import { QuizShell } from "@/components/quiz/quiz-shell";
import { ResultsPage } from "@/components/quiz/results-page";

// ─── Route the question type to its layout component ─────────────────────────

function getLayoutComponent(q: Question): React.ComponentType<LayoutProps> {
  // Type-specific overrides come first
  switch (q.type) {
    case "image-grid":
      return LayoutImageGrid;
    case "palette-cards":
      return LayoutPaletteCards;
    case "binary-pairs":
      return LayoutBinaryPairs;
    case "sliders":
      return LayoutSliders;
    case "life-reality":
      return LayoutLifeReality;
    case "free-text":
      return LayoutFreeText;
    case "category-priority":
      return LayoutCategoryPriority;
    case "category-spend":
      return LayoutCategorySpend;
    case "budget-entry":
      return LayoutBudgetEntry;
    case "room-size":
      return LayoutRoomSize;
    case "openings":
      return LayoutOpenings;
    case "grouped-checklist":
      return LayoutGroupedChecklist;
  }

  // Fall through to layout-variant-based dispatch
  switch (q.layout) {
    case "full-color-split":
      return LayoutFullColorSplit;
    case "ghost-type":
      return LayoutGhostType;
    case "scattered-chips":
      return LayoutScatteredChips;
    case "vertical-split":
      return LayoutVerticalSplit;
    case "offset-composition":
      return LayoutOffsetComposition;
    case "giant-type-small-options":
      return LayoutGiantTypeSmallOptions;
    case "two-column-grid":
      return LayoutTwoColumnGrid;
    case "hover-reactive":
      return LayoutHoverReactive;
    case "editorial-stack":
      return LayoutEditorialStack;
    case "full-bleed-statement":
      return LayoutFullBleedStatement;
    case "magazine-spread":
      return LayoutMagazineSpread;
    case "split-typewriter":
      return LayoutSplitTypewriter;
    case "pinboard":
      return LayoutPinboard;
    default:
      return LayoutHoverReactive;
  }
}

// ─── Answer completeness check ────────────────────────────────────────────────

function isAnswerComplete(q: Question, answer: AnswerValue | null): boolean {
  if (q.optional) return true;
  if (answer === null || answer === undefined) return false;

  switch (q.type) {
    case "single-select":
      return typeof answer === "string" && answer.length > 0;

    case "multi-select":
    case "image-grid": {
      const arr = answer as MultiAnswer;
      const min = q.minSelect ?? 1;
      return arr.length >= min;
    }

    case "binary-pairs": {
      const pairs = answer as BinaryPairsAnswer;
      const total = q.binaryPairs?.length ?? 0;
      return Object.keys(pairs).length === total;
    }

    case "sliders": {
      // Sliders always have defaults (50), so always complete once touched or just allow through
      return true;
    }

    case "life-reality": {
      const groups = answer as LifeRealityAnswer;
      const total = q.lifeRealityGroups?.length ?? 0;
      return Object.keys(groups).length === total;
    }

    case "palette-cards":
      return typeof answer === "string" && answer.length > 0;

    case "free-text":
      return true; // always optional

    case "budget-entry": {
      const b = answer as BudgetEntryAnswer;
      if (!b.path) return false;
      if (b.path === "know") return !!b.amount && !!b.strictness;
      return b.path === "guided"; // guided: proceed to sub-questions
    }

    case "category-priority": {
      const cp = answer as CategoryPriorityAnswer;
      const total = q.categories?.length ?? 0;
      return Object.keys(cp).length === total;
    }

    case "category-spend": {
      const cs = answer as CategorySpendAnswer;
      const total = q.categories?.length ?? 0;
      return Object.keys(cs).length === total;
    }

    case "room-size": {
      const rs = answer as RoomSizeAnswer;
      return !!(rs.preset || (rs.width && rs.length));
    }

    case "openings":
      return true; // optional-style

    case "grouped-checklist": {
      const gc = answer as GroupedChecklistAnswer;
      return gc.length > 0;
    }

    default:
      return !!answer;
  }
}

// ─── Build the ordered list of questions for a run ────────────────────────────
// Budget flow can inject guided sub-questions depending on b1 answer

function buildQuestionSequence(
  mode: QuizAppMode,
  budgetPath: "know" | "guided" | null,
): Question[] {
  const budget = BUDGET_QUESTIONS;
  const room = ROOM_QUESTIONS;

  // budget[0] = b1 (entry), budget[1..6] = b2a–b2f (guided), budget[7] = b3 (priority), budget[8] = b4 (spend)
  const b1 = budget[0];
  const guided = budget.slice(1, 7); // b2a–b2f
  const priority = budget[7]; // b3
  const spend = budget[8]; // b4

  const budgetBlock =
    budgetPath === "guided"
      ? [b1, ...guided, priority, spend]
      : [b1, priority, spend];

  if (mode === "style") return [...STYLE_QUESTIONS];
  if (mode === "budget") return budgetBlock;
  return [...STYLE_QUESTIONS, ...budgetBlock, ...room];
}

// ─── Main app ─────────────────────────────────────────────────────────────────

type Screen = "intro" | "quiz" | "results";

export function QuizApp({ mode = "full" }: { mode?: QuizAppMode }) {
  const [screen, setScreen] = useState<Screen>("intro");
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [animKey, setAnimKey] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Derive the live question sequence (rebuild if budget path changes)
  const budgetAnswer = answers["b1"] as BudgetEntryAnswer | undefined;
  const budgetPath = budgetAnswer?.path ?? null;
  const questions = buildQuestionSequence(
    mode,
    budgetPath === "guided" ? "guided" : budgetPath === "know" ? "know" : null,
  );

  const question = questions[currentIdx];
  const answer = question ? (answers[question.id] ?? null) : null;

  const canProceed = question ? isAnswerComplete(question, answer) : false;

  // ── Handle answer updates ──
  const handleAnswer = useCallback(
    (value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [question.id]: value }));
    },
    [question],
  );

  // ── Advance ──
  const advance = useCallback(() => {
    if (exiting) return;
    setExiting(true);
    setTimeout(() => {
      if (currentIdx < questions.length - 1) {
        setCurrentIdx((i) => i + 1);
        setAnimKey((k) => k + 1);
      } else {
        setScreen("results");
        setAnimKey((k) => k + 1);
      }
      setExiting(false);
    }, 300);
  }, [exiting, currentIdx, questions.length]);

  // ── Go back ──
  const goBack = useCallback(() => {
    if (currentIdx === 0) {
      setScreen("intro");
      return;
    }
    setExiting(true);
    setTimeout(() => {
      setCurrentIdx((i) => i - 1);
      setAnimKey((k) => k + 1);
      setExiting(false);
    }, 300);
  }, [currentIdx]);

  // ── Auto-advance for single-select with autoAdvance ──
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (
      question?.autoAdvance &&
      (question.type === "single-select" ||
        question.type === "palette-cards") &&
      typeof answer === "string" &&
      answer
    ) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, 480);
    }
    return () => {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
    };
  }, [advance, answer, question?.autoAdvance, question?.id, question?.type]);

  // Also auto-advance image-grid with autoAdvance after single selection
  useEffect(() => {
    if (
      question?.autoAdvance &&
      question.type === "image-grid" &&
      !question.minSelect &&
      typeof answer === "string" &&
      answer
    ) {
      if (autoAdvanceTimer.current) clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = setTimeout(() => {
        advance();
      }, 480);
    }
  }, [
    advance,
    answer,
    question?.autoAdvance,
    question?.id,
    question?.minSelect,
    question?.type,
  ]);

  // ── Start quiz ──
  const handleStart = useCallback(() => {
    setScreen("quiz");
    setCurrentIdx(0);
    setAnimKey((k) => k + 1);
  }, []);

  // ── Retake ──
  const handleRetake = useCallback(() => {
    setAnswers({});
    setCurrentIdx(0);
    setScreen("intro");
    setAnimKey((k) => k + 1);
  }, []);

  // ── Results calculation ──
  const styleResult: StyleKey = calculateResult(answers);

  // ── Budget range (if guided path completed) ──
  const budgetRange =
    budgetPath === "guided" &&
    answers["b2a"] &&
    answers["b2b"] &&
    answers["b2c"] &&
    answers["b2d"] &&
    answers["b2e"] &&
    answers["b2f"]
      ? computeBudgetRange(
          answers["b2a"] as string,
          answers["b2b"] as string,
          answers["b2c"] as string,
          answers["b2d"] as string,
          answers["b2e"] as string,
          answers["b2f"] as string,
        )
      : null;

  if (screen === "results") {
    return (
      <ResultsPage
        key={animKey}
        mode={mode}
        styleKey={styleResult}
        answers={answers}
        budgetRange={budgetRange}
        onRetake={handleRetake}
      />
    );
  }

  if (screen === "intro") {
    return <IntroPage key={animKey} mode={mode} onStart={handleStart} />;
  }

  const totalQ = questions.length;
  const LayoutComponent = getLayoutComponent(question);

  return (
    <div key={animKey} className={exiting ? "quiz-exit" : "quiz-enter"}>
      <QuizShell
        question={question}
        questionNumber={currentIdx + 1}
        totalQuestions={totalQ}
        canProceed={canProceed}
        onNext={advance}
        onBack={goBack}
        budgetRange={budgetRange}
        showBudgetResult={
          question.id === "b3" && budgetPath === "guided" && !!budgetRange
        }
        budgetAccent={question.accent}
        budgetBg={question.bg}
      >
        {createElement(LayoutComponent, {
          question,
          answer,
          onAnswer: handleAnswer,
        })}
      </QuizShell>
    </div>
  );
}

// ─── Intro Page ───────────────────────────────────────────────────────────────

function IntroPage({
  mode,
  onStart,
}: {
  mode: QuizAppMode;
  onStart: () => void;
}) {
  const copy =
    mode === "style"
      ? {
          ghost: "MOOD",
          eyebrow: "DESIGN QUIZ",
          title: "WHAT KIND OF SPACE ARE YOU?",
          body: "Textures, light, and instinct. Fourteen questions to surface the look and feel that fits you. No wrong answers.",
          flows: [{ label: "STYLE", sub: "14 questions" }],
          footer: "STYLE DISCOVERY · 5 POSSIBLE PROFILES",
        }
      : mode === "budget"
        ? {
            ghost: "PLAN",
            eyebrow: "BUDGET PLANNER",
            title: "PLAN WHAT YOU'LL SPEND",
            body: "Tell us how you shop and what matters most. Get a guided range or lock in a number you already have in mind.",
            flows: [
              { label: "ENTRY", sub: "1 step" },
              { label: "GUIDED", sub: "up to 6" },
              { label: "PRIORITIES", sub: "2 steps" },
            ],
            footer: "BUDGET FLOW · RANGE OR STATED AMOUNT",
          }
        : {
            ghost: "SPACE",
            eyebrow: "INTERIOR STYLE QUIZ",
            title: "WHAT KIND OF SPACE ARE YOU?",
            body: "Three flows. No right answers. A full portrait of your style, your budget, and your room, drawn in material, light, and instinct.",
            flows: [
              { label: "STYLE", sub: "14 questions" },
              { label: "BUDGET", sub: "6 to 8 questions" },
              { label: "ROOM", sub: "10 questions" },
            ],
            footer: "3 FLOWS · 30+ QUESTIONS · 5 POSSIBLE STYLE PROFILES",
          };

  return (
    <div
      className="quiz-enter"
      style={{
        minHeight: "100dvh",
        backgroundColor: "#1a1714",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "28px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ghost background word */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          bottom: "-4%",
          left: "-2%",
          fontSize: "clamp(80px, 20vw, 240px)",
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: "1px #B33D0E",
          opacity: 0.06,
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
          letterSpacing: "-0.04em",
        }}
      >
        {copy.ghost}
      </div>

      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        <span
          style={{
            fontSize: "10px",
            letterSpacing: "0.22em",
            color: "#B33D0E",
            fontWeight: 700,
          }}
        >
          {copy.eyebrow}
        </span>
        <Link
          href="/inspiration"
          style={{
            fontSize: "9px",
            letterSpacing: "0.18em",
            color: "rgba(221,213,196,0.45)",
            fontWeight: 700,
            textDecoration: "none",
            transition: "color 0.2s",
          }}
        >
          ← INSPIRATION
        </Link>
      </header>

      <main style={{ maxWidth: "560px" }}>
        <h1
          style={{
            fontSize: "clamp(32px, 7vw, 80px)",
            fontWeight: 700,
            letterSpacing: "0.02em",
            lineHeight: 1.05,
            color: "#DDD5C4",
            marginBottom: "28px",
          }}
        >
          {copy.title}
        </h1>
        <p
          style={{
            fontSize: "13px",
            lineHeight: 1.7,
            color: "rgba(221,213,196,0.5)",
            letterSpacing: "0.06em",
            marginBottom: "16px",
            maxWidth: "400px",
          }}
        >
          {copy.body}
        </p>
        <div
          style={{
            display: "flex",
            gap: "20px",
            marginBottom: "40px",
            flexWrap: "wrap",
          }}
        >
          {copy.flows.map((f) => (
            <div key={f.label}>
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  letterSpacing: "0.18em",
                  color: "#B33D0E",
                  fontWeight: 700,
                }}
              >
                {f.label}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: "10px",
                  color: "rgba(221,213,196,0.28)",
                  letterSpacing: "0.1em",
                  marginTop: "2px",
                }}
              >
                {f.sub}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={onStart}
          style={{
            backgroundColor: "#B33D0E",
            color: "#DDD5C4",
            border: "none",
            padding: "16px 40px",
            fontSize: "11px",
            letterSpacing: "0.2em",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.85")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          BEGIN →
        </button>
      </main>

      <footer>
        <p
          style={{
            fontSize: "10px",
            color: "rgba(221,213,196,0.22)",
            letterSpacing: "0.12em",
          }}
        >
          {copy.footer}
        </p>
      </footer>
    </div>
  );
}

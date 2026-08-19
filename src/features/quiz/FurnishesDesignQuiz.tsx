"use client";

import { QuizErrorBoundary } from "@/features/quiz/components/error-boundary";
import { FurnishesDesignQuizInner } from "@/features/quiz/components/quiz-app";

/**
 * FURNISHES — Design Quiz
 * Thin composition shell. Data, scoring, and UI live under data/, engine/, components/.
 */
export default function FurnishesDesignQuiz() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        overflow: "hidden",
        backgroundColor: "#1a1714",
      }}
    >
      <QuizErrorBoundary>
        <FurnishesDesignQuizInner />
      </QuizErrorBoundary>
    </div>
  );
}

"use client";

import dynamic from "next/dynamic";
import type { QuizAppMode } from "@/lib/quiz-data";

const QuizApp = dynamic(
  () =>
    import("@/components/quiz/quiz-app").then((m) => ({ default: m.QuizApp })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex min-h-[60vh] flex-1 items-center justify-center"
        aria-busy="true"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-sm tracking-wide">
          Loading quiz…
        </p>
      </div>
    ),
  },
);

export function QuizAppLoader({ mode }: { mode: QuizAppMode }) {
  return <QuizApp mode={mode} />;
}

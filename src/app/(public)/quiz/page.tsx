import type { Metadata } from "next";
import FurnishesDesignQuiz from "@/features/quiz/FurnishesDesignQuiz";
import { QuizResultCapture } from "@/features/quiz/QuizResultCapture";
import { PUBLIC_PAGE_SEO, publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: PUBLIC_PAGE_SEO.quiz.title,
  description: PUBLIC_PAGE_SEO.quiz.description,
  path: PUBLIC_PAGE_SEO.quiz.path,
});

export default function QuizPage() {
  return (
    <QuizResultCapture>
      <FurnishesDesignQuiz />
    </QuizResultCapture>
  );
}

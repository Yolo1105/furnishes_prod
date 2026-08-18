import type { Metadata } from "next";
import FurnishesDesignQuiz from "@/features/quiz/FurnishesDesignQuiz";
import { QuizResultCapture } from "@/features/quiz/QuizResultCapture";

export const metadata: Metadata = {
  title: "Design Quiz",
};

export default function QuizPage() {
  return (
    <QuizResultCapture>
      <FurnishesDesignQuiz />
    </QuizResultCapture>
  );
}

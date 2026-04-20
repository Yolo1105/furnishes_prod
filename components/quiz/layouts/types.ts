import type { Question, AnswerValue } from "@/lib/quiz-data";

export interface LayoutProps {
  question: Question;
  answer: AnswerValue | null;
  onAnswer: (value: AnswerValue) => void;
}

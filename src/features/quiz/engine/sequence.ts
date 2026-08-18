import { STYLE_QUESTIONS } from "@/features/quiz/data/style-questions";
import { BUDGET_QUESTIONS } from "@/features/quiz/data/budget-questions";
import { ROOM_QUESTIONS } from "@/features/quiz/data/room-questions";
import type { QuizMode, QuizQuestion } from "@/features/quiz/data/types";

export function isAnswerComplete(q: QuizQuestion, answer: unknown): boolean {
  if (q.optional) return true;

  /* FIX #1 + #2: pass-through types checked BEFORE the null guard. */
  if (q.type === "sliders" || q.type === "openings" || q.type === "free-text")
    return true;

  if (answer === null || answer === undefined) return false;

  switch (q.type) {
    case "single-select":
      return typeof answer === "string" && answer.length > 0;
    case "multi-select":
    case "image-grid": {
      if (typeof answer === "string") return answer.length > 0;
      const arr = Array.isArray(answer) ? answer : [];
      const min = q.minSelect ?? 1;
      return arr.length >= min;
    }
    case "binary-pairs":
      return (
        typeof answer === "object" &&
        answer !== null &&
        Object.keys(answer as object).length === (q.binaryPairs?.length ?? 0)
      );
    case "life-reality":
      return (
        typeof answer === "object" &&
        answer !== null &&
        Object.keys(answer as object).length ===
          (q.lifeRealityGroups?.length ?? 0)
      );
    case "palette-cards":
      return typeof answer === "string" && answer.length > 0;
    case "budget-entry": {
      const a = answer as {
        path?: string;
        amount?: unknown;
        strictness?: unknown;
      };
      if (!a.path) return false;
      if (a.path === "know") return !!a.amount && !!a.strictness;
      return a.path === "guided";
    }
    case "category-priority":
    case "category-spend":
      return (
        typeof answer === "object" &&
        answer !== null &&
        Object.keys(answer as object).length === (q.categories?.length ?? 0)
      );
    case "room-size": {
      const a = answer as {
        preset?: unknown;
        width?: unknown;
        length?: unknown;
      };
      return !!(a.preset || (a.width && a.length));
    }
    case "grouped-checklist":
      return Array.isArray(answer) && answer.length > 0;
    default:
      return !!answer;
  }
}

/** Budget flow injects guided sub-questions depending on the b1 answer. */
export function buildQuestionSequence(
  mode: QuizMode | string,
  budgetPath: string | undefined,
): QuizQuestion[] {
  const b1 = BUDGET_QUESTIONS[0]!;
  const guided = BUDGET_QUESTIONS.slice(1, 7);
  const priority = BUDGET_QUESTIONS[7]!;
  const spend = BUDGET_QUESTIONS[8]!;

  const budgetBlock =
    budgetPath === "guided"
      ? [b1, ...guided, priority, spend]
      : [b1, priority, spend];

  if (mode === "style") return [...STYLE_QUESTIONS];
  if (mode === "budget") return budgetBlock;
  if (mode === "room") return [...ROOM_QUESTIONS];
  return [...STYLE_QUESTIONS, ...budgetBlock, ...ROOM_QUESTIONS];
}

type AnswerStatus = { text: string; done: boolean; quiet?: boolean };

/** Live footer status — reacts to every selection so feedback is instant. */
export function answerStatus(
  question: QuizQuestion,
  answer: unknown,
  canProceed: boolean,
): AnswerStatus {
  const t = question.type;
  if (t === "multi-select" || (t === "image-grid" && question.minSelect)) {
    const n = Array.isArray(answer) ? answer.length : 0;
    const min = question.minSelect ?? 1;
    const max = question.maxSelect;
    if (n === 0)
      return {
        text: max ? `PICK ${min}–${max}` : `PICK AT LEAST ${min}`,
        done: false,
      };
    if (n < min)
      return { text: `${n} SELECTED — PICK ${min - n} MORE`, done: false };
    return { text: `${n} SELECTED`, done: true };
  }
  if (t === "binary-pairs") {
    const total = question.binaryPairs?.length ?? 0;
    const n =
      answer && typeof answer === "object" ? Object.keys(answer).length : 0;
    return n >= total
      ? { text: `ALL ${total} ANSWERED`, done: true }
      : { text: `${n} / ${total} ANSWERED`, done: false };
  }
  if (t === "life-reality") {
    const total = question.lifeRealityGroups?.length ?? 0;
    const n =
      answer && typeof answer === "object" ? Object.keys(answer).length : 0;
    return n >= total
      ? { text: `ALL ${total} ANSWERED`, done: true }
      : { text: `${n} / ${total} ANSWERED`, done: false };
  }
  if (t === "category-priority" || t === "category-spend") {
    const total = question.categories?.length ?? 0;
    const n =
      answer && typeof answer === "object" ? Object.keys(answer).length : 0;
    return n >= total
      ? { text: `ALL ${total} SET`, done: true }
      : { text: `${n} / ${total} SET`, done: false };
  }
  if (question.optional) {
    return canProceed &&
      answer != null &&
      (!Array.isArray(answer) || answer.length > 0)
      ? { text: "SAVED — OPTIONAL", done: true }
      : { text: "OPTIONAL — SKIP WITH NEXT", done: false, quiet: true };
  }
  if (t === "free-text") {
    const words =
      typeof answer === "string" && answer.trim()
        ? answer.trim().split(/\s+/).length
        : 0;
    if (words === 0)
      return question.optional
        ? {
            text: "OPTIONAL — WRITE OR SKIP WITH NEXT",
            done: false,
            quiet: true,
          }
        : { text: "START TYPING", done: false };
    return { text: `${words} WORD${words === 1 ? "" : "S"}`, done: true };
  }
  if (t === "sliders")
    return { text: "ADJUST FREELY — NEXT WHEN READY", done: true, quiet: true };
  return canProceed
    ? { text: "ANSWER SAVED", done: true }
    : { text: "SELECT AN OPTION", done: false };
}
